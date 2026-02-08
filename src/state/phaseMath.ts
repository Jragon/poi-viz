import { DEGREES_PER_TURN } from "@/state/angleUnits";
import { TWO_PI } from "@/state/constants";

/**
 * Normalizes degrees into the [0, 360) interval.
 *
 * @param angleDegrees Input angle in degrees.
 * @returns Wrapped angle in `[0, 360)`.
 */
export function normalizeDegrees0ToTurn(angleDegrees: number): number {
  const normalized = angleDegrees % DEGREES_PER_TURN;
  return normalized < 0 ? normalized + DEGREES_PER_TURN : normalized;
}

/**
 * Normalizes radians into the [0, 2π) interval.
 *
 * @param angleRadians Input angle in radians.
 * @returns Wrapped angle in `[0, 2π)`.
 */
export function normalizeRadians0ToTau(angleRadians: number): number {
  const normalized = angleRadians % TWO_PI;
  return normalized < 0 ? normalized + TWO_PI : normalized;
}

/**
 * Returns the smallest absolute wrapped distance between two angles.
 *
 * @param a First angle in radians.
 * @param b Second angle in radians.
 * @returns Smallest absolute wrapped distance in radians.
 */
export function shortestAngularDistanceRadians(a: number, b: number): number {
  const wrappedDelta = normalizeRadians0ToTau(a - b);
  return Math.min(wrappedDelta, TWO_PI - wrappedDelta);
}
