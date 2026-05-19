import type { PreparedMultiRigSequence } from "@/engine/multirig";

import {
  normalizeFirePoiSettings,
  type FirePoiSettings
} from "./firePoiSettings";

interface TrailSamplingState {
  readonly prepared: PreparedMultiRigSequence | null;
  readonly showHandTrails: boolean;
  readonly showHeadTrails: boolean;
  readonly firePoiEnabled: boolean;
}

const FIRE_POI_SETTINGS_KEYS = [
  "enabled",
  "coreIntensity",
  "coreRadius",
  "wakeLengthSteps",
  "emissionDensity",
  "turbulence",
  "spread",
  "fadeRate",
  "velocityStretch"
] as const satisfies readonly (keyof FirePoiSettings)[];

type FirePoiSettingsRecord = Record<string, unknown>;

function isNormalizedFirePoiSettingsRecord(
  value: unknown,
  normalized: FirePoiSettings
): value is FirePoiSettingsRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as FirePoiSettingsRecord;

  return (
    Object.keys(record).length === FIRE_POI_SETTINGS_KEYS.length
    && FIRE_POI_SETTINGS_KEYS.every((key) => Object.is(record[key], normalized[key]))
  );
}

export function mergeFirePoiSettingsPatch(
  settings: FirePoiSettings,
  patch: Partial<FirePoiSettings>
): FirePoiSettings {
  return normalizeFirePoiSettings({
    ...settings,
    ...patch
  });
}

export function reconcileStoredFirePoiSettings(value: unknown): {
  settings: FirePoiSettings;
  needsWrite: boolean;
} {
  const settings = normalizeFirePoiSettings(value as Partial<FirePoiSettings> | null | undefined);

  return {
    settings,
    needsWrite: !isNormalizedFirePoiSettingsRecord(value, settings)
  };
}

export function shouldSampleThreeDDebugWorldTrails(
  state: TrailSamplingState
): PreparedMultiRigSequence | null {
  const {
    prepared,
    showHandTrails,
    showHeadTrails,
    firePoiEnabled
  } = state;

  return prepared !== null && (showHandTrails || showHeadTrails || firePoiEnabled)
    ? prepared
    : null;
}