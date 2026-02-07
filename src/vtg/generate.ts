import { PI, TWO_PI } from "@/state/constants";
import type { AppState, HandId, HandState } from "@/types/state";
import { classifyVTG } from "@/vtg/classify";
import { getRelationForElement, type VTGDescriptor, type VTGPhaseDeg, type VTGTiming } from "@/vtg/types";

const LEFT_HAND_ID: HandId = "L";
const RIGHT_HAND_ID: HandId = "R";

const CANONICAL_LEFT_ARM_SPEED = TWO_PI;
const CANONICAL_LEFT_ARM_PHASE = 0;
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
 * Converts a VTG phase bucket from degrees into radians.
 */
function phaseBucketToRadians(phaseDeg: VTGPhaseDeg): number {
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
  return poiCyclesPerArmCycle * CANONICAL_LEFT_ARM_SPEED;
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
 */
export function generateVTGState(descriptor: VTGDescriptor, baseState: AppState): AppState {
  assertValidPoiCyclesPerArmCycle(descriptor.poiCyclesPerArmCycle);

  const armRelation = getRelationForElement(descriptor.armElement);
  const poiRelation = getRelationForElement(descriptor.poiElement);

  const leftArmSpeed = CANONICAL_LEFT_ARM_SPEED;
  const leftArmPhase = CANONICAL_LEFT_ARM_PHASE;
  const rightArmSpeed = armRelation.direction === "same-direction" ? CANONICAL_LEFT_ARM_SPEED : -CANONICAL_LEFT_ARM_SPEED;
  const rightArmPhase = timingToPhaseOffset(armRelation.timing);

  const leftHeadSpeed = getHeadSpeedRadiansPerBeat(descriptor.poiCyclesPerArmCycle);
  const rightHeadSpeed = poiRelation.direction === "same-direction" ? leftHeadSpeed : -leftHeadSpeed;

  // Phase bucket is treated as absolute orientation for the left head.
  const leftHeadPhase = phaseBucketToRadians(descriptor.phaseDeg);
  const rightHeadPhase = leftHeadPhase + timingToPhaseOffset(poiRelation.timing);

  const leftRelativePoiSpeed = leftHeadSpeed - leftArmSpeed;
  const rightRelativePoiSpeed = rightHeadSpeed - rightArmSpeed;
  const leftRelativePoiPhase = leftHeadPhase - leftArmPhase;
  const rightRelativePoiPhase = rightHeadPhase - rightArmPhase;

  const nextState: AppState = {
    global: { ...baseState.global },
    hands: {
      [LEFT_HAND_ID]: applyAngularOverrides(
        baseState.hands.L,
        leftArmSpeed,
        leftArmPhase,
        leftRelativePoiSpeed,
        leftRelativePoiPhase
      ),
      [RIGHT_HAND_ID]: applyAngularOverrides(
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
