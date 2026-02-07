import type { HandId, HandsState } from "@/types/state";

/**
 * Cartesian point/vector in the wall plane.
 * Coordinate system: +x is right, +y is up.
 */
export interface Vector2 {
  x: number;
  y: number;
}

/**
 * Minimum input state required by the pure engine.
 * All speeds are in radians per beat.
 */
export interface EngineParams {
  bpm: number;
  hands: HandsState;
}

/**
 * Angular channels for one hand at one beat time.
 * - arm: absolute arm angle
 * - rel: poi angle relative to arm
 * - head: absolute head angle = arm + rel
 */
export interface HandAngles {
  arm: number;
  rel: number;
  head: number;
}

export type AnglesByHand = Record<HandId, HandAngles>;

/**
 * Position channels for one hand at one beat time.
 * - hand: hand point H_i(t)
 * - head: poi head point P_i(t)
 * - tether: vector P_i(t) - H_i(t)
 */
export interface HandPositions {
  hand: Vector2;
  head: Vector2;
  tether: Vector2;
}

export type PositionsByHand = Record<HandId, HandPositions>;

/**
 * Snapshot for one sampled beat during loop sampling.
 */
export interface LoopSample {
  tBeats: number;
  angles: AnglesByHand;
  positions: PositionsByHand;
}

/**
 * Trail sample point at a specific beat timestamp.
 */
export interface TrailPoint {
  tBeats: number;
  point: Vector2;
}

/**
 * Configuration for fixed-step deterministic trail sampling.
 */
export interface TrailSamplerConfig {
  bpm: number;
  trailBeats: number;
  trailSampleHz: number;
}
