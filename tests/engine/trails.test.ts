import { describe, expect, it } from "vitest";
import { advanceTrailSampler, createTrailSampler, getTrailPoints } from "@/engine/trails";
import { getTrailCapacity, sampleHzToStepBeats } from "@/engine/math";
import { createDefaultState } from "@/state/defaults";

function createParams() {
  const state = createDefaultState();
  return {
    bpm: state.global.bpm,
    hands: state.hands
  };
}

function createConfig() {
  const state = createDefaultState();
  return {
    bpm: state.global.bpm,
    trailBeats: state.global.trailBeats,
    trailSampleHz: state.global.trailSampleHz
  };
}

describe("trail sampler", () => {
  it("samples at a fixed beat step independent of frame boundaries", () => {
    const params = createParams();
    const config = createConfig();
    const startBeat = 0;
    const sampler = createTrailSampler(config, params, startBeat);
    const advanced = advanceTrailSampler(sampler, params, 1);
    const points = getTrailPoints(advanced);

    const sampleStepBeats = sampleHzToStepBeats(config.trailSampleHz, config.bpm);
    const expectedPoints = Math.floor((1 - startBeat) / sampleStepBeats) + 1;

    expect(points.L).toHaveLength(expectedPoints);
    expect(points.R).toHaveLength(expectedPoints);
    expect(points.L[0]?.tBeats).toBeCloseTo(0, 10);
    expect(points.L.at(-1)?.tBeats).toBeCloseTo(1, 10);
  });

  it("caps points at ring-buffer capacity and keeps newest samples", () => {
    const params = createParams();
    const config = createConfig();
    const capacity = getTrailCapacity(config.trailSampleHz, config.trailBeats, config.bpm);
    const sampler = createTrailSampler(config, params, 0);
    const advanced = advanceTrailSampler(sampler, params, 5);
    const points = getTrailPoints(advanced);

    const stepBeats = sampleHzToStepBeats(config.trailSampleHz, config.bpm);
    const expectedOldestBeat = 5 - (capacity - 1) * stepBeats;

    expect(points.L).toHaveLength(capacity);
    expect(points.R).toHaveLength(capacity);
    expect(points.L[0]?.tBeats).toBeCloseTo(expectedOldestBeat, 10);
    expect(points.L.at(-1)?.tBeats).toBeCloseTo(5, 10);
  });

  it("resets deterministically when playhead goes backwards", () => {
    const params = createParams();
    const config = createConfig();
    const sampler = createTrailSampler(config, params, 0);
    const forward = advanceTrailSampler(sampler, params, 2);
    const rewound = advanceTrailSampler(forward, params, 1);
    const points = getTrailPoints(rewound);

    expect(points.L).toHaveLength(1);
    expect(points.R).toHaveLength(1);
    expect(points.L[0]?.tBeats).toBeCloseTo(1, 10);
    expect(points.R[0]?.tBeats).toBeCloseTo(1, 10);
  });
});
