import { describe, expect, it } from "vitest";
import {
  applyPreset,
  setGlobalBoolean,
  setGlobalNumber,
  setHandNumber,
  setScrubBeat,
  togglePlayback
} from "@/state/actions";
import { createDefaultState } from "@/state/defaults";

describe("state actions", () => {
  it("clamps bpm and loop beats to valid minimum values", () => {
    const state = createDefaultState();

    const withBpm = setGlobalNumber(state, "bpm", 0);
    const withLoopBeats = setGlobalNumber(withBpm, "loopBeats", 0);

    expect(withBpm.global.bpm).toBe(1);
    expect(withLoopBeats.global.loopBeats).toBe(0.25);
  });

  it("normalizes playhead after loop-beat changes", () => {
    const state = createDefaultState();
    state.global.t = 5.5;

    const next = setGlobalNumber(state, "loopBeats", 4);
    expect(next.global.t).toBeCloseTo(1.5, 10);
  });

  it("setScrubBeat normalizes playhead and pauses playback", () => {
    const state = createDefaultState();
    state.global.isPlaying = true;

    const next = setScrubBeat(state, 5.25);
    expect(next.global.t).toBeCloseTo(1.25, 10);
    expect(next.global.isPlaying).toBe(false);
  });

  it("applies boolean toggles and playback toggling", () => {
    const state = createDefaultState();
    const hidden = setGlobalBoolean(state, "showWaves", false);
    const playing = togglePlayback(hidden);

    expect(hidden.global.showWaves).toBe(false);
    expect(playing.global.isPlaying).toBe(!hidden.global.isPlaying);
  });

  it("clamps hand radii to non-negative values", () => {
    const state = createDefaultState();
    const next = setHandNumber(state, "L", "armRadius", -100);

    expect(next.hands.L.armRadius).toBe(0);
  });

  it("applies presets by id through action helpers", () => {
    const state = createDefaultState();
    const next = applyPreset(state, "air");

    expect(Math.sign(next.hands.R.armSpeed)).toBe(-Math.sign(next.hands.L.armSpeed));
    expect(next.hands.R.armPhase).toBeCloseTo(next.hands.L.armPhase, 10);
  });
});
