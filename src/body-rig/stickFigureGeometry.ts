import type { Vec2, Vec3 } from "@/engine/types";

import {
  resolveBodyRigConfig,
  type BodyRigConfig,
  type BodyRigElbowPolicy,
  type ResolvedBodyRigConfig
} from "./bodyRigConfig";

export type ArmSide = "left" | "right";

export interface ArmReachRange {
  readonly min: number;
  readonly max: number;
}

export interface SolveStickArmInput {
  readonly shoulder: Vec2;
  readonly handTarget: Vec2;
  readonly upperArmLength: number;
  readonly forearmLength: number;
  readonly armSide: ArmSide;
  readonly elbowPolicy?: BodyRigElbowPolicy;
}

export interface SolveStickArmResult {
  readonly shoulder: Vec2;
  readonly elbow: Vec2;
  readonly hand: Vec2;
  readonly handTarget: Vec2;
  readonly reach: ArmReachRange;
  readonly distanceToHand: number;
  readonly isClamped: boolean;
}

export interface ProjectShoulderLineInput {
  readonly torsoCenter: Vec2;
  readonly shoulderY: number;
  readonly baseShoulderSpan: number;
  readonly yawRad: number;
  readonly maxYawRad: number;
  readonly minProjectedSpanRatio?: number;
}

export interface ProjectShoulderLineResult {
  readonly torsoCenter: Vec2;
  readonly yawRad: number;
  readonly normalizedYaw: number;
  readonly projectedShoulderSpan: number;
  readonly leftShoulder: Vec2;
  readonly rightShoulder: Vec2;
  readonly nearSide: ArmSide | null;
  readonly farSide: ArmSide | null;
}

export interface BodyRigRoot {
  readonly torsoCenter: Vec2;
  readonly shoulderY: number;
}

export interface RigGoals {
  readonly leftHandTarget: Vec2;
  readonly rightHandTarget: Vec2;
}

export interface BodyRigSolveRequest {
  readonly root: BodyRigRoot;
  readonly config: BodyRigConfig;
  readonly goals: RigGoals;
  readonly yawSearchSteps?: number;
}

export interface BodyRigSolveDiagnostics {
  readonly candidateCount: number;
  readonly projectedLeftShoulder: Vec2;
  readonly projectedRightShoulder: Vec2;
  readonly effectiveLeftShoulder: Vec2;
  readonly effectiveRightShoulder: Vec2;
  readonly leftShoulderLift: number;
  readonly rightShoulderLift: number;
  readonly leftShoulderReach: number;
  readonly rightShoulderReach: number;
  readonly shoulderLimitHit: boolean;
  readonly leftTargetDistance: number;
  readonly rightTargetDistance: number;
  readonly leftReachError: number;
  readonly rightReachError: number;
  readonly reachPenalty: number;
  readonly extensionPenalty: number;
  readonly yawPenalty: number;
  readonly sideBiasPenalty: number;
  readonly handMidpointOffsetX: number;
  readonly isBestEffort: boolean;
}

export interface BodyRigSolveResult {
  readonly yawRad: number;
  readonly shoulders: ProjectShoulderLineResult;
  readonly leftArm: SolveStickArmResult;
  readonly rightArm: SolveStickArmResult;
  readonly diagnostics: BodyRigSolveDiagnostics;
  readonly cost: number;
}

export interface BodyRigWorldRoot {
  readonly shoulderGirdleCenter: Vec3;
  readonly neutralPelvisCenter?: Vec3;
  readonly neutralChestCenter?: Vec3;
  readonly worldUp: Vec3;
  readonly neutralForward: Vec3;
  readonly scale: number;
}

export interface BodyRigWorldGoals {
  readonly leftHandTarget: Vec3;
  readonly rightHandTarget: Vec3;
}

/**
 * An explicit display-layer preference for continuing the currently selected
 * torso-facing branch. It is intentionally absent from the static rig config:
 * a fixed pose must not depend on playback history.
 */
export interface BodyRigYawContinuity {
  readonly previousYawRad: number;
  readonly weight: number;
}

export interface WorldStickArmInput {
  readonly shoulder: Vec3;
  readonly handTarget: Vec3;
  readonly upperArmLength: number;
  readonly forearmLength: number;
  readonly armSide: ArmSide;
  readonly torsoRight: Vec3;
  readonly torsoForward: Vec3;
  readonly worldUp: Vec3;
}

export interface WorldStickArmResult {
  readonly shoulder: Vec3;
  readonly elbow: Vec3;
  readonly hand: Vec3;
  readonly handTarget: Vec3;
  readonly reach: ArmReachRange;
  readonly distanceToHand: number;
  readonly targetDistance: number;
  readonly reachError: number;
  readonly isClamped: boolean;
  readonly elbowPole: Vec3;
  /** Zero when straight and approaches PI as the arm folds back on itself. */
  readonly elbowBendRad: number;
}

export interface BodyRigWorldShoulders {
  readonly yawRad: number;
  readonly normalizedYaw: number;
  readonly leftShoulder: Vec3;
  readonly rightShoulder: Vec3;
  readonly nearSide: ArmSide | null;
  readonly farSide: ArmSide | null;
  readonly torsoRight: Vec3;
  readonly torsoForward: Vec3;
  readonly worldUp: Vec3;
}

export interface BodyRigWorldFrameState {
  readonly center: Vec3;
  readonly forward: Vec3;
  readonly right: Vec3;
  readonly up: Vec3;
  readonly yawRad: number;
  readonly limitHit: boolean;
}

export interface BodyRigWorldShoulderGirdleState {
  readonly shoulderBase: Vec3;
  readonly clavicleVector: Vec3;
  readonly shoulderSocket: Vec3;
  readonly lift: number;
  readonly protraction: number;
  readonly retraction: number;
  readonly lateralTravel: number;
  readonly overheadAmbiguous: boolean;
  readonly limitHit: boolean;
}

export interface BodyRigWorldShoulderGirdlePair {
  readonly left: BodyRigWorldShoulderGirdleState;
  readonly right: BodyRigWorldShoulderGirdleState;
}

export interface BodyRigWorldShoulderDiagnostics {
  readonly lift: number;
  readonly protraction: number;
  readonly retraction: number;
  readonly lateralTravel: number;
  readonly overheadAmbiguous: boolean;
  readonly limitHit: boolean;
}

export interface BodyRigWorldSolveRequest {
  readonly root: BodyRigWorldRoot;
  readonly config: BodyRigConfig;
  readonly goals: BodyRigWorldGoals;
  readonly yawSearchSteps?: number;
  readonly yawContinuity?: BodyRigYawContinuity;
}

export interface BodyRigWorldSolveDiagnostics {
  readonly candidateCount: number;
  readonly leftShoulderLift: number;
  readonly rightShoulderLift: number;
  readonly leftShoulderReach: number;
  readonly rightShoulderReach: number;
  readonly leftTargetDistance: number;
  readonly rightTargetDistance: number;
  readonly leftReachError: number;
  readonly rightReachError: number;
  readonly reachPenalty: number;
  readonly extensionPenalty: number;
  readonly yawPenalty: number;
  readonly sideBiasPenalty: number;
  readonly yawContinuityPenalty: number;
  readonly handMidpointOffset: Vec3;
  readonly leftElbowPole: Vec3;
  readonly rightElbowPole: Vec3;
  readonly pelvisYawLimitHit: boolean;
  readonly pelvisShiftLimitHit: boolean;
  readonly shoulderLimitHit: boolean;
  readonly leftShoulder: BodyRigWorldShoulderDiagnostics;
  readonly rightShoulder: BodyRigWorldShoulderDiagnostics;
  readonly bestEffortReasons: readonly string[];
  readonly isBestEffort: boolean;
}

export interface BodyRigWorldSolveResult {
  readonly yawRad: number;
  readonly pelvis: BodyRigWorldFrameState;
  readonly chest: BodyRigWorldFrameState;
  readonly shoulders: BodyRigWorldShoulders;
  readonly shoulderGirdle: BodyRigWorldShoulderGirdlePair;
  readonly leftArm: WorldStickArmResult;
  readonly rightArm: WorldStickArmResult;
  readonly diagnostics: BodyRigWorldSolveDiagnostics;
  readonly cost: number;
}

export interface CanonicalWallOverlapCircleInput {
  readonly root: BodyRigRoot;
  readonly config: BodyRigConfig;
  readonly useMaxYawCompression?: boolean;
}

export interface CanonicalWallOverlapCircleResult {
  readonly center: Vec2;
  readonly radius: number;
  readonly reach: ArmReachRange;
  readonly shoulders: ProjectShoulderLineResult;
  readonly projectedShoulderSpan: number;
  readonly usesMaxYawCompression: boolean;
}

export type BodyRigProjectionPlaneId = "wall" | "wheel" | "floor";

export interface BodyRigCanonicalPlaneSpace {
  readonly origin: Vec3;
  readonly unitRadius: number;
}

export interface BodyRigCanonicalPatternSpaceInput {
  readonly root: BodyRigWorldRoot;
  readonly config: BodyRigConfig;
  readonly useMaxYawCompression?: boolean;
}

export interface BodyRigCanonicalPatternSpaceResult {
  readonly sourcePlane: "wall";
  readonly origin: Vec3;
  readonly unitRadius: number;
  readonly wallCircle: CanonicalWallOverlapCircleResult;
  readonly projections: Record<BodyRigProjectionPlaneId, BodyRigCanonicalPlaneSpace>;
}

interface CandidateScore {
  readonly result: BodyRigSolveResult;
  readonly absYaw: number;
  readonly preferredSideDistance: number;
}

interface ShoulderOffset {
  readonly lift: number;
  readonly protraction: number;
  readonly retraction: number;
  readonly lateral: number;
  readonly overheadAmbiguous: boolean;
  readonly limitHit: boolean;
}

interface ShoulderPassResult {
  readonly shoulders: ProjectShoulderLineResult;
  readonly projectedLeftShoulder: Vec2;
  readonly projectedRightShoulder: Vec2;
  readonly leftOffset: ShoulderOffset;
  readonly rightOffset: ShoulderOffset;
  readonly shoulderLimitHit: boolean;
}

interface WorldCandidateScore {
  readonly result: BodyRigWorldSolveResult;
  readonly absYaw: number;
  readonly preferredSideDistance: number;
}

interface WorldShoulderPassResult {
  readonly shoulders: BodyRigWorldShoulders;
  readonly projectedLeftShoulder: Vec3;
  readonly projectedRightShoulder: Vec3;
  readonly leftOffset: ShoulderOffset;
  readonly rightOffset: ShoulderOffset;
  readonly shoulderLimitHit: boolean;
}

interface WorldPelvisSolveResult {
  readonly state: BodyRigWorldFrameState;
  readonly yawLimitHit: boolean;
  readonly shiftLimitHit: boolean;
}

const SCORE_EPSILON = 1e-9;
const YAW_REFINEMENT_STEPS = 48;
const ELBOW_POLE_FORWARD_BLEND_START = 0.2;
const ELBOW_POLE_FORWARD_BLEND_END = 0.85;
const ELBOW_POLE_OVERHEAD_BLEND_START = 0.55;
const ELBOW_POLE_OVERHEAD_BLEND_END = 0.9;
const ELBOW_POLE_OVERHEAD_OUTWARD_WEIGHT = 0.35;

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function subtract(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scale(vector: Vec2, scalar: number): Vec2 {
  return { x: vector.x * scalar, y: vector.y * scalar };
}

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

function cross3(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

function length3(vector: Vec3): number {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function normalize3OrFallback(vector: Vec3, fallback: Vec3): Vec3 {
  const length = length3(vector);
  if (length <= Number.EPSILON) {
    return fallback;
  }

  return scale3(vector, 1 / length);
}

function reject3(vector: Vec3, normal: Vec3): Vec3 {
  return subtract3(vector, scale3(normal, dot3(vector, normal)));
}

function negate3(vector: Vec3): Vec3 {
  return scale3(vector, -1);
}

function orient3Toward(vector: Vec3, target: Vec3): Vec3 {
  return dot3(vector, target) < 0 ? negate3(vector) : vector;
}

function rotateAroundAxis(vector: Vec3, axis: Vec3, angleRad: number): Vec3 {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const axisCrossVector = cross3(axis, vector);
  const axisDotVector = dot3(axis, vector);

  return add3(
    add3(scale3(vector, cos), scale3(axisCrossVector, sin)),
    scale3(axis, axisDotVector * (1 - cos))
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  if (edge1 <= edge0) {
    return value >= edge1 ? 1 : 0;
  }
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function getDefaultDirection(armSide: ArmSide): Vec2 {
  return armSide === "right" ? { x: 1, y: 0 } : { x: -1, y: 0 };
}

function normalizeOrFallback(vector: Vec2, fallback: Vec2): Vec2 {
  const length = Math.hypot(vector.x, vector.y);
  if (length <= Number.EPSILON) {
    return fallback;
  }

  return { x: vector.x / length, y: vector.y / length };
}

function getReachRange(upperArmLength: number, forearmLength: number): ArmReachRange {
  return {
    min: Math.abs(upperArmLength - forearmLength),
    max: upperArmLength + forearmLength
  };
}

function getElbowBendSign(
  armSide: ArmSide,
  shoulder: Vec2,
  handTarget: Vec2,
  elbowPolicy?: BodyRigElbowPolicy
): 1 | -1 {
  const baseSign: 1 | -1 = armSide === "right" ? -1 : 1;
  const preferOverheadOutward = elbowPolicy?.preferOverheadOutward ?? true;

  if (handTarget.y >= shoulder.y) {
    return baseSign;
  }

  if (preferOverheadOutward) {
    return baseSign === 1 ? -1 : 1;
  }

  return baseSign;
}

function targetReachError(targetDistance: number, reach: ArmReachRange): number {
  if (targetDistance > reach.max) {
    return targetDistance - reach.max;
  }

  if (targetDistance < reach.min) {
    return reach.min - targetDistance;
  }

  return 0;
}

function extensionCost(
  targetDistance: number,
  reach: ArmReachRange,
  extensionComfortRatio: number
): number {
  const extensionRatio = targetDistance / Math.max(reach.max, Number.EPSILON);
  const overComfort = Math.max(0, extensionRatio - extensionComfortRatio);
  return overComfort ** 2;
}

function getWorldBasis(root: BodyRigWorldRoot, yawRad: number) {
  const worldUp = normalize3OrFallback(root.worldUp, { x: 0, y: 1, z: 0 });
  const neutralForward = normalize3OrFallback(reject3(root.neutralForward, worldUp), {
    x: 0,
    y: 0,
    z: 1
  });
  const torsoForward = normalize3OrFallback(rotateAroundAxis(neutralForward, worldUp, yawRad), {
    x: 0,
    y: 0,
    z: 1
  });
  const torsoRight = normalize3OrFallback(cross3(worldUp, torsoForward), { x: 1, y: 0, z: 0 });

  return { worldUp, torsoForward, torsoRight };
}

function getWorldPreferredYawSign(
  handMidpointOffset: Vec3,
  neutralRight: Vec3,
  neutralDeadzone: number
): -1 | 0 | 1 {
  const offset = dot3(handMidpointOffset, neutralRight);
  if (Math.abs(offset) <= neutralDeadzone) {
    return 0;
  }

  return offset > 0 ? 1 : -1;
}

function getRootPelvisCenter(
  root: BodyRigWorldRoot,
  worldUp: Vec3,
  config: ResolvedBodyRigConfig
): Vec3 {
  return (
    root.neutralPelvisCenter ??
    add3(root.shoulderGirdleCenter, scale3(worldUp, -config.baseShoulderSpan * 0.86))
  );
}

function getRootChestCenter(root: BodyRigWorldRoot): Vec3 {
  return root.neutralChestCenter ?? root.shoulderGirdleCenter;
}

function solveWorldPelvisState(
  input: BodyRigWorldSolveRequest,
  config: ResolvedBodyRigConfig,
  yawRad: number,
  handMidpointOffset: Vec3,
  neutralBasis: ReturnType<typeof getWorldBasis>
): WorldPelvisSolveResult {
  const preferredPelvisYawRad = yawRad * config.pelvisPolicy.preferredYawRatio;
  const maxPelvisYawRad = Math.max(0, Math.abs(config.pelvisPolicy.maxYawRad));
  const maxTwistRad = Math.max(0, Math.abs(config.chestPolicy.maxTwistFromPelvisRad));
  const minimumAllowedYaw = Math.max(-maxPelvisYawRad, yawRad - maxTwistRad);
  const maximumAllowedYaw = Math.min(maxPelvisYawRad, yawRad + maxTwistRad);
  const pelvisYawRad = clamp(preferredPelvisYawRad, minimumAllowedYaw, maximumAllowedYaw);
  const pelvisBasis = getWorldBasis(input.root, pelvisYawRad);
  const lateralRaw = -dot3(handMidpointOffset, neutralBasis.torsoRight) * 0.08;
  const forwardRaw = dot3(handMidpointOffset, neutralBasis.torsoForward) * 0.05;
  const lateralShift = clamp(
    lateralRaw,
    -config.pelvisPolicy.maxLateralShift,
    config.pelvisPolicy.maxLateralShift
  );
  const forwardShift = clamp(
    forwardRaw,
    -config.pelvisPolicy.maxForwardShift,
    config.pelvisPolicy.maxForwardShift
  );
  const neutralCenter = getRootPelvisCenter(input.root, neutralBasis.worldUp, config);
  const center = add3(
    add3(neutralCenter, scale3(neutralBasis.torsoRight, lateralShift)),
    scale3(neutralBasis.torsoForward, forwardShift)
  );

  const shiftLimitHit =
    Math.abs(lateralRaw - lateralShift) > SCORE_EPSILON ||
    Math.abs(forwardRaw - forwardShift) > SCORE_EPSILON;
  const yawLimitHit = Math.abs(preferredPelvisYawRad - pelvisYawRad) > SCORE_EPSILON;

  return {
    state: {
      center,
      forward: pelvisBasis.torsoForward,
      right: pelvisBasis.torsoRight,
      up: pelvisBasis.worldUp,
      yawRad: pelvisYawRad,
      limitHit: yawLimitHit || shiftLimitHit
    },
    yawLimitHit,
    shiftLimitHit
  };
}

function solveWorldChestState(
  input: BodyRigWorldSolveRequest,
  config: ResolvedBodyRigConfig,
  yawRad: number,
  handMidpointOffset: Vec3,
  neutralBasis: ReturnType<typeof getWorldBasis>
): BodyRigWorldFrameState {
  const chestYawRad = yawRad;
  const chestBasis = getWorldBasis(input.root, chestYawRad);
  const neutralCenter = getRootChestCenter(input.root);
  const lift =
    Math.max(0, dot3(handMidpointOffset, neutralBasis.worldUp)) *
    config.chestPolicy.centerLiftRatio;
  const center = add3(neutralCenter, scale3(neutralBasis.worldUp, lift));

  return {
    center,
    forward: chestBasis.torsoForward,
    right: chestBasis.torsoRight,
    up: chestBasis.worldUp,
    yawRad: chestYawRad,
    limitHit: false
  };
}

function buildWorldShoulderGirdleState(
  shoulderBase: Vec3,
  shoulderSocket: Vec3,
  chest: BodyRigWorldFrameState,
  offset: ShoulderOffset,
  limitHit: boolean
): BodyRigWorldShoulderGirdleState {
  return {
    shoulderBase,
    clavicleVector: subtract3(shoulderSocket, chest.center),
    shoulderSocket,
    lift: offset.lift,
    protraction: offset.protraction,
    retraction: offset.retraction,
    lateralTravel: offset.lateral,
    overheadAmbiguous: offset.overheadAmbiguous,
    limitHit: limitHit || offset.limitHit
  };
}

function buildWorldShoulderDiagnostics(
  girdle: BodyRigWorldShoulderGirdleState
): BodyRigWorldShoulderDiagnostics {
  return {
    lift: girdle.lift,
    protraction: girdle.protraction,
    retraction: girdle.retraction,
    lateralTravel: girdle.lateralTravel,
    overheadAmbiguous: girdle.overheadAmbiguous,
    limitHit: girdle.limitHit
  };
}

function getWorldBestEffortReasons(
  leftReachError: number,
  rightReachError: number,
  pelvisShiftLimitHit: boolean,
  shoulderLimitHit: boolean
): string[] {
  const reasons: string[] = [];

  if (leftReachError > SCORE_EPSILON) {
    reasons.push("left-reach");
  }
  if (rightReachError > SCORE_EPSILON) {
    reasons.push("right-reach");
  }
  if (pelvisShiftLimitHit) {
    reasons.push("pelvis-shift-limit");
  }
  if (shoulderLimitHit) {
    reasons.push("shoulder-limit");
  }

  return reasons;
}

function solveWorldShoulders(
  input: BodyRigWorldSolveRequest,
  config: ResolvedBodyRigConfig,
  chest: BodyRigWorldFrameState
): BodyRigWorldShoulders {
  const maxYawRad = Math.max(Math.abs(config.maxYawRad), Number.EPSILON);
  const clampedYawRad = clamp(chest.yawRad, -maxYawRad, maxYawRad);
  const shoulderHalfSpan = config.baseShoulderSpan * 0.5;
  const neutralChestCenter = getRootChestCenter(input.root);
  const shoulderCenter = add3(
    input.root.shoulderGirdleCenter,
    subtract3(chest.center, neutralChestCenter)
  );

  return {
    yawRad: clampedYawRad,
    normalizedYaw: clampedYawRad / maxYawRad,
    leftShoulder: add3(shoulderCenter, scale3(chest.right, -shoulderHalfSpan)),
    rightShoulder: add3(shoulderCenter, scale3(chest.right, shoulderHalfSpan)),
    nearSide: clampedYawRad === 0 ? null : clampedYawRad > 0 ? "right" : "left",
    farSide: clampedYawRad === 0 ? null : clampedYawRad > 0 ? "left" : "right",
    torsoRight: chest.right,
    torsoForward: chest.forward,
    worldUp: chest.up
  };
}

function computeWorldShoulderOffset(
  armSide: ArmSide,
  shoulder: Vec3,
  handTarget: Vec3,
  shoulders: BodyRigWorldShoulders,
  shoulderPolicy: ResolvedBodyRigConfig["shoulderPolicy"],
  maxReach: number
): ShoulderOffset {
  const targetOffset = subtract3(handTarget, shoulder);
  const targetOffsetX = dot3(targetOffset, shoulders.torsoRight);
  const targetForward = dot3(targetOffset, shoulders.torsoForward);
  const targetVertical = dot3(targetOffset, shoulders.worldUp);
  const targetHeight = Math.max(0, targetVertical);
  const targetDrop = Math.max(0, -targetVertical);
  const targetDistance = length3(targetOffset);
  const shoulderMidpoint = scale3(add3(shoulders.leftShoulder, shoulders.rightShoulder), 0.5);
  const targetCenterDistance = Math.abs(
    dot3(subtract3(handTarget, shoulderMidpoint), shoulders.torsoRight)
  );
  const extensionRatio = targetDistance / Math.max(maxReach, Number.EPSILON);
  const activation = clamp(
    (extensionRatio - shoulderPolicy.activationExtensionRatio) /
      Math.max(1 - shoulderPolicy.activationExtensionRatio, Number.EPSILON),
    0,
    1
  );
  const overheadFactor = clamp(targetHeight / Math.max(maxReach, Number.EPSILON), 0, 1);
  const lowFactor = clamp(targetDrop / Math.max(maxReach, Number.EPSILON), 0, 1);
  const liftActivation = clamp(
    activation * 0.6 + overheadFactor * shoulderPolicy.overheadLiftBias,
    0,
    1
  );
  const sideDistance = Math.abs(targetOffsetX);
  const lateralRatio = clamp(sideDistance / Math.max(maxReach, Number.EPSILON), 0, 1);
  const overheadActive = overheadFactor >= 0.55;
  const lowActive = lowFactor >= 0.55;
  const overheadAmbiguous =
    overheadActive && targetCenterDistance <= shoulderPolicy.overheadAmbiguityRadius;
  const rawLateralFade = smoothstep(
    shoulderPolicy.overheadAmbiguityRadius,
    shoulderPolicy.overheadLateralFadeRadius,
    targetCenterDistance
  );
  const lateralFade = overheadActive || lowActive ? rawLateralFade : 1;
  const outwardSign = armSide === "right" ? 1 : -1;
  const isOutward = targetOffsetX === 0 ? true : Math.sign(targetOffsetX) === outwardSign;
  const maxLateral = isOutward ? shoulderPolicy.maxOutwardReach : shoulderPolicy.maxCrossBodyReach;
  const forwardFactor = clamp(
    Math.max(0, targetForward) / Math.max(maxReach, Number.EPSILON),
    0,
    1
  );
  const backwardFactor = clamp(
    Math.max(0, -targetForward) / Math.max(maxReach, Number.EPSILON),
    0,
    1
  );

  return {
    lift: shoulderPolicy.maxLift * liftActivation,
    protraction:
      shoulderPolicy.maxProtraction * Math.max(forwardFactor * activation, overheadFactor * 0.35),
    retraction: shoulderPolicy.maxRetraction * backwardFactor * activation,
    lateral: Math.sign(targetOffsetX) * maxLateral * activation * lateralRatio * lateralFade,
    overheadAmbiguous,
    limitHit: false
  };
}

function applyWorldShoulderPolicy(
  input: BodyRigWorldSolveRequest,
  config: ResolvedBodyRigConfig,
  projectedShoulders: BodyRigWorldShoulders
): WorldShoulderPassResult {
  const maxReach = config.upperArmLength + config.forearmLength;
  const leftOffset = computeWorldShoulderOffset(
    "left",
    projectedShoulders.leftShoulder,
    input.goals.leftHandTarget,
    projectedShoulders,
    config.shoulderPolicy,
    maxReach
  );
  const rightOffset = computeWorldShoulderOffset(
    "right",
    projectedShoulders.rightShoulder,
    input.goals.rightHandTarget,
    projectedShoulders,
    config.shoulderPolicy,
    maxReach
  );
  let leftShoulder = add3(
    add3(
      add3(
        projectedShoulders.leftShoulder,
        scale3(projectedShoulders.torsoRight, leftOffset.lateral)
      ),
      scale3(projectedShoulders.worldUp, leftOffset.lift)
    ),
    scale3(projectedShoulders.torsoForward, leftOffset.protraction - leftOffset.retraction)
  );
  let rightShoulder = add3(
    add3(
      add3(
        projectedShoulders.rightShoulder,
        scale3(projectedShoulders.torsoRight, rightOffset.lateral)
      ),
      scale3(projectedShoulders.worldUp, rightOffset.lift)
    ),
    scale3(projectedShoulders.torsoForward, rightOffset.protraction - rightOffset.retraction)
  );
  let shoulderLimitHit = false;
  const minEffectiveSpan = config.baseShoulderSpan * config.shoulderPolicy.minEffectiveSpanRatio;
  const effectiveSpan = dot3(subtract3(rightShoulder, leftShoulder), projectedShoulders.torsoRight);

  if (effectiveSpan < minEffectiveSpan) {
    shoulderLimitHit = true;
    const midpoint = scale3(add3(leftShoulder, rightShoulder), 0.5);
    leftShoulder = add3(midpoint, scale3(projectedShoulders.torsoRight, -minEffectiveSpan * 0.5));
    rightShoulder = add3(midpoint, scale3(projectedShoulders.torsoRight, minEffectiveSpan * 0.5));
  }

  return {
    shoulders: {
      ...projectedShoulders,
      leftShoulder,
      rightShoulder
    },
    projectedLeftShoulder: projectedShoulders.leftShoulder,
    projectedRightShoulder: projectedShoulders.rightShoulder,
    leftOffset,
    rightOffset,
    shoulderLimitHit
  };
}

function getWorldElbowPole(input: WorldStickArmInput, direction: Vec3): Vec3 {
  const outward = input.armSide === "right" ? input.torsoRight : scale3(input.torsoRight, -1);
  const forwardPole = orient3Toward(reject3(input.torsoForward, direction), input.torsoForward);
  const outwardPole = orient3Toward(reject3(outward, direction), outward);
  const upPole = orient3Toward(reject3(input.worldUp, direction), input.worldUp);
  const stableForwardPole = normalize3OrFallback(
    forwardPole,
    normalize3OrFallback(upPole, outwardPole)
  );
  const stableOutwardPole = normalize3OrFallback(outwardPole, stableForwardPole);
  const forwardUsability = clamp(length3(forwardPole), 0, 1);
  const forwardDegeneracyWeight =
    1 - smoothstep(ELBOW_POLE_FORWARD_BLEND_START, ELBOW_POLE_FORWARD_BLEND_END, forwardUsability);
  const worldUp = normalize3OrFallback(input.worldUp, { x: 0, y: 1, z: 0 });
  const overheadWeight =
    smoothstep(
      ELBOW_POLE_OVERHEAD_BLEND_START,
      ELBOW_POLE_OVERHEAD_BLEND_END,
      Math.abs(dot3(direction, worldUp))
    ) * ELBOW_POLE_OVERHEAD_OUTWARD_WEIGHT;
  const outwardWeight = clamp(Math.max(forwardDegeneracyWeight, overheadWeight), 0, 1);
  const blendedPole = add3(
    scale3(stableForwardPole, 1 - outwardWeight),
    scale3(stableOutwardPole, outwardWeight)
  );
  const blendedForwardDot = dot3(blendedPole, input.torsoForward);
  const forwardPoleDot = dot3(stableForwardPole, input.torsoForward);
  const forwardSafePole =
    blendedForwardDot < 0 && forwardPoleDot > ELBOW_POLE_FORWARD_BLEND_START
      ? add3(blendedPole, scale3(stableForwardPole, -blendedForwardDot / forwardPoleDot))
      : blendedPole;

  return normalize3OrFallback(forwardSafePole, stableForwardPole);
}

export function solveWorldStickArm(input: WorldStickArmInput): WorldStickArmResult {
  const reach = getReachRange(input.upperArmLength, input.forearmLength);
  const shoulderToTarget = subtract3(input.handTarget, input.shoulder);
  const targetDistance = length3(shoulderToTarget);
  const fallbackDirection =
    input.armSide === "right" ? input.torsoRight : scale3(input.torsoRight, -1);
  const direction = normalize3OrFallback(shoulderToTarget, fallbackDirection);
  const clampedDistance = clamp(targetDistance, reach.min, reach.max);
  const hand = add3(input.shoulder, scale3(direction, clampedDistance));
  const baseDistance =
    (input.upperArmLength ** 2 - input.forearmLength ** 2 + clampedDistance ** 2) /
    (2 * Math.max(clampedDistance, Number.EPSILON));
  const heightSquared = Math.max(input.upperArmLength ** 2 - baseDistance ** 2, 0);
  const elbowHeight = Math.sqrt(heightSquared);
  const elbowPole = getWorldElbowPole(input, direction);
  const elbowBase = add3(input.shoulder, scale3(direction, baseDistance));
  const elbow = add3(elbowBase, scale3(elbowPole, elbowHeight));
  const reachError = targetReachError(targetDistance, reach);
  const internalElbowAngle = Math.acos(
    clamp(
      (input.upperArmLength ** 2 + input.forearmLength ** 2 - clampedDistance ** 2) /
        Math.max(2 * input.upperArmLength * input.forearmLength, Number.EPSILON),
      -1,
      1
    )
  );
  const elbowBendRad = Math.PI - internalElbowAngle;

  return {
    shoulder: input.shoulder,
    elbow,
    hand,
    handTarget: input.handTarget,
    reach,
    distanceToHand: clampedDistance,
    targetDistance,
    reachError,
    isClamped: Math.abs(clampedDistance - targetDistance) > 1e-6,
    elbowPole,
    elbowBendRad
  };
}

function computeShoulderOffset(
  armSide: ArmSide,
  shoulder: Vec2,
  handTarget: Vec2,
  shoulderPolicy: ResolvedBodyRigConfig["shoulderPolicy"],
  maxReach: number
): ShoulderOffset {
  const targetOffsetX = handTarget.x - shoulder.x;
  const targetHeight = Math.max(0, shoulder.y - handTarget.y);
  const targetDistance = Math.hypot(targetOffsetX, handTarget.y - shoulder.y);
  const extensionRatio = targetDistance / Math.max(maxReach, Number.EPSILON);
  const activation = clamp(
    (extensionRatio - shoulderPolicy.activationExtensionRatio) /
      Math.max(1 - shoulderPolicy.activationExtensionRatio, Number.EPSILON),
    0,
    1
  );
  const overheadFactor = clamp(targetHeight / Math.max(maxReach, Number.EPSILON), 0, 1);
  const liftActivation = clamp(
    activation * 0.6 + overheadFactor * shoulderPolicy.overheadLiftBias,
    0,
    1
  );
  const lateralRatio = clamp(Math.abs(targetOffsetX) / Math.max(maxReach, Number.EPSILON), 0, 1);
  const outwardSign = armSide === "right" ? 1 : -1;
  const isOutward = targetOffsetX === 0 ? true : Math.sign(targetOffsetX) === outwardSign;
  const maxLateral = isOutward ? shoulderPolicy.maxOutwardReach : shoulderPolicy.maxCrossBodyReach;

  return {
    lift: shoulderPolicy.maxLift * liftActivation,
    protraction: 0,
    retraction: 0,
    lateral: Math.sign(targetOffsetX) * maxLateral * activation * lateralRatio,
    overheadAmbiguous: false,
    limitHit: false
  };
}

function applyShoulderPolicy(
  input: BodyRigSolveRequest,
  config: ResolvedBodyRigConfig,
  projectedShoulders: ProjectShoulderLineResult
): ShoulderPassResult {
  const maxReach = input.config.upperArmLength + input.config.forearmLength;
  const leftOffset = computeShoulderOffset(
    "left",
    projectedShoulders.leftShoulder,
    input.goals.leftHandTarget,
    config.shoulderPolicy,
    maxReach
  );
  const rightOffset = computeShoulderOffset(
    "right",
    projectedShoulders.rightShoulder,
    input.goals.rightHandTarget,
    config.shoulderPolicy,
    maxReach
  );

  let effectiveLeftShoulder = {
    x: projectedShoulders.leftShoulder.x + leftOffset.lateral,
    y: projectedShoulders.leftShoulder.y - leftOffset.lift
  };
  let effectiveRightShoulder = {
    x: projectedShoulders.rightShoulder.x + rightOffset.lateral,
    y: projectedShoulders.rightShoulder.y - rightOffset.lift
  };
  let shoulderLimitHit = false;
  const minEffectiveSpan = config.baseShoulderSpan * config.shoulderPolicy.minEffectiveSpanRatio;
  const effectiveSpan = effectiveRightShoulder.x - effectiveLeftShoulder.x;

  if (effectiveSpan < minEffectiveSpan) {
    shoulderLimitHit = true;
    const midpoint = (effectiveLeftShoulder.x + effectiveRightShoulder.x) * 0.5;
    effectiveLeftShoulder = {
      ...effectiveLeftShoulder,
      x: midpoint - minEffectiveSpan * 0.5
    };
    effectiveRightShoulder = {
      ...effectiveRightShoulder,
      x: midpoint + minEffectiveSpan * 0.5
    };
  }

  return {
    shoulders: {
      ...projectedShoulders,
      leftShoulder: effectiveLeftShoulder,
      rightShoulder: effectiveRightShoulder,
      projectedShoulderSpan: Math.hypot(
        effectiveRightShoulder.x - effectiveLeftShoulder.x,
        effectiveRightShoulder.y - effectiveLeftShoulder.y
      )
    },
    projectedLeftShoulder: projectedShoulders.leftShoulder,
    projectedRightShoulder: projectedShoulders.rightShoulder,
    leftOffset,
    rightOffset,
    shoulderLimitHit
  };
}

function getPreferredYawSign(handMidpointOffsetX: number, neutralDeadzonePx: number): -1 | 0 | 1 {
  if (Math.abs(handMidpointOffsetX) <= neutralDeadzonePx) {
    return 0;
  }

  return handMidpointOffsetX > 0 ? 1 : -1;
}

function scoreYawCandidate(
  input: BodyRigSolveRequest,
  yawRad: number,
  candidateCount: number
): CandidateScore {
  const config = resolveBodyRigConfig(input.config);
  const shoulderInput: ProjectShoulderLineInput = {
    torsoCenter: input.root.torsoCenter,
    shoulderY: input.root.shoulderY,
    baseShoulderSpan: config.baseShoulderSpan,
    yawRad,
    maxYawRad: config.maxYawRad
  };
  const projectedShoulders = projectShoulderLine(
    config.minProjectedSpanRatio === undefined
      ? shoulderInput
      : { ...shoulderInput, minProjectedSpanRatio: config.minProjectedSpanRatio }
  );
  const shoulderPass = applyShoulderPolicy(input, config, projectedShoulders);
  const shoulders = shoulderPass.shoulders;
  const leftArm = solveStickArm({
    shoulder: shoulders.leftShoulder,
    handTarget: input.goals.leftHandTarget,
    upperArmLength: config.upperArmLength,
    forearmLength: config.forearmLength,
    armSide: "left",
    elbowPolicy: config.elbowPolicy
  });
  const rightArm = solveStickArm({
    shoulder: shoulders.rightShoulder,
    handTarget: input.goals.rightHandTarget,
    upperArmLength: config.upperArmLength,
    forearmLength: config.forearmLength,
    armSide: "right",
    elbowPolicy: config.elbowPolicy
  });
  const leftTargetDistance = Math.hypot(
    input.goals.leftHandTarget.x - shoulders.leftShoulder.x,
    input.goals.leftHandTarget.y - shoulders.leftShoulder.y
  );
  const rightTargetDistance = Math.hypot(
    input.goals.rightHandTarget.x - shoulders.rightShoulder.x,
    input.goals.rightHandTarget.y - shoulders.rightShoulder.y
  );
  const leftReachError = targetReachError(leftTargetDistance, leftArm.reach);
  const rightReachError = targetReachError(rightTargetDistance, rightArm.reach);
  const reachPenalty =
    (leftReachError ** 2 + rightReachError ** 2) * config.solverWeights.reachPenalty;
  const extensionPenalty =
    (extensionCost(leftTargetDistance, leftArm.reach, config.limits.extensionComfortRatio) +
      extensionCost(rightTargetDistance, rightArm.reach, config.limits.extensionComfortRatio)) *
    config.solverWeights.extensionPenalty;
  const normalizedYaw = yawRad / Math.max(Math.abs(config.maxYawRad), Number.EPSILON);
  const yawPenalty = normalizedYaw ** 2 * config.solverWeights.yawPenalty;
  const handMidpointOffsetX =
    (input.goals.leftHandTarget.x + input.goals.rightHandTarget.x) * 0.5 - input.root.torsoCenter.x;
  const neutralDeadzonePx = config.neutralDeadzonePx ?? config.baseShoulderSpan * 0.08;
  const preferredYawSign = getPreferredYawSign(handMidpointOffsetX, neutralDeadzonePx);
  const yawSign = Math.abs(yawRad) <= SCORE_EPSILON ? 0 : yawRad > 0 ? 1 : -1;
  const sideBiasPenalty =
    preferredYawSign === 0 || yawSign === preferredYawSign
      ? 0
      : config.solverWeights.sideBiasPenalty;
  const cost = reachPenalty + extensionPenalty + yawPenalty + sideBiasPenalty;

  return {
    result: {
      yawRad: shoulders.yawRad,
      shoulders,
      leftArm,
      rightArm,
      cost,
      diagnostics: {
        candidateCount,
        projectedLeftShoulder: shoulderPass.projectedLeftShoulder,
        projectedRightShoulder: shoulderPass.projectedRightShoulder,
        effectiveLeftShoulder: shoulderPass.shoulders.leftShoulder,
        effectiveRightShoulder: shoulderPass.shoulders.rightShoulder,
        leftShoulderLift: shoulderPass.leftOffset.lift,
        rightShoulderLift: shoulderPass.rightOffset.lift,
        leftShoulderReach: shoulderPass.leftOffset.lateral,
        rightShoulderReach: shoulderPass.rightOffset.lateral,
        shoulderLimitHit: shoulderPass.shoulderLimitHit,
        leftTargetDistance,
        rightTargetDistance,
        leftReachError,
        rightReachError,
        reachPenalty,
        extensionPenalty,
        yawPenalty,
        sideBiasPenalty,
        handMidpointOffsetX,
        isBestEffort: leftReachError > SCORE_EPSILON || rightReachError > SCORE_EPSILON
      }
    },
    absYaw: Math.abs(yawRad),
    preferredSideDistance:
      preferredYawSign === 0
        ? Math.abs(shoulders.yawRad)
        : Math.abs(shoulders.yawRad - preferredYawSign * config.maxYawRad)
  };
}

function isBetterCandidate(candidate: CandidateScore, current: CandidateScore | null): boolean {
  if (!current) {
    return true;
  }

  if (candidate.result.cost < current.result.cost - SCORE_EPSILON) {
    return true;
  }

  if (Math.abs(candidate.result.cost - current.result.cost) > SCORE_EPSILON) {
    return false;
  }

  if (candidate.absYaw < current.absYaw - SCORE_EPSILON) {
    return true;
  }

  if (Math.abs(candidate.absYaw - current.absYaw) > SCORE_EPSILON) {
    return false;
  }

  return candidate.preferredSideDistance < current.preferredSideDistance;
}

function scoreWorldYawCandidate(
  input: BodyRigWorldSolveRequest,
  yawRad: number,
  candidateCount: number
): WorldCandidateScore {
  const config = resolveBodyRigConfig(input.config);
  const handMidpoint = scale3(add3(input.goals.leftHandTarget, input.goals.rightHandTarget), 0.5);
  const handMidpointOffset = subtract3(handMidpoint, input.root.shoulderGirdleCenter);
  const neutralBasis = getWorldBasis(input.root, 0);
  const pelvisSolve = solveWorldPelvisState(
    input,
    config,
    yawRad,
    handMidpointOffset,
    neutralBasis
  );
  const pelvis = pelvisSolve.state;
  const chest = solveWorldChestState(input, config, yawRad, handMidpointOffset, neutralBasis);
  const shoulderPass = applyWorldShoulderPolicy(
    input,
    config,
    solveWorldShoulders(input, config, chest)
  );
  const shoulders = shoulderPass.shoulders;
  const leftArm = solveWorldStickArm({
    shoulder: shoulders.leftShoulder,
    handTarget: input.goals.leftHandTarget,
    upperArmLength: config.upperArmLength,
    forearmLength: config.forearmLength,
    armSide: "left",
    torsoRight: shoulders.torsoRight,
    torsoForward: shoulders.torsoForward,
    worldUp: shoulders.worldUp
  });
  const rightArm = solveWorldStickArm({
    shoulder: shoulders.rightShoulder,
    handTarget: input.goals.rightHandTarget,
    upperArmLength: config.upperArmLength,
    forearmLength: config.forearmLength,
    armSide: "right",
    torsoRight: shoulders.torsoRight,
    torsoForward: shoulders.torsoForward,
    worldUp: shoulders.worldUp
  });
  const reachPenalty =
    (leftArm.reachError ** 2 + rightArm.reachError ** 2) * config.solverWeights.reachPenalty;
  const extensionPenalty =
    (extensionCost(leftArm.targetDistance, leftArm.reach, config.limits.extensionComfortRatio) +
      extensionCost(rightArm.targetDistance, rightArm.reach, config.limits.extensionComfortRatio)) *
    config.solverWeights.extensionPenalty;
  const normalizedYaw = yawRad / Math.max(Math.abs(config.maxYawRad), Number.EPSILON);
  const yawPenalty = normalizedYaw ** 2 * config.solverWeights.yawPenalty;
  const shoulderGirdle: BodyRigWorldShoulderGirdlePair = {
    left: buildWorldShoulderGirdleState(
      shoulderPass.projectedLeftShoulder,
      leftArm.shoulder,
      chest,
      shoulderPass.leftOffset,
      shoulderPass.shoulderLimitHit
    ),
    right: buildWorldShoulderGirdleState(
      shoulderPass.projectedRightShoulder,
      rightArm.shoulder,
      chest,
      shoulderPass.rightOffset,
      shoulderPass.shoulderLimitHit
    )
  };
  const neutralDeadzone = config.neutralDeadzonePx ?? config.baseShoulderSpan * 0.08;
  const preferredYawSign = getWorldPreferredYawSign(
    handMidpointOffset,
    neutralBasis.torsoRight,
    neutralDeadzone
  );
  const yawSign = Math.abs(yawRad) <= SCORE_EPSILON ? 0 : yawRad > 0 ? 1 : -1;
  const sideBiasPenalty =
    preferredYawSign === 0 || yawSign === preferredYawSign
      ? 0
      : config.solverWeights.sideBiasPenalty;
  const continuity = input.yawContinuity;
  const yawContinuityPenalty =
    continuity && Number.isFinite(continuity.previousYawRad) && Number.isFinite(continuity.weight)
      ? (yawRad - continuity.previousYawRad) ** 2 * Math.max(0, continuity.weight)
      : 0;
  const cost =
    reachPenalty + extensionPenalty + yawPenalty + sideBiasPenalty + yawContinuityPenalty;
  const bestEffortReasons = getWorldBestEffortReasons(
    leftArm.reachError,
    rightArm.reachError,
    pelvisSolve.shiftLimitHit,
    shoulderPass.shoulderLimitHit
  );

  return {
    result: {
      yawRad: chest.yawRad,
      pelvis,
      chest,
      shoulders,
      shoulderGirdle,
      leftArm,
      rightArm,
      cost,
      diagnostics: {
        candidateCount,
        leftShoulderLift: shoulderPass.leftOffset.lift,
        rightShoulderLift: shoulderPass.rightOffset.lift,
        leftShoulderReach: shoulderPass.leftOffset.lateral,
        rightShoulderReach: shoulderPass.rightOffset.lateral,
        leftTargetDistance: leftArm.targetDistance,
        rightTargetDistance: rightArm.targetDistance,
        leftReachError: leftArm.reachError,
        rightReachError: rightArm.reachError,
        reachPenalty,
        extensionPenalty,
        yawPenalty,
        sideBiasPenalty,
        yawContinuityPenalty,
        handMidpointOffset,
        leftElbowPole: leftArm.elbowPole,
        rightElbowPole: rightArm.elbowPole,
        pelvisYawLimitHit: pelvisSolve.yawLimitHit,
        pelvisShiftLimitHit: pelvisSolve.shiftLimitHit,
        shoulderLimitHit: shoulderPass.shoulderLimitHit,
        leftShoulder: buildWorldShoulderDiagnostics(shoulderGirdle.left),
        rightShoulder: buildWorldShoulderDiagnostics(shoulderGirdle.right),
        bestEffortReasons,
        isBestEffort: bestEffortReasons.length > 0
      }
    },
    absYaw: Math.abs(yawRad),
    preferredSideDistance:
      preferredYawSign === 0
        ? Math.abs(yawRad)
        : Math.abs(yawRad - preferredYawSign * config.maxYawRad)
  };
}

function isBetterWorldCandidate(
  candidate: WorldCandidateScore,
  current: WorldCandidateScore | null
): boolean {
  if (!current) {
    return true;
  }

  if (candidate.result.cost < current.result.cost - SCORE_EPSILON) {
    return true;
  }

  if (Math.abs(candidate.result.cost - current.result.cost) > SCORE_EPSILON) {
    return false;
  }

  if (candidate.absYaw < current.absYaw - SCORE_EPSILON) {
    return true;
  }

  if (Math.abs(candidate.absYaw - current.absYaw) > SCORE_EPSILON) {
    return false;
  }

  return candidate.preferredSideDistance < current.preferredSideDistance;
}

export function solveStickArm(input: SolveStickArmInput): SolveStickArmResult {
  const reach = getReachRange(input.upperArmLength, input.forearmLength);
  const shoulderToTarget = subtract(input.handTarget, input.shoulder);
  const direction = normalizeOrFallback(shoulderToTarget, getDefaultDirection(input.armSide));
  const targetDistance = Math.hypot(shoulderToTarget.x, shoulderToTarget.y);
  const clampedDistance = clamp(targetDistance, reach.min, reach.max);
  const hand = add(input.shoulder, scale(direction, clampedDistance));

  const baseDistance =
    (input.upperArmLength ** 2 - input.forearmLength ** 2 + clampedDistance ** 2) /
    (2 * Math.max(clampedDistance, Number.EPSILON));
  const heightSquared = Math.max(input.upperArmLength ** 2 - baseDistance ** 2, 0);
  const bendSign = getElbowBendSign(
    input.armSide,
    input.shoulder,
    input.handTarget,
    input.elbowPolicy
  );
  const normal = {
    x: bendSign * -direction.y,
    y: bendSign * direction.x
  };
  const elbowBase = add(input.shoulder, scale(direction, baseDistance));
  const elbow = add(elbowBase, scale(normal, Math.sqrt(heightSquared)));

  return {
    shoulder: input.shoulder,
    elbow,
    hand,
    handTarget: input.handTarget,
    reach,
    distanceToHand: clampedDistance,
    isClamped: Math.abs(clampedDistance - targetDistance) > 1e-6
  };
}

export function projectShoulderLine(input: ProjectShoulderLineInput): ProjectShoulderLineResult {
  const maxYawRad = Math.max(Math.abs(input.maxYawRad), Number.EPSILON);
  const yawRad = clamp(input.yawRad, -maxYawRad, maxYawRad);
  const minProjectedSpanRatio = input.minProjectedSpanRatio ?? 0.34;
  const spanRatio = Math.max(minProjectedSpanRatio, Math.cos(Math.abs(yawRad)));
  const projectedShoulderSpan = input.baseShoulderSpan * spanRatio;
  const shoulderHalfSpan = projectedShoulderSpan * 0.5;

  return {
    torsoCenter: input.torsoCenter,
    yawRad,
    normalizedYaw: yawRad / maxYawRad,
    projectedShoulderSpan,
    leftShoulder: { x: input.torsoCenter.x - shoulderHalfSpan, y: input.shoulderY },
    rightShoulder: { x: input.torsoCenter.x + shoulderHalfSpan, y: input.shoulderY },
    nearSide: yawRad === 0 ? null : yawRad > 0 ? "right" : "left",
    farSide: yawRad === 0 ? null : yawRad > 0 ? "left" : "right"
  };
}

export function computeCanonicalWallOverlapCircle(
  input: CanonicalWallOverlapCircleInput
): CanonicalWallOverlapCircleResult {
  const config = resolveBodyRigConfig(input.config);
  const usesMaxYawCompression = input.useMaxYawCompression ?? false;
  const shoulderInput: ProjectShoulderLineInput = {
    torsoCenter: input.root.torsoCenter,
    shoulderY: input.root.shoulderY,
    baseShoulderSpan: config.baseShoulderSpan,
    yawRad: usesMaxYawCompression ? Math.abs(config.maxYawRad) : 0,
    maxYawRad: config.maxYawRad
  };
  const shoulders = projectShoulderLine(
    config.minProjectedSpanRatio === undefined
      ? shoulderInput
      : { ...shoulderInput, minProjectedSpanRatio: config.minProjectedSpanRatio }
  );
  const reach = getReachRange(config.upperArmLength, config.forearmLength);
  const shoulderHalfSpan = shoulders.projectedShoulderSpan * 0.5;
  const outerBoundRadius = Math.max(0, reach.max - shoulderHalfSpan);
  const innerBoundRadius = Math.max(0, shoulderHalfSpan - reach.min);
  const radius =
    reach.min > SCORE_EPSILON &&
    outerBoundRadius > innerBoundRadius &&
    outerBoundRadius < shoulderHalfSpan + reach.min
      ? innerBoundRadius
      : outerBoundRadius;

  return {
    center: {
      x: (shoulders.leftShoulder.x + shoulders.rightShoulder.x) * 0.5,
      y: input.root.shoulderY
    },
    radius,
    reach,
    shoulders,
    projectedShoulderSpan: shoulders.projectedShoulderSpan,
    usesMaxYawCompression
  };
}

export function computeBodyRigCanonicalPatternSpace(
  input: BodyRigCanonicalPatternSpaceInput
): BodyRigCanonicalPatternSpaceResult {
  const wallCircle = computeCanonicalWallOverlapCircle({
    root: {
      torsoCenter: {
        x: input.root.shoulderGirdleCenter.x,
        y: input.root.shoulderGirdleCenter.y
      },
      shoulderY: input.root.shoulderGirdleCenter.y
    },
    config: input.config,
    ...(input.useMaxYawCompression === undefined
      ? {}
      : { useMaxYawCompression: input.useMaxYawCompression })
  });
  const origin = {
    x: wallCircle.center.x,
    y: wallCircle.center.y,
    z: input.root.shoulderGirdleCenter.z
  };
  const unitRadius = wallCircle.radius;
  const planeSpace = { origin, unitRadius };

  return {
    sourcePlane: "wall",
    origin,
    unitRadius,
    wallCircle,
    projections: {
      wall: planeSpace,
      wheel: planeSpace,
      floor: planeSpace
    }
  };
}

export function solveBodyRig(input: BodyRigSolveRequest): BodyRigSolveResult {
  const config = resolveBodyRigConfig(input.config);
  const searchSteps = Math.max(8, Math.floor(input.yawSearchSteps ?? 96));
  const candidateCount = searchSteps + 1 + YAW_REFINEMENT_STEPS + 1;
  let bestCandidate: CandidateScore | null = null;
  let bestYawRad = 0;

  for (let step = 0; step <= searchSteps; step++) {
    const t = step / searchSteps;
    const yawRad = -config.maxYawRad + t * config.maxYawRad * 2;
    const candidate = scoreYawCandidate({ ...input, config }, yawRad, candidateCount);
    if (isBetterCandidate(candidate, bestCandidate)) {
      bestCandidate = candidate;
      bestYawRad = yawRad;
    }
  }

  if (!bestCandidate) {
    throw new Error("Expected at least one body rig candidate");
  }

  const coarseStepRad = (config.maxYawRad * 2) / searchSteps;
  const refinementMin = Math.max(-config.maxYawRad, bestYawRad - coarseStepRad);
  const refinementMax = Math.min(config.maxYawRad, bestYawRad + coarseStepRad);
  for (let step = 0; step <= YAW_REFINEMENT_STEPS; step++) {
    const t = step / YAW_REFINEMENT_STEPS;
    const yawRad = refinementMin + (refinementMax - refinementMin) * t;
    const candidate = scoreYawCandidate({ ...input, config }, yawRad, candidateCount);
    if (isBetterCandidate(candidate, bestCandidate)) {
      bestCandidate = candidate;
    }
  }

  return bestCandidate.result;
}

export function solveWorldBodyRig(input: BodyRigWorldSolveRequest): BodyRigWorldSolveResult {
  const config = resolveBodyRigConfig(input.config);
  const searchSteps = Math.max(8, Math.floor(input.yawSearchSteps ?? 96));
  const maxWorldYawRad = Math.min(
    Math.max(0, Math.abs(config.maxYawRad)),
    Math.max(0, Math.abs(config.pelvisPolicy.maxYawRad)) +
      Math.max(0, Math.abs(config.chestPolicy.maxTwistFromPelvisRad))
  );
  const candidateCount = searchSteps + 1 + YAW_REFINEMENT_STEPS + 1;
  let bestCandidate: WorldCandidateScore | null = null;
  let bestYawRad = 0;

  for (let step = 0; step <= searchSteps; step++) {
    const t = step / searchSteps;
    const yawRad = -maxWorldYawRad + t * maxWorldYawRad * 2;
    const candidate = scoreWorldYawCandidate({ ...input, config }, yawRad, candidateCount);
    if (isBetterWorldCandidate(candidate, bestCandidate)) {
      bestCandidate = candidate;
      bestYawRad = yawRad;
    }
  }

  if (!bestCandidate) {
    throw new Error("Expected at least one world body rig candidate");
  }

  const coarseStepRad = (maxWorldYawRad * 2) / searchSteps;
  const refinementMin = Math.max(-maxWorldYawRad, bestYawRad - coarseStepRad);
  const refinementMax = Math.min(maxWorldYawRad, bestYawRad + coarseStepRad);
  for (let step = 0; step <= YAW_REFINEMENT_STEPS; step++) {
    const t = step / YAW_REFINEMENT_STEPS;
    const yawRad = refinementMin + (refinementMax - refinementMin) * t;
    const candidate = scoreWorldYawCandidate({ ...input, config }, yawRad, candidateCount);
    if (isBetterWorldCandidate(candidate, bestCandidate)) {
      bestCandidate = candidate;
    }
  }

  return bestCandidate.result;
}
