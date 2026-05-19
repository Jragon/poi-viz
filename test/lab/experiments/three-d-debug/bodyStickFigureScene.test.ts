import { describe, expect, it } from "vitest";

import type { WorldMultiRigPose } from "@/engine/types";
import {
  buildBodyStickFigureScene
} from "@/lab/experiments/three-d-debug/bodyStickFigureScene";
import { SKELETON_SEGMENTS } from "@/body-rig";

const leftPose = {
  handPosition: { x: -0.5, y: 0.6, z: 0 },
  headPosition: { x: -0.25, y: 0.6, z: 0 },
  planeId: "wall" as const
};

const rightPose = {
  handPosition: { x: 0.5, y: 0.6, z: 0 },
  headPosition: { x: 0.75, y: 0.6, z: 0 },
  planeId: "wall" as const
};

describe("buildBodyStickFigureScene", () => {
  it("returns null when neither left nor right rig is present", () => {
    const worldPoses: WorldMultiRigPose = {
      center: {
        handPosition: { x: 0, y: 0.4, z: 0 },
        headPosition: { x: 0.25, y: 0.4, z: 0 },
        planeId: "wall"
      }
    };

    expect(buildBodyStickFigureScene(worldPoses)).toBeNull();
  });

  it("returns null for empty world poses", () => {
    expect(buildBodyStickFigureScene({})).toBeNull();
  });

  it("builds a full BodySkeletonFrame from both left and right world poses", () => {
    const worldPoses: WorldMultiRigPose = { left: leftPose, right: rightPose };

    const result = buildBodyStickFigureScene(worldPoses);

    expect(result).not.toBeNull();
    expect(result!.segments).toBe(SKELETON_SEGMENTS);
    expect(result!.joints.handLeft.x).toBeCloseTo(-0.5, 1);
    expect(result!.joints.handRight.x).toBeCloseTo(0.5, 1);
  });

  it("builds a skeleton when only left rig is present", () => {
    const worldPoses: WorldMultiRigPose = { left: leftPose };

    const result = buildBodyStickFigureScene(worldPoses);

    expect(result).not.toBeNull();
    expect(result!.joints.handLeft.x).toBeCloseTo(-0.5, 1);
  });

  it("builds a skeleton when only right rig is present", () => {
    const worldPoses: WorldMultiRigPose = { right: rightPose };

    const result = buildBodyStickFigureScene(worldPoses);

    expect(result).not.toBeNull();
    expect(result!.joints.handRight.x).toBeCloseTo(0.5, 1);
  });

  it("returns orientation cue with unit-length up, forward, and right vectors", () => {
    const worldPoses: WorldMultiRigPose = { left: leftPose, right: rightPose };

    const result = buildBodyStickFigureScene(worldPoses);
    const { up, forward, right } = result!.orientation;

    const len = (v: { x: number; y: number; z: number }) =>
      Math.hypot(v.x, v.y, v.z);

    expect(len(up)).toBeCloseTo(1, 4);
    expect(len(forward)).toBeCloseTo(1, 4);
    expect(len(right)).toBeCloseTo(1, 4);
  });
});
