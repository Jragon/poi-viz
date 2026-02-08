import { sampleLoop } from "@/engine/sampling";
import type { FixtureCaseDefinition } from "@/engine/fixtureCases";
import { DEFAULT_PLAYHEAD_BEATS, DEFAULT_TRAIL_SAMPLE_HZ } from "@/state/constants";
import type { LoopSample } from "@/engine/types";
import type { AppState } from "@/types/state";

export const FIXTURE_SCHEMA_VERSION = 2;
export const FIXTURE_SAMPLE_HZ = DEFAULT_TRAIL_SAMPLE_HZ;
export const FIXTURE_START_BEAT = DEFAULT_PLAYHEAD_BEATS;

/**
 * Serializable XY point in fixture payloads.
 */
export interface FixturePoint {
  x: number;
  y: number;
}

/**
 * One sampled beat row in a fixture file.
 */
export interface FixtureSample {
  tBeats: number;
  L: FixturePoint;
  R: FixturePoint;
}

/**
 * Persisted fixture payload for one fixture state case.
 */
export interface StateFixtureFile {
  schemaVersion: number;
  fixtureId: string;
  bpm: number;
  loopBeats: number;
  sampleHz: number;
  startBeat: number;
  sampleCount: number;
  samples: FixtureSample[];
}

/**
 * Manifest entry pointing one fixture case id to its fixture filename.
 */
export interface FixtureManifestEntry {
  id: string;
  file: string;
}

/**
 * Fixture manifest for all generated state-case fixtures.
 */
export interface FixtureManifestFile {
  schemaVersion: number;
  sampleHz: number;
  startBeat: number;
  fixtureCount: number;
  fixtures: FixtureManifestEntry[];
}

function toFixtureSample(sample: LoopSample): FixtureSample {
  return {
    tBeats: sample.tBeats,
    L: {
      x: sample.positions.L.head.x,
      y: sample.positions.L.head.y
    },
    R: {
      x: sample.positions.R.head.x,
      y: sample.positions.R.head.y
    }
  };
}

function sampleFixtureFromState(state: AppState, sampleHz: number, startBeat: number): FixtureSample[] {
  const loopSamples = sampleLoop(
    {
      bpm: state.global.bpm,
      hands: state.hands
    },
    sampleHz,
    state.global.loopBeats,
    startBeat
  );

  return loopSamples.map(toFixtureSample);
}

/**
 * Returns the canonical fixture filename for a fixture id.
 *
 * @param fixtureId Fixture identifier.
 * @returns Fixture filename under `fixtures/`.
 */
export function getFixtureFilename(fixtureId: string): string {
  return `${fixtureId}.json`;
}

/**
 * Builds deterministic fixture samples for one fixture state case.
 *
 * @param fixtureCase Fixture state case to sample.
 * @param sampleHz Sample rate in samples per second.
 * @param startBeat Beat offset where sampling starts.
 * @returns Serializable fixture payload for the input state.
 */
export function buildFixtureFromStateCase(
  fixtureCase: FixtureCaseDefinition,
  sampleHz = FIXTURE_SAMPLE_HZ,
  startBeat = FIXTURE_START_BEAT
): StateFixtureFile {
  const samples = sampleFixtureFromState(fixtureCase.state, sampleHz, startBeat);

  return {
    schemaVersion: FIXTURE_SCHEMA_VERSION,
    fixtureId: fixtureCase.id,
    bpm: fixtureCase.state.global.bpm,
    loopBeats: fixtureCase.state.global.loopBeats,
    sampleHz,
    startBeat,
    sampleCount: samples.length,
    samples
  };
}

/**
 * Builds fixture files for a list of fixture state cases.
 *
 * @param fixtureCases Fixture state case list to sample in order.
 * @param sampleHz Sample rate in samples per second.
 * @param startBeat Beat offset where fixture sampling starts.
 * @returns Deterministic fixture payloads for all provided cases.
 */
export function buildAllStateFixtures(
  fixtureCases: FixtureCaseDefinition[],
  sampleHz = FIXTURE_SAMPLE_HZ,
  startBeat = FIXTURE_START_BEAT
): StateFixtureFile[] {
  return fixtureCases.map((fixtureCase) => buildFixtureFromStateCase(fixtureCase, sampleHz, startBeat));
}

function getUniformFixtureField(
  fixtures: StateFixtureFile[],
  key: "sampleHz" | "startBeat",
  fallback: number
): number {
  const firstValue = fixtures[0]?.[key] ?? fallback;
  const hasMismatch = fixtures.some((fixture) => fixture[key] !== firstValue);
  if (hasMismatch) {
    throw new Error(`fixture manifest requires uniform ${key} across fixtures`);
  }
  return firstValue;
}

/**
 * Builds a manifest describing generated fixture files.
 *
 * @param fixtures Fixture payloads generated from state-case inputs.
 * @returns Manifest with uniform sample settings and file map.
 */
export function buildFixtureManifest(fixtures: StateFixtureFile[]): FixtureManifestFile {
  const sampleHz = getUniformFixtureField(fixtures, "sampleHz", FIXTURE_SAMPLE_HZ);
  const startBeat = getUniformFixtureField(fixtures, "startBeat", FIXTURE_START_BEAT);

  return {
    schemaVersion: FIXTURE_SCHEMA_VERSION,
    sampleHz,
    startBeat,
    fixtureCount: fixtures.length,
    fixtures: fixtures.map((fixture) => ({
      id: fixture.fixtureId,
      file: getFixtureFilename(fixture.fixtureId)
    }))
  };
}
