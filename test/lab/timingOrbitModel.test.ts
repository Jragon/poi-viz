import { evalPreparedMultiRigSequenceAt, prepareMultiRigSequence } from "@/engine/multirig";
import type { MultiRigSequence, SequenceSpec } from "@/engine/types";
import {
  buildTimingOrbitEvents,
  buildTimingOrbitSequence,
  findTimingOrbitCoincidences,
  getTimingOrbitPeriods,
  normalizeTimingOrbitOffset,
  resolveTimingOrbitHorizon,
  resolveTimingOrbitSharedStep,
  snapTimingOrbitOffset,
  timingOrbitPositionAt
} from "@/lab/experiments/timing-orbit/timingOrbitModel";
import { describe, expect, it } from "vitest";

const TAU = Math.PI * 2;

function circleSequence(durationUnits: number, phase = 0): SequenceSpec {
  return {
    segments: [
      {
        durationUnits,
        planeId: "wall",
        hand: {
          startPose: { phaseAbs: phase, radius: 0.5 },
          driver: { kind: "circle", omega: TAU / durationUnits }
        },
        head: {
          startPose: { phaseAbs: phase, radius: 1 },
          driver: { kind: "circle", omega: -TAU / durationUnits }
        }
      }
    ]
  };
}

function unequalCycleSource(): MultiRigSequence {
  return {
    rigs: [
      { rigId: "left", sequence: circleSequence(3) },
      { rigId: "right", sequence: circleSequence(5, Math.PI / 3) }
    ]
  };
}

describe("timing orbit model", () => {
  it("uses each track total as its independent cycle period", () => {
    expect(getTimingOrbitPeriods(unequalCycleSource())).toEqual({
      ok: true,
      periods: { left: 3, right: 5 }
    });
  });

  it("finds a bounded exact joint period for rational track durations", () => {
    expect(resolveTimingOrbitHorizon({ left: 3, right: 5 })).toEqual({
      kind: "joint-period",
      duration: 15,
      leftRepeats: 5,
      rightRepeats: 3
    });
  });

  it("falls back to a bounded observation window without a small joint period", () => {
    expect(resolveTimingOrbitHorizon({ left: 1, right: Math.SQRT2 }, 8, 20)).toEqual({
      kind: "bounded-window",
      duration: Math.SQRT2,
      reason: "NO_SMALL_JOINT_PERIOD"
    });
  });

  it("builds independent landmark trains with unequal widths", () => {
    const left = buildTimingOrbitEvents(3, 3, 15);
    const right = buildTimingOrbitEvents(5, 10, 15);

    expect(left).toHaveLength(15);
    expect(right).toHaveLength(30);
    expect(left.slice(0, 4)).toEqual([
      { time: 0, landmarkIndex: 0 },
      { time: 1, landmarkIndex: 1 },
      { time: 2, landmarkIndex: 2 },
      { time: 3, landmarkIndex: 0 }
    ]);
    expect(right.slice(0, 4)).toEqual([
      { time: 0, landmarkIndex: 0 },
      { time: 0.5, landmarkIndex: 1 },
      { time: 1, landmarkIndex: 2 },
      { time: 1.5, landmarkIndex: 3 }
    ]);
    expect(findTimingOrbitCoincidences(left, right)).toHaveLength(15);
  });

  it("moves the right landmark train by the same offset used for playback", () => {
    const events = buildTimingOrbitEvents(5, 10, 3, 0.5);
    expect(events.slice(0, 3)).toEqual([
      { time: 0, landmarkIndex: 1 },
      { time: 0.5, landmarkIndex: 2 },
      { time: 1, landmarkIndex: 3 }
    ]);
  });

  it("derives a practical shared snap step from the joint timing grid", () => {
    const horizon = resolveTimingOrbitHorizon({ left: 3, right: 5 });
    expect(resolveTimingOrbitSharedStep(horizon, 3, 10)).toBe(0.5);
    expect(snapTimingOrbitOffset(1.26, 0.5, 5)).toBe(1.5);
    expect(normalizeTimingOrbitOffset(5.5, 5)).toBe(0.5);
  });

  it("describes the current interval within each track's own quantization", () => {
    expect(timingOrbitPositionAt(1.25, 3, 3)).toMatchObject({
      localTime: 1.25,
      previousLandmarkIndex: 1,
      nextLandmarkIndex: 2,
      intervalProgress: 0.25
    });
    expect(timingOrbitPositionAt(0, 5, 10, 0.5)).toMatchObject({
      localTime: 0.5,
      previousLandmarkIndex: 1,
      nextLandmarkIndex: 2,
      intervalProgress: 0
    });
  });

  it("builds a deterministic 15-unit observation without mutating the source", () => {
    const source = unequalCycleSource();
    const originalSnapshot = JSON.stringify(source);
    const result = buildTimingOrbitSequence(source, 15, 0.5);
    expect(result.ok).toBe(true);
    expect(JSON.stringify(source)).toBe(originalSnapshot);
    if (!result.ok) throw new Error("Expected timing orbit sequence");

    const prepared = prepareMultiRigSequence(result.sequence);
    const originalPrepared = prepareMultiRigSequence(source);
    if (!prepared.ok || !originalPrepared.ok) throw new Error("Expected sequences to prepare");

    expect(prepared.prepared.maxSequenceDuration).toBe(15);
    const observed = evalPreparedMultiRigSequenceAt(prepared.prepared, 2);
    const originalAtLeftTime = evalPreparedMultiRigSequenceAt(originalPrepared.prepared, 2);
    const originalAtRightTime = evalPreparedMultiRigSequenceAt(originalPrepared.prepared, 2.5);
    if (!observed.ok || !originalAtLeftTime.ok || !originalAtRightTime.ok) {
      throw new Error("Expected sequences to evaluate");
    }

    expect(observed.poses.left?.pose).toEqual(originalAtLeftTime.poses.left?.pose);
    expect(observed.poses.right?.pose).toEqual(originalAtRightTime.poses.right?.pose);
  });

  it("rejects patterns without both authored track ids", () => {
    const source: MultiRigSequence = {
      rigs: [{ rigId: "left", sequence: circleSequence(1) }]
    };
    expect(getTimingOrbitPeriods(source)).toEqual({
      ok: false,
      reason: "MISSING_RIGHT_TRACK"
    });
    expect(buildTimingOrbitSequence(source, 1, 0)).toEqual({
      ok: false,
      reason: "MISSING_RIGHT_TRACK"
    });
  });
});
