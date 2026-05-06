import {
  getCameraDepth,
  projectWorldPoint,
  type PlaneProjectionSettings
} from "@/engine/planeProjection";
import type { Vec2 } from "@/engine/types";

import type { ArmSide, BodyRigWorldSolveResult } from "./stickFigureGeometry";

export interface ProjectedBodyRigArm {
  readonly shoulder: Vec2;
  readonly elbow: Vec2;
  readonly hand: Vec2;
  readonly depth: number;
}

export interface ProjectedBodyRigFrame {
  readonly leftArm: ProjectedBodyRigArm;
  readonly rightArm: ProjectedBodyRigArm;
  readonly leftShoulder: Vec2;
  readonly rightShoulder: Vec2;
  readonly drawOrder: readonly ArmSide[];
  readonly solve: BodyRigWorldSolveResult;
}

function getArmDepth(
  solve: BodyRigWorldSolveResult,
  side: ArmSide,
  settings: PlaneProjectionSettings
): number {
  const arm = side === "left" ? solve.leftArm : solve.rightArm;

  return (
    (getCameraDepth(arm.shoulder, settings) +
      getCameraDepth(arm.elbow, settings) +
      getCameraDepth(arm.hand, settings)) /
    3
  );
}

export function projectWorldBodyRig(
  solve: BodyRigWorldSolveResult,
  settings: PlaneProjectionSettings
): ProjectedBodyRigFrame {
  const leftDepth = getArmDepth(solve, "left", settings);
  const rightDepth = getArmDepth(solve, "right", settings);

  return {
    leftArm: {
      shoulder: projectWorldPoint(solve.leftArm.shoulder, settings),
      elbow: projectWorldPoint(solve.leftArm.elbow, settings),
      hand: projectWorldPoint(solve.leftArm.hand, settings),
      depth: leftDepth
    },
    rightArm: {
      shoulder: projectWorldPoint(solve.rightArm.shoulder, settings),
      elbow: projectWorldPoint(solve.rightArm.elbow, settings),
      hand: projectWorldPoint(solve.rightArm.hand, settings),
      depth: rightDepth
    },
    leftShoulder: projectWorldPoint(solve.shoulders.leftShoulder, settings),
    rightShoulder: projectWorldPoint(solve.shoulders.rightShoulder, settings),
    drawOrder: leftDepth > rightDepth ? ["right", "left"] : ["left", "right"],
    solve
  };
}

export function getProjectedBodyRigArmPoints(
  frame: ProjectedBodyRigFrame,
  side: ArmSide
): readonly Vec2[] {
  const arm = side === "left" ? frame.leftArm : frame.rightArm;

  return [arm.shoulder, arm.elbow, arm.hand];
}
