import type { Vector2 } from "@/engine/types";

export const SECONDS_PER_MINUTE = 60;
export const ONE_SECOND = 1;
export const ZERO = 0;

function assertFiniteNumber(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number`);
  }
}

function assertPositiveNumber(name: string, value: number): void {
  assertFiniteNumber(name, value);
  if (value <= ZERO) {
    throw new Error(`${name} must be > 0`);
  }
}

function assertNonNegativeNumber(name: string, value: number): void {
  assertFiniteNumber(name, value);
  if (value < ZERO) {
    throw new Error(`${name} must be >= 0`);
  }
}

/**
 * Converts beat-domain time to seconds using BPM.
 *
 * @param beats Beat-domain duration.
 * @param bpm Tempo in beats per minute.
 * @returns Elapsed seconds for the given beat duration.
 */
export function beatsToSeconds(beats: number, bpm: number): number {
  assertFiniteNumber("beats", beats);
  assertPositiveNumber("bpm", bpm);
  return beats * (SECONDS_PER_MINUTE / bpm);
}

/**
 * Converts elapsed seconds into beat-domain units.
 *
 * @param seconds Elapsed seconds.
 * @param bpm Tempo in beats per minute.
 * @returns Equivalent duration in beats.
 */
export function secondsToBeats(seconds: number, bpm: number): number {
  assertFiniteNumber("seconds", seconds);
  assertPositiveNumber("bpm", bpm);
  return seconds * (bpm / SECONDS_PER_MINUTE);
}

/**
 * Converts sample rate to deterministic beat step size.
 *
 * @param sampleHz Sampling frequency in samples per second.
 * @param bpm Tempo in beats per minute.
 * @returns Fixed beat step between adjacent samples.
 */
export function sampleHzToStepBeats(sampleHz: number, bpm: number): number {
  assertPositiveNumber("sampleHz", sampleHz);
  return secondsToBeats(ONE_SECOND / sampleHz, bpm);
}

/**
 * Converts trail window length from beats to seconds.
 *
 * @param trailBeats Trail window length in beats.
 * @param bpm Tempo in beats per minute.
 * @returns Trail window duration in seconds.
 */
export function getTrailSeconds(trailBeats: number, bpm: number): number {
  assertNonNegativeNumber("trailBeats", trailBeats);
  return beatsToSeconds(trailBeats, bpm);
}

/**
 * Ring-buffer capacity for trail samples:
 * ceil(trailSampleHz * trailSeconds).
 *
 * @param trailSampleHz Trail sample frequency in samples per second.
 * @param trailBeats Trail history length in beats.
 * @param bpm Tempo in beats per minute.
 * @returns Required trail point capacity for bounded history.
 */
export function getTrailCapacity(trailSampleHz: number, trailBeats: number, bpm: number): number {
  assertPositiveNumber("trailSampleHz", trailSampleHz);
  const trailSeconds = getTrailSeconds(trailBeats, bpm);
  return Math.ceil(trailSampleHz * trailSeconds);
}

/**
 * Converts polar coordinates to Cartesian vector.
 *
 * @param radius Radius magnitude.
 * @param angle Angle in radians (CCW+, x-right, y-up).
 * @returns Cartesian vector representing the polar coordinate.
 */
export function vectorFromPolar(radius: number, angle: number): Vector2 {
  assertFiniteNumber("radius", radius);
  assertFiniteNumber("angle", angle);
  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle)
  };
}

/**
 * Adds two Cartesian vectors component-wise.
 *
 * @param a Left vector.
 * @param b Right vector.
 * @returns Summed vector `a + b`.
 */
export function addVectors(a: Vector2, b: Vector2): Vector2 {
  return {
    x: a.x + b.x,
    y: a.y + b.y
  };
}

/**
 * Subtracts two Cartesian vectors component-wise.
 *
 * @param a Left vector.
 * @param b Right vector.
 * @returns Difference vector `a - b`.
 */
export function subtractVectors(a: Vector2, b: Vector2): Vector2 {
  return {
    x: a.x - b.x,
    y: a.y - b.y
  };
}

/**
 * Euclidean vector length.
 *
 * @param vector Cartesian vector.
 * @returns Magnitude `sqrt(x^2 + y^2)`.
 */
export function vectorMagnitude(vector: Vector2): number {
  return Math.hypot(vector.x, vector.y);
}
