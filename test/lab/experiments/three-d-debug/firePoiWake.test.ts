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

    // 3-point window → 2 segments: non-near-head (2) + near-head (2×3=6) = 8
    expect(result.particles).toHaveLength(8);
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

  it("verifies particle spatial distribution and near-head density in a straight trail", () => {
    const settings = {
      ...DEFAULT_FIRE_POI_SETTINGS,
      coreRadius: 0.2,
      emissionDensity: 2,
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

    // Non-near-head segment (y:0→1): emissionDensity=2 particles
    // Near-head segment (y:1→2): emissionDensity*3=6 particles
    expect(result.particles).toHaveLength(8);

    // Non-near-head particles are at t=0.25, t=0.75 along segment (y=0→1)
    // age = (3-1)/3 = 2/3, drag = (2/3)*2*0.08 = 0.10667 in +y direction
    expect(result.particles[0].position.y).toBeCloseTo(0.25 - (2 / 3) * 2 * 0.08);
    expect(result.particles[1].position.y).toBeCloseTo(0.75 - (2 / 3) * 2 * 0.08);
    expect(result.particles[0].heat).toBeCloseTo(1 - (2 / 3) * 1.2);
    // size = coreRadius * (0.4 + (1 - age)); older segments are smaller
    expect(result.particles[0].size).toBeCloseTo(0.2 * (0.4 + 1 / 3));

    // Near-head particles: age = (3-2)/3 = 1/3, no drag applied
    // size = coreRadius * (0.4 + (1 - age)); newest segment is the largest
    const nearHead = result.particles.slice(2);
    expect(nearHead).toHaveLength(6);
    expect(nearHead[0].heat).toBeCloseTo(1 - (1 / 3) * 1.2);
    expect(nearHead[0].size).toBeCloseTo(0.2 * (0.4 + 2 / 3));
  });

  it("distributes particles along each trail segment rather than clustering at the endpoint when spread is zero", () => {
    const settings = {
      ...DEFAULT_FIRE_POI_SETTINGS,
      emissionDensity: 3,
      spread: 0,
      turbulence: 0
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

    // The non-near-head segment (y: 0→1) emits 3 particles distributed along it
    const nonNearHeadParticles = result.particles.slice(0, 3);
    const yValues = nonNearHeadParticles.map((p) => p.position.y);

    // With spread=0, positions differ only by segment interpolation — they must be distinct
    expect(new Set(yValues.map((y) => y.toFixed(5))).size).toBe(3);

    // And they should span a significant portion of the segment
    const range = Math.max(...yValues) - Math.min(...yValues);
    expect(range).toBeGreaterThan(0.3);
  });

  it("applies 3x density boost to the newest trail segment", () => {
    const settings = {
      ...DEFAULT_FIRE_POI_SETTINGS,
      emissionDensity: 2,
      spread: 0,
      turbulence: 0,
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

    // Non-near-head: 2 particles; near-head: 2*3=6 particles → total 8
    expect(result.particles).toHaveLength(8);

    const nearHeadCount = result.particles.filter((p) => p.position.y > 0.9).length;
    const nonNearHeadCount = result.particles.filter((p) => p.position.y <= 0.9).length;

    expect(nearHeadCount).toBeGreaterThan(nonNearHeadCount);
  });

  it("places the first near-head particle close to the head with no visible gap", () => {
    const settings = {
      ...DEFAULT_FIRE_POI_SETTINGS,
      emissionDensity: 2,
      spread: 0,
      turbulence: 0,
      velocityStretch: 2,
      wakeLengthSteps: 4
    };

    const headPosition = { x: 0, y: 2, z: 0 };

    const result = buildFirePoiRigState({
      rigId: "left",
      headPosition,
      headTrail: [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
        headPosition
      ],
      settings
    });

    // Near-head segment runs y=1→2; emissionDensity*3=6 particles.
    // With source-biased sampling the first particle sits at t≈0.917 along that
    // segment → y≈1.917, and zero drag should be applied to near-head particles.
    // The gap from the fireball core must be less than 15 % of the segment length.
    const nearHead = result.particles.slice(2);
    const distanceFromHead = Math.abs(nearHead[0].position.y - headPosition.y);
    expect(distanceFromHead).toBeLessThan(0.15);
  });

  it("makes near-head particles larger than non-near-head particles", () => {
    const settings = {
      ...DEFAULT_FIRE_POI_SETTINGS,
      emissionDensity: 2,
      spread: 0,
      turbulence: 0,
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

    const nonNearHead = result.particles.slice(0, 2);
    const nearHead = result.particles.slice(2);

    const maxNonNearHeadSize = Math.max(...nonNearHead.map((p) => p.size));
    const minNearHeadSize = Math.min(...nearHead.map((p) => p.size));

    expect(minNearHeadSize).toBeGreaterThan(maxNonNearHeadSize);
  });

  it("does not apply backward drag to near-head particles even with high velocityStretch", () => {
    const settings = {
      ...DEFAULT_FIRE_POI_SETTINGS,
      emissionDensity: 2,
      spread: 0,
      turbulence: 0,
      velocityStretch: 10,
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

    // Near-head segment runs y=1→2.  With drag applied, the high velocityStretch
    // would push the first near-head particle back to y≈0.82 (visible gap).
    // With no drag the first near-head particle must remain above y=1.8.
    const nearHead = result.particles.slice(2);
    expect(nearHead[0].position.y).toBeGreaterThan(1.8);
  });
});