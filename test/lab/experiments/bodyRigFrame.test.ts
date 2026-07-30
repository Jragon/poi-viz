import { describe, expect, it } from "vitest";

import {
  DEFAULT_BODY_ARM_REACH,
  buildBodyRigDimensionsForCanonicalUnitRadius,
  buildBodyRigFrame,
  buildBodyRigFrameFromDimensions,
  buildDefaultBodyRigDimensions,
  getBodyRigArmPoints,
  solveBodyRigFrame
} from "@/body-rig";
import { DEFAULT_PLANE_PROJECTION_SETTINGS } from "@/engine/planeProjection";
import type { Vec3 } from "@/engine/types";

function distance3(a: Vec3, b: Vec3): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

function dot3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

describe("bodyRigFrame", () => {
  it("builds the sequence overlay default body dimensions as one preset", () => {
    const dimensions = buildDefaultBodyRigDimensions();

    expect(dimensions.armReach).toBe(DEFAULT_BODY_ARM_REACH);
    expect(dimensions.config.upperArmLength + dimensions.config.forearmLength).toBeCloseTo(
      DEFAULT_BODY_ARM_REACH
    );
    expect(dimensions.torsoHeight).toBeCloseTo(DEFAULT_BODY_ARM_REACH * 0.86);
    expect(dimensions.thighLength).toBeCloseTo(DEFAULT_BODY_ARM_REACH * 0.82);
    expect(dimensions.shinLength).toBeCloseTo(DEFAULT_BODY_ARM_REACH * 0.765);
    expect((dimensions.thighLength + dimensions.shinLength) / dimensions.armReach).toBeCloseTo(
      1.585
    );
    expect(dimensions.hipSpan).toBeCloseTo(dimensions.shoulderSpan * 0.72);
    expect(dimensions.headRadius).toBeCloseTo(DEFAULT_BODY_ARM_REACH * 0.21);
    expect(dimensions.canonicalPatternSpace.unitRadius).toBeGreaterThan(0);
  });

  it("scales default body dimensions to a target canonical wall unit radius", () => {
    const dimensions = buildBodyRigDimensionsForCanonicalUnitRadius(1);

    expect(dimensions.canonicalPatternSpace.unitRadius).toBeCloseTo(1);
    expect(dimensions.config.upperArmLength + dimensions.config.forearmLength).toBeCloseTo(
      dimensions.armReach
    );
    expect(dimensions.torsoHeight / dimensions.armReach).toBeCloseTo(0.86);
  });

  it("solves a y-up world-space body frame before projection", () => {
    const dimensions = buildDefaultBodyRigDimensions();
    const body = buildBodyRigFrame({
      shoulderGirdleCenter: dimensions.rootShoulderGirdleCenter,
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

    expect(body.headCenter.y).toBeGreaterThan(body.shoulderGirdleCenter.y);
    expect(body.pelvisCenter.y).toBeLessThan(body.shoulderGirdleCenter.y);
    expect(pose.projectedBody.headCenter.y).toBeGreaterThan(pose.projectedBody.pelvisCenter.y);
    expect(pose.solve.shoulders.leftShoulder.x).toBeLessThan(body.shoulderGirdleCenter.x);
    expect(pose.solve.shoulders.rightShoulder.x).toBeGreaterThan(body.shoulderGirdleCenter.x);
    expect(getBodyRigArmPoints(pose, "left")).toHaveLength(3);
    expect(dot3(pose.solve.leftArm.elbowPole, pose.solve.shoulders.torsoForward)).toBeGreaterThan(
      0.8
    );
    expect(dot3(pose.solve.rightArm.elbowPole, pose.solve.shoulders.torsoForward)).toBeGreaterThan(
      0.8
    );
    expect(pose.solve.leftArm.elbowPole.x).toBeLessThan(0);
    expect(pose.solve.rightArm.elbowPole.x).toBeGreaterThan(0);
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

  it("projects the complete solved skeleton while keeping the feet planted", () => {
    const dimensions = buildDefaultBodyRigDimensions();
    const body = buildBodyRigFrameFromDimensions(dimensions);
    // Both hands biased right forces a lateral pelvis shift from the shoulder-girdle root.
    const pose = solveBodyRigFrame(
      body,
      {
        leftHandTarget: { x: 0.3, y: 0.75, z: 0 },
        rightHandTarget: { x: 0.6, y: 0.75, z: 0 }
      },
      DEFAULT_PLANE_PROJECTION_SETTINGS
    );

    // Verify the solve produced a nonzero lateral pelvis shift
    expect(pose.solve.pelvis.center.x).not.toBeCloseTo(body.pelvisCenter.x);
    // Shoulder elevation belongs to the clavicle/shoulder solve. The default
    // chest does not float upward independently from the spine.
    expect(pose.solve.chest.center).toEqual(body.chest);

    // projectedBody must reflect the same solved skeleton used by the 3D and VRM renderers.
    // With orthographic projection: projected.x == world.x, projected.y == world.y.
    expect(pose.projectedBody.pelvisCenter.x).toBeCloseTo(pose.solve.pelvis.center.x);
    expect(pose.projectedBody.chest).toEqual({ x: body.chest.x, y: body.chest.y });
    expect(pose.projectedBody.hipLeft).toEqual({
      x: pose.skeleton.joints.hipLeft.x,
      y: pose.skeleton.joints.hipLeft.y
    });
    expect(pose.projectedBody.kneeLeft).toEqual({
      x: pose.skeleton.joints.kneeLeft.x,
      y: pose.skeleton.joints.kneeLeft.y
    });
    expect(pose.projectedBody.hipLeft).not.toEqual({ x: body.hipLeft.x, y: body.hipLeft.y });
    expect(pose.projectedBody.kneeLeft).not.toEqual({
      x: body.kneeLeft.x,
      y: body.kneeLeft.y
    });
    expect(pose.projectedBody.footLeft).toEqual({
      x: body.footLeft.x,
      y: body.footLeft.y
    });
    expect(pose.projectedBody.footRight).toEqual({
      x: body.footRight.x,
      y: body.footRight.y
    });
  });

  it("rotates the root support pose without rotating observer-fixed hand goals", () => {
    const dimensions = buildDefaultBodyRigDimensions();
    const body = buildBodyRigFrameFromDimensions(dimensions);
    const goals = {
      leftHandTarget: { x: -0.25, y: 0.4, z: 0 },
      rightHandTarget: { x: 0.25, y: 0.4, z: 0 }
    };
    const poseAt0 = solveBodyRigFrame(body, goals, DEFAULT_PLANE_PROJECTION_SETTINGS, {
      rootFacingDeg: 0
    });
    const poseAt90 = solveBodyRigFrame(body, goals, DEFAULT_PLANE_PROJECTION_SETTINGS, {
      rootFacingDeg: 90
    });
    const poseAt180 = solveBodyRigFrame(body, goals, DEFAULT_PLANE_PROJECTION_SETTINGS, {
      rootFacingDeg: 180
    });

    expect(poseAt0.shoulders.leftShoulder.x).toBeLessThan(poseAt0.shoulders.rightShoulder.x);
    expect(poseAt180.shoulders.leftShoulder.x).toBeGreaterThan(poseAt180.shoulders.rightShoulder.x);

    for (const pose of [poseAt0, poseAt90, poseAt180]) {
      expect(pose.solve.leftArm.handTarget).toEqual(goals.leftHandTarget);
      expect(pose.solve.rightArm.handTarget).toEqual(goals.rightHandTarget);
      expect(distance3(pose.solve.leftArm.hand, goals.leftHandTarget)).toBeCloseTo(0);
      expect(distance3(pose.solve.rightArm.hand, goals.rightHandTarget)).toBeCloseTo(0);
    }

    const feetAt0 = {
      x: poseAt0.skeleton.joints.footRight.x - poseAt0.skeleton.joints.footLeft.x,
      z: poseAt0.skeleton.joints.footRight.z - poseAt0.skeleton.joints.footLeft.z
    };
    const feetAt90 = {
      x: poseAt90.skeleton.joints.footRight.x - poseAt90.skeleton.joints.footLeft.x,
      z: poseAt90.skeleton.joints.footRight.z - poseAt90.skeleton.joints.footLeft.z
    };
    const feetAt180 = {
      x: poseAt180.skeleton.joints.footRight.x - poseAt180.skeleton.joints.footLeft.x,
      z: poseAt180.skeleton.joints.footRight.z - poseAt180.skeleton.joints.footLeft.z
    };

    expect(feetAt0.x).toBeGreaterThan(0);
    expect(feetAt0.z).toBeCloseTo(0);
    expect(feetAt90.x).toBeCloseTo(0);
    expect(feetAt90.z).toBeLessThan(0);
    expect(feetAt180.x).toBeLessThan(0);
    expect(feetAt180.z).toBeCloseTo(0);
    expect(Math.hypot(feetAt90.x, feetAt90.z)).toBeCloseTo(Math.hypot(feetAt0.x, feetAt0.z));

    expect(
      distance3(poseAt90.skeleton.joints.hipLeft, poseAt90.skeleton.joints.kneeLeft)
    ).toBeCloseTo(distance3(body.hipLeft, body.kneeLeft));
    expect(
      distance3(poseAt90.skeleton.joints.kneeLeft, poseAt90.skeleton.joints.footLeft)
    ).toBeCloseTo(distance3(body.kneeLeft, body.footLeft));
    expect(
      solveBodyRigFrame(body, goals, DEFAULT_PLANE_PROJECTION_SETTINGS, {
        rootFacingDeg: 90
      })
    ).toEqual(poseAt90);
  });

  it("rejects a non-finite root-facing angle", () => {
    const body = buildBodyRigFrameFromDimensions(buildDefaultBodyRigDimensions());

    expect(() =>
      solveBodyRigFrame(
        body,
        {
          leftHandTarget: { x: -0.25, y: 0.4, z: 0 },
          rightHandTarget: { x: 0.25, y: 0.4, z: 0 }
        },
        DEFAULT_PLANE_PROJECTION_SETTINGS,
        { rootFacingDeg: Number.NaN }
      )
    ).toThrowError("Body rig root facing must be a finite number of degrees");
  });
});
