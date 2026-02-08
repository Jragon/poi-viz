import { PI } from "@/state/constants";
import { normalizeRadians0ToTau, shortestAngularDistanceRadians } from "@/state/phaseMath";
import type { AppState } from "@/types/state";
import { getElementForRelation, type VTGDescriptor, type VTGDirection, type VTGPhaseDeg, type VTGTiming } from "@/vtg/types";

const LEFT_HAND_ID = "L";
const RIGHT_HAND_ID = "R";
const SAME_TIME_PHASE_OFFSET = 0;
const SPLIT_TIME_PHASE_OFFSET = PI;
const SPEED_SIGN_TOLERANCE = 1e-9;
const RADIANS_PER_DEGREE = PI / 180;

export const VTG_PHASE_BUCKET_TOLERANCE_DEGREES = 5;
export const VTG_PHASE_BUCKET_TOLERANCE_RADIANS = VTG_PHASE_BUCKET_TOLERANCE_DEGREES * RADIANS_PER_DEGREE;

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
  if (shortestAngularDistanceRadians(offsetRadians, SAME_TIME_PHASE_OFFSET) <= VTG_PHASE_BUCKET_TOLERANCE_RADIANS) {
    return "same-time";
  }
  if (shortestAngularDistanceRadians(offsetRadians, SPLIT_TIME_PHASE_OFFSET) <= VTG_PHASE_BUCKET_TOLERANCE_RADIANS) {
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
 * Authoritative arm-element classifier.
 * Uses only right-vs-left timing (Δφ≈0/π) and direction-sign relation, so it is rotation-invariant.
 *
 * @param state Full app state with hand angular params in radians/radians-per-beat.
 * @returns VTG arm element label derived from arm timing/direction relation.
 */
export function classifyArmElement(state: AppState) {
  const direction = classifyDirection(state.hands.L.armSpeed, state.hands.R.armSpeed);
  const armDelta = normalizeRadians0ToTau(state.hands.R.armPhase - state.hands.L.armPhase);
  const timing = classifyBinaryTiming(armDelta);
  return getElementForRelation({ timing, direction });
}

/**
 * Authoritative poi-element classifier.
 * Uses only head timing/direction relations (world-frame), never absolute orientation.
 *
 * @param state Full app state with hand angular params in radians/radians-per-beat.
 * @returns VTG poi element label derived from head timing/direction relation.
 */
export function classifyPoiElement(state: AppState) {
  const leftHeadSpeed = getHeadSpeedRadiansPerBeat(state, LEFT_HAND_ID);
  const rightHeadSpeed = getHeadSpeedRadiansPerBeat(state, RIGHT_HAND_ID);
  const direction = classifyDirection(leftHeadSpeed, rightHeadSpeed);
  const leftHeadPhase = getHeadPhaseRadians(state, LEFT_HAND_ID);
  const rightHeadPhase = getHeadPhaseRadians(state, RIGHT_HAND_ID);
  const deltaHead = normalizeRadians0ToTau(rightHeadPhase - leftHeadPhase);
  const timing = classifyBinaryTiming(deltaHead);
  return getElementForRelation({ timing, direction });
}

/**
 * Authoritative VTG phase bucket classifier.
 * Phase bucket here is the right-head offset relative to right-arm phase, not absolute world orientation.
 *
 * @param state Full app state with hand angular params in radians/radians-per-beat.
 * @returns Phase bucket in degrees (`0`, `90`, `180`, or `270`).
 */
export function classifyPhaseBucket(state: AppState): VTGPhaseDeg {
  const rightHeadPhase = getHeadPhaseRadians(state, RIGHT_HAND_ID);
  const rightArmPhase = state.hands.R.armPhase;
  const phaseOffset = normalizeRadians0ToTau(rightHeadPhase - rightArmPhase);
  let best: PhaseBucketCandidate | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of PHASE_BUCKET_CANDIDATES) {
    const distance = shortestAngularDistanceRadians(phaseOffset, candidate.phaseRadians);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  if (!best || bestDistance > VTG_PHASE_BUCKET_TOLERANCE_RADIANS) {
    throw new Error(`Head phase is outside ±${VTG_PHASE_BUCKET_TOLERANCE_DEGREES}° VTG bucket tolerance.`);
  }

  return best.phaseDeg;
}

/**
 * Full VTG classifier for the current state.
 * Element fields are relation-based; `phaseDeg` is poi-head offset from right-arm phase.
 *
 * @param state Full app state with hand angular params in radians/radians-per-beat.
 * @returns VTG descriptor subset `{ armElement, poiElement, phaseDeg }`.
 */
export function classifyVTG(state: AppState): Pick<VTGDescriptor, "armElement" | "poiElement" | "phaseDeg"> {
  return {
    armElement: classifyArmElement(state),
    poiElement: classifyPoiElement(state),
    phaseDeg: classifyPhaseBucket(state)
  };
}
