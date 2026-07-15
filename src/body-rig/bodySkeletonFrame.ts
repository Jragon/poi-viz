import type { Vec3 } from "@/engine/types";

import type { BodyRigFrame } from "./bodyRigFrame";
import type { ArmReachRange, BodyRigWorldSolveResult } from "./stickFigureGeometry";

// ── Joint names ──────────────────────────────────────────────────────────────

export type SkeletonJointName =
  | "headCenter"
  | "neck"
  | "chest"
  | "clavicleLeft"
  | "clavicleRight"
  | "shoulderLeft"
  | "shoulderRight"
  | "elbowLeft"
  | "elbowRight"
  | "handLeft"
  | "handRight"
  | "pelvisCenter"
  | "hipLeft"
  | "hipRight"
  | "kneeLeft"
  | "kneeRight"
  | "footLeft"
  | "footRight";

export const SKELETON_JOINT_NAMES: readonly SkeletonJointName[] = [
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
  { from: "neck", to: "chest", category: "spine" },
  { from: "chest", to: "pelvisCenter", category: "spine" },
  { from: "chest", to: "clavicleLeft", category: "spine", side: "left" },
  { from: "clavicleLeft", to: "shoulderLeft", category: "spine", side: "left" },
  { from: "chest", to: "clavicleRight", category: "spine", side: "right" },
  { from: "clavicleRight", to: "shoulderRight", category: "spine", side: "right" },
  { from: "pelvisCenter", to: "hipLeft", category: "spine", side: "left" },
  { from: "pelvisCenter", to: "hipRight", category: "spine", side: "right" },
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

export interface SkeletonArmSolverDiagnostics {
  readonly isClamped: boolean;
  readonly reach: ArmReachRange;
  readonly distanceToHand: number;
  readonly targetDistance: number;
  readonly reachError: number;
  readonly elbowPole: Vec3;
  readonly elbowBendRad: number;
}

export interface SkeletonShoulderSolverDiagnostics {
  readonly lift: number;
  readonly protraction: number;
  readonly retraction: number;
  readonly lateralTravel: number;
  readonly overheadAmbiguous: boolean;
  readonly limitHit: boolean;
}

export interface SkeletonSolverDiagnostics {
  readonly yawRad: number;
  readonly pelvisYawRad: number;
  readonly chestYawRad: number;
  readonly pelvisLimitHit: boolean;
  readonly leftArm: SkeletonArmSolverDiagnostics;
  readonly rightArm: SkeletonArmSolverDiagnostics;
  readonly leftShoulder: SkeletonShoulderSolverDiagnostics;
  readonly rightShoulder: SkeletonShoulderSolverDiagnostics;
  readonly bestEffortReasons: readonly string[];
}

// ── Frame ────────────────────────────────────────────────────────────────────

export interface BodySkeletonFrame {
  readonly joints: Record<SkeletonJointName, Vec3>;
  readonly segments: readonly SkeletonSegmentDescriptor[];
  readonly orientation: SkeletonOrientationCue;
  readonly supportPose: SkeletonSupportPoseMetadata;
  readonly solverDiagnostics: SkeletonSolverDiagnostics;
}

// ── Builder ──────────────────────────────────────────────────────────────────

export function buildBodySkeletonFrame(
  body: BodyRigFrame,
  solve: BodyRigWorldSolveResult
): BodySkeletonFrame {
  const joints: Record<SkeletonJointName, Vec3> = {
    headCenter: body.headCenter,
    neck: body.neck,
    chest: solve.chest.center,
    clavicleLeft: solve.shoulderGirdle.left.shoulderBase,
    clavicleRight: solve.shoulderGirdle.right.shoulderBase,
    shoulderLeft: solve.shoulderGirdle.left.shoulderSocket,
    shoulderRight: solve.shoulderGirdle.right.shoulderSocket,
    elbowLeft: solve.leftArm.elbow,
    elbowRight: solve.rightArm.elbow,
    handLeft: solve.leftArm.hand,
    handRight: solve.rightArm.hand,
    pelvisCenter: solve.pelvis.center,
    hipLeft: body.hipLeft,
    hipRight: body.hipRight,
    kneeLeft: body.kneeLeft,
    kneeRight: body.kneeRight,
    footLeft: body.footLeft,
    footRight: body.footRight
  };

  const orientation: SkeletonOrientationCue = {
    up: solve.chest.up,
    forward: solve.chest.forward,
    right: solve.chest.right
  };

  const supportPose: SkeletonSupportPoseMetadata = {
    armReach: body.rigConfig.upperArmLength + body.rigConfig.forearmLength,
    upperArmLength: body.rigConfig.upperArmLength,
    forearmLength: body.rigConfig.forearmLength,
    shoulderSpan: body.rigConfig.baseShoulderSpan
  };

  const solverDiagnostics: SkeletonSolverDiagnostics = {
    yawRad: solve.yawRad,
    pelvisYawRad: solve.pelvis.yawRad,
    chestYawRad: solve.chest.yawRad,
    pelvisLimitHit: solve.pelvis.limitHit,
    leftArm: {
      isClamped: solve.leftArm.isClamped,
      reach: solve.leftArm.reach,
      distanceToHand: solve.leftArm.distanceToHand,
      targetDistance: solve.leftArm.targetDistance,
      reachError: solve.leftArm.reachError,
      elbowPole: solve.leftArm.elbowPole,
      elbowBendRad: solve.leftArm.elbowBendRad
    },
    rightArm: {
      isClamped: solve.rightArm.isClamped,
      reach: solve.rightArm.reach,
      distanceToHand: solve.rightArm.distanceToHand,
      targetDistance: solve.rightArm.targetDistance,
      reachError: solve.rightArm.reachError,
      elbowPole: solve.rightArm.elbowPole,
      elbowBendRad: solve.rightArm.elbowBendRad
    },
    leftShoulder: solve.diagnostics.leftShoulder,
    rightShoulder: solve.diagnostics.rightShoulder,
    bestEffortReasons: solve.diagnostics.bestEffortReasons
  };

  return { joints, segments: SKELETON_SEGMENTS, orientation, supportPose, solverDiagnostics };
}
