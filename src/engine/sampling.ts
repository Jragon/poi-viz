import { getAngles } from "@/engine/angles";
import { sampleHzToStepBeats, ZERO } from "@/engine/math";
import { getPositions } from "@/engine/positions";
import type { EngineParams, LoopSample } from "@/engine/types";

/**
 * Number of fixed intervals needed to span loopBeats with stepBeats.
 * Sample count is interval count + 1 because both endpoints are included.
 */
export function getLoopIntervalCount(loopBeats: number, stepBeats: number): number {
  if (loopBeats < ZERO) {
    throw new Error("loopBeats must be >= 0");
  }
  if (stepBeats <= ZERO) {
    throw new Error("stepBeats must be > 0");
  }
  return Math.ceil(loopBeats / stepBeats);
}

function getSampleBeat(startBeat: number, loopBeats: number, stepBeats: number, sampleIndex: number): number {
  const nextBeat = startBeat + sampleIndex * stepBeats;
  const loopEnd = startBeat + loopBeats;
  return Math.min(nextBeat, loopEnd);
}

/**
 * Deterministically samples angles and positions across one beat loop.
 * Sampling is in fixed beat steps derived from sampleHz and bpm.
 */
export function sampleLoop(params: EngineParams, sampleHz: number, loopBeats: number, startBeat = ZERO): LoopSample[] {
  const stepBeats = sampleHzToStepBeats(sampleHz, params.bpm);
  const intervalCount = getLoopIntervalCount(loopBeats, stepBeats);
  const sampleCount = intervalCount + 1;

  return Array.from({ length: sampleCount }, (_, sampleIndex) => {
    const tBeats = getSampleBeat(startBeat, loopBeats, stepBeats, sampleIndex);
    return {
      tBeats,
      angles: getAngles(params, tBeats),
      positions: getPositions(params, tBeats)
    };
  });
}
