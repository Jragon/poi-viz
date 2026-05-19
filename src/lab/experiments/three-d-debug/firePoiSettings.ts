export interface FirePoiSettings {
  readonly enabled: boolean;
  readonly coreIntensity: number;
  readonly coreRadius: number;
  readonly wakeLengthSteps: number;
  readonly emissionDensity: number;
  readonly turbulence: number;
  readonly spread: number;
  readonly fadeRate: number;
  readonly velocityStretch: number;
}

export const DEFAULT_FIRE_POI_SETTINGS: FirePoiSettings = {
  enabled: false,
  coreIntensity: 1.8,
  coreRadius: 0.06,
  wakeLengthSteps: 24,
  emissionDensity: 5,
  turbulence: 0.10,
  spread: 0.08,
  fadeRate: 1.35,
  velocityStretch: 1.4
};

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : fallback;

  return Math.min(Math.max(numeric, min), max);
}

export function normalizeFirePoiSettings(
  value?: Partial<FirePoiSettings> | null
): FirePoiSettings {
  return {
    enabled:
      typeof value?.enabled === "boolean"
        ? value.enabled
        : DEFAULT_FIRE_POI_SETTINGS.enabled,
    coreIntensity: clamp(value?.coreIntensity, 0.5, 4, DEFAULT_FIRE_POI_SETTINGS.coreIntensity),
    coreRadius: clamp(value?.coreRadius, 0.04, 0.24, DEFAULT_FIRE_POI_SETTINGS.coreRadius),
    wakeLengthSteps: Math.round(
      clamp(value?.wakeLengthSteps, 4, 48, DEFAULT_FIRE_POI_SETTINGS.wakeLengthSteps)
    ),
    emissionDensity: Math.round(
      clamp(value?.emissionDensity, 1, 6, DEFAULT_FIRE_POI_SETTINGS.emissionDensity)
    ),
    turbulence: clamp(value?.turbulence, 0, 0.6, DEFAULT_FIRE_POI_SETTINGS.turbulence),
    spread: clamp(value?.spread, 0.02, 0.4, DEFAULT_FIRE_POI_SETTINGS.spread),
    fadeRate: clamp(value?.fadeRate, 0.4, 3, DEFAULT_FIRE_POI_SETTINGS.fadeRate),
    velocityStretch: clamp(
      value?.velocityStretch,
      0.5,
      3,
      DEFAULT_FIRE_POI_SETTINGS.velocityStretch
    )
  };
}