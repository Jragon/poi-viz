export type AngleUnit = "degrees" | "radians";

export const DEGREES_PER_TURN = 360;
export const RADIANS_PER_TURN = Math.PI * 2;

export const DEGREES_PER_RADIAN = DEGREES_PER_TURN / RADIANS_PER_TURN;
export const RADIANS_PER_DEGREE = RADIANS_PER_TURN / DEGREES_PER_TURN;

/**
 * Converts radians to degrees for UI presentation.
 *
 * @param radians Angle in radians.
 * @returns Equivalent angle in degrees.
 */
export function radiansToDegrees(radians: number): number {
  return radians * DEGREES_PER_RADIAN;
}

/**
 * Converts degrees to radians for engine/state storage.
 *
 * @param degrees Angle in degrees.
 * @returns Equivalent angle in radians.
 */
export function degreesToRadians(degrees: number): number {
  return degrees * RADIANS_PER_DEGREE;
}
