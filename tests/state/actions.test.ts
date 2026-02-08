import { describe, expect, it } from "vitest";
import {
  advancePlayhead,
  setGlobalBoolean,
  setGlobalNumber,
  setGlobalPhaseReference,
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

  it("advances playhead only while playing", () => {
    const paused = createDefaultState();
    paused.global.isPlaying = false;
    paused.global.t = 1;
    const pausedNext = advancePlayhead(paused, 0.5);
    expect(pausedNext.global.t).toBe(1);

    const playing = createDefaultState();
    playing.global.isPlaying = true;
    playing.global.loopBeats = 4;
    playing.global.t = 3.75;
    const playingNext = advancePlayhead(playing, 0.5);
    expect(playingNext.global.t).toBeCloseTo(0.25, 10);
  });

  it("wraps negative global playhead values into loop range", () => {
    const state = createDefaultState();
    state.global.loopBeats = 4;

    const next = setGlobalNumber(state, "t", -0.25);
    expect(next.global.t).toBeCloseTo(3.75, 10);
  });

  it("applies boolean toggles and playback toggling", () => {
    const state = createDefaultState();
    const hidden = setGlobalBoolean(state, "showWaves", false);
    const playing = togglePlayback(hidden);

    expect(hidden.global.showWaves).toBe(false);
    expect(playing.global.isPlaying).toBe(!hidden.global.isPlaying);
  });

  it("sets global phase reference explicitly", () => {
    const state = createDefaultState();
    state.hands.L.armPhase = 1.23;
    state.hands.R.armPhase = -0.67;
    const next = setGlobalPhaseReference(state, "phaseReference", "up");

    expect(next.global.phaseReference).toBe("up");
    expect(next.hands.L.armPhase).toBeCloseTo(1.23, 10);
    expect(next.hands.R.armPhase).toBeCloseTo(-0.67, 10);
  });

  it("clamps hand radii to non-negative values", () => {
    const state = createDefaultState();
    const next = setHandNumber(state, "L", "armRadius", -100);

    expect(next.hands.L.armRadius).toBe(0);
  });

});
