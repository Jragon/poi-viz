/**
 * Public engine surface for math + deterministic sampling.
 * Import from this barrel to avoid coupling to internal module paths.
 */
export { getAngles } from "@/engine/angles";
export { buildFixtureCaseSet, parseFixtureCasesFile, DEFAULT_FIXTURE_ID, FIXTURE_CASES_SCHEMA_VERSION } from "@/engine/fixtureCases";
export { buildAllStateFixtures, buildFixtureFromStateCase, buildFixtureManifest, getFixtureFilename } from "@/engine/fixtures";
export { getPositions } from "@/engine/positions";
export { sampleLoop } from "@/engine/sampling";
export { createTrailSampler, advanceTrailSampler, getTrailPoints } from "@/engine/trails";
export type {
  EngineParams,
  AnglesByHand,
  PositionsByHand,
  LoopSample,
  Vector2,
  TrailPoint,
  TrailSamplerConfig
} from "@/engine/types";
export type { FixtureCaseDefinition, FixtureCasesFile } from "@/engine/fixtureCases";
export type { FixtureManifestEntry, FixtureManifestFile, FixtureSample, StateFixtureFile } from "@/engine/fixtures";
