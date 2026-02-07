import { describe, expect, it } from "vitest";
import { getLoopIntervalCount, sampleLoop } from "@/engine/sampling";
import { sampleHzToStepBeats } from "@/engine/math";
import { createDefaultState } from "@/state/defaults";

function createParams() {
  const state = createDefaultState();
  return {
    bpm: state.global.bpm,
    hands: state.hands
  };
}

describe("sampleLoop", () => {
  it("samples from start beat through loop end beat", () => {
    const params = createParams();
    const sampleHz = 60;
    const loopBeats = 4;
    const startBeat = 0;

    const samples = sampleLoop(params, sampleHz, loopBeats, startBeat);
    const stepBeats = sampleHzToStepBeats(sampleHz, params.bpm);
    const expectedCount = getLoopIntervalCount(loopBeats, stepBeats) + 1;

    expect(samples).toHaveLength(expectedCount);
    expect(samples[0]?.tBeats).toBe(startBeat);
    expect(samples.at(-1)?.tBeats).toBe(startBeat + loopBeats);
  });

  it("is deterministic across repeated calls", () => {
    const params = createParams();
    const sampleHz = 90;
    const loopBeats = 3;

    const first = sampleLoop(params, sampleHz, loopBeats);
    const second = sampleLoop(params, sampleHz, loopBeats);

    expect(second).toEqual(first);
  });
});

