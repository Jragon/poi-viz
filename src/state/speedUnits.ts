import { DEGREES_PER_RADIAN, RADIANS_PER_DEGREE } from "@/state/angleUnits";
import { TWO_PI } from "@/state/constants";

export type SpeedUnit = "cycles" | "degrees";
export type PoiSpinMode = "extension" | "inspin" | "antispin" | "static-spin";

const ZERO_SPEED_TOLERANCE = 1e-9;

/**
 * Converts angular speed from radians/beat to cycles/beat.
 *
 * @param radiansPerBeat Angular speed in radians per beat.
 * @returns Angular speed in cycles per beat.
 */
export function radiansPerBeatToCyclesPerBeat(radiansPerBeat: number): number {
  return radiansPerBeat / TWO_PI;
}

/**
 * Converts angular speed from cycles/beat to radians/beat.
 *
 * @param cyclesPerBeat Angular speed in cycles per beat.
 * @returns Angular speed in radians per beat.
 */
export function cyclesPerBeatToRadiansPerBeat(cyclesPerBeat: number): number {
  return cyclesPerBeat * TWO_PI;
}

/**
 * Converts angular speed from radians/beat to degrees/beat.
 *
 * @param radiansPerBeat Angular speed in radians per beat.
 * @returns Angular speed in degrees per beat.
 */
export function radiansPerBeatToDegreesPerBeat(radiansPerBeat: number): number {
  return radiansPerBeat * DEGREES_PER_RADIAN;
}

/**
 * Converts angular speed from degrees/beat to radians/beat.
 *
 * @param degreesPerBeat Angular speed in degrees per beat.
 * @returns Angular speed in radians per beat.
 */
export function degreesPerBeatToRadiansPerBeat(degreesPerBeat: number): number {
  return degreesPerBeat * RADIANS_PER_DEGREE;
}

/**
 * Converts internal radians/beat speed into requested UI unit.
 *
 * @param radiansPerBeat Angular speed in radians per beat.
 * @param unit Target speed unit.
 * @returns Speed value in requested unit.
 */
export function speedFromRadiansPerBeat(radiansPerBeat: number, unit: SpeedUnit): number {
  if (unit === "cycles") {
    return radiansPerBeatToCyclesPerBeat(radiansPerBeat);
  }
  return radiansPerBeatToDegreesPerBeat(radiansPerBeat);
}

/**
 * Converts user-entered speed value into internal radians/beat.
 *
 * @param value Speed value in selected UI unit.
 * @param unit Unit used by `value`.
 * @returns Speed in radians per beat.
 */
export function speedToRadiansPerBeat(value: number, unit: SpeedUnit): number {
  if (unit === "cycles") {
    return cyclesPerBeatToRadiansPerBeat(value);
  }
  return degreesPerBeatToRadiansPerBeat(value);
}

/**
 * Solves absolute head speed from arm and relative poi speeds.
 * Invariant: `ω_head = ω_arm + ω_rel`.
 *
 * @param armSpeedRadiansPerBeat Arm angular speed in radians per beat.
 * @param relativePoiSpeedRadiansPerBeat Relative poi angular speed in radians per beat.
 * @returns Absolute head angular speed in radians per beat.
 */
export function getAbsoluteHeadSpeedRadiansPerBeat(armSpeedRadiansPerBeat: number, relativePoiSpeedRadiansPerBeat: number): number {
  return armSpeedRadiansPerBeat + relativePoiSpeedRadiansPerBeat;
}

/**
 * Solves relative poi speed from arm and absolute head speeds.
 * Invariant: `ω_rel = ω_head - ω_arm`.
 *
 * @param armSpeedRadiansPerBeat Arm angular speed in radians per beat.
 * @param absoluteHeadSpeedRadiansPerBeat Absolute head angular speed in radians per beat.
 * @returns Relative poi angular speed in radians per beat.
 */
export function getRelativePoiSpeedFromAbsoluteHeadRadiansPerBeat(
  armSpeedRadiansPerBeat: number,
  absoluteHeadSpeedRadiansPerBeat: number
): number {
  return absoluteHeadSpeedRadiansPerBeat - armSpeedRadiansPerBeat;
}

/**
 * Classifies poi spin mode from arm-relative speed relationship.
 *
 * @param armSpeedRadiansPerBeat Arm angular speed in radians per beat.
 * @param relativePoiSpeedRadiansPerBeat Relative poi angular speed in radians per beat.
 * @returns `extension`, `inspin`, `antispin`, or `static-spin`.
 */
export function classifyPoiSpinMode(armSpeedRadiansPerBeat: number, relativePoiSpeedRadiansPerBeat: number): PoiSpinMode {
  if (Math.abs(relativePoiSpeedRadiansPerBeat) <= ZERO_SPEED_TOLERANCE) {
    return "extension";
  }
  if (Math.abs(armSpeedRadiansPerBeat) <= ZERO_SPEED_TOLERANCE) {
    return "static-spin";
  }
  return Math.sign(relativePoiSpeedRadiansPerBeat) === Math.sign(armSpeedRadiansPerBeat) ? "inspin" : "antispin";
}
