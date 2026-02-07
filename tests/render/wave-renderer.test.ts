import { describe, expect, it } from "vitest";
import { sampleLoop } from "@/engine/sampling";
import { normalizeLoopBeat } from "@/render/math";
import { createWaveLanesFromSamples } from "@/render/waveRenderer";
import { createDefaultState } from "@/state/defaults";

const WAVE_TEST_SAMPLE_HZ = 60;
const MIN_WAVE_VALUE = -1;
const MAX_WAVE_VALUE = 1;

function createLoopSamples() {
  const state = createDefaultState();
  return sampleLoop(
    {
      bpm: state.global.bpm,
      hands: state.hands
    },
    WAVE_TEST_SAMPLE_HZ,
    state.global.loopBeats,
    0
  );
}

describe("wave renderer helpers", () => {
  it("builds four oscillator lanes with sin/cos traces", () => {
    const samples = createLoopSamples();
    const lanes = createWaveLanesFromSamples(samples);

    expect(lanes).toHaveLength(4);
    for (const lane of lanes) {
      expect(lane.sin.points).toHaveLength(samples.length);
      expect(lane.cos.points).toHaveLength(samples.length);
    }
  });

  it("keeps all generated sin/cos values in [-1, 1]", () => {
    const samples = createLoopSamples();
    const lanes = createWaveLanesFromSamples(samples);

    for (const lane of lanes) {
      for (const point of lane.sin.points) {
        expect(point.value).toBeGreaterThanOrEqual(MIN_WAVE_VALUE);
        expect(point.value).toBeLessThanOrEqual(MAX_WAVE_VALUE);
      }
      for (const point of lane.cos.points) {
        expect(point.value).toBeGreaterThanOrEqual(MIN_WAVE_VALUE);
        expect(point.value).toBeLessThanOrEqual(MAX_WAVE_VALUE);
      }
    }
  });

  it("normalizes beat cursor position to loop range", () => {
    expect(normalizeLoopBeat(5.25, 4)).toBeCloseTo(1.25, 10);
    expect(normalizeLoopBeat(-0.5, 4)).toBeCloseTo(3.5, 10);
  });
});

