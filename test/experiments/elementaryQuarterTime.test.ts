import { evalPreparedMultiRigSequenceAt, prepareMultiRigSequence } from "@/engine/multirig";
import {
  buildElementaryQuarterTimeSequence,
  ELEMENTARY_QUARTER_ARCS,
  ELEMENTARY_TIMING_OPTIONS,
  getElementaryArcEndpointAxis,
  type ElementaryEndpointAxis,
  type ElementaryQuarterArcId,
  type ElementaryTimingMode
} from "@/experiments/quarterTime/elementaryQuarterTime";
import { describe, expect, it } from "vitest";

const LOOP_DURATION_UNITS = 0.5;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function axisFromPhase(phaseRad: number): ElementaryEndpointAxis {
  const normalizedDegrees = Math.round((((phaseRad * 180) / Math.PI) % 360) + 360) % 360;
  if (normalizedDegrees === 0 || normalizedDegrees === 180) {
    return "horizontal";
  }

  if (normalizedDegrees === 90 || normalizedDegrees === 270) {
    return "vertical";
  }

  throw new Error(`Expected a cardinal phase, got ${normalizedDegrees}`);
}

function getPreparedSequence(
  leftArcId: ElementaryQuarterArcId,
  rightArcId: ElementaryQuarterArcId,
  timingMode: ElementaryTimingMode
) {
  const sequence = buildElementaryQuarterTimeSequence({ leftArcId, rightArcId, timingMode });
  const prepared = prepareMultiRigSequence(sequence);

  expect(prepared.ok).toBe(true);
  if (!prepared.ok) {
    throw new Error(`expected sequence to prepare, got ${JSON.stringify(prepared.errors)}`);
  }

  return prepared.prepared;
}

describe("buildElementaryQuarterTimeSequence", () => {
  it("prepares every elementary left/right arc and timing combination", () => {
    for (const leftArc of ELEMENTARY_QUARTER_ARCS) {
      for (const rightArc of ELEMENTARY_QUARTER_ARCS) {
        for (const timing of ELEMENTARY_TIMING_OPTIONS) {
          const prepared = getPreparedSequence(leftArc.id, rightArc.id, timing.id);

          expect(prepared.maxSequenceDuration).toBe(LOOP_DURATION_UNITS);
          expect(prepared.rigs.map((rig) => rig.rigId)).toEqual(["left", "right"]);
          expect(prepared.rigs.flatMap((rig) => rig.prepared.placements)).toHaveLength(4);
        }
      }
    }
  });

  it("loops each hand back to its start pose", () => {
    const prepared = getPreparedSequence("270-0", "90-180", "quarter");
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

  it("preserves independent right arc selection", () => {
    const prepared = getPreparedSequence("0-90", "270-0", "quarter");
    const result = evalPreparedMultiRigSequenceAt(prepared, 0);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected start to evaluate");
    }

    expect(result.poses.left.pose.handPose.phaseAbs).toBeCloseTo(toRadians(0));
    expect(result.poses.right.pose.handPose.phaseAbs).toBeCloseTo(toRadians(270));
  });

  it.each([
    ["together", true],
    ["quarter", false]
  ] as const)("%s is defined by endpoint axis relation", (timingMode, shouldMatchAxis) => {
    for (const leftArc of ELEMENTARY_QUARTER_ARCS) {
      for (const rightArc of ELEMENTARY_QUARTER_ARCS) {
        const prepared = getPreparedSequence(leftArc.id, rightArc.id, timingMode);

        for (const t of [0, 0.25]) {
          const result = evalPreparedMultiRigSequenceAt(prepared, t);
          expect(result.ok).toBe(true);
          if (!result.ok) {
            throw new Error(`expected t=${t} to evaluate`);
          }

          const leftAxis = axisFromPhase(result.poses.left.pose.handPose.phaseAbs);
          const rightAxis = axisFromPhase(result.poses.right.pose.handPose.phaseAbs);
          expect(rightAxis === leftAxis).toBe(shouldMatchAxis);
        }
      }
    }
  });

  it.each([
    ["0-90", "0-90", "quarter", 0, 90, 90, 0],
    ["0-90", "90-180", "quarter", 0, 90, 90, 180],
    ["0-90", "180-270", "together", 0, 180, 90, 270],
    ["0-90", "270-0", "together", 0, 360, 90, 270]
  ] as const)(
    "matches concrete %s / %s / %s checkpoints",
    (leftArcId, rightArcId, timingMode, leftT0, rightT0, leftT1, rightT1) => {
      const prepared = getPreparedSequence(leftArcId, rightArcId, timingMode);
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

  it("classifies arc endpoints by horizontal and vertical axis", () => {
    expect(getElementaryArcEndpointAxis("0-90", "start")).toBe("horizontal");
    expect(getElementaryArcEndpointAxis("0-90", "end")).toBe("vertical");
    expect(getElementaryArcEndpointAxis("90-180", "start")).toBe("vertical");
    expect(getElementaryArcEndpointAxis("90-180", "end")).toBe("horizontal");
  });
});
