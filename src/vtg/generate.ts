import { PI, TWO_PI } from "@/state/constants";
import type { AppState, HandState } from "@/types/state";
import { classifyVTG } from "@/vtg/classify";
import { getRelationForElement, type VTGDescriptor, type VTGPhaseDeg, type VTGTiming } from "@/vtg/types";

const CANONICAL_RIGHT_ARM_SPEED = TWO_PI;
const ZERO_CYCLE_TOLERANCE = 1e-9;

const RADIANS_PER_DEGREE = PI / 180;
const SAME_TIME_PHASE_OFFSET = 0;
const SPLIT_TIME_PHASE_OFFSET = PI;

/**
 * Clones only the hand angular fields that VTG generation is allowed to override.
 */
function applyAngularOverrides(
  hand: HandState,
  armSpeed: number,
  armPhase: number,
  poiSpeed: number,
  poiPhase: number
): HandState {
  return {
    ...hand,
    armSpeed,
    armPhase,
    poiSpeed,
    poiPhase
  };
}

/**
 * Converts a VTG phase bucket into a canonical relative phase offset in radians.
 */
function phaseBucketToOffsetRadians(phaseDeg: VTGPhaseDeg): number {
  return phaseDeg * RADIANS_PER_DEGREE;
}

/**
 * Returns canonical timing offset in radians (same-time=0, split-time=π).
 */
function timingToPhaseOffset(timing: VTGTiming): number {
  return timing === "split-time" ? SPLIT_TIME_PHASE_OFFSET : SAME_TIME_PHASE_OFFSET;
}

/**
 * Validates signed poi cycles-per-arm-cycle input.
 */
function assertValidPoiCyclesPerArmCycle(poiCyclesPerArmCycle: number): void {
  if (!Number.isFinite(poiCyclesPerArmCycle)) {
    throw new Error("VTG poiCyclesPerArmCycle must be finite.");
  }
  if (Math.abs(poiCyclesPerArmCycle) <= ZERO_CYCLE_TOLERANCE) {
    throw new Error("VTG poiCyclesPerArmCycle must be non-zero.");
  }
}

/**
 * Converts signed head cycles-per-arm-cycle into radians-per-beat.
 */
function getHeadSpeedRadiansPerBeat(poiCyclesPerArmCycle: number): number {
  return poiCyclesPerArmCycle * CANONICAL_RIGHT_ARM_SPEED;
}

/**
 * Validates generator output by classifying state back to discrete VTG buckets.
 */
function assertMatchesDescriptor(state: AppState, descriptor: VTGDescriptor): void {
  const actual = classifyVTG(state);

  if (actual.armElement !== descriptor.armElement) {
    throw new Error(`Generated arm element mismatch: expected ${descriptor.armElement}, got ${actual.armElement}.`);
  }
  if (actual.poiElement !== descriptor.poiElement) {
    throw new Error(`Generated poi element mismatch: expected ${descriptor.poiElement}, got ${actual.poiElement}.`);
  }
  if (actual.phaseDeg !== descriptor.phaseDeg) {
    throw new Error(`Generated phase bucket mismatch: expected ${descriptor.phaseDeg}, got ${actual.phaseDeg}.`);
  }
}

/**
 * Generates one canonical VTG state by overriding only angular arm/poi parameters.
 * Non-angular settings (radii, bpm, trails, persistence fields) are preserved from baseState.
 *
 * @param descriptor VTG discrete inputs (elements, phase bucket, signed head cycles).
 * @param baseState Source state used for non-angular fields.
 * @returns New app state with angular fields solved from VTG descriptor constraints.
 */
export function generateVTGState(descriptor: VTGDescriptor, baseState: AppState): AppState {
  assertValidPoiCyclesPerArmCycle(descriptor.poiCyclesPerArmCycle);

  const armRelation = getRelationForElement(descriptor.armElement);
  const poiRelation = getRelationForElement(descriptor.poiElement);
  const armBaselinePhase = phaseBucketToOffsetRadians(0);

  const rightArmSpeed = CANONICAL_RIGHT_ARM_SPEED;
  const rightArmPhase = armBaselinePhase;
  const leftArmSpeed = armRelation.direction === "same-direction" ? CANONICAL_RIGHT_ARM_SPEED : -CANONICAL_RIGHT_ARM_SPEED;
  const leftArmPhase = rightArmPhase + timingToPhaseOffset(armRelation.timing);

  const rightHeadSpeed = getHeadSpeedRadiansPerBeat(descriptor.poiCyclesPerArmCycle);
  const leftHeadSpeed = poiRelation.direction === "same-direction" ? rightHeadSpeed : -rightHeadSpeed;

  // Phase bucket rotates poi-head orientation relative to the hand baseline.
  const rightHeadPhase = rightArmPhase + phaseBucketToOffsetRadians(descriptor.phaseDeg);
  const leftHeadPhase = rightHeadPhase + timingToPhaseOffset(poiRelation.timing);

  const rightRelativePoiSpeed = rightHeadSpeed - rightArmSpeed;
  const leftRelativePoiSpeed = leftHeadSpeed - leftArmSpeed;
  const rightRelativePoiPhase = rightHeadPhase - rightArmPhase;
  const leftRelativePoiPhase = leftHeadPhase - leftArmPhase;

  const nextState: AppState = {
    global: { ...baseState.global },
    hands: {
      L: applyAngularOverrides(
        baseState.hands.L,
        leftArmSpeed,
        leftArmPhase,
        leftRelativePoiSpeed,
        leftRelativePoiPhase
      ),
      R: applyAngularOverrides(
        baseState.hands.R,
        rightArmSpeed,
        rightArmPhase,
        rightRelativePoiSpeed,
        rightRelativePoiPhase
      )
    }
  };

  assertMatchesDescriptor(nextState, descriptor);
  return nextState;
}
