import { evalSegment } from "@/engine/engine";
import {
  evalPreparedSequenceAt,
  prepareSequence,
  validateSequenceStructure
} from "@/engine/sequence";
import type { Segment, SequenceSpec } from "@/engine/types";
import { describe, expect, it } from "vitest";

function makeSegment(handOmega: number, headOmega: number): Segment {
  return {
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

describe("validateSequenceStructure", () => {
  const base = makeSegment(1, 2);
  it("accepts a valid contiguous sequence", () => {
    const seq: SequenceSpec = {
      segments: [
        { segment: base, durationUnits: 2 },
        { segment: base, durationUnits: 3 }
      ]
    };
    const result = validateSequenceStructure(seq);
    if (!result.ok) {
      throw new Error(`expected valid sequence, got errors: ${JSON.stringify(result.errors)}`);
    }
  });
  it("rejects empty sequence", () => {
    const seq: SequenceSpec = { segments: [] };
    const result = validateSequenceStructure(seq);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ code: "EMPTY_SEQUENCE" });
    }
  });
  it("rejects non-positive durations", () => {
    const seq: SequenceSpec = {
      segments: [
        { segment: base, durationUnits: 0 },
        { segment: base, durationUnits: -1 }
      ]
    };
    const result = validateSequenceStructure(seq);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ code: "NON_POSITIVE_DURATION", index: 0 });
      expect(result.errors).toContainEqual({ code: "NON_POSITIVE_DURATION", index: 1 });
    }
  });
  it("rejects non-finite durations", () => {
    const seq: SequenceSpec = {
      segments: [
        { segment: base, durationUnits: Number.POSITIVE_INFINITY },
        { segment: base, durationUnits: Number.NaN }
      ]
    };
    const result = validateSequenceStructure(seq);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ code: "INVALID_DURATION_UNITS", index: 0 });
      expect(result.errors).toContainEqual({ code: "INVALID_DURATION_UNITS", index: 1 });
    }
  });
  it("reports errors in stable index order", () => {
    const seq: SequenceSpec = {
      segments: [
        { segment: base, durationUnits: Number.NaN },
        { segment: base, durationUnits: 0 },
        { segment: base, durationUnits: Number.POSITIVE_INFINITY },
        { segment: base, durationUnits: -10 }
      ]
    };
    const result = validateSequenceStructure(seq);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([
        { code: "INVALID_DURATION_UNITS", index: 0 },
        { code: "NON_POSITIVE_DURATION", index: 1 },
        { code: "INVALID_DURATION_UNITS", index: 2 },
        { code: "NON_POSITIVE_DURATION", index: 3 }
      ]);
    }
  });
  it("rejects invalid placement plane ids", () => {
    const seq = {
      segments: [{ segment: base, durationUnits: 1, planeId: "diagonal" }]
    } as unknown as SequenceSpec;
    const result = validateSequenceStructure(seq);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ code: "INVALID_PLANE_ID", index: 0 });
    }
  });
  it("accepts valid placement plane sides", () => {
    const seq: SequenceSpec = {
      segments: [
        { segment: base, durationUnits: 1, planeSide: "a" },
        { segment: base, durationUnits: 1, planeSide: "b" },
        { segment: base, durationUnits: 1 }
      ]
    };

    const result = validateSequenceStructure(seq);
    expect(result.ok).toBe(true);
  });
  it("rejects invalid placement plane sides", () => {
    const seq = {
      segments: [{ segment: base, durationUnits: 1, planeSide: "front" }]
    } as unknown as SequenceSpec;
    const result = validateSequenceStructure(seq);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ code: "INVALID_PLANE_SIDE", index: 0 });
    }
  });
  it("reports invalid plane side errors in stable placement order", () => {
    const seq = {
      segments: [
        { segment: base, durationUnits: 1, planeSide: "front" },
        { segment: base, durationUnits: 1, planeId: "diagonal", planeSide: "back" }
      ]
    } as unknown as SequenceSpec;
    const result = validateSequenceStructure(seq);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([
        { code: "INVALID_PLANE_SIDE", index: 0 },
        { code: "INVALID_PLANE_ID", index: 1 },
        { code: "INVALID_PLANE_SIDE", index: 1 }
      ]);
    }
  });
});
describe("prepareSequence", () => {
  const segA = makeSegment(1, 2);
  const segB = makeSegment(10, 20);
  it("returns validation errors for invalid sequence", () => {
    const seq: SequenceSpec = {
      segments: [{ segment: segA, durationUnits: 0 }]
    };
    const prepared = prepareSequence(seq);
    expect(prepared.ok).toBe(false);
    if (!prepared.ok) {
      expect(prepared.errors).toContainEqual({ code: "NON_POSITIVE_DURATION", index: 0 });
    }
  });
  it("returns prepared sequence for valid input", () => {
    const seq: SequenceSpec = {
      segments: [
        { segment: segA, durationUnits: 2 },
        { segment: segB, durationUnits: 3 }
      ]
    };
    const prepared = prepareSequence(seq);
    expect(prepared.ok).toBe(true);
    if (prepared.ok) {
      expect(prepared.prepared.totalDuration).toBe(5);
      expect(prepared.prepared.placements.length).toBe(2);
    }
  });
  it("defaults omitted placement planes to wall", () => {
    const seq: SequenceSpec = {
      segments: [{ segment: segA, durationUnits: 2 }]
    };
    const prepared = prepareSequence(seq);
    expect(prepared.ok).toBe(true);
    if (prepared.ok) {
      expect(prepared.prepared.placements[0].planeId).toBe("wall");
    }
  });
  it("preserves explicit placement planes", () => {
    const seq: SequenceSpec = {
      segments: [{ segment: segA, durationUnits: 2, planeId: "wheel" }]
    };
    const prepared = prepareSequence(seq);
    expect(prepared.ok).toBe(true);
    if (prepared.ok) {
      expect(prepared.prepared.placements[0].planeId).toBe("wheel");
    }
  });
  it("preserves explicit placement sides and leaves omitted sides unspecified", () => {
    const seq: SequenceSpec = {
      segments: [
        { segment: segA, durationUnits: 2, planeSide: "a" },
        { segment: segB, durationUnits: 3 }
      ]
    };
    const prepared = prepareSequence(seq);
    expect(prepared.ok).toBe(true);
    if (prepared.ok) {
      expect(prepared.prepared.placements[0].planeSide).toBe("a");
      expect(prepared.prepared.placements[1].planeSide).toBeUndefined();
    }
  });
});
describe("evalPreparedSequenceAt", () => {
  const segA = makeSegment(1, 2);
  const segB = makeSegment(10, 20);
  const seq: SequenceSpec = {
    segments: [
      { segment: segA, durationUnits: 2 },
      { segment: segB, durationUnits: 3 }
    ]
  };
  const preparedResult = prepareSequence(seq);
  if (!preparedResult.ok) {
    throw new Error("Test fixture sequence must be valid");
  }
  const prepared = preparedResult.prepared;
  it("returns INVALID_TIME for NaN and infinities", () => {
    expect(evalPreparedSequenceAt(prepared, Number.NaN)).toEqual({
      ok: false,
      reason: "INVALID_TIME"
    });
    expect(evalPreparedSequenceAt(prepared, Number.POSITIVE_INFINITY)).toEqual({
      ok: false,
      reason: "INVALID_TIME"
    });
    expect(evalPreparedSequenceAt(prepared, Number.NEGATIVE_INFINITY)).toEqual({
      ok: false,
      reason: "INVALID_TIME"
    });
  });
  it("returns NEGATIVE_TIME for negative time", () => {
    expect(evalPreparedSequenceAt(prepared, -0.001)).toEqual({
      ok: false,
      reason: "NEGATIVE_TIME"
    });
  });
  it("wraps at total duration and beyond", () => {
    expect(evalPreparedSequenceAt(prepared, 5)).toEqual(evalPreparedSequenceAt(prepared, 0));
    expect(evalPreparedSequenceAt(prepared, 6)).toEqual(evalPreparedSequenceAt(prepared, 1));
    expect(evalPreparedSequenceAt(prepared, 10)).toEqual(evalPreparedSequenceAt(prepared, 0));
  });
  it("evaluates first segment for time inside [0, d0)", () => {
    const tGlobal = 1.25;
    const result = evalPreparedSequenceAt(prepared, tGlobal);
    if (!result.ok) {
      throw new Error(`expected ok result, got ${result.reason}`);
    }
    expect(result.segmentIndex).toBe(0);
    expect(result.planeId).toBe("wall");
    expect(result.tLocal).toBeCloseTo(1.25, 12);
    expect(result.pose).toEqual(evalSegment(segA, 1.25));
  });
  it("returns the active plane for explicit placement planes", () => {
    const explicitPlanePrepared = prepareSequence({
      segments: [{ segment: segA, durationUnits: 2, planeId: "floor" }]
    });
    if (!explicitPlanePrepared.ok) {
      throw new Error("Test fixture sequence must be valid");
    }

    const result = evalPreparedSequenceAt(explicitPlanePrepared.prepared, 1);
    if (!result.ok) {
      throw new Error(`expected ok result, got ${result.reason}`);
    }

    expect(result.planeId).toBe("floor");
  });
  it("returns the active side for explicit placement sides", () => {
    const explicitSidePrepared = prepareSequence({
      segments: [{ segment: segA, durationUnits: 2, planeId: "wall", planeSide: "b" }]
    });
    if (!explicitSidePrepared.ok) {
      throw new Error("Test fixture sequence must be valid");
    }

    const result = evalPreparedSequenceAt(explicitSidePrepared.prepared, 1);
    if (!result.ok) {
      throw new Error(`expected ok result, got ${result.reason}`);
    }

    expect(result.planeSide).toBe("b");
  });
  it("leaves active side unspecified when placement side is omitted", () => {
    const result = evalPreparedSequenceAt(prepared, 1);
    if (!result.ok) {
      throw new Error(`expected ok result, got ${result.reason}`);
    }

    expect(result.planeSide).toBeUndefined();
    expect("planeSide" in result).toBe(false);
  });
  it("uses half-open boundary semantics: exact boundary selects next segment", () => {
    const tGlobal = 2;
    const result = evalPreparedSequenceAt(prepared, tGlobal);
    if (!result.ok) {
      throw new Error(`expected ok result, got ${result.reason}`);
    }
    expect(result.segmentIndex).toBe(1);
    expect(result.tLocal).toBe(0);
    expect(result.pose).toEqual(evalSegment(segB, 0));
  });
  it("uses half-open boundary semantics for active side", () => {
    const sidePrepared = prepareSequence({
      segments: [
        { segment: segA, durationUnits: 2, planeSide: "a" },
        { segment: segB, durationUnits: 3, planeSide: "b" }
      ]
    });
    if (!sidePrepared.ok) {
      throw new Error("Test fixture sequence must be valid");
    }

    const result = evalPreparedSequenceAt(sidePrepared.prepared, 2);
    if (!result.ok) {
      throw new Error(`expected ok result, got ${result.reason}`);
    }

    expect(result.segmentIndex).toBe(1);
    expect(result.planeSide).toBe("b");
  });
  it("evaluates second segment with shifted local time", () => {
    const tGlobal = 4;
    const result = evalPreparedSequenceAt(prepared, tGlobal);
    if (!result.ok) {
      throw new Error(`expected ok result, got ${result.reason}`);
    }
    expect(result.segmentIndex).toBe(1);
    expect(result.tLocal).toBe(2);
    expect(result.pose).toEqual(evalSegment(segB, 2));
  });
  it("is deterministic for repeated calls", () => {
    const tGlobal = 3.333;
    const a = evalPreparedSequenceAt(prepared, tGlobal);
    const b = evalPreparedSequenceAt(prepared, tGlobal);
    expect(a).toEqual(b);
  });
});
