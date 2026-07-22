import { describe, expect, it } from "vitest";

import { prepareMultiRigSequence } from "@/engine/multirig";
import type { MultiRigSequence, Segment, Vec3 } from "@/engine/types";
import {
  sampleMultiRigWorldTrailGrid,
  sampleMultiRigWorldTrails
} from "@/visualizer/worldTrailSampling";

function makeSegment(handOmega: number, headOmega: number, handPhase = 0, headPhase = 0): Segment {
  return {
    durationUnits: 1,
    hand: {
      startPose: { phaseAbs: handPhase, radius: 1 },
      driver: { kind: "circle", omega: handOmega }
    },
    head: {
      startPose: { phaseAbs: headPhase, radius: 1 },
      driver: { kind: "circle", omega: headOmega }
    }
  };
}

function prepare(sequence: MultiRigSequence) {
  const result = prepareMultiRigSequence(sequence);
  if (!result.ok) {
    throw new Error(`invalid fixture: ${JSON.stringify(result.errors)}`);
  }

  return result.prepared;
}

function singleRigSequence(segment: Segment, durationUnits: number): MultiRigSequence {
  return {
    rigs: [
      {
        rigId: "left",
        sequence: { segments: [{ ...segment, durationUnits }] }
      }
    ]
  };
}

function expectVecClose(actual: Vec3 | undefined, expected: Vec3) {
  expect(actual?.x).toBeCloseTo(expected.x, 12);
  expect(actual?.y).toBeCloseTo(expected.y, 12);
  expect(actual?.z).toBeCloseTo(expected.z, 12);
}

describe("worldTrailSampling", () => {
  it("builds a wrapped fixed-size world-space grid window", () => {
    const prepared = prepare(singleRigSequence(makeSegment(Math.PI * 2, Math.PI * 2), 1));

    const trails = sampleMultiRigWorldTrailGrid(prepared, 0, 0.25, 3, 1);

    expect(trails.left?.hand).toHaveLength(3);
    expectVecClose(trails.left?.hand[0], { x: -1, y: 0, z: 0.12 });
    expectVecClose(trails.left?.hand[1], { x: 0, y: -1, z: 0.12 });
    expectVecClose(trails.left?.hand[2], { x: 1, y: 0, z: 0.12 });
    expectVecClose(trails.left?.head[0], { x: -2, y: 0, z: 0.12 });
  });

  it("applies plane-side separation to sampled world points", () => {
    const prepared = prepare({
      rigs: [
        {
          rigId: "left",
          sequence: {
            segments: [{ ...makeSegment(0, 0), durationUnits: 1, planeId: "wall", planeSide: "b" }]
          }
        }
      ]
    });

    const plain = sampleMultiRigWorldTrailGrid(prepared, 0, 0.25, 2, null);
    const separated = sampleMultiRigWorldTrailGrid(prepared, 0, 0.25, 2, null, {
      sideADepthWorld: 0.2,
      sideBDepthWorld: 0.2,
      defaultSide: null
    });

    expectVecClose(plain.left?.hand[0], { x: 1, y: 0, z: -0.12 });
    expectVecClose(separated.left?.hand[0], { x: 1, y: 0, z: -0.2 });
    expectVecClose(separated.left?.head[0], { x: 2, y: 0, z: -0.2 });
  });

  it("appends the current unsnapped world-space tip", () => {
    const prepared = prepare(singleRigSequence(makeSegment(Math.PI * 2, Math.PI * 2), 1));

    const trails = sampleMultiRigWorldTrails(prepared, 0.625, 0.25);

    expect(trails.left?.hand).toHaveLength(4);
    expectVecClose(trails.left?.hand[3], {
      x: -Math.SQRT1_2,
      y: -Math.SQRT1_2,
      z: 0.12
    });
    expectVecClose(trails.left?.head[3], {
      x: -Math.SQRT2,
      y: -Math.SQRT2,
      z: 0.12
    });
  });

  it("keeps non-zero wrapped samples at large grid times", () => {
    const prepared = prepare(singleRigSequence(makeSegment(Math.PI * 2, Math.PI * 2), 1));

    const trails = sampleMultiRigWorldTrailGrid(prepared, 4_000_000_001, 0.25, 2, 1);

    expect(trails.left?.hand).toHaveLength(2);
    expectVecClose(trails.left?.hand[0], { x: 1, y: 0, z: 0.12 });
    expectVecClose(trails.left?.hand[1], { x: 0, y: 1, z: 0.12 });
  });

  it("keeps unbounded sampling when holdSteps is omitted", () => {
    const prepared = prepare(singleRigSequence(makeSegment(Math.PI * 2, Math.PI * 2), 1));

    const auto = sampleMultiRigWorldTrails(prepared, 1.25, 0.25, undefined, {
      loopMode: "auto",
      loopDuration: 1
    });
    const off = sampleMultiRigWorldTrails(prepared, 1.25, 0.25, undefined, {
      loopMode: "off",
      loopDuration: 1
    });

    expect(auto).toEqual(off);
  });

  it("does not append a duplicate current tip on exact grid times", () => {
    const prepared = prepare(singleRigSequence(makeSegment(Math.PI * 2, Math.PI * 2), 1));

    const trails = sampleMultiRigWorldTrails(prepared, 0.5, 0.25);

    expect(trails.left?.hand).toHaveLength(3);
    expectVecClose(trails.left?.hand[2], { x: -1, y: 0, z: 0.12 });
  });

  it("wraps in auto mode only when the loop boundary is continuous", () => {
    const continuous = prepare(singleRigSequence(makeSegment(Math.PI * 2, Math.PI * 2), 1));
    const discontinuous = prepare(singleRigSequence(makeSegment(1, 1), 1));

    const wrapped = sampleMultiRigWorldTrails(continuous, 0, 0.25, 3, {
      loopMode: "auto",
      loopDuration: 1
    });
    const notWrapped = sampleMultiRigWorldTrails(discontinuous, 0, 0.25, 3, {
      loopMode: "auto",
      loopDuration: 1
    });

    expect(wrapped.left?.hand).toHaveLength(3);
    expectVecClose(wrapped.left?.hand[0], { x: -1, y: 0, z: 0.12 });
    expectVecClose(wrapped.left?.hand[1], { x: 0, y: -1, z: 0.12 });
    expectVecClose(wrapped.left?.hand[2], { x: 1, y: 0, z: 0.12 });
    expect(notWrapped).toEqual({});
  });

  it("returns empty trails at t=0 when not wrapping", () => {
    const prepared = prepare(singleRigSequence(makeSegment(Math.PI * 2, Math.PI * 2), 1));

    expect(
      sampleMultiRigWorldTrails(prepared, 0, 0.25, 3, { loopMode: "off", loopDuration: 1 })
    ).toEqual({});
  });
});
