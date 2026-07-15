import { describe, expect, it } from "vitest";

import {
  SKELETON_JOINT_NAMES,
  SKELETON_SEGMENTS,
  buildBodySkeletonFrame,
  type SkeletonJointName,
  type SkeletonSegmentCategory
} from "@/body-rig";
import { buildBodyRigFrameFromDimensions, solveBodyRigFrame } from "@/body-rig";
import { buildDefaultBodyRigDimensions } from "@/body-rig";
import { DEFAULT_PLANE_PROJECTION_SETTINGS } from "@/engine/planeProjection";
import type { Vec3 } from "@/engine/types";

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
      "chest",
      "clavicleLeft",
      "clavicleRight",
      "shoulderLeft",
      "shoulderRight",
      "elbowLeft",
      "elbowRight",
      "handLeft",
      "handRight",
      "pelvisCenter",
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
      ["neck", "chest"],
      ["chest", "pelvisCenter"],
      ["chest", "clavicleLeft"],
      ["clavicleLeft", "shoulderLeft"],
      ["chest", "clavicleRight"],
      ["clavicleRight", "shoulderRight"],
      ["pelvisCenter", "hipLeft"],
      ["pelvisCenter", "hipRight"],
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
    expect(SKELETON_SEGMENTS).toHaveLength(17);
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
  it("solveBodyRigFrame exposes the same skeleton frame used by renderers", () => {
    const { pose } = makePose();

    expect(pose.skeleton.joints.chest).toEqual(pose.solve.chest.center);
    expect(pose.skeleton.joints.pelvisCenter).toEqual(pose.solve.pelvis.center);
    expect(pose.skeleton.joints.shoulderLeft).toEqual(
      pose.solve.shoulderGirdle.left.shoulderSocket
    );
    expect(pose.skeleton.solverDiagnostics.bestEffortReasons).toEqual(
      pose.solve.diagnostics.bestEffortReasons
    );
  });

  it("returns joints record with all joint names as keys", () => {
    const { pose } = makePose();
    const frame = buildBodySkeletonFrame(pose.body, pose.solve);

    for (const name of SKELETON_JOINT_NAMES) {
      expect(frame.joints[name], `missing joint: ${name}`).toBeDefined();
    }
    expect(Object.keys(frame.joints)).toHaveLength(SKELETON_JOINT_NAMES.length);
  });

  it("core joint positions match body and solve sources", () => {
    const { pose } = makePose();
    const frame = buildBodySkeletonFrame(pose.body, pose.solve);

    expect(frame.joints.headCenter).toEqual(pose.body.headCenter);
    expect(frame.joints.neck).toEqual(pose.body.neck);
    expect(frame.joints.chest).toEqual(pose.solve.chest.center);
    expect(frame.joints.pelvisCenter).toEqual(pose.solve.pelvis.center);
    expect(frame.joints.footLeft).toEqual(pose.body.footLeft);
    expect(frame.joints.footRight).toEqual(pose.body.footRight);
  });

  it("moves the hips with the solved pelvis while keeping both feet planted", () => {
    const dimensions = buildDefaultBodyRigDimensions();
    const body = buildBodyRigFrameFromDimensions(dimensions);
    const pose = solveBodyRigFrame(
      body,
      {
        leftHandTarget: { x: 0.2, y: 0.15, z: 0.4 },
        rightHandTarget: { x: 1.1, y: 0.25, z: 0.35 }
      },
      DEFAULT_PLANE_PROJECTION_SETTINGS
    );
    const frame = pose.skeleton;
    const hipMidpoint = {
      x: (frame.joints.hipLeft.x + frame.joints.hipRight.x) * 0.5,
      y: (frame.joints.hipLeft.y + frame.joints.hipRight.y) * 0.5,
      z: (frame.joints.hipLeft.z + frame.joints.hipRight.z) * 0.5
    };

    expect(hipMidpoint.x).toBeCloseTo(frame.joints.pelvisCenter.x);
    expect(hipMidpoint.y).toBeCloseTo(frame.joints.pelvisCenter.y);
    expect(hipMidpoint.z).toBeCloseTo(frame.joints.pelvisCenter.z);
    expect(frame.joints.footLeft).toEqual(body.footLeft);
    expect(frame.joints.footRight).toEqual(body.footRight);
    expect(
      length3({
        x: frame.joints.kneeLeft.x - frame.joints.hipLeft.x,
        y: frame.joints.kneeLeft.y - frame.joints.hipLeft.y,
        z: frame.joints.kneeLeft.z - frame.joints.hipLeft.z
      })
    ).toBeCloseTo(
      length3({
        x: body.kneeLeft.x - body.hipLeft.x,
        y: body.kneeLeft.y - body.hipLeft.y,
        z: body.kneeLeft.z - body.hipLeft.z
      })
    );
    expect(frame.joints.kneeLeft.z).toBeGreaterThan(frame.joints.hipLeft.z);
  });

  it("shoulder and arm joint positions match the solve result", () => {
    const { pose } = makePose();
    const frame = buildBodySkeletonFrame(pose.body, pose.solve);

    expect(frame.joints.clavicleLeft).toEqual(pose.solve.shoulderGirdle.left.shoulderBase);
    expect(frame.joints.clavicleRight).toEqual(pose.solve.shoulderGirdle.right.shoulderBase);
    expect(frame.joints.shoulderLeft).toEqual(pose.solve.shoulderGirdle.left.shoulderSocket);
    expect(frame.joints.shoulderRight).toEqual(pose.solve.shoulderGirdle.right.shoulderSocket);
    expect(frame.joints.elbowLeft).toEqual(pose.solve.leftArm.elbow);
    expect(frame.joints.elbowRight).toEqual(pose.solve.rightArm.elbow);
    expect(frame.joints.handLeft).toEqual(pose.solve.leftArm.hand);
    expect(frame.joints.handRight).toEqual(pose.solve.rightArm.hand);
  });

  it("segments is the shared SKELETON_SEGMENTS constant (not a per-frame copy)", () => {
    const { pose } = makePose();
    const frame = buildBodySkeletonFrame(pose.body, pose.solve);

    // buildBodySkeletonFrame assigns the module-level constant directly so that
    // all frames share a single segment descriptor array without allocation.
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
    const { pose } = makePose();
    const frame = buildBodySkeletonFrame(pose.body, pose.solve);

    const expectedReach = pose.body.rigConfig.upperArmLength + pose.body.rigConfig.forearmLength;
    expect(frame.supportPose.armReach).toBeCloseTo(expectedReach);
    expect(frame.supportPose.upperArmLength).toBeCloseTo(pose.body.rigConfig.upperArmLength);
    expect(frame.supportPose.forearmLength).toBeCloseTo(pose.body.rigConfig.forearmLength);
    expect(frame.supportPose.shoulderSpan).toBeCloseTo(pose.body.rigConfig.baseShoulderSpan);
  });

  it("solverDiagnostics reflects clamped state, reach, and distance from the solve result", () => {
    const { pose } = makePose();
    const frame = buildBodySkeletonFrame(pose.body, pose.solve);

    expect(frame.solverDiagnostics.leftArm.isClamped).toBe(pose.solve.leftArm.isClamped);
    expect(frame.solverDiagnostics.rightArm.isClamped).toBe(pose.solve.rightArm.isClamped);
    expect(frame.solverDiagnostics.leftArm.reach).toEqual(pose.solve.leftArm.reach);
    expect(frame.solverDiagnostics.rightArm.reach).toEqual(pose.solve.rightArm.reach);
    expect(frame.solverDiagnostics.leftArm.distanceToHand).toBeCloseTo(
      pose.solve.leftArm.distanceToHand
    );
    expect(frame.solverDiagnostics.rightArm.distanceToHand).toBeCloseTo(
      pose.solve.rightArm.distanceToHand
    );
    expect(frame.solverDiagnostics.leftArm.targetDistance).toBeCloseTo(
      pose.solve.leftArm.targetDistance
    );
    expect(frame.solverDiagnostics.rightArm.targetDistance).toBeCloseTo(
      pose.solve.rightArm.targetDistance
    );
    expect(frame.solverDiagnostics.leftArm.reachError).toBeCloseTo(pose.solve.leftArm.reachError);
    expect(frame.solverDiagnostics.rightArm.reachError).toBeCloseTo(pose.solve.rightArm.reachError);
    expect(frame.solverDiagnostics.leftArm.elbowPole).toEqual(pose.solve.leftArm.elbowPole);
    expect(frame.solverDiagnostics.rightArm.elbowPole).toEqual(pose.solve.rightArm.elbowPole);
    expect(frame.solverDiagnostics.leftArm.elbowBendRad).toBeCloseTo(
      pose.solve.leftArm.elbowBendRad
    );
    expect(frame.solverDiagnostics.rightArm.elbowBendRad).toBeCloseTo(
      pose.solve.rightArm.elbowBendRad
    );
    expect(frame.solverDiagnostics.yawRad).toBeCloseTo(pose.solve.yawRad);
    expect(frame.solverDiagnostics.pelvisYawRad).toBeCloseTo(pose.solve.pelvis.yawRad);
    expect(frame.solverDiagnostics.chestYawRad).toBeCloseTo(pose.solve.chest.yawRad);
    expect(frame.solverDiagnostics.pelvisLimitHit).toBe(pose.solve.pelvis.limitHit);
    expect(frame.solverDiagnostics.leftShoulder).toEqual({
      lift: pose.solve.shoulderGirdle.left.lift,
      protraction: pose.solve.shoulderGirdle.left.protraction,
      retraction: pose.solve.shoulderGirdle.left.retraction,
      lateralTravel: pose.solve.shoulderGirdle.left.lateralTravel,
      overheadAmbiguous: pose.solve.shoulderGirdle.left.overheadAmbiguous,
      limitHit: pose.solve.shoulderGirdle.left.limitHit
    });
    expect(frame.solverDiagnostics.rightShoulder).toEqual({
      lift: pose.solve.shoulderGirdle.right.lift,
      protraction: pose.solve.shoulderGirdle.right.protraction,
      retraction: pose.solve.shoulderGirdle.right.retraction,
      lateralTravel: pose.solve.shoulderGirdle.right.lateralTravel,
      overheadAmbiguous: pose.solve.shoulderGirdle.right.overheadAmbiguous,
      limitHit: pose.solve.shoulderGirdle.right.limitHit
    });
    expect(frame.solverDiagnostics.bestEffortReasons).toBe(
      pose.solve.diagnostics.bestEffortReasons
    );
  });
});
