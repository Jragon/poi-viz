import { sampleLoop } from "@/engine/sampling";
import { createDefaultState } from "@/state/defaults";
import { DEFAULT_PLAYHEAD_BEATS, DEFAULT_TRAIL_SAMPLE_HZ } from "@/state/constants";
import { PRESET_CATALOG } from "@/state/presets";
import type { LoopSample } from "@/engine/types";
import type { AppState, PresetDefinition, PresetId } from "@/types/state";

export const FIXTURE_SCHEMA_VERSION = 1;
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
 * Persisted fixture payload for one preset.
 */
export interface PresetFixtureFile {
  schemaVersion: number;
  presetId: PresetId;
  bpm: number;
  loopBeats: number;
  sampleHz: number;
  startBeat: number;
  sampleCount: number;
  samples: FixtureSample[];
}

/**
 * Manifest entry pointing a preset id to its fixture filename.
 */
export interface FixtureManifestPresetEntry {
  id: PresetId;
  file: string;
}

/**
 * Fixture manifest for all generated preset fixtures.
 */
export interface FixtureManifestFile {
  schemaVersion: number;
  sampleHz: number;
  startBeat: number;
  presetCount: number;
  presets: FixtureManifestPresetEntry[];
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
 * Returns the canonical fixture filename for a preset id.
 *
 * @param presetId Preset identifier.
 * @returns Fixture filename under `fixtures/`.
 */
export function getPresetFixtureFilename(presetId: PresetId): string {
  return `${presetId}.json`;
}

/**
 * Builds deterministic fixture samples for one preset.
 *
 * @param preset Preset definition to apply before sampling.
 * @param baseState Baseline state used as the preset input.
 * @param sampleHz Sample rate in samples per second.
 * @param startBeat Beat offset where sampling starts.
 * @returns Serializable fixture payload for the preset.
 */
export function buildPresetFixture(
  preset: PresetDefinition,
  baseState: AppState,
  sampleHz = FIXTURE_SAMPLE_HZ,
  startBeat = FIXTURE_START_BEAT
): PresetFixtureFile {
  const presetState = preset.apply(baseState);
  const samples = sampleFixtureFromState(presetState, sampleHz, startBeat);

  return {
    schemaVersion: FIXTURE_SCHEMA_VERSION,
    presetId: preset.id,
    bpm: presetState.global.bpm,
    loopBeats: presetState.global.loopBeats,
    sampleHz,
    startBeat,
    sampleCount: samples.length,
    samples
  };
}

/**
 * Builds fixture files for the full preset catalog.
 *
 * @param sampleHz Sample rate in samples per second.
 * @param startBeat Beat offset where fixture sampling starts.
 * @returns Deterministic fixture payloads for all presets.
 */
export function buildAllPresetFixtures(sampleHz = FIXTURE_SAMPLE_HZ, startBeat = FIXTURE_START_BEAT): PresetFixtureFile[] {
  const baseState = createDefaultState();
  return PRESET_CATALOG.map((preset) => buildPresetFixture(preset, baseState, sampleHz, startBeat));
}

function getUniformFixtureField(
  fixtures: PresetFixtureFile[],
  key: "sampleHz" | "startBeat",
  fallback: number
): number {
  const firstValue = fixtures[0]?.[key] ?? fallback;
  const hasMismatch = fixtures.some((fixture) => fixture[key] !== firstValue);
  if (hasMismatch) {
    throw new Error(`fixture manifest requires uniform ${key} across presets`);
  }
  return firstValue;
}

/**
 * Builds a manifest describing generated fixture files.
 *
 * @param fixtures Fixture payloads generated from presets.
 * @returns Manifest with uniform sample settings and file map.
 */
export function buildFixtureManifest(fixtures: PresetFixtureFile[]): FixtureManifestFile {
  const sampleHz = getUniformFixtureField(fixtures, "sampleHz", FIXTURE_SAMPLE_HZ);
  const startBeat = getUniformFixtureField(fixtures, "startBeat", FIXTURE_START_BEAT);

  return {
    schemaVersion: FIXTURE_SCHEMA_VERSION,
    sampleHz,
    startBeat,
    presetCount: fixtures.length,
    presets: fixtures.map((fixture) => ({
      id: fixture.presetId,
      file: getPresetFixtureFilename(fixture.presetId)
    }))
  };
}
