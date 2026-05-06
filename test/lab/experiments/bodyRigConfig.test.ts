import { describe, expect, it } from "vitest";

import {
  DEFAULT_EXTENSION_COMFORT_RATIO,
  DEFAULT_MAX_TORSO_YAW_RAD,
  DEFAULT_MIN_PROJECTED_SHOULDER_SPAN_RATIO,
  buildBodyRigConfigFromArmReach,
  resolveBodyRigConfig
} from "@/body-rig/bodyRigConfig";

describe("buildBodyRigConfigFromArmReach", () => {
  it("builds the shared default rig proportions from arm reach", () => {
    const config = buildBodyRigConfigFromArmReach(160);

    expect(config.upperArmLength).toBeCloseTo(80);
    expect(config.forearmLength).toBeCloseTo(80);
    expect(config.baseShoulderSpan).toBeCloseTo(170);
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

    expect(config.upperArmLength).toBeCloseTo(60);
    expect(config.forearmLength).toBeCloseTo(60);
    expect(config.baseShoulderSpan).toBeCloseTo(127.5);
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
