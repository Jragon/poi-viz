import type { Vec3 } from "@/engine/types";

import type { BodyRigFrame } from "./bodyRigFrame";
import type { ArmReachRange, BodyRigWorldSolveResult } from "./stickFigureGeometry";

// ── Joint names ──────────────────────────────────────────────────────────────

export type SkeletonJointName =
  | "headCenter"
  | "neck"
  | "shoulderCenter"
  | "shoulderLeft"
  | "shoulderRight"
  | "elbowLeft"
  | "elbowRight"
  | "handLeft"
  | "handRight"
  | "pelvis"
  | "hipLeft"
  | "hipRight"
  | "kneeLeft"
  | "kneeRight"
  | "footLeft"
  | "footRight";

export const SKELETON_JOINT_NAMES: readonly SkeletonJointName[] = [
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

// ── Segment descriptors ──────────────────────────────────────────────────────

export type SkeletonSegmentCategory = "spine" | "head" | "arm" | "leg";

export interface SkeletonSegmentDescriptor {
  readonly from: SkeletonJointName;
  readonly to: SkeletonJointName;
  readonly category: SkeletonSegmentCategory;
  readonly side?: "left" | "right";
}

export const SKELETON_SEGMENTS: readonly SkeletonSegmentDescriptor[] = [
  { from: "headCenter", to: "neck", category: "head" },
  { from: "neck", to: "shoulderCenter", category: "spine" },
  { from: "shoulderCenter", to: "pelvis", category: "spine" },
  { from: "pelvis", to: "hipLeft", category: "spine", side: "left" },
  { from: "pelvis", to: "hipRight", category: "spine", side: "right" },
  { from: "shoulderLeft", to: "elbowLeft", category: "arm", side: "left" },
  { from: "elbowLeft", to: "handLeft", category: "arm", side: "left" },
  { from: "shoulderRight", to: "elbowRight", category: "arm", side: "right" },
  { from: "elbowRight", to: "handRight", category: "arm", side: "right" },
  { from: "hipLeft", to: "kneeLeft", category: "leg", side: "left" },
  { from: "kneeLeft", to: "footLeft", category: "leg", side: "left" },
  { from: "hipRight", to: "kneeRight", category: "leg", side: "right" },
  { from: "kneeRight", to: "footRight", category: "leg", side: "right" }
];

// ── Orientation cue ──────────────────────────────────────────────────────────

export interface SkeletonOrientationCue {
  readonly up: Vec3;
  readonly forward: Vec3;
  readonly right: Vec3;
}

// ── Support-pose metadata ────────────────────────────────────────────────────

export interface SkeletonSupportPoseMetadata {
  readonly armReach: number;
  readonly upperArmLength: number;
  readonly forearmLength: number;
  readonly shoulderSpan: number;
}

// ── Solver flags ─────────────────────────────────────────────────────────────

export interface SkeletonArmSolverFlags {
  readonly isClamped: boolean;
  readonly reach: ArmReachRange;
  readonly distanceToHand: number;
}

export interface SkeletonSolverFlags {
  readonly yawRad: number;
  readonly leftArm: SkeletonArmSolverFlags;
  readonly rightArm: SkeletonArmSolverFlags;
}

// ── Frame ────────────────────────────────────────────────────────────────────

export interface BodySkeletonFrame {
  readonly joints: Record<SkeletonJointName, Vec3>;
  readonly segments: readonly SkeletonSegmentDescriptor[];
  readonly orientation: SkeletonOrientationCue;
  readonly supportPose: SkeletonSupportPoseMetadata;
  readonly solverFlags: SkeletonSolverFlags;
}

// ── Builder ──────────────────────────────────────────────────────────────────

export function buildBodySkeletonFrame(
  body: BodyRigFrame,
  solve: BodyRigWorldSolveResult
): BodySkeletonFrame {
  const joints: Record<SkeletonJointName, Vec3> = {
    headCenter: body.headCenter,
    neck: body.neck,
    shoulderCenter: body.shoulderCenter,
    shoulderLeft: solve.shoulders.leftShoulder,
    shoulderRight: solve.shoulders.rightShoulder,
    elbowLeft: solve.leftArm.elbow,
    elbowRight: solve.rightArm.elbow,
    handLeft: solve.leftArm.hand,
    handRight: solve.rightArm.hand,
    pelvis: body.pelvis,
    hipLeft: body.hipLeft,
    hipRight: body.hipRight,
    kneeLeft: body.kneeLeft,
    kneeRight: body.kneeRight,
    footLeft: body.footLeft,
    footRight: body.footRight
  };

  const orientation: SkeletonOrientationCue = {
    up: solve.shoulders.worldUp,
    forward: solve.shoulders.torsoForward,
    right: solve.shoulders.torsoRight
  };

  const supportPose: SkeletonSupportPoseMetadata = {
    armReach: body.rigConfig.upperArmLength + body.rigConfig.forearmLength,
    upperArmLength: body.rigConfig.upperArmLength,
    forearmLength: body.rigConfig.forearmLength,
    shoulderSpan: body.rigConfig.baseShoulderSpan
  };

  const solverFlags: SkeletonSolverFlags = {
    yawRad: solve.yawRad,
    leftArm: {
      isClamped: solve.leftArm.isClamped,
      reach: solve.leftArm.reach,
      distanceToHand: solve.leftArm.distanceToHand
    },
    rightArm: {
      isClamped: solve.rightArm.isClamped,
      reach: solve.rightArm.reach,
      distanceToHand: solve.rightArm.distanceToHand
    }
  };

  return { joints, segments: SKELETON_SEGMENTS, orientation, supportPose, solverFlags };
}
