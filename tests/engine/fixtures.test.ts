import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPresetFixture,
  type FixtureManifestFile,
  type PresetFixtureFile
} from "@/engine/fixtures";
import { createDefaultState } from "@/state/defaults";
import { PRESET_CATALOG } from "@/state/presets";
import { compareFixtureSamples } from "./fixture-harness";
import { FIXTURE_TOLERANCE } from "./helpers";

const FIXTURES_DIRECTORY = resolve(process.cwd(), "fixtures");
const MANIFEST_PATH = resolve(FIXTURES_DIRECTORY, "manifest.json");

const PRESET_LOOKUP = new Map(PRESET_CATALOG.map((preset) => [preset.id, preset]));

async function readJsonFile<T>(path: string): Promise<T> {
  const content = await readFile(path, "utf8");
  return JSON.parse(content) as T;
}

function formatFixtureMismatchMessage(
  presetId: string,
  mismatches: ReturnType<typeof compareFixtureSamples>
): string {
  if (mismatches.length === 0) {
    return `${presetId}: no mismatches`;
  }

  const firstMismatch = mismatches[0];
  if (!firstMismatch) {
    return `${presetId}: mismatch list unexpectedly empty`;
  }

  return [
    `${presetId}: fixture mismatch detected`,
    `sampleIndex=${firstMismatch.sampleIndex}`,
    `tBeats=${firstMismatch.tBeats}`,
    `hand=${firstMismatch.handId}`,
    `axis=${firstMismatch.axis}`,
    `expected=${firstMismatch.expected}`,
    `actual=${firstMismatch.actual}`,
    `delta=${firstMismatch.delta}`
  ].join(", ");
}

describe("generated fixture files", () => {
  it("manifest matches known preset catalog", async () => {
    const manifest = await readJsonFile<FixtureManifestFile>(MANIFEST_PATH);

    expect(manifest.presets).toHaveLength(PRESET_CATALOG.length);
    expect(manifest.presetCount).toBe(PRESET_CATALOG.length);
    expect(manifest.presets.map((entry) => entry.id)).toEqual(PRESET_CATALOG.map((preset) => preset.id));
  });

  it("fixture files match recomputed samples within fixture tolerance", async () => {
    const manifest = await readJsonFile<FixtureManifestFile>(MANIFEST_PATH);
    const defaultState = createDefaultState();

    for (const manifestEntry of manifest.presets) {
      const preset = PRESET_LOOKUP.get(manifestEntry.id);
      expect(preset, `missing preset for id ${manifestEntry.id}`).toBeDefined();
      if (!preset) {
        continue;
      }

      const fixturePath = resolve(FIXTURES_DIRECTORY, manifestEntry.file);
      const fixture = await readJsonFile<PresetFixtureFile>(fixturePath);

      expect(fixture.presetId).toBe(manifestEntry.id);
      expect(fixture.sampleCount).toBe(fixture.samples.length);

      const recomputed = buildPresetFixture(preset, defaultState, fixture.sampleHz, fixture.startBeat);
      const mismatches = compareFixtureSamples(fixture.samples, recomputed.samples, FIXTURE_TOLERANCE);

      expect(mismatches, formatFixtureMismatchMessage(manifestEntry.id, mismatches)).toEqual([]);
    }
  });
});
