import { describe, expect, it } from "vitest";
import { createDefaultState } from "@/state/defaults";
import {
  DEFAULT_ARM_RADIUS,
  DEFAULT_BPM,
  DEFAULT_LEFT_RELATIVE_POI_CYCLES_PER_BEAT,
  DEFAULT_LOOP_BEATS,
  DEFAULT_POI_RADIUS,
  DEFAULT_RIGHT_RELATIVE_POI_CYCLES_PER_BEAT,
  DEFAULT_TRAIL_BEATS,
  DEFAULT_TRAIL_SAMPLE_HZ,
  TWO_PI
} from "@/state/constants";

describe("createDefaultState", () => {
  it("matches global defaults from spec", () => {
    const state = createDefaultState();

    expect(state.global.bpm).toBe(DEFAULT_BPM);
    expect(state.global.loopBeats).toBe(DEFAULT_LOOP_BEATS);
    expect(state.global.playSpeed).toBe(1);
    expect(state.global.isPlaying).toBe(false);
    expect(state.global.t).toBe(0);
    expect(state.global.showTrails).toBe(true);
    expect(state.global.trailBeats).toBe(DEFAULT_TRAIL_BEATS);
    expect(state.global.trailSampleHz).toBe(DEFAULT_TRAIL_SAMPLE_HZ);
    expect(state.global.showWaves).toBe(true);
  });

  it("matches per-hand defaults from spec", () => {
    const state = createDefaultState();

    expect(state.hands.L.armRadius).toBe(DEFAULT_ARM_RADIUS);
    expect(state.hands.R.armRadius).toBe(DEFAULT_ARM_RADIUS);
    expect(state.hands.L.poiRadius).toBe(DEFAULT_POI_RADIUS);
    expect(state.hands.R.poiRadius).toBe(DEFAULT_POI_RADIUS);

    expect(state.hands.L.armSpeed).toBe(TWO_PI);
    expect(state.hands.R.armSpeed).toBe(TWO_PI);
    expect(state.hands.L.armPhase).toBe(0);
    expect(state.hands.R.armPhase).toBe(0);

    expect(state.hands.L.poiSpeed).toBe(DEFAULT_LEFT_RELATIVE_POI_CYCLES_PER_BEAT * TWO_PI);
    expect(state.hands.R.poiSpeed).toBe(DEFAULT_RIGHT_RELATIVE_POI_CYCLES_PER_BEAT * TWO_PI);
    expect(state.hands.L.poiPhase).toBe(0);
    expect(state.hands.R.poiPhase).toBe(0);
  });
});
