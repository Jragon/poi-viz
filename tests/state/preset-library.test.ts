import { describe, expect, it } from "vitest";
import { createDefaultState } from "@/state/defaults";
import {
  createPresetFileName,
  createPresetId,
  createUserPresetRecord,
  deserializeUserPresetFile,
  deserializeUserPresetLibrary,
  ensureUniquePresetId,
  isPresetLibraryPayloadCompatible,
  PRESET_FILE_SCHEMA_VERSION,
  PRESET_LIBRARY_SCHEMA_VERSION,
  serializeUserPresetFile,
  serializeUserPresetLibrary,
  upsertUserPreset
} from "@/state/presetLibrary";
import { speedFromRadiansPerBeat } from "@/state/speedUnits";

describe("preset library", () => {
  it("creates deterministic preset ids from name + timestamp", () => {
    const fixedDate = new Date("2026-02-07T13:00:00.000Z");
    const id = createPresetId("My Pattern", fixedDate);

    expect(id).toBe(`preset-my-pattern-${fixedDate.getTime()}`);
  });

  it("ensures unique ids when collisions exist", () => {
    const state = createDefaultState();
    const existing = createUserPresetRecord("Earth", state, new Date("2026-02-07T13:00:00.000Z"), "preset-earth-1");
    const nextId = ensureUniquePresetId([existing], "preset-earth-1");

    expect(nextId).toBe("preset-earth-1-2");
  });

  it("serializes and deserializes library payloads", () => {
    const defaults = createDefaultState();
    const presetA = createUserPresetRecord("A", defaults, new Date("2026-02-07T13:00:00.000Z"), "preset-a");
    const presetB = createUserPresetRecord("B", defaults, new Date("2026-02-07T13:01:00.000Z"), "preset-b");
    const serialized = serializeUserPresetLibrary([presetA, presetB]);
    const parsed = deserializeUserPresetLibrary(serialized, defaults);

    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.id).toBe("preset-b");
    expect(parsed[1]?.id).toBe("preset-a");
  });

  it("round-trips individual preset files", () => {
    const defaults = createDefaultState();
    defaults.hands.L.armPhase = 0;
    defaults.global.phaseReference = "down";
    const preset = createUserPresetRecord("Library Preset", defaults, new Date("2026-02-07T13:02:00.000Z"), "preset-lib");
    const filePayload = serializeUserPresetFile(preset, {
      speedUnit: "cycles",
      phaseUnit: "degrees"
    });
    const parsedRaw = JSON.parse(filePayload) as {
      schemaVersion: number;
      preset: {
        units: { speedUnit: string; phaseUnit: string; phaseReference: string };
        state: { hands: { L: { armSpeed: number; armPhase: number } } };
      };
    };

    expect(parsedRaw.schemaVersion).toBe(PRESET_FILE_SCHEMA_VERSION);
    expect(parsedRaw.preset.units.speedUnit).toBe("cycles");
    expect(parsedRaw.preset.units.phaseUnit).toBe("degrees");
    expect(parsedRaw.preset.units.phaseReference).toBe("down");
    expect(parsedRaw.preset.state.hands.L.armSpeed).toBeCloseTo(speedFromRadiansPerBeat(defaults.hands.L.armSpeed, "cycles"), 12);
    expect(parsedRaw.preset.state.hands.L.armPhase).toBeCloseTo(-270, 10);

    const parsed = deserializeUserPresetFile(filePayload, defaults);

    expect(parsed).not.toBeNull();
    expect(parsed?.id).toBe("preset-lib");
    expect(parsed?.name).toBe("Library Preset");
    expect(parsed?.state.global.bpm).toBe(defaults.global.bpm);
    expect(parsed?.state.global.phaseReference).toBe("down");
    expect(parsed?.state.hands.L.armPhase).toBeCloseTo(defaults.hands.L.armPhase, 10);
  });

  it("creates safe export filenames", () => {
    expect(createPresetFileName("My Cool Pattern!!!")).toBe("my-cool-pattern.json");
    expect(createPresetFileName("   ")).toBe("preset.json");
  });

  it("upserts preset records by id", () => {
    const defaults = createDefaultState();
    const original = createUserPresetRecord("Preset", defaults, new Date("2026-02-07T13:00:00.000Z"), "preset-1");
    const updated = createUserPresetRecord("Preset Updated", defaults, new Date("2026-02-07T13:10:00.000Z"), "preset-1");
    const merged = upsertUserPreset([original], updated);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.id).toBe("preset-1");
    expect(merged[0]?.name).toBe("Preset Updated");
  });

  it("rejects legacy preset file schemas under break policy", () => {
    const defaults = createDefaultState();
    const payload = JSON.stringify({
      schemaVersion: 1,
      preset: {
        id: "legacy-preset",
        name: "Legacy",
        savedAt: "2026-02-07T13:00:00.000Z",
        state: defaults
      }
    });

    const parsed = deserializeUserPresetFile(payload, defaults);
    expect(parsed).toBeNull();
  });

  it("reports preset-library payload compatibility for schema purging", () => {
    const defaults = createDefaultState();
    const preset = createUserPresetRecord("A", defaults, new Date("2026-02-07T13:00:00.000Z"), "preset-a");
    const serialized = serializeUserPresetLibrary([preset]);
    const legacySerialized = JSON.stringify({
      schemaVersion: PRESET_LIBRARY_SCHEMA_VERSION - 1,
      presets: [preset]
    });

    expect(isPresetLibraryPayloadCompatible(serialized)).toBe(true);
    expect(isPresetLibraryPayloadCompatible(legacySerialized)).toBe(false);
  });
});
