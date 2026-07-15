import { describe, expect, it } from "vitest";

import type { BodySkeletonFrame } from "@/body-rig";
import { buildBodyHumanoidScene } from "@/lab/experiments/three-d-debug/bodyHumanoidScene";
import {
  buildVrmRigPoseCases,
  getVrmRigPoseCase,
  type VrmRigPoseCaseId
} from "@/lab/experiments/vrm-rig/rigPoseCases";

function distance3(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
) {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

function solveCase(id: VrmRigPoseCaseId): BodySkeletonFrame {
  const poseCase = getVrmRigPoseCase(id);
  const result = buildBodyHumanoidScene(poseCase.worldPoses);

  if (!result) {
    throw new Error(`Pose case ${id} did not produce a body frame.`);
  }

  return result;
}

describe("VRM rig canonical pose cases", () => {
  it("exposes the intended fixed inspection corpus", () => {
    expect(buildVrmRigPoseCases().map((entry) => entry.id)).toEqual([
      "arms-down",
      "t-pose",
      "forward-reach",
      "overhead",
      "cross-body",
      "behind",
      "both-right",
      "unreachable"
    ]);
  });

  it.each(buildVrmRigPoseCases().map((entry) => entry.id))(
    "%s preserves exact arm lengths and deterministic output",
    (id) => {
      const first = solveCase(id);
      const second = solveCase(id);

      expect(second).toEqual(first);
      expect(distance3(first.joints.shoulderLeft, first.joints.elbowLeft)).toBeCloseTo(
        first.supportPose.upperArmLength
      );
      expect(distance3(first.joints.elbowLeft, first.joints.handLeft)).toBeCloseTo(
        first.supportPose.forearmLength
      );
      expect(distance3(first.joints.shoulderRight, first.joints.elbowRight)).toBeCloseTo(
        first.supportPose.upperArmLength
      );
      expect(distance3(first.joints.elbowRight, first.joints.handRight)).toBeCloseTo(
        first.supportPose.forearmLength
      );
      expect(Number.isFinite(first.solverDiagnostics.leftArm.elbowBendRad)).toBe(true);
      expect(Number.isFinite(first.solverDiagnostics.rightArm.elbowBendRad)).toBe(true);
    }
  );

  it.each(
    buildVrmRigPoseCases()
      .filter((entry) => entry.expectReachable)
      .map((entry) => entry.id)
  )("%s reaches both requested hands exactly", (id) => {
    const frame = solveCase(id);

    expect(frame.solverDiagnostics.leftArm.reachError).toBeCloseTo(0, 8);
    expect(frame.solverDiagnostics.rightArm.reachError).toBeCloseTo(0, 8);
    expect(frame.solverDiagnostics.leftArm.isClamped).toBe(false);
    expect(frame.solverDiagnostics.rightArm.isClamped).toBe(false);
  });

  it("clamps the deliberately unreachable case explicitly and symmetrically", () => {
    const frame = solveCase("unreachable");

    expect(frame.solverDiagnostics.leftArm.isClamped).toBe(true);
    expect(frame.solverDiagnostics.rightArm.isClamped).toBe(true);
    expect(frame.solverDiagnostics.leftArm.reachError).toBeGreaterThan(0);
    expect(frame.solverDiagnostics.leftArm.reachError).toBeCloseTo(
      frame.solverDiagnostics.rightArm.reachError
    );
  });

  it.each<VrmRigPoseCaseId>([
    "arms-down",
    "t-pose",
    "forward-reach",
    "overhead",
    "cross-body",
    "behind",
    "unreachable"
  ])("%s remains mirror-symmetric", (id) => {
    const frame = solveCase(id);

    expect(frame.joints.shoulderLeft.x).toBeCloseTo(-frame.joints.shoulderRight.x);
    expect(frame.joints.shoulderLeft.y).toBeCloseTo(frame.joints.shoulderRight.y);
    expect(frame.joints.shoulderLeft.z).toBeCloseTo(frame.joints.shoulderRight.z);
    expect(frame.joints.elbowLeft.x).toBeCloseTo(-frame.joints.elbowRight.x);
    expect(frame.joints.elbowLeft.y).toBeCloseTo(frame.joints.elbowRight.y);
    expect(frame.joints.elbowLeft.z).toBeCloseTo(frame.joints.elbowRight.z);
    expect(frame.solverDiagnostics.chestYawRad).toBeCloseTo(0);
  });

  it("rejects an unknown pose identifier", () => {
    expect(() => getVrmRigPoseCase("missing" as VrmRigPoseCaseId)).toThrow(
      "Unknown VRM rig pose case"
    );
  });
});
