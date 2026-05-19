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

const NEAR_HEAD_MULTIPLIER = 3;

export function buildFirePoiRigState(input: BuildFirePoiRigStateInput): FirePoiRigState {
  const trail = buildTrailWindow(
    input.headTrail,
    input.headPosition,
    input.settings.wakeLengthSteps
  );

  if (trail.length < 2) {
    return {
      corePosition: input.headPosition,
      particles: []
    };
  }

  const particles: FirePoiWakeParticle[] = [];

  for (let index = 1; index < trail.length; index += 1) {
    const from = trail[index - 1];
    const to = trail[index];
    const age = (trail.length - index) / trail.length;
    const segmentDirection = normalizeVector(subtract(to, from));
    const isNearHead = index === trail.length - 1;
    const segmentDensity = isNearHead
      ? input.settings.emissionDensity * NEAR_HEAD_MULTIPLIER
      : input.settings.emissionDensity;

    for (let emission = 0; emission < segmentDensity; emission += 1) {
      // Near-head segment: sample from the head end (t→1) back toward the older
      // end so the first particle sits close to the fireball core with no gap.
      const t = isNearHead
        ? 1.0 - (emission + 0.5) / segmentDensity
        : (emission + 0.5) / segmentDensity;
      const baseX = from.x + (to.x - from.x) * t;
      const baseY = from.y + (to.y - from.y) * t;
      const baseZ = from.z + (to.z - from.z) * t;
      const seed = `${input.rigId}:${index}:${emission}`;
      const randomOffset = jitter(seed);
      // No backward drag on the freshest segment — drag would pull the nearest
      // particles away from the fireball, creating a visible gap.
      const drag = isNearHead ? 0 : age * input.settings.velocityStretch * 0.08;
      const spread = age * (input.settings.spread + input.settings.turbulence * 0.05);

      particles.push({
        position: {
          x: baseX - segmentDirection.x * drag + randomOffset.x * spread,
          y: baseY - segmentDirection.y * drag + randomOffset.y * spread,
          z: baseZ - segmentDirection.z * drag + randomOffset.z * spread
        },
        heat: Math.max(0, 1 - age * input.settings.fadeRate),
        // Newest particles (age≈0) are the largest; older particles taper away.
        size: input.settings.coreRadius * (0.4 + (1 - age))
      });
    }
  }

  return {
    corePosition: input.headPosition,
    particles
  };
}