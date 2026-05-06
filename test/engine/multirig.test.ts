import { evalPreparedMultiRigSequenceAt, prepareMultiRigSequence } from "@/engine/multirig";
import { evalPreparedSequenceAt, prepareSequence } from "@/engine/sequence";
import type { Segment, SequenceSpec } from "@/engine/types";
import { describe, expect, it } from "vitest";

function makeSegment(handOmega: number, headOmega: number): Segment {
  return {
    durationUnits: 1,
    hand: {
      startPose: { phaseAbs: 0, radius: 1 },
      driver: { kind: "circle", omega: handOmega }
    },
    head: {
      startPose: { phaseAbs: 0, radius: 2 },
      driver: { kind: "circle", omega: headOmega }
    }
  };
}

function makeSequence(durations: number[], handOmega: number, headOmega: number): SequenceSpec {
  const segment = makeSegment(handOmega, headOmega);
  return {
    segments: durations.map((durationUnits) => ({
      ...segment,
      durationUnits
    }))
  };
}

describe("prepareMultiRigSequence", () => {
  it("rejects empty rig list", () => {
    const result = prepareMultiRigSequence({ rigs: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([{ code: "EMPTY_MULTI_RIG_SEQUENCE" }]);
    }
  });

  it("rejects duplicate rig ids", () => {
    const sequence = makeSequence([2], 1, 2);
    const result = prepareMultiRigSequence({
      rigs: [
        { rigId: "left", sequence },
        { rigId: "left", sequence }
      ]
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ code: "DUPLICATE_RIG_ID", index: 1, rigId: "left" });
    }
  });

  it("bubbles inner sequence validation errors with rig id", () => {
    const result = prepareMultiRigSequence({
      rigs: [{ rigId: "left", sequence: { segments: [] } }]
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([
        {
          code: "INVALID_RIG_SEQUENCE",
          index: 0,
          rigId: "left",
          errors: [{ code: "EMPTY_SEQUENCE" }]
        }
      ]);
    }
  });

  it("computes maxSequenceDuration from prepared rigs", () => {
    const result = prepareMultiRigSequence({
      rigs: [
        { rigId: "left", sequence: makeSequence([2], 1, 2) },
        { rigId: "right", sequence: makeSequence([2, 3], 10, 20) }
      ]
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.prepared.maxSequenceDuration).toBe(5);
      expect(result.prepared.rigs.map((rig) => rig.rigId)).toEqual(["left", "right"]);
    }
  });
});

describe("evalPreparedMultiRigSequenceAt", () => {
  it("matches single-rig evaluation for a one-rig multirig sequence", () => {
    const sequence = makeSequence([2, 3], 1, 2);
    const singlePreparedResult = prepareSequence(sequence);
    const multiPreparedResult = prepareMultiRigSequence({
      rigs: [{ rigId: "left", sequence }]
    });

    if (!singlePreparedResult.ok || !multiPreparedResult.ok) {
      throw new Error("Fixtures must prepare successfully");
    }

    const t = 7;
    const singleResult = evalPreparedSequenceAt(singlePreparedResult.prepared, t);
    const multiResult = evalPreparedMultiRigSequenceAt(multiPreparedResult.prepared, t);

    expect(singleResult.ok).toBe(true);
    expect(multiResult.ok).toBe(true);

    if (singleResult.ok && multiResult.ok) {
      expect(multiResult.poses.left).toEqual({
        pose: singleResult.pose,
        planeId: singleResult.planeId,
        ...(singleResult.planeSide !== undefined ? { planeSide: singleResult.planeSide } : {}),
        segmentIndex: singleResult.segmentIndex,
        tLocal: singleResult.tLocal
      });
    }
  });

  it("passes active plane ids through evaluated rig poses", () => {
    const preparedResult = prepareMultiRigSequence({
      rigs: [
        {
          rigId: "left",
          sequence: {
            segments: [{ ...makeSegment(1, 2), durationUnits: 2, planeId: "floor" }]
          }
        },
        {
          rigId: "right",
          sequence: { segments: [{ ...makeSegment(3, 4), durationUnits: 2 }] }
        }
      ]
    });
    if (!preparedResult.ok) {
      throw new Error("Fixture must prepare successfully");
    }

    const result = evalPreparedMultiRigSequenceAt(preparedResult.prepared, 1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.poses.left.planeId).toBe("floor");
      expect(result.poses.right.planeId).toBe("wall");
    }
  });

  it("passes active plane sides through evaluated rig poses", () => {
    const preparedResult = prepareMultiRigSequence({
      rigs: [
        {
          rigId: "left",
          sequence: {
            segments: [{ ...makeSegment(1, 2), durationUnits: 2, planeSide: "b" }]
          }
        },
        {
          rigId: "right",
          sequence: { segments: [{ ...makeSegment(3, 4), durationUnits: 2 }] }
        }
      ]
    });
    if (!preparedResult.ok) {
      throw new Error("Fixture must prepare successfully");
    }

    const result = evalPreparedMultiRigSequenceAt(preparedResult.prepared, 1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.poses.left.planeSide).toBe("b");
      expect(result.poses.right.planeSide).toBeUndefined();
      expect("planeSide" in result.poses.right).toBe(false);
    }
  });

  it("rejects invalid and negative times before evaluating rigs", () => {
    const preparedResult = prepareMultiRigSequence({
      rigs: [{ rigId: "left", sequence: makeSequence([2], 1, 2) }]
    });
    if (!preparedResult.ok) {
      throw new Error("Fixture must prepare successfully");
    }

    expect(evalPreparedMultiRigSequenceAt(preparedResult.prepared, Number.NaN)).toEqual({
      ok: false,
      reason: "INVALID_TIME"
    });
    expect(evalPreparedMultiRigSequenceAt(preparedResult.prepared, -0.5)).toEqual({
      ok: false,
      reason: "NEGATIVE_TIME"
    });
  });

  it("wraps each rig independently using its own total duration", () => {
    const preparedResult = prepareMultiRigSequence({
      rigs: [
        { rigId: "left", sequence: makeSequence([2], 1, 2) },
        { rigId: "right", sequence: makeSequence([5], 10, 20) }
      ]
    });
    if (!preparedResult.ok) {
      throw new Error("Fixture must prepare successfully");
    }

    const result = evalPreparedMultiRigSequenceAt(preparedResult.prepared, 4);
    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.poses.left.segmentIndex).toBe(0);
      expect(result.poses.left.tLocal).toBe(0);
      expect(result.poses.left.pose.handPose.phaseAbs).toBeCloseTo(0);
      expect(result.poses.right.segmentIndex).toBe(0);
      expect(result.poses.right.tLocal).toBe(4);
      expect(result.poses.right.pose.handPose.phaseAbs).toBeCloseTo(40);
    }
  });

  it("is deterministic for repeated calls", () => {
    const preparedResult = prepareMultiRigSequence({
      rigs: [
        { rigId: "left", sequence: makeSequence([2], 1, 2) },
        { rigId: "right", sequence: makeSequence([5], 10, 20) }
      ]
    });
    if (!preparedResult.ok) {
      throw new Error("Fixture must prepare successfully");
    }

    const t = 9.25;
    const a = evalPreparedMultiRigSequenceAt(preparedResult.prepared, t);
    const b = evalPreparedMultiRigSequenceAt(preparedResult.prepared, t);
    expect(a).toEqual(b);
  });
});
