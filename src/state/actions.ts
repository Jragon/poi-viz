import { normalizeLoopBeat } from "@/render/math";
import { applyPresetById } from "@/state/presets";
import type { AppState, GlobalState, HandId, HandState, PresetId } from "@/types/state";

export type GlobalNumberKey = {
  [Key in keyof GlobalState]: GlobalState[Key] extends number ? Key : never;
}[keyof GlobalState];

export type GlobalBooleanKey = {
  [Key in keyof GlobalState]: GlobalState[Key] extends boolean ? Key : never;
}[keyof GlobalState];

export type HandNumberKey = keyof HandState;

const MIN_BPM = 1;
const MIN_LOOP_BEATS = 0.25;
const MIN_PLAY_SPEED = 0;
const MIN_TRAIL_BEATS = 0;
const MIN_TRAIL_SAMPLE_HZ = 1;
const MIN_RADIUS = 0;

function cloneState(state: AppState): AppState {
  return {
    global: { ...state.global },
    hands: {
      L: { ...state.hands.L },
      R: { ...state.hands.R }
    }
  };
}

function clampMin(value: number, minimum: number): number {
  return value < minimum ? minimum : value;
}

function sanitizeNumber(input: number, fallback: number): number {
  return Number.isFinite(input) ? input : fallback;
}

function clampGlobalNumber(key: GlobalNumberKey, value: number, state: AppState): number {
  switch (key) {
    case "bpm":
      return clampMin(value, MIN_BPM);
    case "loopBeats":
      return clampMin(value, MIN_LOOP_BEATS);
    case "playSpeed":
      return clampMin(value, MIN_PLAY_SPEED);
    case "trailBeats":
      return clampMin(value, MIN_TRAIL_BEATS);
    case "trailSampleHz":
      return clampMin(value, MIN_TRAIL_SAMPLE_HZ);
    case "t":
      return value;
    default:
      return sanitizeNumber(value, state.global[key]);
  }
}

function clampHandNumber(key: HandNumberKey, value: number, state: AppState, handId: HandId): number {
  switch (key) {
    case "armRadius":
    case "poiRadius":
      return clampMin(value, MIN_RADIUS);
    default:
      return sanitizeNumber(value, state.hands[handId][key]);
  }
}

export function setGlobalNumber(state: AppState, key: GlobalNumberKey, nextValue: number): AppState {
  const cloned = cloneState(state);
  const currentValue = cloned.global[key];
  const sanitized = sanitizeNumber(nextValue, currentValue);
  const clamped = clampGlobalNumber(key, sanitized, cloned);

  cloned.global[key] = clamped;

  if (key === "loopBeats") {
    cloned.global.t = normalizeLoopBeat(cloned.global.t, clamped);
  }
  if (key === "t") {
    cloned.global.t = normalizeLoopBeat(clamped, cloned.global.loopBeats);
  }

  return cloned;
}

export function setGlobalBoolean(state: AppState, key: GlobalBooleanKey, nextValue: boolean): AppState {
  const cloned = cloneState(state);
  cloned.global[key] = nextValue;
  return cloned;
}

export function togglePlayback(state: AppState): AppState {
  return setGlobalBoolean(state, "isPlaying", !state.global.isPlaying);
}

export function setScrubBeat(state: AppState, beatValue: number): AppState {
  const scrubbed = setGlobalNumber(state, "t", beatValue);
  return setGlobalBoolean(scrubbed, "isPlaying", false);
}

export function setHandNumber(state: AppState, handId: HandId, key: HandNumberKey, nextValue: number): AppState {
  const cloned = cloneState(state);
  const currentValue = cloned.hands[handId][key];
  const sanitized = sanitizeNumber(nextValue, currentValue);
  const clamped = clampHandNumber(key, sanitized, cloned, handId);
  cloned.hands[handId][key] = clamped;
  return cloned;
}

export function applyPreset(state: AppState, presetId: PresetId): AppState {
  return applyPresetById(state, presetId);
}
