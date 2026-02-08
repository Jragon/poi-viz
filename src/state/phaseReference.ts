import { DEGREES_PER_TURN, degreesToRadians, radiansToDegrees } from "@/state/angleUnits";
import { PI, TWO_PI } from "@/state/constants";
import type { PhaseReference } from "@/types/state";
import type { VTGPhaseDeg } from "@/vtg/types";

const QUARTER_TURN_DEGREES = 90;
const HALF_TURN_DEGREES = 180;
const THREE_QUARTER_TURN_DEGREES = 270;
const HALF_TURN_RADIANS = PI;
const THREE_QUARTER_TURN_RADIANS = (3 * PI) / 2;

export const PHASE_REFERENCE_OPTIONS: PhaseReference[] = ["down", "right", "left", "up"];

const PHASE_REFERENCE_OFFSET_RADIANS: Record<PhaseReference, number> = {
  right: 0,
  down: THREE_QUARTER_TURN_RADIANS,
  left: HALF_TURN_RADIANS,
  up: PI / 2
};

const PHASE_REFERENCE_OFFSET_DEGREES: Record<PhaseReference, VTGPhaseDeg> = {
  right: 0,
  down: THREE_QUARTER_TURN_DEGREES,
  left: HALF_TURN_DEGREES,
  up: QUARTER_TURN_DEGREES
};

/**
 * Returns canonical (right-zero) phase offset for a user-facing phase reference.
 *
 * @param phaseReference User-facing phase-zero reference.
 * @returns Canonical radians offset to apply when converting to/from reference-relative phases.
 */
export function getPhaseReferenceOffsetRadians(phaseReference: PhaseReference): number {
  return PHASE_REFERENCE_OFFSET_RADIANS[phaseReference];
}

/**
 * Converts canonical radians into user-facing reference-relative radians.
 *
 * @param canonicalPhaseRadians Canonical phase radians (`right = 0`).
 * @param phaseReference User-facing phase-zero reference.
 * @returns Reference-relative phase radians.
 */
export function canonicalToReferencePhaseRadians(canonicalPhaseRadians: number, phaseReference: PhaseReference): number {
  return canonicalPhaseRadians - getPhaseReferenceOffsetRadians(phaseReference);
}

/**
 * Converts user-facing reference-relative radians into canonical radians.
 *
 * @param referencePhaseRadians Reference-relative phase radians.
 * @param phaseReference User-facing phase-zero reference.
 * @returns Canonical phase radians (`right = 0`).
 */
export function referenceToCanonicalPhaseRadians(referencePhaseRadians: number, phaseReference: PhaseReference): number {
  return referencePhaseRadians + getPhaseReferenceOffsetRadians(phaseReference);
}

function normalizeDegrees(angleDeg: number): number {
  const normalized = angleDeg % DEGREES_PER_TURN;
  return normalized < 0 ? normalized + DEGREES_PER_TURN : normalized;
}

function normalizeQuarterTurnPhaseDeg(angleDeg: number): VTGPhaseDeg {
  const normalized = normalizeDegrees(angleDeg);
  if (normalized === 0 || normalized === 90 || normalized === 180 || normalized === 270) {
    return normalized;
  }
  throw new Error("Phase bucket must be one of 0/90/180/270.");
}

/**
 * Converts canonical VTG orientation bucket into reference-relative bucket.
 *
 * @param phaseDeg Canonical bucket (`right = 0`).
 * @param phaseReference User-facing phase-zero reference.
 * @returns Reference-relative bucket (`0/90/180/270`).
 */
export function canonicalPhaseBucketToReference(phaseDeg: VTGPhaseDeg, phaseReference: PhaseReference): VTGPhaseDeg {
  return normalizeQuarterTurnPhaseDeg(phaseDeg - PHASE_REFERENCE_OFFSET_DEGREES[phaseReference]);
}

/**
 * Converts reference-relative VTG bucket into canonical bucket.
 *
 * @param phaseDeg Reference-relative bucket (`0/90/180/270`).
 * @param phaseReference User-facing phase-zero reference.
 * @returns Canonical bucket (`right = 0`).
 */
export function referencePhaseBucketToCanonical(phaseDeg: VTGPhaseDeg, phaseReference: PhaseReference): VTGPhaseDeg {
  return normalizeQuarterTurnPhaseDeg(phaseDeg + PHASE_REFERENCE_OFFSET_DEGREES[phaseReference]);
}

/**
 * Converts canonical phase radians into reference-relative phase degrees.
 *
 * @param canonicalPhaseRadians Canonical phase radians (`right = 0`).
 * @param phaseReference User-facing phase-zero reference.
 * @returns Reference-relative phase in degrees.
 */
export function canonicalPhaseRadiansToReferenceDegrees(canonicalPhaseRadians: number, phaseReference: PhaseReference): number {
  return radiansToDegrees(canonicalToReferencePhaseRadians(canonicalPhaseRadians, phaseReference));
}

/**
 * Converts reference-relative phase degrees into canonical phase radians.
 *
 * @param referencePhaseDegrees Reference-relative phase degrees.
 * @param phaseReference User-facing phase-zero reference.
 * @returns Canonical phase radians (`right = 0`).
 */
export function referencePhaseDegreesToCanonicalRadians(referencePhaseDegrees: number, phaseReference: PhaseReference): number {
  const referencePhaseRadians = degreesToRadians(referencePhaseDegrees);
  return referenceToCanonicalPhaseRadians(referencePhaseRadians, phaseReference);
}

/**
 * Wraps canonical phase radians into `[0, 2π)`.
 *
 * @param phaseRadians Canonical phase radians.
 * @returns Wrapped canonical phase radians.
 */
export function normalizeCanonicalPhaseRadians(phaseRadians: number): number {
  const normalized = phaseRadians % TWO_PI;
  return normalized < 0 ? normalized + TWO_PI : normalized;
}
