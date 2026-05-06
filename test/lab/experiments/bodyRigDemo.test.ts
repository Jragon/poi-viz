import { describe, expect, it } from "vitest";

import type { Vec2, Vec3 } from "@/engine/types";
import { buildBodyRigConfigFromArmReach } from "@/lab/experiments/body-tracing/bodyRigConfig";
import {
  buildBodyRigFrame,
  getBodyRigArmDrawOrder,
  getBodyRigArmPoints,
  solveBodyRigFrame
} from "@/lab/experiments/body-tracing/bodyRigDemo";

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function distance3(a: Vec3, b: Vec3): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

describe("bodyRigDemo", () => {
  it("builds a reusable body frame with default hand targets", () => {
    const rigConfig = buildBodyRigConfigFromArmReach(160);
    const body = buildBodyRigFrame({
      shoulderCenter: { x: 200, y: 120 },
      rigConfig,
      torsoHeight: 120,
      hipSpan: rigConfig.baseShoulderSpan * 0.6,
      headRadius: 32,
      headGap: 24,
      neckOffset: 16,
      thighLength: 90,
      shinLength: 84,
      footOffset: 10,
      stanceWidth: rigConfig.baseShoulderSpan * 0.2,
      defaultHandTargetXRatio: 0.78,
      defaultHandTargetYRatio: 1.05
    });

    expect(body.shoulderCenter).toEqual({ x: 200, y: 120 });
    expect(body.headCenter).toEqual({ x: 200, y: 64 });
    expect(body.defaultLeftHandTarget.x).toBeLessThan(body.shoulderCenter.x);
    expect(body.defaultRightHandTarget.x).toBeGreaterThan(body.shoulderCenter.x);
    expect(body.defaultLeftHandTarget.y).toBeGreaterThan(body.shoulderY);
  });

  it("solves a body pose from a reusable frame and exposes shared arm helpers", () => {
    const rigConfig = buildBodyRigConfigFromArmReach(150);
    const body = buildBodyRigFrame({
      shoulderCenter: { x: 180, y: 110 },
      rigConfig,
      torsoHeight: 118,
      hipSpan: rigConfig.baseShoulderSpan * 0.6,
      headRadius: 30,
      headGap: 22,
      neckOffset: 14,
      thighLength: 88,
      shinLength: 82,
      footOffset: 8,
      stanceWidth: rigConfig.baseShoulderSpan * 0.2,
      defaultHandTargetXRatio: 0.78,
      defaultHandTargetYRatio: 1.05
    });
    const pose = solveBodyRigFrame(body, {
      leftHandTarget: body.defaultLeftHandTarget,
      rightHandTarget: body.defaultRightHandTarget
    });
    const leftArmPoints = getBodyRigArmPoints(pose, "left");
    const rightArmPoints = getBodyRigArmPoints(pose, "right");

    expect(pose.yawDeg).toBeCloseTo(0, 1);
    expect(getBodyRigArmDrawOrder(pose)).toEqual(["left", "right"]);
    expect(leftArmPoints).toHaveLength(3);
    expect(rightArmPoints).toHaveLength(3);
    expect(distance(leftArmPoints[0], leftArmPoints[1])).toBeLessThanOrEqual(
      rigConfig.upperArmLength
    );
    expect(distance3(pose.solve.leftArm.shoulder, pose.solve.leftArm.elbow)).toBeCloseTo(
      rigConfig.upperArmLength
    );
    expect(distance3(pose.solve.leftArm.elbow, pose.solve.leftArm.hand)).toBeCloseTo(
      rigConfig.forearmLength
    );
    expect(pose.projected.leftArm.depth).toBeGreaterThan(0);
  });
});
