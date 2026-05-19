import { describe, expect, it } from "vitest";

import type { Vec3 } from "@/engine/types";
import { DEFAULT_FIRE_POI_SETTINGS } from "@/lab/experiments/three-d-debug/firePoiSettings";
import { buildFirePoiRigState } from "@/lab/experiments/three-d-debug/firePoiWake";

const HEAD_TRAIL: Vec3[] = [
  { x: 0, y: 0.6, z: 0 },
  { x: 0.08, y: 0.68, z: 0.01 },
  { x: 0.16, y: 0.76, z: 0.02 },
  { x: 0.25, y: 0.84, z: 0.04 }
];

describe("firePoiWake", () => {
  it("rebuilds the same wake for the same rig, trail, and settings", () => {
    const first = buildFirePoiRigState({
      rigId: "left",
      headPosition: HEAD_TRAIL[HEAD_TRAIL.length - 1],
      headTrail: HEAD_TRAIL,
      settings: DEFAULT_FIRE_POI_SETTINGS
    });

    const second = buildFirePoiRigState({
      rigId: "left",
      headPosition: HEAD_TRAIL[HEAD_TRAIL.length - 1],
      headTrail: HEAD_TRAIL,
      settings: DEFAULT_FIRE_POI_SETTINGS
    });

    expect(second).toEqual(first);
  });

  it("returns no wake particles when there is not enough trail history", () => {
    const result = buildFirePoiRigState({
      rigId: "left",
      headPosition: { x: 0, y: 0.8, z: 0 },
      headTrail: [{ x: 0, y: 0.8, z: 0 }],
      settings: DEFAULT_FIRE_POI_SETTINGS
    });

    expect(result.particles).toEqual([]);
    expect(result.corePosition).toEqual({ x: 0, y: 0.8, z: 0 });
  });

  it("caps particle count by the bounded wake window without double-counting the current tip", () => {
    const settings = {
      ...DEFAULT_FIRE_POI_SETTINGS,
      wakeLengthSteps: 3,
      emissionDensity: 2
    };

    const result = buildFirePoiRigState({
      rigId: "left",
      headPosition: HEAD_TRAIL[HEAD_TRAIL.length - 1],
      headTrail: HEAD_TRAIL,
      settings
    });

    expect(result.particles).toHaveLength(4);
  });

  it("changes seeded wake output when the rig identity changes", () => {
    const left = buildFirePoiRigState({
      rigId: "left",
      headPosition: HEAD_TRAIL[HEAD_TRAIL.length - 1],
      headTrail: HEAD_TRAIL,
      settings: DEFAULT_FIRE_POI_SETTINGS
    });

    const right = buildFirePoiRigState({
      rigId: "right",
      headPosition: HEAD_TRAIL[HEAD_TRAIL.length - 1],
      headTrail: HEAD_TRAIL,
      settings: DEFAULT_FIRE_POI_SETTINGS
    });

    expect(right.particles).toHaveLength(left.particles.length);
    expect(right.particles).not.toEqual(left.particles);
  });

  it("treats tiny tip drift as the same final trail point", () => {
    const driftedTrail: Vec3[] = [
      HEAD_TRAIL[0],
      HEAD_TRAIL[1],
      HEAD_TRAIL[2],
      {
        x: HEAD_TRAIL[3].x + 1e-8,
        y: HEAD_TRAIL[3].y - 1e-8,
        z: HEAD_TRAIL[3].z + 1e-8
      }
    ];

    const exact = buildFirePoiRigState({
      rigId: "left",
      headPosition: HEAD_TRAIL[3],
      headTrail: HEAD_TRAIL,
      settings: DEFAULT_FIRE_POI_SETTINGS
    });

    const drifted = buildFirePoiRigState({
      rigId: "left",
      headPosition: HEAD_TRAIL[3],
      headTrail: driftedTrail,
      settings: DEFAULT_FIRE_POI_SETTINGS
    });

    expect(drifted).toEqual(exact);
  });

  it("preserves straight-trail wake math for drag, fade, size, and flame scale", () => {
    const settings = {
      ...DEFAULT_FIRE_POI_SETTINGS,
      coreRadius: 0.2,
      emissionDensity: 1,
      fadeRate: 1.2,
      spread: 0,
      turbulence: 0,
      velocityStretch: 2,
      wakeLengthSteps: 4
    };

    const result = buildFirePoiRigState({
      rigId: "left",
      headPosition: { x: 0, y: 2, z: 0 },
      headTrail: [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
        { x: 0, y: 2, z: 0 }
      ],
      settings
    });

    expect(result.flameScale).toEqual({ x: 0.2, y: 0.4, z: 0.2 });
    expect(result.flameDirection).toEqual({ x: 0, y: 1, z: 0 });
    expect(result.particles).toHaveLength(2);
    expect(result.particles[0]).toMatchObject({
      position: { x: 0, y: 1 - (2 / 3) * 2 * 0.08, z: 0 },
      heat: 1 - (2 / 3) * 1.2,
      size: 0.2 * (0.4 + 2 / 3)
    });
    expect(result.particles[1]).toMatchObject({
      position: { x: 0, y: 2 - (1 / 3) * 2 * 0.08, z: 0 },
      heat: 1 - (1 / 3) * 1.2,
      size: 0.2 * (0.4 + 1 / 3)
    });
  });
});