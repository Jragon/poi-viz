import { describe, expect, expectTypeOf, it } from "vitest";

import type { PreparedMultiRigSequence } from "@/engine/multirig";
import {
  DEFAULT_FIRE_POI_SETTINGS,
  normalizeFirePoiSettings
} from "@/lab/experiments/three-d-debug/firePoiSettings";
import {
  mergeFirePoiSettingsPatch,
  reconcileStoredFirePoiSettings,
  shouldSampleThreeDDebugWorldTrails
} from "@/lab/experiments/three-d-debug/firePoiSettingsState";

const PREPARED_PLAYBACK = {
  rigs: [],
  maxSequenceDuration: 1
} satisfies PreparedMultiRigSequence;

describe("firePoiSettingsState", () => {
  it("merges partial panel updates into a normalized full settings payload", () => {
    expect(
      mergeFirePoiSettingsPatch(
        {
          ...DEFAULT_FIRE_POI_SETTINGS,
          enabled: true,
          emissionDensity: 5
        },
        {
          coreIntensity: 99,
          wakeLengthSteps: 7.6
        }
      )
    ).toEqual({
      ...DEFAULT_FIRE_POI_SETTINGS,
      enabled: true,
      emissionDensity: 5,
      coreIntensity: 4,
      wakeLengthSteps: 8
    });
  });

  it("identifies legacy persisted settings that must be rewritten after normalization", () => {
    expect(
      reconcileStoredFirePoiSettings({
        enabled: "true" as unknown as boolean,
        coreRadius: 999,
        turbulence: Number.NaN
      })
    ).toEqual({
      settings: normalizeFirePoiSettings({
        enabled: "true" as unknown as boolean,
        coreRadius: 999,
        turbulence: Number.NaN
      }),
      needsWrite: true
    });

    expect(reconcileStoredFirePoiSettings(DEFAULT_FIRE_POI_SETTINGS)).toEqual({
      settings: DEFAULT_FIRE_POI_SETTINGS,
      needsWrite: false
    });
  });

  it("samples world trails only when playback is ready and either debug trails or fire poi need them", () => {
    expect(
      shouldSampleThreeDDebugWorldTrails({
        prepared: null,
        showHandTrails: true,
        showHeadTrails: true,
        firePoiEnabled: true
      })
    ).toBeNull();

    expect(
      shouldSampleThreeDDebugWorldTrails({
        prepared: PREPARED_PLAYBACK,
        showHandTrails: false,
        showHeadTrails: false,
        firePoiEnabled: false
      })
    ).toBeNull();

    expect(
      shouldSampleThreeDDebugWorldTrails({
        prepared: PREPARED_PLAYBACK,
        showHandTrails: true,
        showHeadTrails: false,
        firePoiEnabled: false
      })
    ).toBe(PREPARED_PLAYBACK);

    expect(
      shouldSampleThreeDDebugWorldTrails({
        prepared: PREPARED_PLAYBACK,
        showHandTrails: false,
        showHeadTrails: false,
        firePoiEnabled: true
      })
    ).toBe(PREPARED_PLAYBACK);
  });

  it("returns the prepared playback value type at the trail sampling gate", () => {
    type TrailSamplingPrepared = Parameters<
      typeof shouldSampleThreeDDebugWorldTrails
    >[0]["prepared"];
    type TrailSamplingResult = ReturnType<typeof shouldSampleThreeDDebugWorldTrails>;

    expectTypeOf<TrailSamplingPrepared>().toEqualTypeOf<PreparedMultiRigSequence | null>();
    expectTypeOf<TrailSamplingResult>().toEqualTypeOf<PreparedMultiRigSequence | null>();
  });
});