import { PI, TWO_PI } from "@/state/constants";
import type { AppState } from "@/types/state";
import { getElementForRelation, type VTGDescriptor, type VTGDirection, type VTGElement, type VTGPhaseDeg, type VTGTiming } from "@/vtg/types";

const LEFT_HAND_ID = "L";
const RIGHT_HAND_ID = "R";
const ZERO = 0;
const SPLIT_TIME_PHASE_OFFSET = PI;
const SAME_TIME_PHASE_OFFSET = ZERO;
const SPEED_SIGN_TOLERANCE = 1e-9;
const PHASE_TOLERANCE_DEGREES = 5;
const RADIANS_PER_DEGREE = PI / 180;
const PHASE_TOLERANCE_RADIANS = PHASE_TOLERANCE_DEGREES * RADIANS_PER_DEGREE;

interface PhaseBucketCandidate {
  phaseDeg: VTGPhaseDeg;
  phaseRadians: number;
}

const PHASE_BUCKET_CANDIDATES: PhaseBucketCandidate[] = [
  { phaseDeg: 0, phaseRadians: 0 },
  { phaseDeg: 90, phaseRadians: PI / 2 },
  { phaseDeg: 180, phaseRadians: PI },
  { phaseDeg: 270, phaseRadians: (3 * PI) / 2 }
];

/**
 * Normalizes an angle to the [0, 2π) range.
 */
export function normalizeAngleRadians(angle: number): number {
  const normalized = angle % TWO_PI;
  return normalized < ZERO ? normalized + TWO_PI : normalized;
}

/**
 * Smallest absolute wrapped angular distance between two angles.
 */
export function shortestAngularDistanceRadians(a: number, b: number): number {
  const wrappedDelta = normalizeAngleRadians(a - b);
  return Math.min(wrappedDelta, TWO_PI - wrappedDelta);
}

/**
 * Classifies a sign relationship as same-direction or opposite-direction.
 */
function classifyDirection(leftSpeed: number, rightSpeed: number): VTGDirection {
  if (Math.abs(leftSpeed) <= SPEED_SIGN_TOLERANCE || Math.abs(rightSpeed) <= SPEED_SIGN_TOLERANCE) {
    throw new Error("Cannot classify direction with near-zero angular speed.");
  }
  return Math.sign(leftSpeed) === Math.sign(rightSpeed) ? "same-direction" : "opposite-direction";
}

/**
 * Resolves timing from a binary phase-offset relation (0 or π) with tolerance.
 */
function classifyBinaryTiming(offsetRadians: number): VTGTiming {
  if (shortestAngularDistanceRadians(offsetRadians, SAME_TIME_PHASE_OFFSET) <= PHASE_TOLERANCE_RADIANS) {
    return "same-time";
  }
  if (shortestAngularDistanceRadians(offsetRadians, SPLIT_TIME_PHASE_OFFSET) <= PHASE_TOLERANCE_RADIANS) {
    return "split-time";
  }
  throw new Error("Phase offset is outside VTG timing tolerance.");
}

/**
 * Head angular speed ω_head = ω_arm + ω_rel for one hand.
 */
function getHeadSpeedRadiansPerBeat(state: AppState, handId: typeof LEFT_HAND_ID | typeof RIGHT_HAND_ID): number {
  const hand = state.hands[handId];
  return hand.armSpeed + hand.poiSpeed;
}

/**
 * Head phase φ_head = φ_arm + φ_rel for one hand.
 */
function getHeadPhaseRadians(state: AppState, handId: typeof LEFT_HAND_ID | typeof RIGHT_HAND_ID): number {
  const hand = state.hands[handId];
  return hand.armPhase + hand.poiPhase;
}

/**
 * Classifies arm element from right-vs-left arm timing and direction relations.
 */
export function classifyArmElement(state: AppState): VTGElement {
  const direction = classifyDirection(state.hands.L.armSpeed, state.hands.R.armSpeed);
  const armDelta = normalizeAngleRadians(state.hands.R.armPhase - state.hands.L.armPhase);
  const timing = classifyBinaryTiming(armDelta);
  return getElementForRelation({ timing, direction });
}

/**
 * Classifies poi-head element from head timing and direction in world frame.
 */
export function classifyPoiElement(state: AppState): VTGElement {
  const leftHeadSpeed = getHeadSpeedRadiansPerBeat(state, LEFT_HAND_ID);
  const rightHeadSpeed = getHeadSpeedRadiansPerBeat(state, RIGHT_HAND_ID);
  const direction = classifyDirection(leftHeadSpeed, rightHeadSpeed);
  const leftHeadPhase = getHeadPhaseRadians(state, LEFT_HAND_ID);
  const rightHeadPhase = getHeadPhaseRadians(state, RIGHT_HAND_ID);
  const deltaHead = normalizeAngleRadians(rightHeadPhase - leftHeadPhase);
  const timing = classifyBinaryTiming(deltaHead);
  return getElementForRelation({
    timing,
    direction
  });
}

/**
 * Classifies phase bucket from the left-head absolute phase with ±5° tolerance.
 * This is intentionally independent from head timing so phase stays meaningful for all poi elements.
 */
export function classifyPhaseBucket(state: AppState): VTGPhaseDeg {
  const leftHeadPhase = normalizeAngleRadians(getHeadPhaseRadians(state, LEFT_HAND_ID));
  let best: PhaseBucketCandidate | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of PHASE_BUCKET_CANDIDATES) {
    const distance = shortestAngularDistanceRadians(leftHeadPhase, candidate.phaseRadians);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  if (!best || bestDistance > PHASE_TOLERANCE_RADIANS) {
    throw new Error(`Head phase is outside ±${PHASE_TOLERANCE_DEGREES}° VTG bucket tolerance.`);
  }

  return best.phaseDeg;
}

/**
 * Full VTG classifier for the current state, returning arm/poi elements + phase bucket.
 */
export function classifyVTG(state: AppState): Pick<VTGDescriptor, "armElement" | "poiElement" | "phaseDeg"> {
  return {
    armElement: classifyArmElement(state),
    poiElement: classifyPoiElement(state),
    phaseDeg: classifyPhaseBucket(state)
  };
}
