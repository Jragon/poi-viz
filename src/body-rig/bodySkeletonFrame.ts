import type { Vec3 } from "@/engine/types";

import type { BodyRigFrame } from "./bodyRigFrame";
import {
  buildBodyRigRootPose,
  transformBodyRigRootPoint,
  type BodyRigRootPose
} from "./bodyRigRootPose";
import type { ArmReachRange, BodyRigWorldSolveResult } from "./stickFigureGeometry";

const MIN_CHAIN_LENGTH = 1e-8;

function add3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function subtract3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scale3(vector: Vec3, scalar: number): Vec3 {
  return { x: vector.x * scalar, y: vector.y * scalar, z: vector.z * scalar };
}

function dot3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function length3(vector: Vec3): number {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function normalize3(vector: Vec3, fallback: Vec3): Vec3 {
  const length = length3(vector);
  return length > MIN_CHAIN_LENGTH ? scale3(vector, 1 / length) : fallback;
}

function transformPelvisPoint(
  body: BodyRigFrame,
  solve: BodyRigWorldSolveResult,
  point: Vec3
): Vec3 {
  const local = subtract3(point, body.pelvisCenter);
  return add3(
    solve.pelvis.center,
    add3(
      scale3(solve.pelvis.right, local.x),
      add3(scale3(solve.pelvis.up, local.y), scale3(solve.pelvis.forward, local.z))
    )
  );
}

function solvePlantedKnee(
  hip: Vec3,
  foot: Vec3,
  upperLegLength: number,
  lowerLegLength: number,
  forward: Vec3
): Vec3 {
  const hipToFoot = subtract3(foot, hip);
  const targetDistance = length3(hipToFoot);
  const direction = normalize3(hipToFoot, { x: 0, y: -1, z: 0 });
  const minReach = Math.abs(upperLegLength - lowerLegLength);
  const maxReach = upperLegLength + lowerLegLength;
  const distance = Math.min(maxReach, Math.max(minReach, targetDistance));
  const baseDistance =
    (upperLegLength ** 2 - lowerLegLength ** 2 + distance ** 2) /
    Math.max(distance * 2, MIN_CHAIN_LENGTH);
  const kneeHeight = Math.sqrt(Math.max(0, upperLegLength ** 2 - baseDistance ** 2));
  const rejectedForward = subtract3(forward, scale3(direction, dot3(forward, direction)));
  const kneePole = normalize3(rejectedForward, { x: 0, y: 0, z: 1 });

  return add3(add3(hip, scale3(direction, baseDistance)), scale3(kneePole, kneeHeight));
}

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
  solve: BodyRigWorldSolveResult,
  rootPose: BodyRigRootPose = buildBodyRigRootPose(body.shoulderGirdleCenter)
): BodySkeletonFrame {
  const hipLeft = transformPelvisPoint(body, solve, body.hipLeft);
  const hipRight = transformPelvisPoint(body, solve, body.hipRight);
  const footLeft = transformBodyRigRootPoint(rootPose, body.footLeft);
  const footRight = transformBodyRigRootPoint(rootPose, body.footRight);
  const leftUpperLegLength = length3(subtract3(body.kneeLeft, body.hipLeft));
  const leftLowerLegLength = length3(subtract3(body.footLeft, body.kneeLeft));
  const rightUpperLegLength = length3(subtract3(body.kneeRight, body.hipRight));
  const rightLowerLegLength = length3(subtract3(body.footRight, body.kneeRight));
  const joints: Record<SkeletonJointName, Vec3> = {
    headCenter: transformBodyRigRootPoint(rootPose, body.headCenter),
    neck: transformBodyRigRootPoint(rootPose, body.neck),
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
    hipLeft,
    hipRight,
    kneeLeft: solvePlantedKnee(
      hipLeft,
      footLeft,
      leftUpperLegLength,
      leftLowerLegLength,
      solve.pelvis.forward
    ),
    kneeRight: solvePlantedKnee(
      hipRight,
      footRight,
      rightUpperLegLength,
      rightLowerLegLength,
      solve.pelvis.forward
    ),
    footLeft,
    footRight
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
