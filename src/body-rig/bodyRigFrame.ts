import { projectWorldPoint, type PlaneProjectionSettings } from "@/engine/planeProjection";
import type { Vec2, Vec3 } from "@/engine/types";

import type { BodyRigConfig } from "./bodyRigConfig";
import type { BodyRigDimensions } from "./bodyRigDefaults";
import {
  getProjectedBodyRigArmPoints,
  projectWorldBodyRig,
  type ProjectedBodyRigFrame
} from "./bodyRigProjection";
import { buildBodySkeletonFrame, type BodySkeletonFrame } from "./bodySkeletonFrame";
import {
  solveWorldBodyRig,
  type ArmSide,
  type BodyRigWorldGoals,
  type BodyRigWorldSolveResult
} from "./stickFigureGeometry";

export interface BodyRigFrame {
  readonly headCenter: Vec3;
  readonly headRadius: number;
  readonly neck: Vec3;
  readonly chest: Vec3;
  readonly rigConfig: BodyRigConfig;
  readonly shoulderGirdleCenter: Vec3;
  readonly pelvisCenter: Vec3;
  readonly hipLeft: Vec3;
  readonly hipRight: Vec3;
  readonly kneeLeft: Vec3;
  readonly kneeRight: Vec3;
  readonly footLeft: Vec3;
  readonly footRight: Vec3;
  readonly defaultLeftHandTarget: Vec3;
  readonly defaultRightHandTarget: Vec3;
}

export interface ProjectedBodyRigStaticFrame {
  readonly headCenter: Vec2;
  readonly headRadius: number;
  readonly neck: Vec2;
  readonly chest: Vec2;
  readonly shoulderGirdleCenter: Vec2;
  readonly pelvisCenter: Vec2;
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
  readonly shoulderGirdleCenter: Vec3;
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
  readonly skeleton: BodySkeletonFrame;
  readonly projectedBody: ProjectedBodyRigStaticFrame;
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

function projectBodyRigFrame(
  body: BodyRigFrame,
  skeleton: BodySkeletonFrame,
  settings: PlaneProjectionSettings
): ProjectedBodyRigStaticFrame {
  const joints = skeleton.joints;
  const shoulderGirdleCenter = {
    x: (joints.clavicleLeft.x + joints.clavicleRight.x) * 0.5,
    y: (joints.clavicleLeft.y + joints.clavicleRight.y) * 0.5,
    z: (joints.clavicleLeft.z + joints.clavicleRight.z) * 0.5
  };

  return {
    headCenter: projectWorldPoint(joints.headCenter, settings),
    headRadius: body.headRadius,
    neck: projectWorldPoint(joints.neck, settings),
    chest: projectWorldPoint(joints.chest, settings),
    shoulderGirdleCenter: projectWorldPoint(shoulderGirdleCenter, settings),
    pelvisCenter: projectWorldPoint(joints.pelvisCenter, settings),
    hipLeft: projectWorldPoint(joints.hipLeft, settings),
    hipRight: projectWorldPoint(joints.hipRight, settings),
    kneeLeft: projectWorldPoint(joints.kneeLeft, settings),
    kneeRight: projectWorldPoint(joints.kneeRight, settings),
    footLeft: projectWorldPoint(joints.footLeft, settings),
    footRight: projectWorldPoint(joints.footRight, settings),
    defaultLeftHandTarget: projectWorldPoint(body.defaultLeftHandTarget, settings),
    defaultRightHandTarget: projectWorldPoint(body.defaultRightHandTarget, settings)
  };
}

function toProjectedArm(
  solve: BodyRigWorldSolveResult,
  projected: ProjectedBodyRigFrame,
  side: ArmSide,
  settings: PlaneProjectionSettings
): BodyRigProjectedArm {
  const worldArm = side === "left" ? solve.leftArm : solve.rightArm;
  const projectedArm = side === "left" ? projected.leftArm : projected.rightArm;

  return {
    shoulder: projectedArm.shoulder,
    elbow: projectedArm.elbow,
    hand: projectedArm.hand,
    handTarget: projectWorldPoint(worldArm.handTarget, settings),
    reach: worldArm.reach,
    distanceToHand: worldArm.distanceToHand,
    isClamped: worldArm.isClamped,
    depth: projectedArm.depth
  };
}

export function buildBodyRigFrame(input: BuildBodyRigFrameInput): BodyRigFrame {
  const shoulderGirdleY = input.shoulderGirdleCenter.y;
  const shoulderGirdleZ = input.shoulderGirdleCenter.z;
  const neutralLeftShoulder = {
    x: input.shoulderGirdleCenter.x - input.rigConfig.baseShoulderSpan * 0.5,
    y: shoulderGirdleY,
    z: shoulderGirdleZ
  };
  const neutralRightShoulder = {
    x: input.shoulderGirdleCenter.x + input.rigConfig.baseShoulderSpan * 0.5,
    y: shoulderGirdleY,
    z: shoulderGirdleZ
  };
  const defaultHandTargetXRatio = input.defaultHandTargetXRatio ?? 0;
  const defaultHandTargetYRatio = input.defaultHandTargetYRatio ?? 0;
  const pelvisCenter = {
    x: input.shoulderGirdleCenter.x,
    y: shoulderGirdleY - input.torsoHeight,
    z: shoulderGirdleZ
  };
  const chest = {
    x: input.shoulderGirdleCenter.x,
    y: shoulderGirdleY - input.torsoHeight * 0.12,
    z: shoulderGirdleZ
  };
  const hipLeft = {
    x: input.shoulderGirdleCenter.x - input.hipSpan * 0.5,
    y: pelvisCenter.y,
    z: shoulderGirdleZ
  };
  const hipRight = {
    x: input.shoulderGirdleCenter.x + input.hipSpan * 0.5,
    y: pelvisCenter.y,
    z: shoulderGirdleZ
  };
  const kneeLeft = {
    x: hipLeft.x - input.stanceWidth,
    y: hipLeft.y - input.thighLength,
    z: shoulderGirdleZ
  };
  const kneeRight = {
    x: hipRight.x + input.stanceWidth,
    y: hipRight.y - input.thighLength,
    z: shoulderGirdleZ
  };

  return {
    headCenter: {
      x: input.shoulderGirdleCenter.x,
      y: shoulderGirdleY + input.headRadius + input.headGap,
      z: shoulderGirdleZ
    },
    headRadius: input.headRadius,
    neck: {
      x: input.shoulderGirdleCenter.x,
      y: shoulderGirdleY + input.neckOffset,
      z: shoulderGirdleZ
    },
    chest,
    rigConfig: input.rigConfig,
    shoulderGirdleCenter: input.shoulderGirdleCenter,
    pelvisCenter,
    hipLeft,
    hipRight,
    kneeLeft,
    kneeRight,
    footLeft: {
      x: kneeLeft.x - input.footOffset,
      y: kneeLeft.y - input.shinLength,
      z: shoulderGirdleZ
    },
    footRight: {
      x: kneeRight.x + input.footOffset,
      y: kneeRight.y - input.shinLength,
      z: shoulderGirdleZ
    },
    defaultLeftHandTarget: {
      x: neutralLeftShoulder.x - input.rigConfig.upperArmLength * defaultHandTargetXRatio,
      y: neutralLeftShoulder.y - input.rigConfig.forearmLength * defaultHandTargetYRatio,
      z: shoulderGirdleZ
    },
    defaultRightHandTarget: {
      x: neutralRightShoulder.x + input.rigConfig.upperArmLength * defaultHandTargetXRatio,
      y: neutralRightShoulder.y - input.rigConfig.forearmLength * defaultHandTargetYRatio,
      z: shoulderGirdleZ
    }
  };
}

export function buildBodyRigFrameFromDimensions(dimensions: BodyRigDimensions): BodyRigFrame {
  return buildBodyRigFrame({
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
}

export function solveBodyRigFrame(
  body: BodyRigFrame,
  goals: BodyRigWorldGoals,
  projectionSettings: PlaneProjectionSettings,
  yawSearchSteps?: number
): BodyRigPose {
  const solve = solveWorldBodyRig({
    root: {
      shoulderGirdleCenter: body.shoulderGirdleCenter,
      neutralPelvisCenter: body.pelvisCenter,
      neutralChestCenter: body.chest,
      worldUp: { x: 0, y: 1, z: 0 },
      neutralForward: { x: 0, y: 0, z: 1 },
      scale: 1
    },
    config: body.rigConfig,
    goals,
    ...(yawSearchSteps === undefined ? {} : { yawSearchSteps })
  });
  const projected = projectWorldBodyRig(solve, projectionSettings);
  const skeleton = buildBodySkeletonFrame(body, solve);

  return {
    body,
    skeleton,
    projectedBody: projectBodyRigFrame(body, skeleton, projectionSettings),
    shoulders: {
      leftShoulder: projected.leftShoulder,
      rightShoulder: projected.rightShoulder,
      nearSide: solve.shoulders.nearSide,
      farSide: solve.shoulders.farSide
    },
    leftArm: toProjectedArm(solve, projected, "left", projectionSettings),
    rightArm: toProjectedArm(solve, projected, "right", projectionSettings),
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
