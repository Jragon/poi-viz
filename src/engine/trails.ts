import { getPositions } from "@/engine/positions";
import { createRingBuffer, pushRingBuffer, ringBufferToArray, type RingBuffer } from "@/engine/ringBuffer";
import { getTrailCapacity, sampleHzToStepBeats, ZERO } from "@/engine/math";
import type { EngineParams, TrailPoint, TrailSamplerConfig } from "@/engine/types";

interface TrailBuffers {
  L: RingBuffer<TrailPoint>;
  R: RingBuffer<TrailPoint>;
}

export interface TrailSamplerState {
  /**
   * Immutable trail sampling configuration.
   */
  config: TrailSamplerConfig;
  /**
   * Beat-domain sample step derived from `trailSampleHz` and `bpm`.
   */
  sampleStepBeats: number;
  /**
   * Next beat timestamp that should be sampled.
   */
  nextSampleBeat: number;
  /**
   * Most recent frame beat used to advance this sampler.
   */
  lastFrameBeat: number;
  /**
   * Per-hand bounded trail history.
   */
  trails: TrailBuffers;
}

function createTrailBuffers(capacity: number): TrailBuffers {
  return {
    L: createRingBuffer<TrailPoint>(capacity),
    R: createRingBuffer<TrailPoint>(capacity)
  };
}

function appendTrailSample(trails: TrailBuffers, params: EngineParams, tBeats: number): TrailBuffers {
  const positions = getPositions(params, tBeats);

  return {
    L: pushRingBuffer(trails.L, {
      tBeats,
      point: positions.L.head
    }),
    R: pushRingBuffer(trails.R, {
      tBeats,
      point: positions.R.head
    })
  };
}

/**
 * Creates a trail sampler with a seeded sample at startBeat.
 * Sampling thereafter is fixed-step in beat-space, independent of render FPS.
 *
 * @param config Trail window and sample-rate configuration.
 * @param params Engine inputs for positional sampling.
 * @param startBeat Beat where the seeded sample is written.
 * @returns Initialized deterministic trail sampler state.
 */
export function createTrailSampler(config: TrailSamplerConfig, params: EngineParams, startBeat: number): TrailSamplerState {
  const capacity = getTrailCapacity(config.trailSampleHz, config.trailBeats, config.bpm);
  const sampleStepBeats = sampleHzToStepBeats(config.trailSampleHz, config.bpm);
  const trails = createTrailBuffers(capacity);
  const seededTrails = appendTrailSample(trails, params, startBeat);

  return {
    config,
    sampleStepBeats,
    nextSampleBeat: startBeat + sampleStepBeats,
    lastFrameBeat: startBeat,
    trails: seededTrails
  };
}

function resetTrailSampler(state: TrailSamplerState, params: EngineParams, frameBeat: number): TrailSamplerState {
  const capacity = getTrailCapacity(state.config.trailSampleHz, state.config.trailBeats, state.config.bpm);
  const sampleStepBeats = state.sampleStepBeats;
  const trails = createTrailBuffers(capacity);

  if (capacity === ZERO) {
    return {
      ...state,
      trails,
      nextSampleBeat: frameBeat + sampleStepBeats,
      lastFrameBeat: frameBeat
    };
  }

  const oldestBeat = frameBeat - (capacity - 1) * sampleStepBeats;
  let rebuiltTrails = trails;

  for (let sampleIndex = ZERO; sampleIndex < capacity; sampleIndex += 1) {
    const sampleBeat = oldestBeat + sampleIndex * sampleStepBeats;
    rebuiltTrails = appendTrailSample(rebuiltTrails, params, sampleBeat);
  }

  return {
    ...state,
    trails: rebuiltTrails,
    nextSampleBeat: frameBeat + sampleStepBeats,
    lastFrameBeat: frameBeat
  };
}

function getPendingSampleCount(nextSampleBeat: number, frameBeat: number, sampleStepBeats: number): number {
  if (frameBeat < nextSampleBeat) {
    return ZERO;
  }

  const beatDelta = frameBeat - nextSampleBeat;
  return Math.floor(beatDelta / sampleStepBeats) + 1;
}

/**
 * Advances trails up to frameBeat.
 * If frameBeat rewinds, state is rebuilt to the full trailing window ending at `frameBeat`.
 *
 * @param state Previous trail sampler state.
 * @param params Engine inputs for positional sampling.
 * @param frameBeat Current playhead beat.
 * @returns Next trail sampler state after catching up to `frameBeat`.
 */
export function advanceTrailSampler(state: TrailSamplerState, params: EngineParams, frameBeat: number): TrailSamplerState {
  if (frameBeat < state.lastFrameBeat) {
    return resetTrailSampler(state, params, frameBeat);
  }

  const pendingSampleCount = getPendingSampleCount(state.nextSampleBeat, frameBeat, state.sampleStepBeats);
  if (pendingSampleCount === ZERO) {
    return {
      ...state,
      lastFrameBeat: frameBeat
    };
  }

  let nextTrails = state.trails;
  for (let sampleIndex = ZERO; sampleIndex < pendingSampleCount; sampleIndex += 1) {
    const tBeats = state.nextSampleBeat + sampleIndex * state.sampleStepBeats;
    nextTrails = appendTrailSample(nextTrails, params, tBeats);
  }

  return {
    ...state,
    trails: nextTrails,
    nextSampleBeat: state.nextSampleBeat + pendingSampleCount * state.sampleStepBeats,
    lastFrameBeat: frameBeat
  };
}

/**
 * Returns trail points ordered from oldest to newest.
 *
 * @param state Trail sampler state.
 * @returns Per-hand ordered trail points from oldest to newest.
 */
export function getTrailPoints(state: TrailSamplerState) {
  return {
    L: ringBufferToArray(state.trails.L),
    R: ringBufferToArray(state.trails.R)
  };
}
