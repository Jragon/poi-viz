import type { Vector2 } from "@/engine/types";

export interface PatternTransform {
  centerX: number;
  centerY: number;
  scale: number;
}

export const ONE = 1;
export const TWO = ONE + ONE;
export const ZERO = 0;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function normalizeLoopBeat(tBeats: number, loopBeats: number): number {
  if (loopBeats <= ZERO) {
    return ZERO;
  }
  const normalized = tBeats % loopBeats;
  return normalized < ZERO ? normalized + loopBeats : normalized;
}

export function createPatternTransform(
  width: number,
  height: number,
  worldRadius: number,
  paddingFactor: number
): PatternTransform {
  const safeWorldRadius = Math.max(worldRadius * paddingFactor, ONE);
  const halfMinDimension = Math.min(width, height) / TWO;

  return {
    centerX: width / TWO,
    centerY: height / TWO,
    scale: halfMinDimension / safeWorldRadius
  };
}

export function worldToCanvas(point: Vector2, transform: PatternTransform): Vector2 {
  return {
    x: transform.centerX + point.x * transform.scale,
    y: transform.centerY - point.y * transform.scale
  };
}

export function beatToCanvasX(tBeats: number, loopBeats: number, left: number, width: number): number {
  if (loopBeats <= ZERO) {
    return left;
  }
  const normalizedBeat = normalizeLoopBeat(tBeats, loopBeats);
  return left + (normalizedBeat / loopBeats) * width;
}

