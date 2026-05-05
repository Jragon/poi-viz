import type { Vec2 } from "@/engine/types";

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

export interface BodyRigSolveInput {
  readonly torsoCenter: Vec2;
  readonly shoulderY: number;
  readonly baseShoulderSpan: number;
  readonly maxYawRad: number;
  readonly upperArmLength: number;
  readonly forearmLength: number;
  readonly leftHandTarget: Vec2;
  readonly rightHandTarget: Vec2;
  readonly minProjectedSpanRatio?: number;
  readonly neutralDeadzonePx?: number;
  readonly yawSearchSteps?: number;
}

export interface BodyRigSolveDiagnostics {
  readonly candidateCount: number;
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

interface CandidateScore {
  readonly result: BodyRigSolveResult;
  readonly absYaw: number;
  readonly preferredSideDistance: number;
}

const SCORE_EPSILON = 1e-9;

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function subtract(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scale(vector: Vec2, scalar: number): Vec2 {
  return { x: vector.x * scalar, y: vector.y * scalar };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
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

function getBendSign(armSide: ArmSide): 1 | -1 {
  return armSide === "right" ? -1 : 1;
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

function extensionCost(targetDistance: number, reach: ArmReachRange): number {
  const extensionRatio = targetDistance / Math.max(reach.max, Number.EPSILON);
  const overComfort = Math.max(0, extensionRatio - 0.86);
  return overComfort ** 2;
}

function getPreferredYawSign(handMidpointOffsetX: number, neutralDeadzonePx: number): -1 | 0 | 1 {
  if (Math.abs(handMidpointOffsetX) <= neutralDeadzonePx) {
    return 0;
  }

  return handMidpointOffsetX > 0 ? 1 : -1;
}

function scoreYawCandidate(
  input: BodyRigSolveInput,
  yawRad: number,
  candidateCount: number
): CandidateScore {
  const shoulderInput: ProjectShoulderLineInput = {
    torsoCenter: input.torsoCenter,
    shoulderY: input.shoulderY,
    baseShoulderSpan: input.baseShoulderSpan,
    yawRad,
    maxYawRad: input.maxYawRad
  };
  const shoulders = projectShoulderLine(
    input.minProjectedSpanRatio === undefined
      ? shoulderInput
      : { ...shoulderInput, minProjectedSpanRatio: input.minProjectedSpanRatio }
  );
  const leftArm = solveStickArm({
    shoulder: shoulders.leftShoulder,
    handTarget: input.leftHandTarget,
    upperArmLength: input.upperArmLength,
    forearmLength: input.forearmLength,
    armSide: "left"
  });
  const rightArm = solveStickArm({
    shoulder: shoulders.rightShoulder,
    handTarget: input.rightHandTarget,
    upperArmLength: input.upperArmLength,
    forearmLength: input.forearmLength,
    armSide: "right"
  });
  const leftTargetDistance = Math.hypot(
    input.leftHandTarget.x - shoulders.leftShoulder.x,
    input.leftHandTarget.y - shoulders.leftShoulder.y
  );
  const rightTargetDistance = Math.hypot(
    input.rightHandTarget.x - shoulders.rightShoulder.x,
    input.rightHandTarget.y - shoulders.rightShoulder.y
  );
  const leftReachError = targetReachError(leftTargetDistance, leftArm.reach);
  const rightReachError = targetReachError(rightTargetDistance, rightArm.reach);
  const reachPenalty = (leftReachError ** 2 + rightReachError ** 2) * 24;
  const extensionPenalty =
    (extensionCost(leftTargetDistance, leftArm.reach) +
      extensionCost(rightTargetDistance, rightArm.reach)) *
    180;
  const normalizedYaw = yawRad / Math.max(Math.abs(input.maxYawRad), Number.EPSILON);
  const yawPenalty = normalizedYaw ** 2 * 2.4;
  const handMidpointOffsetX =
    (input.leftHandTarget.x + input.rightHandTarget.x) * 0.5 - input.torsoCenter.x;
  const neutralDeadzonePx = input.neutralDeadzonePx ?? input.baseShoulderSpan * 0.08;
  const preferredYawSign = getPreferredYawSign(handMidpointOffsetX, neutralDeadzonePx);
  const yawSign = Math.abs(yawRad) <= SCORE_EPSILON ? 0 : yawRad > 0 ? 1 : -1;
  const sideBiasPenalty = preferredYawSign === 0 || yawSign === preferredYawSign ? 0 : 6;
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
    absYaw: Math.abs(shoulders.yawRad),
    preferredSideDistance:
      preferredYawSign === 0
        ? Math.abs(shoulders.yawRad)
        : Math.abs(shoulders.yawRad - preferredYawSign * input.maxYawRad)
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
  const bendSign = getBendSign(input.armSide);
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

export function solveBodyRigFromHands(input: BodyRigSolveInput): BodyRigSolveResult {
  const searchSteps = Math.max(8, Math.floor(input.yawSearchSteps ?? 96));
  const candidateCount = searchSteps + 1;
  let bestCandidate: CandidateScore | null = null;

  for (let step = 0; step <= searchSteps; step++) {
    const t = step / searchSteps;
    const yawRad = -input.maxYawRad + t * input.maxYawRad * 2;
    const candidate = scoreYawCandidate(input, yawRad, candidateCount);
    if (isBetterCandidate(candidate, bestCandidate)) {
      bestCandidate = candidate;
    }
  }

  if (!bestCandidate) {
    throw new Error("Expected at least one body rig candidate");
  }

  return bestCandidate.result;
}
