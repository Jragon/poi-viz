import { describe, expect, it } from "vitest";

import {
  SKELETON_JOINT_NAMES,
  SKELETON_SEGMENTS,
  buildBodySkeletonFrame,
  type SkeletonJointName,
  type SkeletonSegmentCategory
} from "@/body-rig";
import {
  buildBodyRigFrameFromDimensions,
  solveBodyRigFrame
} from "@/body-rig";
import { buildDefaultBodyRigDimensions } from "@/body-rig";
import { DEFAULT_PLANE_PROJECTION_SETTINGS } from "@/engine/planeProjection";
import type { Vec3 } from "@/engine/types";

function distance3(a: Vec3, b: Vec3): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

function dot3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function length3(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

function makePose() {
  const dimensions = buildDefaultBodyRigDimensions();
  const body = buildBodyRigFrameFromDimensions(dimensions);
  const pose = solveBodyRigFrame(
    body,
    { leftHandTarget: { x: -0.3, y: 0.6, z: 0 }, rightHandTarget: { x: 0.3, y: 0.6, z: 0 } },
    DEFAULT_PLANE_PROJECTION_SETTINGS
  );
  return { dimensions, body, pose };
}

describe("SKELETON_JOINT_NAMES", () => {
  it("contains the full set of expected joint names", () => {
    const expected: readonly SkeletonJointName[] = [
      "headCenter",
      "neck",
      "shoulderCenter",
      "shoulderLeft",
      "shoulderRight",
      "elbowLeft",
      "elbowRight",
      "handLeft",
      "handRight",
      "pelvis",
      "hipLeft",
      "hipRight",
      "kneeLeft",
      "kneeRight",
      "footLeft",
      "footRight"
    ];
    for (const name of expected) {
      expect(SKELETON_JOINT_NAMES).toContain(name);
    }
    expect(SKELETON_JOINT_NAMES).toHaveLength(expected.length);
  });
});

describe("SKELETON_SEGMENTS", () => {
  it("has entries for every expected bone pair", () => {
    const pairs: Array<[SkeletonJointName, SkeletonJointName]> = [
      ["headCenter", "neck"],
      ["neck", "shoulderCenter"],
      ["shoulderCenter", "pelvis"],
      ["shoulderLeft", "elbowLeft"],
      ["elbowLeft", "handLeft"],
      ["shoulderRight", "elbowRight"],
      ["elbowRight", "handRight"],
      ["hipLeft", "kneeLeft"],
      ["kneeLeft", "footLeft"],
      ["hipRight", "kneeRight"],
      ["kneeRight", "footRight"]
    ];

    for (const [from, to] of pairs) {
      const found = SKELETON_SEGMENTS.some((s) => s.from === from && s.to === to);
      expect(found, `expected segment ${from} -> ${to}`).toBe(true);
    }
  });

  it("uses only valid segment categories", () => {
    const validCategories: readonly SkeletonSegmentCategory[] = ["spine", "head", "arm", "leg"];
    for (const seg of SKELETON_SEGMENTS) {
      expect(validCategories).toContain(seg.category);
    }
  });

  it("side annotations are present for all arm and leg segments", () => {
    for (const seg of SKELETON_SEGMENTS) {
      if (seg.category === "arm" || seg.category === "leg") {
        expect(seg.side, `segment ${seg.from}->${seg.to} missing side`).toBeDefined();
      }
    }
  });

  it("from and to are valid joint names", () => {
    for (const seg of SKELETON_SEGMENTS) {
      expect(SKELETON_JOINT_NAMES).toContain(seg.from);
      expect(SKELETON_JOINT_NAMES).toContain(seg.to);
    }
  });
});

describe("buildBodySkeletonFrame", () => {
  it("returns joints record with all joint names as keys", () => {
    const { pose } = makePose();
    const frame = buildBodySkeletonFrame(pose.body, pose.solve);

    for (const name of SKELETON_JOINT_NAMES) {
      expect(frame.joints[name], `missing joint: ${name}`).toBeDefined();
    }
    expect(Object.keys(frame.joints)).toHaveLength(SKELETON_JOINT_NAMES.length);
  });

  it("static joint positions match the source BodyRigFrame", () => {
    const { pose } = makePose();
    const frame = buildBodySkeletonFrame(pose.body, pose.solve);

    expect(frame.joints.headCenter).toEqual(pose.body.headCenter);
    expect(frame.joints.neck).toEqual(pose.body.neck);
    expect(frame.joints.shoulderCenter).toEqual(pose.body.shoulderCenter);
    expect(frame.joints.pelvis).toEqual(pose.body.pelvis);
    expect(frame.joints.hipLeft).toEqual(pose.body.hipLeft);
    expect(frame.joints.hipRight).toEqual(pose.body.hipRight);
    expect(frame.joints.kneeLeft).toEqual(pose.body.kneeLeft);
    expect(frame.joints.kneeRight).toEqual(pose.body.kneeRight);
    expect(frame.joints.footLeft).toEqual(pose.body.footLeft);
    expect(frame.joints.footRight).toEqual(pose.body.footRight);
  });

  it("arm joint positions match the solve result", () => {
    const { pose } = makePose();
    const frame = buildBodySkeletonFrame(pose.body, pose.solve);

    expect(frame.joints.shoulderLeft).toEqual(pose.solve.shoulders.leftShoulder);
    expect(frame.joints.shoulderRight).toEqual(pose.solve.shoulders.rightShoulder);
    expect(frame.joints.elbowLeft).toEqual(pose.solve.leftArm.elbow);
    expect(frame.joints.elbowRight).toEqual(pose.solve.rightArm.elbow);
    expect(frame.joints.handLeft).toEqual(pose.solve.leftArm.hand);
    expect(frame.joints.handRight).toEqual(pose.solve.rightArm.hand);
  });

  it("segments reference is the shared SKELETON_SEGMENTS constant", () => {
    const { pose } = makePose();
    const frame = buildBodySkeletonFrame(pose.body, pose.solve);

    expect(frame.segments).toBe(SKELETON_SEGMENTS);
  });

  it("orientation up vector is close to world up (0,1,0) at zero yaw", () => {
    const { pose } = makePose();
    const frame = buildBodySkeletonFrame(pose.body, pose.solve);

    expect(length3(frame.orientation.up)).toBeCloseTo(1);
    expect(length3(frame.orientation.forward)).toBeCloseTo(1);
    expect(length3(frame.orientation.right)).toBeCloseTo(1);
  });

  it("orientation axes are mutually orthogonal", () => {
    const { pose } = makePose();
    const frame = buildBodySkeletonFrame(pose.body, pose.solve);

    expect(dot3(frame.orientation.up, frame.orientation.forward)).toBeCloseTo(0, 6);
    expect(dot3(frame.orientation.up, frame.orientation.right)).toBeCloseTo(0, 6);
    expect(dot3(frame.orientation.forward, frame.orientation.right)).toBeCloseTo(0, 6);
  });

  it("support pose reflects the rig config arm reach and shoulder span", () => {
    const { pose, dimensions } = makePose();
    const frame = buildBodySkeletonFrame(pose.body, pose.solve);

    const expectedReach =
      pose.body.rigConfig.upperArmLength + pose.body.rigConfig.forearmLength;
    expect(frame.supportPose.armReach).toBeCloseTo(expectedReach);
    expect(frame.supportPose.upperArmLength).toBeCloseTo(pose.body.rigConfig.upperArmLength);
    expect(frame.supportPose.forearmLength).toBeCloseTo(pose.body.rigConfig.forearmLength);
    expect(frame.supportPose.shoulderSpan).toBeCloseTo(pose.body.rigConfig.baseShoulderSpan);
  });

  it("solver flags reflect clamped state and reach from the solve result", () => {
    const { pose } = makePose();
    const frame = buildBodySkeletonFrame(pose.body, pose.solve);

    expect(frame.solverFlags.leftArm.isClamped).toBe(pose.solve.leftArm.isClamped);
    expect(frame.solverFlags.rightArm.isClamped).toBe(pose.solve.rightArm.isClamped);
    expect(frame.solverFlags.leftArm.reach).toEqual(pose.solve.leftArm.reach);
    expect(frame.solverFlags.rightArm.reach).toEqual(pose.solve.rightArm.reach);
    expect(frame.solverFlags.leftArm.distanceToHand).toBeCloseTo(
      pose.solve.leftArm.distanceToHand
    );
    expect(frame.solverFlags.rightArm.distanceToHand).toBeCloseTo(
      pose.solve.rightArm.distanceToHand
    );
    expect(frame.solverFlags.yawRad).toBeCloseTo(pose.solve.yawRad);
  });

  it("arm segment lengths match rig config dimensions", () => {
    const { pose } = makePose();
    const frame = buildBodySkeletonFrame(pose.body, pose.solve);

    expect(
      distance3(frame.joints.shoulderLeft, frame.joints.elbowLeft)
    ).toBeCloseTo(pose.body.rigConfig.upperArmLength);
    expect(
      distance3(frame.joints.elbowLeft, frame.joints.handLeft)
    ).toBeCloseTo(pose.body.rigConfig.forearmLength);
    expect(
      distance3(frame.joints.shoulderRight, frame.joints.elbowRight)
    ).toBeCloseTo(pose.body.rigConfig.upperArmLength);
    expect(
      distance3(frame.joints.elbowRight, frame.joints.handRight)
    ).toBeCloseTo(pose.body.rigConfig.forearmLength);
  });
});
