import { PI } from "@/state/constants";
import {
  normalizeRadians0ToTau,
  shortestAngularDistanceRadians as shortestWrappedAngularDistanceRadians
} from "@/state/phaseMath";
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

export type CardinalGeometry = "together" | "apart";

export interface CardinalGeometryDescription {
  right: CardinalGeometry;
  up: CardinalGeometry;
  left: CardinalGeometry;
  down: CardinalGeometry;
}

interface CardinalPhase {
  key: keyof CardinalGeometryDescription;
  phaseRadians: number;
}

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

const CARDINAL_PHASES: CardinalPhase[] = [
  { key: "right", phaseRadians: 0 },
  { key: "up", phaseRadians: PI / 2 },
  { key: "left", phaseRadians: PI },
  { key: "down", phaseRadians: (3 * PI) / 2 }
];

/**
 * Non-authoritative geometric interpretation table used for docs/debug.
 * These patterns are descriptive VTG language aids under the default
 * "phase zero = down" orientation, not classification rules.
 */
const ELEMENT_CARDINAL_GEOMETRY: Record<VTGElement, CardinalGeometryDescription> = {
  Earth: {
    right: "together",
    up: "together",
    left: "together",
    down: "together"
  },
  Air: {
    right: "apart",
    up: "together",
    left: "apart",
    down: "together"
  },
  Water: {
    right: "apart",
    up: "apart",
    left: "apart",
    down: "apart"
  },
  Fire: {
    right: "together",
    up: "apart",
    left: "together",
    down: "apart"
  }
};

export const normalizeAngleRadians = normalizeRadians0ToTau;
export const shortestAngularDistanceRadians = shortestWrappedAngularDistanceRadians;

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
 * Classifies angular relation as together (Δθ≈0) or apart (Δθ≈π) with VTG phase tolerance.
 */
function classifyTogetherApart(offsetRadians: number): CardinalGeometry {
  if (shortestAngularDistanceRadians(offsetRadians, SAME_TIME_PHASE_OFFSET) <= PHASE_TOLERANCE_RADIANS) {
    return "together";
  }
  if (shortestAngularDistanceRadians(offsetRadians, SPLIT_TIME_PHASE_OFFSET) <= PHASE_TOLERANCE_RADIANS) {
    return "apart";
  }
  throw new Error("Cardinal geometry is outside together/apart tolerance.");
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
 * Solves beat-time when a linear oscillator reaches a target phase.
 */
function solveBeatForPhase(phaseRadians: number, speedRadiansPerBeat: number, targetPhaseRadians: number): number {
  if (Math.abs(speedRadiansPerBeat) <= SPEED_SIGN_TOLERANCE) {
    throw new Error("Cannot evaluate cardinal geometry with near-zero angular speed.");
  }
  return (targetPhaseRadians - phaseRadians) / speedRadiansPerBeat;
}

/**
 * Describes together/apart behavior at right/up/left/down for one left-vs-right pair of oscillators.
 * This is descriptive geometry only; authoritative element classification is still timing+direction.
 */
function describeGeometryAtCardinals(
  leftSpeedRadiansPerBeat: number,
  leftPhaseRadians: number,
  rightSpeedRadiansPerBeat: number,
  rightPhaseRadians: number
): CardinalGeometryDescription {
  const geometry = {} as CardinalGeometryDescription;

  for (const cardinal of CARDINAL_PHASES) {
    const tBeats = solveBeatForPhase(leftPhaseRadians, leftSpeedRadiansPerBeat, cardinal.phaseRadians);
    const leftTheta = leftSpeedRadiansPerBeat * tBeats + leftPhaseRadians;
    const rightTheta = rightSpeedRadiansPerBeat * tBeats + rightPhaseRadians;
    const delta = normalizeAngleRadians(rightTheta - leftTheta);
    geometry[cardinal.key] = classifyTogetherApart(delta);
  }

  return geometry;
}

/**
 * Authoritative arm-element classifier.
 * Uses only right-vs-left timing (Δφ≈0/π) and direction-sign relation, so it is rotation-invariant.
 *
 * @param state Full app state with hand angular params in radians/radians-per-beat.
 * @returns VTG arm element label derived from arm timing/direction relation.
 */
export function classifyArmElement(state: AppState): VTGElement {
  const direction = classifyDirection(state.hands.L.armSpeed, state.hands.R.armSpeed);
  const armDelta = normalizeAngleRadians(state.hands.R.armPhase - state.hands.L.armPhase);
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
 * Authoritative VTG phase bucket classifier.
 * Phase bucket here is the right-head offset relative to right-arm phase, not absolute world orientation.
 *
 * @param state Full app state with hand angular params in radians/radians-per-beat.
 * @returns Phase bucket in degrees (`0`, `90`, `180`, or `270`).
 */
export function classifyPhaseBucket(state: AppState): VTGPhaseDeg {
  const rightHeadPhase = getHeadPhaseRadians(state, RIGHT_HAND_ID);
  const rightArmPhase = state.hands.R.armPhase;
  const phaseOffset = normalizeAngleRadians(rightHeadPhase - rightArmPhase);
  let best: PhaseBucketCandidate | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of PHASE_BUCKET_CANDIDATES) {
    const distance = shortestAngularDistanceRadians(phaseOffset, candidate.phaseRadians);
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

/**
 * Descriptive-only helper mapping element labels to together/apart cardinal language.
 * This is an interpretation aid for docs/debug and is NOT used for classification.
 * It describes the default "phase zero = down" VTG orientation language.
 *
 * @param element VTG element label.
 * @returns Cardinal together/apart description table for the element.
 */
export function describeElementGeometryAtCardinals(element: VTGElement): CardinalGeometryDescription {
  return { ...ELEMENT_CARDINAL_GEOMETRY[element] };
}

/**
 * Descriptive-only helper for arm geometry cardinal language.
 * Computed from current arm motion at cardinal events; it is not used for element classification.
 *
 * @param state Full app state with hand angular params in radians/radians-per-beat.
 * @returns Cardinal together/apart description derived from arm channels.
 */
export function describeArmGeometryAtCardinals(state: AppState): CardinalGeometryDescription {
  return describeGeometryAtCardinals(
    state.hands.L.armSpeed,
    state.hands.L.armPhase,
    state.hands.R.armSpeed,
    state.hands.R.armPhase
  );
}

/**
 * Descriptive-only helper for poi-head geometry cardinal language.
 * Computed from current head motion at cardinal events; it is not used for element classification.
 *
 * @param state Full app state with hand angular params in radians/radians-per-beat.
 * @returns Cardinal together/apart description derived from head channels.
 */
export function describePoiGeometryAtCardinals(state: AppState): CardinalGeometryDescription {
  return describeGeometryAtCardinals(
    getHeadSpeedRadiansPerBeat(state, LEFT_HAND_ID),
    getHeadPhaseRadians(state, LEFT_HAND_ID),
    getHeadSpeedRadiansPerBeat(state, RIGHT_HAND_ID),
    getHeadPhaseRadians(state, RIGHT_HAND_ID)
  );
}
