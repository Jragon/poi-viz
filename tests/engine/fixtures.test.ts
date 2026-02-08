import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAllStateFixtures,
  type FixtureManifestFile,
  type StateFixtureFile
} from "@/engine/fixtures";
import { buildFixtureCaseSet, parseFixtureCasesFile } from "@/engine/fixtureCases";
import { createDefaultState } from "@/state/defaults";
import { compareFixtureSamples } from "./fixture-harness";
import { FIXTURE_TOLERANCE } from "./helpers";

const FIXTURES_DIRECTORY = resolve(process.cwd(), "fixtures");
const MANIFEST_PATH = resolve(FIXTURES_DIRECTORY, "manifest.json");
const CASES_PATH = resolve(FIXTURES_DIRECTORY, "state-cases.json");

async function readJsonFile<T>(path: string): Promise<T> {
  const content = await readFile(path, "utf8");
  return JSON.parse(content) as T;
}

async function readFixtureCases() {
  const defaultState = createDefaultState();
  const casesSerialized = await readFile(CASES_PATH, "utf8");
  const manualCases = parseFixtureCasesFile(casesSerialized);
  return buildFixtureCaseSet(defaultState, manualCases);
}

function formatFixtureMismatchMessage(
  fixtureId: string,
  mismatches: ReturnType<typeof compareFixtureSamples>
): string {
  if (mismatches.length === 0) {
    return `${fixtureId}: no mismatches`;
  }

  const firstMismatch = mismatches[0];
  if (!firstMismatch) {
    return `${presetId}: mismatch list unexpectedly empty`;
  }

  return [
    `${fixtureId}: fixture mismatch detected`,
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
  it("manifest matches known fixture case ids", async () => {
    const manifest = await readJsonFile<FixtureManifestFile>(MANIFEST_PATH);
    const fixtureCases = await readFixtureCases();

    expect(manifest.fixtures).toHaveLength(fixtureCases.length);
    expect(manifest.fixtureCount).toBe(fixtureCases.length);
    expect(manifest.fixtures.map((entry) => entry.id)).toEqual(fixtureCases.map((fixtureCase) => fixtureCase.id));
  });

  it("fixture files match recomputed samples within fixture tolerance", async () => {
    const manifest = await readJsonFile<FixtureManifestFile>(MANIFEST_PATH);
    const fixtureCases = await readFixtureCases();
    const recomputedFixtures = buildAllStateFixtures(fixtureCases, manifest.sampleHz, manifest.startBeat);
    const recomputedLookup = new Map(recomputedFixtures.map((fixture) => [fixture.fixtureId, fixture]));

    for (const manifestEntry of manifest.fixtures) {
      const recomputed = recomputedLookup.get(manifestEntry.id);
      expect(recomputed, `missing fixture definition for id ${manifestEntry.id}`).toBeDefined();
      if (!recomputed) {
        continue;
      }

      const fixturePath = resolve(FIXTURES_DIRECTORY, manifestEntry.file);
      const fixture = await readJsonFile<StateFixtureFile>(fixturePath);

      expect(fixture.fixtureId).toBe(manifestEntry.id);
      expect(fixture.sampleCount).toBe(fixture.samples.length);

      const mismatches = compareFixtureSamples(fixture.samples, recomputed.samples, FIXTURE_TOLERANCE);

      expect(mismatches, formatFixtureMismatchMessage(manifestEntry.id, mismatches)).toEqual([]);
    }
  });
});
