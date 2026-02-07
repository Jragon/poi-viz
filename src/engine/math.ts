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

export function beatsToSeconds(beats: number, bpm: number): number {
  assertFiniteNumber("beats", beats);
  assertPositiveNumber("bpm", bpm);
  return beats * (SECONDS_PER_MINUTE / bpm);
}

/**
 * Converts elapsed seconds into beat units using BPM.
 */
export function secondsToBeats(seconds: number, bpm: number): number {
  assertFiniteNumber("seconds", seconds);
  assertPositiveNumber("bpm", bpm);
  return seconds * (bpm / SECONDS_PER_MINUTE);
}

/**
 * Converts a sample frequency (samples/second) into a deterministic beat step.
 */
export function sampleHzToStepBeats(sampleHz: number, bpm: number): number {
  assertPositiveNumber("sampleHz", sampleHz);
  return secondsToBeats(ONE_SECOND / sampleHz, bpm);
}

/**
 * Converts trail window length from beats to seconds.
 */
export function getTrailSeconds(trailBeats: number, bpm: number): number {
  assertNonNegativeNumber("trailBeats", trailBeats);
  return beatsToSeconds(trailBeats, bpm);
}

/**
 * Ring-buffer capacity for trail samples:
 * ceil(trailSampleHz * trailSeconds).
 */
export function getTrailCapacity(trailSampleHz: number, trailBeats: number, bpm: number): number {
  assertPositiveNumber("trailSampleHz", trailSampleHz);
  const trailSeconds = getTrailSeconds(trailBeats, bpm);
  return Math.ceil(trailSampleHz * trailSeconds);
}

/**
 * Converts polar coordinates to Cartesian vector.
 */
export function vectorFromPolar(radius: number, angle: number): Vector2 {
  assertFiniteNumber("radius", radius);
  assertFiniteNumber("angle", angle);
  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle)
  };
}

export function addVectors(a: Vector2, b: Vector2): Vector2 {
  return {
    x: a.x + b.x,
    y: a.y + b.y
  };
}

export function subtractVectors(a: Vector2, b: Vector2): Vector2 {
  return {
    x: a.x - b.x,
    y: a.y - b.y
  };
}

/**
 * Euclidean vector length.
 */
export function vectorMagnitude(vector: Vector2): number {
  return Math.hypot(vector.x, vector.y);
}
