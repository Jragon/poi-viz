import { PI } from "@/state/constants";
import { normalizeRadians0ToTau, shortestAngularDistanceRadians } from "@/state/phaseMath";
import { getPhaseReferenceOffsetRadians } from "@/state/phaseReference";
import type { AppState } from "@/types/state";
import { VTG_PHASE_BUCKET_TOLERANCE_RADIANS } from "@/vtg/classify";
import type { VTGElement } from "@/vtg/types";

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

const LEFT_HAND_ID = "L";
const RIGHT_HAND_ID = "R";
const SAME_TIME_PHASE_OFFSET = 0;
const SPLIT_TIME_PHASE_OFFSET = PI;
const SPEED_SIGN_TOLERANCE = 1e-9;

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

/**
 * Classifies angular relation as together (Δθ≈0) or apart (Δθ≈π) with VTG phase tolerance.
 */
function classifyTogetherApart(offsetRadians: number): CardinalGeometry {
  if (shortestAngularDistanceRadians(offsetRadians, SAME_TIME_PHASE_OFFSET) <= VTG_PHASE_BUCKET_TOLERANCE_RADIANS) {
    return "together";
  }
  if (shortestAngularDistanceRadians(offsetRadians, SPLIT_TIME_PHASE_OFFSET) <= VTG_PHASE_BUCKET_TOLERANCE_RADIANS) {
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
    const delta = normalizeRadians0ToTau(rightTheta - leftTheta);
    geometry[cardinal.key] = classifyTogetherApart(delta);
  }

  return geometry;
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
  const referenceOffset = getPhaseReferenceOffsetRadians(state.global.phaseReference);
  return describeGeometryAtCardinals(
    state.hands.L.armSpeed,
    state.hands.L.armPhase + referenceOffset,
    state.hands.R.armSpeed,
    state.hands.R.armPhase + referenceOffset
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
  const referenceOffset = getPhaseReferenceOffsetRadians(state.global.phaseReference);
  return describeGeometryAtCardinals(
    getHeadSpeedRadiansPerBeat(state, LEFT_HAND_ID),
    getHeadPhaseRadians(state, LEFT_HAND_ID) + referenceOffset,
    getHeadSpeedRadiansPerBeat(state, RIGHT_HAND_ID),
    getHeadPhaseRadians(state, RIGHT_HAND_ID) + referenceOffset
  );
}
