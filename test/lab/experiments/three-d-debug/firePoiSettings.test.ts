import { describe, expect, it } from "vitest";

import {
  DEFAULT_FIRE_POI_SETTINGS,
  normalizeFirePoiSettings
} from "@/lab/experiments/three-d-debug/firePoiSettings";

describe("firePoiSettings", () => {
  it("returns the default settings when given nothing", () => {
    expect(normalizeFirePoiSettings()).toEqual(DEFAULT_FIRE_POI_SETTINGS);
  });

  it("clamps persisted values into safe ranges", () => {
    expect(
      normalizeFirePoiSettings({
        enabled: true,
        coreIntensity: 99,
        coreRadius: -5,
        wakeLengthSteps: 999,
        emissionDensity: 0,
        turbulence: -1,
        spread: 2,
        fadeRate: 99,
        velocityStretch: 0
      })
    ).toEqual({
      enabled: true,
      coreIntensity: 4,
      coreRadius: 0.04,
      wakeLengthSteps: 48,
      emissionDensity: 1,
      turbulence: 0,
      spread: 0.4,
      fadeRate: 3,
      velocityStretch: 0.5
    });
  });

  it("falls back to defaults for invalid persisted numeric values", () => {
    expect(
      normalizeFirePoiSettings({
        enabled: true,
        coreIntensity: Number.NaN,
        coreRadius: Number.POSITIVE_INFINITY,
        emissionDensity: Number.NEGATIVE_INFINITY,
        turbulence: Number.NaN,
        fadeRate: Number.NaN,
        velocityStretch: Number.POSITIVE_INFINITY
      })
    ).toEqual({
      ...DEFAULT_FIRE_POI_SETTINGS,
      enabled: true
    });
  });

  it("sanitizes invalid persisted enabled-like values to a real boolean", () => {
    expect(
      normalizeFirePoiSettings({
        enabled: "true" as unknown as boolean
      })
    ).toEqual(DEFAULT_FIRE_POI_SETTINGS);

    expect(
      normalizeFirePoiSettings({
        enabled: 1 as unknown as boolean
      })
    ).toEqual(DEFAULT_FIRE_POI_SETTINGS);
  });

  it("default settings favor a larger hot source with dense wake", () => {
    expect(DEFAULT_FIRE_POI_SETTINGS.emissionDensity).toBeGreaterThanOrEqual(8);
    expect(DEFAULT_FIRE_POI_SETTINGS.wakeLengthSteps).toBeGreaterThanOrEqual(24);
    expect(DEFAULT_FIRE_POI_SETTINGS.coreRadius).toBeGreaterThanOrEqual(0.09);
  });

  it("extended clamp ranges allow high emission density and large core radius", () => {
    const result = normalizeFirePoiSettings({
      emissionDensity: 20,
      coreRadius: 0.4
    });

    expect(result.emissionDensity).toBe(20);
    expect(result.coreRadius).toBeCloseTo(0.4);
  });
});
