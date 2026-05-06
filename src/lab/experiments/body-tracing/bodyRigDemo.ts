import { DEFAULT_PLANE_PROJECTION_SETTINGS, projectWorldPoint } from "@/engine/planeProjection";
import type { Vec2, Vec3 } from "@/engine/types";

import {
  getProjectedBodyRigArmPoints,
  projectWorldBodyRig,
  type ProjectedBodyRigFrame
} from "@/body-rig/bodyRigProjection";
import type { BodyRigConfig } from "./bodyRigConfig";
import {
  solveWorldBodyRig,
  type ArmSide,
  type BodyRigWorldSolveResult,
  type RigGoals
} from "./stickFigureGeometry";

export interface BodyRigFrame {
  readonly headCenter: Vec2;
  readonly headRadius: number;
  readonly neck: Vec2;
  readonly rigConfig: BodyRigConfig;
  readonly shoulderCenter: Vec2;
  readonly shoulderY: number;
  readonly pelvis: Vec2;
  readonly hipLeft: Vec2;
  readonly hipRight: Vec2;
  readonly kneeLeft: Vec2;
  readonly kneeRight: Vec2;
  readonly footLeft: Vec2;
  readonly footRight: Vec2;
  readonly defaultLeftHandTarget: Vec2;
  readonly defaultRightHandTarget: Vec2;
}

export interface BodyRigProjectedArm {
  readonly shoulder: Vec2;
  readonly elbow: Vec2;
  readonly hand: Vec2;
  readonly handTarget: Vec2;
  readonly reach: BodyRigWorldSolveResult["leftArm"]["reach"];
  readonly distanceToHand: number;
  readonly isClamped: boolean;
  readonly depth: number;
}

export interface BuildBodyRigFrameInput {
  readonly shoulderCenter: Vec2;
  readonly rigConfig: BodyRigConfig;
  readonly torsoHeight: number;
  readonly hipSpan: number;
  readonly headRadius: number;
  readonly headGap: number;
  readonly neckOffset: number;
  readonly thighLength: number;
  readonly shinLength: number;
  readonly footOffset: number;
  readonly stanceWidth: number;
  readonly defaultHandTargetXRatio?: number;
  readonly defaultHandTargetYRatio?: number;
}

export interface BodyRigPose {
  readonly body: BodyRigFrame;
  readonly shoulders: {
    readonly leftShoulder: Vec2;
    readonly rightShoulder: Vec2;
    readonly nearSide: ArmSide | null;
    readonly farSide: ArmSide | null;
  };
  readonly leftArm: BodyRigProjectedArm;
  readonly rightArm: BodyRigProjectedArm;
  readonly yawDeg: number;
  readonly projected: ProjectedBodyRigFrame;
  readonly solve: BodyRigWorldSolveResult;
}

function toWorldPoint(point: Vec2): Vec3 {
  return { x: point.x, y: point.y, z: 0 };
}

function toProjectedArm(
  solve: BodyRigWorldSolveResult,
  projected: ProjectedBodyRigFrame,
  side: ArmSide
): BodyRigProjectedArm {
  const worldArm = side === "left" ? solve.leftArm : solve.rightArm;
  const projectedArm = side === "left" ? projected.leftArm : projected.rightArm;

  return {
    shoulder: projectedArm.shoulder,
    elbow: projectedArm.elbow,
    hand: projectedArm.hand,
    handTarget: projectWorldPoint(worldArm.handTarget, DEFAULT_PLANE_PROJECTION_SETTINGS),
    reach: worldArm.reach,
    distanceToHand: worldArm.distanceToHand,
    isClamped: worldArm.isClamped,
    depth: projectedArm.depth
  };
}

export function buildBodyRigFrame(input: BuildBodyRigFrameInput): BodyRigFrame {
  const shoulderY = input.shoulderCenter.y;
  const neutralLeftShoulder = {
    x: input.shoulderCenter.x - input.rigConfig.baseShoulderSpan * 0.5,
    y: shoulderY
  };
  const neutralRightShoulder = {
    x: input.shoulderCenter.x + input.rigConfig.baseShoulderSpan * 0.5,
    y: shoulderY
  };
  const defaultHandTargetXRatio = input.defaultHandTargetXRatio ?? 0;
  const defaultHandTargetYRatio = input.defaultHandTargetYRatio ?? 0;
  const pelvis = {
    x: input.shoulderCenter.x,
    y: shoulderY + input.torsoHeight
  };
  const hipLeft = { x: input.shoulderCenter.x - input.hipSpan * 0.5, y: pelvis.y };
  const hipRight = { x: input.shoulderCenter.x + input.hipSpan * 0.5, y: pelvis.y };
  const kneeLeft = { x: hipLeft.x - input.stanceWidth, y: hipLeft.y + input.thighLength };
  const kneeRight = { x: hipRight.x + input.stanceWidth, y: hipRight.y + input.thighLength };

  return {
    headCenter: {
      x: input.shoulderCenter.x,
      y: shoulderY - input.headRadius - input.headGap
    },
    headRadius: input.headRadius,
    neck: {
      x: input.shoulderCenter.x,
      y: shoulderY - input.neckOffset
    },
    rigConfig: input.rigConfig,
    shoulderCenter: input.shoulderCenter,
    shoulderY,
    pelvis,
    hipLeft,
    hipRight,
    kneeLeft,
    kneeRight,
    footLeft: { x: kneeLeft.x - input.footOffset, y: kneeLeft.y + input.shinLength },
    footRight: { x: kneeRight.x + input.footOffset, y: kneeRight.y + input.shinLength },
    defaultLeftHandTarget: {
      x: neutralLeftShoulder.x - input.rigConfig.upperArmLength * defaultHandTargetXRatio,
      y: neutralLeftShoulder.y + input.rigConfig.forearmLength * defaultHandTargetYRatio
    },
    defaultRightHandTarget: {
      x: neutralRightShoulder.x + input.rigConfig.upperArmLength * defaultHandTargetXRatio,
      y: neutralRightShoulder.y + input.rigConfig.forearmLength * defaultHandTargetYRatio
    }
  };
}

export function solveBodyRigFrame(
  body: BodyRigFrame,
  goals: RigGoals,
  yawSearchSteps?: number
): BodyRigPose {
  const solve = solveWorldBodyRig({
    root: {
      shoulderCenter: toWorldPoint(body.shoulderCenter),
      worldUp: { x: 0, y: -1, z: 0 },
      neutralForward: { x: 0, y: 0, z: 1 },
      scale: 1
    },
    config: body.rigConfig,
    goals: {
      leftHandTarget: toWorldPoint(goals.leftHandTarget),
      rightHandTarget: toWorldPoint(goals.rightHandTarget)
    },
    ...(yawSearchSteps === undefined ? {} : { yawSearchSteps })
  });
  const projected = projectWorldBodyRig(solve, DEFAULT_PLANE_PROJECTION_SETTINGS);

  return {
    body,
    shoulders: {
      leftShoulder: projected.leftShoulder,
      rightShoulder: projected.rightShoulder,
      nearSide: solve.shoulders.nearSide,
      farSide: solve.shoulders.farSide
    },
    leftArm: toProjectedArm(solve, projected, "left"),
    rightArm: toProjectedArm(solve, projected, "right"),
    yawDeg: (solve.yawRad * 180) / Math.PI,
    projected,
    solve
  };
}

export function getBodyRigArmPoints(pose: BodyRigPose, side: ArmSide): readonly Vec2[] {
  return getProjectedBodyRigArmPoints(pose.projected, side);
}

export function getBodyRigArmDrawOrder(pose: BodyRigPose): readonly ArmSide[] {
  return pose.projected.drawOrder;
}
