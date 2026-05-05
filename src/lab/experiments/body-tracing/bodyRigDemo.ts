import type { Vec2 } from "@/engine/types";

import type { BodyRigConfig } from "./bodyRigConfig";
import {
  solveBodyRig,
  type ArmSide,
  type BodyRigSolveResult,
  type RigGoals,
  type SolveStickArmResult
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
  readonly shoulders: BodyRigSolveResult["shoulders"];
  readonly leftArm: SolveStickArmResult;
  readonly rightArm: SolveStickArmResult;
  readonly yawDeg: number;
  readonly solve: BodyRigSolveResult;
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
  const solve = solveBodyRig({
    root: {
      torsoCenter: body.shoulderCenter,
      shoulderY: body.shoulderY
    },
    config: body.rigConfig,
    goals,
    ...(yawSearchSteps === undefined ? {} : { yawSearchSteps })
  });

  return {
    body,
    shoulders: solve.shoulders,
    leftArm: solve.leftArm,
    rightArm: solve.rightArm,
    yawDeg: (solve.yawRad * 180) / Math.PI,
    solve
  };
}

export function getBodyRigArmPoints(pose: BodyRigPose, side: ArmSide): readonly Vec2[] {
  const arm = side === "left" ? pose.leftArm : pose.rightArm;
  return [arm.shoulder, arm.elbow, arm.hand];
}

export function getBodyRigArmDrawOrder(pose: BodyRigPose): readonly ArmSide[] {
  if (pose.shoulders.nearSide === "left") {
    return ["right", "left"];
  }

  return ["left", "right"];
}
