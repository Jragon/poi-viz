import { describe, expect, it } from "vitest";

import {
  DEFAULT_BODY_ARM_REACH,
  buildBodyRigFrame,
  buildDefaultBodyRigDimensions,
  getBodyRigArmPoints,
  solveBodyRigFrame
} from "@/body-rig";
import { DEFAULT_PLANE_PROJECTION_SETTINGS } from "@/engine/planeProjection";
import type { Vec3 } from "@/engine/types";

function distance3(a: Vec3, b: Vec3): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

describe("bodyRigFrame", () => {
  it("builds the sequence overlay default body dimensions as one preset", () => {
    const dimensions = buildDefaultBodyRigDimensions();

    expect(dimensions.armReach).toBe(DEFAULT_BODY_ARM_REACH);
    expect(dimensions.config.upperArmLength + dimensions.config.forearmLength).toBeCloseTo(
      DEFAULT_BODY_ARM_REACH
    );
    expect(dimensions.torsoHeight).toBeCloseTo(DEFAULT_BODY_ARM_REACH * 0.90625);
    expect(dimensions.hipSpan).toBeCloseTo(dimensions.shoulderSpan * 0.6);
    expect(dimensions.headRadius).toBeCloseTo(DEFAULT_BODY_ARM_REACH * 0.28125);
    expect(dimensions.sharedHandOverlapCircle.radius).toBeGreaterThan(0);
  });

  it("solves a y-up world-space body frame before projection", () => {
    const dimensions = buildDefaultBodyRigDimensions();
    const body = buildBodyRigFrame({
      shoulderCenter: dimensions.rootShoulderCenter,
      rigConfig: dimensions.config,
      torsoHeight: dimensions.torsoHeight,
      hipSpan: dimensions.hipSpan,
      headRadius: dimensions.headRadius,
      headGap: dimensions.headGap,
      neckOffset: dimensions.neckOffset,
      thighLength: dimensions.thighLength,
      shinLength: dimensions.shinLength,
      footOffset: dimensions.footOffset,
      stanceWidth: dimensions.stanceWidth
    });
    const pose = solveBodyRigFrame(
      body,
      {
        leftHandTarget: { x: -0.25, y: 0.75, z: 0 },
        rightHandTarget: { x: 0.25, y: 0.75, z: 0 }
      },
      DEFAULT_PLANE_PROJECTION_SETTINGS
    );

    expect(body.headCenter.y).toBeGreaterThan(body.shoulderCenter.y);
    expect(body.pelvis.y).toBeLessThan(body.shoulderCenter.y);
    expect(pose.projectedBody.headCenter.y).toBeGreaterThan(pose.projectedBody.pelvis.y);
    expect(pose.solve.shoulders.leftShoulder.x).toBeLessThan(body.shoulderCenter.x);
    expect(pose.solve.shoulders.rightShoulder.x).toBeGreaterThan(body.shoulderCenter.x);
    expect(getBodyRigArmPoints(pose, "left")).toHaveLength(3);
    expect(pose.solve.leftArm.elbowPole.x).toBeLessThanOrEqual(0);
    expect(pose.solve.rightArm.elbowPole.x).toBeGreaterThanOrEqual(0);
    expect(pose.solve.leftArm.elbowPole.z).toBeGreaterThan(0);
    expect(pose.solve.rightArm.elbowPole.z).toBeGreaterThan(0);
    expect(distance3(pose.solve.leftArm.shoulder, pose.solve.leftArm.elbow)).toBeCloseTo(
      dimensions.config.upperArmLength
    );
    expect(distance3(pose.solve.leftArm.elbow, pose.solve.leftArm.hand)).toBeCloseTo(
      dimensions.config.forearmLength
    );
    expect(pose.solve.leftArm.elbow.z).toBeGreaterThan(0);
    expect(pose.solve.rightArm.elbow.z).toBeGreaterThan(0);
  });
});
