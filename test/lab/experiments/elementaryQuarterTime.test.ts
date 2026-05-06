import { evalPreparedMultiRigSequenceAt, prepareMultiRigSequence } from "@/engine/multirig";
import type { PlaneId } from "@/engine/types";
import {
  buildElementaryQuarterTimeSequence,
  ELEMENTARY_PLANE_OPTIONS,
  ELEMENTARY_TIMING_OPTIONS,
  getAvailableElementaryArcIds,
  getElementaryArcEndpointWorldAxis,
  isElementaryTimingAvailable,
  type ElementaryQuarterArcId,
  type ElementaryTimingMode,
  type ElementaryWorldAxis
} from "@/lab/experiments/quarter-time/elementaryQuarterTime";
import { describe, expect, it } from "vitest";

const LOOP_DURATION_UNITS = 0.5;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function axisFromPhase(planeId: PlaneId, phaseRad: number): ElementaryWorldAxis {
  const normalizedDegrees = Math.round((((phaseRad * 180) / Math.PI) % 360) + 360) % 360;
  const localAxis = normalizedDegrees === 0 || normalizedDegrees === 180 ? "x" : "y";

  switch (planeId) {
    case "wall":
      return localAxis === "x" ? "x" : "y";
    case "wheel":
      return localAxis === "x" ? "z" : "y";
    case "floor":
      return localAxis === "x" ? "x" : "z";
  }
}

function getPreparedSequence(
  leftPlaneId: PlaneId,
  leftArcId: ElementaryQuarterArcId,
  rightPlaneId: PlaneId,
  rightArcId: ElementaryQuarterArcId,
  timingMode: ElementaryTimingMode
) {
  const sequence = buildElementaryQuarterTimeSequence({
    leftPlaneId,
    leftArcId,
    rightPlaneId,
    rightArcId,
    timingMode
  });
  const prepared = prepareMultiRigSequence(sequence);

  expect(prepared.ok).toBe(true);
  if (!prepared.ok) {
    throw new Error(`expected sequence to prepare, got ${JSON.stringify(prepared.errors)}`);
  }

  return prepared.prepared;
}

describe("buildElementaryQuarterTimeSequence", () => {
  it("prepares every available elementary left/right arc and timing combination", () => {
    for (const leftPlane of ELEMENTARY_PLANE_OPTIONS) {
      for (const rightPlane of ELEMENTARY_PLANE_OPTIONS) {
        for (const leftArcId of getAvailableElementaryArcIds(leftPlane.id)) {
          for (const rightArcId of getAvailableElementaryArcIds(rightPlane.id)) {
            for (const timing of ELEMENTARY_TIMING_OPTIONS) {
              const available = isElementaryTimingAvailable({
                leftPlaneId: leftPlane.id,
                leftArcId,
                rightPlaneId: rightPlane.id,
                rightArcId,
                timingMode: timing.id
              });
              if (!available) continue;

              const prepared = getPreparedSequence(
                leftPlane.id,
                leftArcId,
                rightPlane.id,
                rightArcId,
                timing.id
              );

              expect(prepared.maxSequenceDuration).toBe(LOOP_DURATION_UNITS);
              expect(prepared.rigs.map((rig) => rig.rigId)).toEqual(["left", "right"]);
              expect(prepared.rigs.flatMap((rig) => rig.prepared.segments)).toHaveLength(4);
            }
          }
        }
      }
    }
  });

  it("preserves independent per-hand planes in generated segments", () => {
    const sequence = buildElementaryQuarterTimeSequence({
      leftPlaneId: "wheel",
      leftArcId: "0-90",
      rightPlaneId: "floor",
      rightArcId: "90-180",
      timingMode: "quarter"
    });

    expect(sequence.rigs[0].sequence.segments.map((segment) => segment.planeId)).toEqual([
      "wheel",
      "wheel"
    ]);
    expect(sequence.rigs[1].sequence.segments.map((segment) => segment.planeId)).toEqual([
      "floor",
      "floor"
    ]);
  });

  it("loops each hand back to its start pose", () => {
    const prepared = getPreparedSequence("floor", "90-180", "wheel", "270-0", "quarter");
    const start = evalPreparedMultiRigSequenceAt(prepared, 0);
    const loopBoundary = evalPreparedMultiRigSequenceAt(prepared, LOOP_DURATION_UNITS);

    expect(start.ok).toBe(true);
    expect(loopBoundary.ok).toBe(true);
    if (!start.ok || !loopBoundary.ok) {
      throw new Error("expected start and loop boundary to evaluate");
    }

    expect(loopBoundary.poses.left.pose).toEqual(start.poses.left.pose);
    expect(loopBoundary.poses.right.pose).toEqual(start.poses.right.pose);
  });

  it.each([
    ["wall", ["0-90", "90-180", "180-270", "270-0"]],
    ["wheel", ["0-90", "270-0"]],
    ["floor", ["0-90", "90-180"]]
  ] as const)("enables only front arcs for %s", (planeId, expectedArcIds) => {
    expect(getAvailableElementaryArcIds(planeId)).toEqual(expectedArcIds);
  });

  it.each([
    ["wall", "0-90", "start", "x"],
    ["wall", "0-90", "end", "y"],
    ["wheel", "0-90", "start", "z"],
    ["wheel", "0-90", "end", "y"],
    ["floor", "0-90", "start", "x"],
    ["floor", "0-90", "end", "z"]
  ] as const)("classifies %s %s %s as world %s", (planeId, arcId, endpoint, axis) => {
    expect(getElementaryArcEndpointWorldAxis(planeId, arcId, endpoint)).toBe(axis);
  });

  it.each(["same", "quarter"] as const)(
    "%s is defined by world-axis relation at movement checkpoints",
    (timingMode) => {
      for (const plane of ELEMENTARY_PLANE_OPTIONS) {
        for (const leftArcId of getAvailableElementaryArcIds(plane.id)) {
          for (const rightArcId of getAvailableElementaryArcIds(plane.id)) {
            const prepared = getPreparedSequence(
              plane.id,
              leftArcId,
              plane.id,
              rightArcId,
              timingMode
            );
            const checkpointAxisMatches: boolean[] = [];

            for (const t of [0, 0.25]) {
              const result = evalPreparedMultiRigSequenceAt(prepared, t);
              expect(result.ok).toBe(true);
              if (!result.ok) {
                throw new Error(`expected t=${t} to evaluate`);
              }

              const leftAxis = axisFromPhase(plane.id, result.poses.left.pose.handPose.phaseAbs);
              const rightAxis = axisFromPhase(plane.id, result.poses.right.pose.handPose.phaseAbs);
              checkpointAxisMatches.push(rightAxis === leftAxis);
            }

            if (timingMode === "same") {
              expect(checkpointAxisMatches.some(Boolean)).toBe(true);
            } else {
              expect(checkpointAxisMatches).toEqual([false, false]);
            }
          }
        }
      }
    }
  );

  it("allows same-time for mixed planes when either checkpoint can share an axis", () => {
    expect(
      isElementaryTimingAvailable({
        leftPlaneId: "wall",
        leftArcId: "0-90",
        rightPlaneId: "wheel",
        rightArcId: "0-90",
        timingMode: "same"
      })
    ).toBe(true);
    expect(
      isElementaryTimingAvailable({
        leftPlaneId: "wall",
        leftArcId: "0-90",
        rightPlaneId: "wheel",
        rightArcId: "0-90",
        timingMode: "quarter"
      })
    ).toBe(true);
  });

  it.each([
    ["0-90", "0-90", "quarter", 0, 90, 90, 0],
    ["0-90", "90-180", "quarter", 0, 90, 90, 180],
    ["0-90", "180-270", "same", 0, 180, 90, 270],
    ["0-90", "270-0", "same", 0, 360, 90, 270]
  ] as const)(
    "matches concrete wall %s / %s / %s checkpoints",
    (leftArcId, rightArcId, timingMode, leftT0, rightT0, leftT1, rightT1) => {
      const prepared = getPreparedSequence("wall", leftArcId, "wall", rightArcId, timingMode);
      const start = evalPreparedMultiRigSequenceAt(prepared, 0);
      const halfLoop = evalPreparedMultiRigSequenceAt(prepared, 0.25);

      expect(start.ok).toBe(true);
      expect(halfLoop.ok).toBe(true);
      if (!start.ok || !halfLoop.ok) {
        throw new Error("expected concrete timing samples to evaluate");
      }

      expect(start.poses.left.pose.handPose.phaseAbs).toBeCloseTo(toRadians(leftT0));
      expect(start.poses.right.pose.handPose.phaseAbs).toBeCloseTo(toRadians(rightT0));
      expect(halfLoop.poses.left.pose.handPose.phaseAbs).toBeCloseTo(toRadians(leftT1));
      expect(halfLoop.poses.right.pose.handPose.phaseAbs).toBeCloseTo(toRadians(rightT1));
    }
  );
});
