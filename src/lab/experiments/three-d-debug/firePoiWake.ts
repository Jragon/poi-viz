import type { RigId, Vec3 } from "@/engine/types";

import type { FirePoiSettings } from "./firePoiSettings";

const POINT_MATCH_EPSILON = 1e-6;

export interface FirePoiWakeParticle {
  readonly position: Vec3;
  readonly heat: number;
  readonly size: number;
}

export interface FirePoiRigState {
  readonly corePosition: Vec3;
  readonly flameDirection: Vec3;
  readonly flameScale: Vec3;
  readonly particles: FirePoiWakeParticle[];
}

export type FirePoiWakeSettings = Pick<
  FirePoiSettings,
  | "coreRadius"
  | "wakeLengthSteps"
  | "emissionDensity"
  | "turbulence"
  | "spread"
  | "fadeRate"
  | "velocityStretch"
>;

export interface BuildFirePoiRigStateInput {
  readonly rigId: RigId;
  readonly headPosition: Vec3;
  readonly headTrail: readonly Vec3[];
  readonly settings: FirePoiWakeSettings;
}

function normalizeVector(vector: Vec3): Vec3 {
  const length = Math.hypot(vector.x, vector.y, vector.z);

  if (length <= 1e-6) {
    return { x: 0, y: 1, z: 0 };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length
  };
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z
  };
}

function pointsMatch(a: Vec3 | undefined, b: Vec3): boolean {
  if (!a) {
    return false;
  }

  return (
    Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) <= POINT_MATCH_EPSILON
  );
}

function buildTrailWindow(headTrail: readonly Vec3[], headPosition: Vec3, maxPoints: number): Vec3[] {
  const boundedTrail = headTrail.slice(-maxPoints);

  if (pointsMatch(boundedTrail[boundedTrail.length - 1], headPosition)) {
    return [...boundedTrail.slice(0, -1), headPosition];
  }

  return [...boundedTrail, headPosition].slice(-maxPoints);
}

function seededUnit(seed: string): number {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return ((hash >>> 0) % 10_000) / 10_000;
}

function jitter(seed: string): Vec3 {
  const x = seededUnit(`${seed}:x`) * 2 - 1;
  const y = seededUnit(`${seed}:y`) * 2 - 1;
  const z = seededUnit(`${seed}:z`) * 2 - 1;

  return normalizeVector({ x, y, z });
}

export function buildFirePoiRigState(input: BuildFirePoiRigStateInput): FirePoiRigState {
  const trail = buildTrailWindow(
    input.headTrail,
    input.headPosition,
    input.settings.wakeLengthSteps
  );
  const tail = trail[trail.length - 2] ?? input.headPosition;
  const direction = normalizeVector(subtract(input.headPosition, tail));

  if (trail.length < 2) {
    return {
      corePosition: input.headPosition,
      flameDirection: direction,
      flameScale: {
        x: input.settings.coreRadius,
        y: input.settings.coreRadius * input.settings.velocityStretch,
        z: input.settings.coreRadius
      },
      particles: []
    };
  }

  const particles: FirePoiWakeParticle[] = [];

  for (let index = 1; index < trail.length; index += 1) {
    const point = trail[index];
    const age = (trail.length - index) / trail.length;
    const segmentDirection = normalizeVector(subtract(point, trail[index - 1]));

    for (let emission = 0; emission < input.settings.emissionDensity; emission += 1) {
      const seed = `${input.rigId}:${index}:${emission}`;
      const randomOffset = jitter(seed);
      const drag = age * input.settings.velocityStretch * 0.08;
      const spread = age * (input.settings.spread + input.settings.turbulence * 0.05);

      particles.push({
        position: {
          x: point.x - segmentDirection.x * drag + randomOffset.x * spread,
          y: point.y - segmentDirection.y * drag + randomOffset.y * spread,
          z: point.z - segmentDirection.z * drag + randomOffset.z * spread
        },
        heat: Math.max(0, 1 - age * input.settings.fadeRate),
        size: input.settings.coreRadius * (0.4 + age)
      });
    }
  }

  return {
    corePosition: input.headPosition,
    flameDirection: direction,
    flameScale: {
      x: input.settings.coreRadius,
      y: input.settings.coreRadius * input.settings.velocityStretch,
      z: input.settings.coreRadius
    },
    particles
  };
}