import { describe, expect, it } from "vitest";

import {
  DEFAULT_EXTENSION_COMFORT_RATIO,
  DEFAULT_MAX_TORSO_YAW_RAD,
  DEFAULT_MIN_PROJECTED_SHOULDER_SPAN_RATIO,
  buildBodyRigConfigFromArmReach,
  resolveBodyRigConfig
} from "@/body-rig/bodyRigConfig";

describe("resolveBodyRigConfig humanoid policies", () => {
  it("resolves pelvis, chest, and shoulder-girdle defaults from arm reach", () => {
    const config = buildBodyRigConfigFromArmReach(2);
    const resolved = resolveBodyRigConfig(config);

    expect(resolved.pelvisPolicy.yawFollowRatio).toBeCloseTo(0.35);
    expect(resolved.pelvisPolicy.maxLateralShift).toBeCloseTo(config.baseShoulderSpan * 0.12);
    expect(resolved.pelvisPolicy.maxForwardShift).toBeCloseTo(config.baseShoulderSpan * 0.08);
    expect(resolved.chestPolicy.yawFollowRatio).toBeCloseTo(0.82);
    expect(resolved.chestPolicy.centerLiftRatio).toBe(0);
    expect(resolved.shoulderPolicy.maxProtraction).toBeCloseTo(2 * 0.12);
    expect(resolved.shoulderPolicy.maxRetraction).toBeCloseTo(2 * 0.06);
    expect(resolved.shoulderPolicy.overheadAmbiguityRadius).toBeCloseTo(2 * 0.18);
    expect(resolved.shoulderPolicy.overheadLateralFadeRadius).toBeCloseTo(2 * 0.28);
  });

  it("preserves explicit humanoid policy overrides", () => {
    const resolved = resolveBodyRigConfig({
      upperArmLength: 1,
      forearmLength: 1,
      baseShoulderSpan: 1.2,
      maxYawRad: Math.PI / 3,
      pelvisPolicy: {
        yawFollowRatio: 0.25,
        maxLateralShift: 0.04,
        maxForwardShift: 0.03
      },
      chestPolicy: {
        yawFollowRatio: 0.7,
        centerLiftRatio: 0.05
      },
      shoulderPolicy: {
        maxProtraction: 0.2,
        maxRetraction: 0.1,
        overheadAmbiguityRadius: 0.25,
        overheadLateralFadeRadius: 0.35
      }
    });

    expect(resolved.pelvisPolicy).toEqual({
      yawFollowRatio: 0.25,
      maxLateralShift: 0.04,
      maxForwardShift: 0.03
    });
    expect(resolved.chestPolicy).toEqual({
      yawFollowRatio: 0.7,
      centerLiftRatio: 0.05
    });
    expect(resolved.shoulderPolicy.maxProtraction).toBe(0.2);
    expect(resolved.shoulderPolicy.maxRetraction).toBe(0.1);
    expect(resolved.shoulderPolicy.overheadAmbiguityRadius).toBe(0.25);
    expect(resolved.shoulderPolicy.overheadLateralFadeRadius).toBe(0.35);
  });
});

describe("buildBodyRigConfigFromArmReach", () => {
  it("builds the shared default rig proportions from arm reach", () => {
    const config = buildBodyRigConfigFromArmReach(160);

    expect(config.upperArmLength).toBeCloseTo(88);
    expect(config.forearmLength).toBeCloseTo(72);
    expect(config.baseShoulderSpan).toBeCloseTo(128);
    expect(config.maxYawRad).toBeCloseTo(DEFAULT_MAX_TORSO_YAW_RAD);
    expect(config.minProjectedSpanRatio).toBeCloseTo(DEFAULT_MIN_PROJECTED_SHOULDER_SPAN_RATIO);
    expect(config.elbowPolicy?.mode).toBe("outward");
    expect(config.limits?.extensionComfortRatio).toBeCloseTo(DEFAULT_EXTENSION_COMFORT_RATIO);
    expect(config.shoulderPolicy?.maxLift).toBeGreaterThan(0);
  });

  it("allows solver defaults to be overridden without changing the shared ratios", () => {
    const config = buildBodyRigConfigFromArmReach(120, {
      maxYawRad: Math.PI / 2,
      minProjectedSpanRatio: 0.4,
      neutralDeadzonePx: 12
    });

    expect(config.upperArmLength).toBeCloseTo(66);
    expect(config.forearmLength).toBeCloseTo(54);
    expect(config.baseShoulderSpan).toBeCloseTo(96);
    expect(config.maxYawRad).toBeCloseTo(Math.PI / 2);
    expect(config.minProjectedSpanRatio).toBeCloseTo(0.4);
    expect(config.neutralDeadzonePx).toBe(12);
  });

  it("resolves explicit engine policy defaults for partial configs", () => {
    const config = resolveBodyRigConfig({
      upperArmLength: 60,
      forearmLength: 60,
      baseShoulderSpan: 128,
      maxYawRad: Math.PI / 3
    });

    expect(config.elbowPolicy.mode).toBe("outward");
    expect(config.limits.allowStretch).toBe(false);
    expect(config.solverWeights.reachPenalty).toBeGreaterThan(0);
    expect(config.shoulderPolicy.maxLift).toBeGreaterThan(0);
    expect(config.shoulderPolicy.minEffectiveSpanRatio).toBeCloseTo(
      DEFAULT_MIN_PROJECTED_SHOULDER_SPAN_RATIO
    );
  });
});
