import { describe, expect, it } from "vitest";

import { toCartesianMultiRigPose } from "@/engine/cartesian";
import { evalPreparedMultiRigSequenceAt, prepareMultiRigSequence } from "@/engine/multirig";
import { projectWorldPoint } from "@/engine/planeProjection";
import type { MultiRigSequence, Segment, Vec2 } from "@/engine/types";
import { isContinuousAtLoopBoundary, sampleMultiRigTrailGrid } from "@/visualizer/trailSampling";

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

function degrees(value: number): number {
  return (value * Math.PI) / 180;
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

function expectVecClose(actual: Vec2 | undefined, expected: Vec2) {
  expect(actual?.x).toBeCloseTo(expected.x, 12);
  expect(actual?.y).toBeCloseTo(expected.y, 12);
}

function cartesianAt(sequence: ReturnType<typeof prepare>, t: number) {
  const result = evalPreparedMultiRigSequenceAt(sequence, t);
  if (!result.ok) throw new Error("evaluation failed");
  return toCartesianMultiRigPose(
    Object.fromEntries(Object.entries(result.poses).map(([rigId, value]) => [rigId, value.pose]))
  );
}

describe("trailSampling", () => {
  it("detects continuous loops using the exact left boundary", () => {
    const prepared = prepare(singleRigSequence(makeSegment(Math.PI * 2, Math.PI * 2), 1));

    expect(isContinuousAtLoopBoundary(prepared, 1)).toBe(true);
  });

  it("accepts authored decimal durations that return to the same displayed polar coordinates", () => {
    const durationUnits = 0.66666666;
    const prepared = prepare({
      rigs: [
        {
          rigId: "left",
          sequence: {
            segments: [
              {
                durationUnits,
                hand: {
                  startPose: { phaseAbs: degrees(240), radius: 1 },
                  driver: { kind: "circle", omega: Math.PI * 2 }
                },
                head: {
                  startPose: { phaseAbs: degrees(60), radius: 0.75 },
                  driver: { kind: "circle", omega: Math.PI * 8 }
                }
              },
              {
                durationUnits,
                hand: {
                  startPose: { phaseAbs: degrees(120), radius: 1 },
                  driver: { kind: "circle", omega: -Math.PI * 2 }
                },
                head: {
                  startPose: { phaseAbs: degrees(300), radius: 0.75 },
                  driver: { kind: "circle", omega: Math.PI * 4 }
                }
              }
            ]
          }
        }
      ]
    });

    expect(isContinuousAtLoopBoundary(prepared, prepared.maxSequenceDuration)).toBe(true);
  });

  it("does not treat exact D wraparound as continuity", () => {
    const prepared = prepare(singleRigSequence(makeSegment(1, 1), 1));

    expect(isContinuousAtLoopBoundary(prepared, 1)).toBe(false);
  });

  it("requires plane match for loop continuity", () => {
    const segment = makeSegment(0, 0);
    const prepared = prepare({
      rigs: [
        {
          rigId: "left",
          sequence: {
            segments: [
              { ...segment, durationUnits: 1, planeId: "wall" },
              { ...segment, durationUnits: 1, planeId: "floor" }
            ]
          }
        }
      ]
    });

    expect(isContinuousAtLoopBoundary(prepared, prepared.maxSequenceDuration)).toBe(false);
  });

  it("requires plane side match for loop continuity", () => {
    const segment = makeSegment(0, 0);
    const prepared = prepare({
      rigs: [
        {
          rigId: "left",
          sequence: {
            segments: [
              { ...segment, durationUnits: 1, planeId: "wall", planeSide: "a" },
              { ...segment, durationUnits: 1, planeId: "wall", planeSide: "b" }
            ]
          }
        }
      ]
    });

    expect(isContinuousAtLoopBoundary(prepared, prepared.maxSequenceDuration)).toBe(false);
  });

  it("does not use D minus dt as the continuity source", () => {
    const prepared = prepare(singleRigSequence(makeSegment(Math.PI * 2, Math.PI * 2), 1));
    const nearEnd = cartesianAt(prepared, 0.9);
    const start = cartesianAt(prepared, 0);

    expect(nearEnd.left.handPosition.x).not.toBeCloseTo(start.left.handPosition.x, 6);
    expect(isContinuousAtLoopBoundary(prepared, 1)).toBe(true);
  });

  it("uses the previous segment at internal boundaries", () => {
    const prepared = prepare({
      rigs: [
        {
          rigId: "left",
          sequence: {
            segments: [
              { ...makeSegment(Math.PI, Math.PI), durationUnits: 1 },
              { ...makeSegment(0, 0), durationUnits: 1 }
            ]
          }
        }
      ]
    });

    expect(isContinuousAtLoopBoundary(prepared, 1)).toBe(false);
  });

  it("uses shorter rig left boundaries at the transport boundary", () => {
    const prepared = prepare({
      rigs: [
        {
          rigId: "left",
          sequence: { segments: [{ ...makeSegment(Math.PI, Math.PI), durationUnits: 1 }] }
        },
        {
          rigId: "right",
          sequence: {
            segments: [{ ...makeSegment(Math.PI * 2, Math.PI * 2), durationUnits: 2 }]
          }
        }
      ]
    });

    expect(prepared.maxSequenceDuration).toBe(2);
    expect(isContinuousAtLoopBoundary(prepared, prepared.maxSequenceDuration)).toBe(false);
  });

  it("builds a wrapped fixed-size grid window", () => {
    const prepared = prepare(singleRigSequence(makeSegment(Math.PI * 2, Math.PI * 2), 1));
    const trails = sampleMultiRigTrailGrid(prepared, 0, 0.25, 3, 1);
    const atHalfTurn = cartesianAt(prepared, 0.5);
    const atThreeQuarterTurn = cartesianAt(prepared, 0.75);
    const atStart = cartesianAt(prepared, 0);

    expect(trails.left?.hand).toHaveLength(3);
    expectVecClose(trails.left?.hand[0], atHalfTurn.left.handPosition);
    expectVecClose(trails.left?.hand[1], atThreeQuarterTurn.left.handPosition);
    expectVecClose(trails.left?.hand[2], atStart.left.handPosition);
  });

  it("samples trail points with orthographic projection by default", () => {
    const prepared = prepare({
      rigs: [
        {
          rigId: "left",
          sequence: {
            segments: [{ ...makeSegment(0, 0), durationUnits: 1, planeId: "wheel" }]
          }
        }
      ]
    });

    const trails = sampleMultiRigTrailGrid(prepared, 0, 0.25, 2, null);
    expect(trails.left?.hand[0]).toEqual({ x: 0.12, y: 0 });
    expect(trails.left?.head[0]).toEqual({ x: 0.12, y: 0 });
  });

  it("samples trail points with tilted projection settings", () => {
    const prepared = prepare({
      rigs: [
        {
          rigId: "left",
          sequence: {
            segments: [{ ...makeSegment(0, 0), durationUnits: 1, planeId: "wheel" }]
          }
        }
      ]
    });

    const trails = sampleMultiRigTrailGrid(prepared, 0, 0.25, 2, null, {
      mode: "tilted",
      yawDeg: -25,
      pitchDeg: 18
    });
    expect(trails.left?.hand[0]).toEqual(
      projectWorldPoint({ x: 0.12, y: 0, z: 1 }, { mode: "tilted", yawDeg: -25, pitchDeg: 18 })
    );
  });

  it("samples trail points with plane side display separation", () => {
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
    const projectionSettings = { mode: "tilted", yawDeg: -25, pitchDeg: 18 } as const;

    const plain = sampleMultiRigTrailGrid(prepared, 0, 0.25, 2, null, projectionSettings);
    const separated = sampleMultiRigTrailGrid(prepared, 0, 0.25, 2, null, projectionSettings, {
      sideADepthWorld: 0.2,
      sideBDepthWorld: 0.2,
      defaultSide: null
    });

    expect(separated.left?.hand[0].x).not.toBeCloseTo(plain.left!.hand[0].x, 6);
    expect(separated.left?.hand[0].y).not.toBeCloseTo(plain.left!.hand[0].y, 6);
  });

  it("keeps unbounded sampling on the non-wrapped grid", () => {
    const prepared = prepare(singleRigSequence(makeSegment(Math.PI * 2, Math.PI * 2), 1));
    const auto = sampleMultiRigTrailGrid(prepared, 5, 0.25, null, 1);
    const off = sampleMultiRigTrailGrid(prepared, 5, 0.25, null, null);

    expect(auto).toEqual(off);
  });
});
