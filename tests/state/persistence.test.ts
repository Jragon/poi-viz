import { describe, expect, it } from "vitest";
import { createDefaultState } from "@/state/defaults";
import {
  buildStateUrl,
  deserializeState,
  isPersistedStatePayloadCompatible,
  PERSISTED_STATE_SCHEMA_VERSION,
  readStateFromStorage,
  readStateFromUrl,
  resolveInitialState,
  serializeState,
  stripStateQueryParam
} from "@/state/persistence";

describe("state persistence", () => {
  it("serializes durable state only (excluding playhead and playback flags)", () => {
    const state = createDefaultState();
    state.global.t = 2.5;
    state.global.isPlaying = false;
    state.global.bpm = 42;

    const serialized = serializeState(state);
    const payload = JSON.parse(serialized) as { schemaVersion: number; state: { global: Record<string, unknown> } };

    expect(payload.schemaVersion).toBe(PERSISTED_STATE_SCHEMA_VERSION);
    expect(payload.state.global.bpm).toBe(42);
    expect(payload.state.global.t).toBeUndefined();
    expect(payload.state.global.isPlaying).toBeUndefined();
  });

  it("round-trips full state through URL payload", () => {
    const state = createDefaultState();
    state.global.bpm = 42;
    state.global.showWaves = false;
    state.global.phaseReference = "up";
    state.hands.L.armPhase = 1.25;
    state.hands.R.poiRadius = 77;

    const url = buildStateUrl(state, "https://jragon.github.io/poi-viz/");
    const serialized = new URL(url).searchParams.get("state");
    const decoded = readStateFromUrl(url, createDefaultState());

    expect(isPersistedStatePayloadCompatible(serialized)).toBe(true);
    expect(decoded).not.toBeNull();
    expect(decoded?.global.bpm).toBe(42);
    expect(decoded?.global.showWaves).toBe(false);
    expect(decoded?.global.phaseReference).toBe("up");
    expect(decoded?.hands.L.armPhase).toBeCloseTo(1.25, 10);
    expect(decoded?.hands.R.poiRadius).toBe(77);
  });

  it("restores volatile transport fields from defaults during hydration", () => {
    const defaults = createDefaultState();
    defaults.global.t = 11;
    defaults.global.isPlaying = false;

    const raw = JSON.stringify({
      schemaVersion: PERSISTED_STATE_SCHEMA_VERSION,
      state: {
        global: {
          phaseReference: "up",
          t: 3,
          isPlaying: true
        },
        hands: {}
      }
    });

    const parsed = deserializeState(raw, defaults);

    expect(parsed).not.toBeNull();
    expect(parsed?.global.phaseReference).toBe("up");
    expect(parsed?.global.t).toBe(11);
    expect(parsed?.global.isPlaying).toBe(false);
  });

  it("prefers URL state over storage state when both exist", () => {
    const urlState = createDefaultState();
    urlState.global.bpm = 30;

    const storageState = createDefaultState();
    storageState.global.bpm = 60;

    const url = buildStateUrl(urlState, "https://jragon.github.io/poi-viz/");
    const storagePayload = serializeState(storageState);
    const resolved = resolveInitialState(createDefaultState(), url, storagePayload);

    expect(resolved.global.bpm).toBe(30);
  });

  it("falls back to storage state when URL has no state payload", () => {
    const storageState = createDefaultState();
    storageState.global.loopBeats = 8;

    const resolved = resolveInitialState(
      createDefaultState(),
      "https://jragon.github.io/poi-viz/?foo=bar",
      serializeState(storageState)
    );

    expect(resolved.global.loopBeats).toBe(8);
  });

  it("sanitizes persisted numeric values through action clamps", () => {
    const defaults = createDefaultState();
    const raw = JSON.stringify({
      schemaVersion: PERSISTED_STATE_SCHEMA_VERSION,
      state: {
        global: {
          bpm: -5,
          loopBeats: -10,
          playSpeed: -3,
          phaseReference: "down",
          trailBeats: -2,
          trailSampleHz: 0
        },
        hands: {
          L: { armRadius: -100, poiRadius: -200 },
          R: { armRadius: -50, poiRadius: -75 }
        }
      }
    });

    const parsed = deserializeState(raw, defaults);

    expect(parsed).not.toBeNull();
    expect(parsed?.global.bpm).toBe(1);
    expect(parsed?.global.loopBeats).toBe(0.25);
    expect(parsed?.global.playSpeed).toBe(0);
    expect(parsed?.global.trailBeats).toBe(0);
    expect(parsed?.global.trailSampleHz).toBe(1);
    expect(parsed?.hands.L.armRadius).toBe(0);
    expect(parsed?.hands.L.poiRadius).toBe(0);
    expect(parsed?.hands.R.armRadius).toBe(0);
    expect(parsed?.hands.R.poiRadius).toBe(0);
  });

  it("treats phase reference as view metadata during hydration", () => {
    const defaults = createDefaultState();
    defaults.hands.L.armPhase = 0.75;
    defaults.hands.R.armPhase = -1.25;

    const raw = JSON.stringify({
      schemaVersion: PERSISTED_STATE_SCHEMA_VERSION,
      state: {
        global: {
          phaseReference: "up"
        },
        hands: {}
      }
    });

    const parsed = deserializeState(raw, defaults);

    expect(parsed).not.toBeNull();
    expect(parsed?.global.phaseReference).toBe("up");
    expect(parsed?.hands.L.armPhase).toBeCloseTo(0.75, 10);
    expect(parsed?.hands.R.armPhase).toBeCloseTo(-1.25, 10);
  });

  it("returns null for invalid storage payload", () => {
    const parsed = readStateFromStorage("{ not-json", createDefaultState());
    expect(parsed).toBeNull();
  });

  it("rejects incompatible schema payloads under break policy", () => {
    const defaults = createDefaultState();
    const legacyPayload = JSON.stringify({
      schemaVersion: PERSISTED_STATE_SCHEMA_VERSION - 1,
      state: defaults
    });

    expect(deserializeState(legacyPayload, defaults)).toBeNull();
    expect(isPersistedStatePayloadCompatible(legacyPayload)).toBe(false);
  });

  it("rejects payloads missing phase-reference metadata", () => {
    const defaults = createDefaultState();
    const missingPhaseReference = JSON.stringify({
      schemaVersion: PERSISTED_STATE_SCHEMA_VERSION,
      state: {
        global: {
          bpm: defaults.global.bpm
        },
        hands: defaults.hands
      }
    });

    expect(deserializeState(missingPhaseReference, defaults)).toBeNull();
  });

  it("removes state query parameter from URL", () => {
    const url = "https://jragon.github.io/poi-viz/?state=abc123&foo=bar";
    const stripped = stripStateQueryParam(url);
    const parsed = new URL(stripped);

    expect(parsed.searchParams.get("state")).toBeNull();
    expect(parsed.searchParams.get("foo")).toBe("bar");
  });
});
