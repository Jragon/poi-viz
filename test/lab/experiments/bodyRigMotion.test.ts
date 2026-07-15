import { describe, expect, it } from "vitest";

import {
  BodyRigMotionSolver,
  buildBodyRigDimensionsForCanonicalUnitRadius,
  buildBodyRigFrameFromDimensions
} from "@/body-rig";
import { DEFAULT_PLANE_PROJECTION_SETTINGS } from "@/engine/planeProjection";

describe("BodyRigMotionSolver", () => {
  it("keeps an opposed anti-spin on one torso branch through a full hand circle", () => {
    const dimensions = buildBodyRigDimensionsForCanonicalUnitRadius(1);
    const body = buildBodyRigFrameFromDimensions(dimensions);
    const solver = new BodyRigMotionSolver();
    const yaws: number[] = [];

    for (let index = 0; index <= 120; index += 1) {
      const angle = (index / 120) * Math.PI * 2;
      const leftHandTarget = { x: Math.cos(angle), y: Math.sin(angle), z: 0 };
      const rightHandTarget = {
        x: -leftHandTarget.x,
        y: -leftHandTarget.y,
        z: 0
      };
      const pose = solver.solve(
        body,
        { leftHandTarget, rightHandTarget },
        DEFAULT_PLANE_PROJECTION_SETTINGS,
        { time: index / 120 }
      );
      yaws.push(pose.skeleton.solverDiagnostics.chestYawRad);
    }

    const frameToFrameYawDelta = yaws.slice(1).map((yaw, index) => Math.abs(yaw - yaws[index]));

    // The static solve has an equivalent opposite-facing branch. Playback must
    // not bounce across it while the hands complete one continuous circle.
    expect(Math.max(...yaws)).toBeLessThanOrEqual(0);
    expect(Math.max(...frameToFrameYawDelta)).toBeLessThan(0.15);
    expect(yaws.at(-1)).toBeCloseTo(yaws[0], 3);
  });

  it("resets its history after playback moves backward", () => {
    const dimensions = buildBodyRigDimensionsForCanonicalUnitRadius(1);
    const body = buildBodyRigFrameFromDimensions(dimensions);
    const solver = new BodyRigMotionSolver();
    const goals = {
      leftHandTarget: { x: 1, y: 0, z: 0 },
      rightHandTarget: { x: -1, y: 0, z: 0 }
    };

    solver.solve(body, goals, DEFAULT_PLANE_PROJECTION_SETTINGS, { time: 1 });
    const restarted = solver.solve(body, goals, DEFAULT_PLANE_PROJECTION_SETTINGS, { time: 0 });
    const staticPose = new BodyRigMotionSolver().solve(
      body,
      goals,
      DEFAULT_PLANE_PROJECTION_SETTINGS,
      { time: 0 }
    );

    expect(restarted).toEqual(staticPose);
  });
});
