import { sampleLoop } from "@/engine/sampling";
import { createDefaultState } from "@/state/defaults";
import { buildStaticTrailSeries } from "@/render/staticTrails";
import { describe, expect, it } from "vitest";

function createParams() {
  const state = createDefaultState();
  return {
    bpm: state.global.bpm,
    hands: state.hands
  };
}

describe("static trail builder", () => {
  it("builds trail points from full-loop sampled head positions", () => {
    const params = createParams();
    const loopBeats = 4;
    const sampleHz = 12;
    const startBeat = 1.5;

    const trails = buildStaticTrailSeries(params, loopBeats, sampleHz, startBeat);
    const samples = sampleLoop(params, sampleHz, loopBeats, startBeat);

    expect(trails.L).toHaveLength(samples.length);
    expect(trails.R).toHaveLength(samples.length);
    expect(trails.L[0]?.tBeats).toBeCloseTo(startBeat, 10);
    expect(trails.R[0]?.tBeats).toBeCloseTo(startBeat, 10);
    expect(trails.L.at(-1)?.tBeats).toBeCloseTo(startBeat + loopBeats, 10);
    expect(trails.R.at(-1)?.tBeats).toBeCloseTo(startBeat + loopBeats, 10);

    expect(trails.L[3]?.point).toEqual(samples[3]?.positions.L.head);
    expect(trails.R[3]?.point).toEqual(samples[3]?.positions.R.head);
  });

  it("is deterministic for identical sampling inputs", () => {
    const params = createParams();
    const loopBeats = 2;
    const sampleHz = 20;
    const startBeat = 0.25;

    const first = buildStaticTrailSeries(params, loopBeats, sampleHz, startBeat);
    const second = buildStaticTrailSeries(params, loopBeats, sampleHz, startBeat);

    expect(first).toEqual(second);
  });
});
