import { DEGREES_PER_RADIAN, RADIANS_PER_DEGREE } from "@/state/angleUnits";
import { TWO_PI } from "@/state/constants";

export type SpeedUnit = "cycles" | "degrees";
export type PoiSpinMode = "extension" | "inspin" | "antispin" | "static-spin";

const ZERO_SPEED_TOLERANCE = 1e-9;

export function radiansPerBeatToCyclesPerBeat(radiansPerBeat: number): number {
  return radiansPerBeat / TWO_PI;
}

export function cyclesPerBeatToRadiansPerBeat(cyclesPerBeat: number): number {
  return cyclesPerBeat * TWO_PI;
}

export function radiansPerBeatToDegreesPerBeat(radiansPerBeat: number): number {
  return radiansPerBeat * DEGREES_PER_RADIAN;
}

export function degreesPerBeatToRadiansPerBeat(degreesPerBeat: number): number {
  return degreesPerBeat * RADIANS_PER_DEGREE;
}

export function speedFromRadiansPerBeat(radiansPerBeat: number, unit: SpeedUnit): number {
  if (unit === "cycles") {
    return radiansPerBeatToCyclesPerBeat(radiansPerBeat);
  }
  return radiansPerBeatToDegreesPerBeat(radiansPerBeat);
}

export function speedToRadiansPerBeat(value: number, unit: SpeedUnit): number {
  if (unit === "cycles") {
    return cyclesPerBeatToRadiansPerBeat(value);
  }
  return degreesPerBeatToRadiansPerBeat(value);
}

export function getAbsoluteHeadSpeedRadiansPerBeat(armSpeedRadiansPerBeat: number, relativePoiSpeedRadiansPerBeat: number): number {
  return armSpeedRadiansPerBeat + relativePoiSpeedRadiansPerBeat;
}

export function getRelativePoiSpeedFromAbsoluteHeadRadiansPerBeat(
  armSpeedRadiansPerBeat: number,
  absoluteHeadSpeedRadiansPerBeat: number
): number {
  return absoluteHeadSpeedRadiansPerBeat - armSpeedRadiansPerBeat;
}

export function classifyPoiSpinMode(armSpeedRadiansPerBeat: number, relativePoiSpeedRadiansPerBeat: number): PoiSpinMode {
  if (Math.abs(relativePoiSpeedRadiansPerBeat) <= ZERO_SPEED_TOLERANCE) {
    return "extension";
  }
  if (Math.abs(armSpeedRadiansPerBeat) <= ZERO_SPEED_TOLERANCE) {
    return "static-spin";
  }
  return Math.sign(relativePoiSpeedRadiansPerBeat) === Math.sign(armSpeedRadiansPerBeat) ? "inspin" : "antispin";
}
