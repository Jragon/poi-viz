/**
 * Public engine surface for math + deterministic sampling.
 * Import from this barrel to avoid coupling to internal module paths.
 */
export { getAngles } from "@/engine/angles";
export { buildAllPresetFixtures, buildFixtureManifest, buildPresetFixture, getPresetFixtureFilename } from "@/engine/fixtures";
export { getPositions } from "@/engine/positions";
export { sampleLoop } from "@/engine/sampling";
export { createTrailSampler, advanceTrailSampler, getTrailPoints } from "@/engine/trails";
export type {
  FixtureManifestFile,
  FixtureSample,
  PresetFixtureFile,
  EngineParams,
  AnglesByHand,
  PositionsByHand,
  LoopSample,
  Vector2,
  TrailPoint,
  TrailSamplerConfig
} from "@/engine/types";
