import { prepareSequence } from "@/engine/sequence";
import {
  compileStallPattern,
  type StallGraphDiagnostic
} from "@/lab/experiments/qt-stall-graph/compileStallGraph";
import {
  STALL_PATTERN_VERSION,
  type StallPatternDraft
} from "@/lab/experiments/qt-stall-graph/stallPattern";
import { describe, expect, it } from "vitest";

function pattern(
  left: StallPatternDraft["tracks"]["left"],
  right: StallPatternDraft["tracks"]["right"]
): StallPatternDraft {
  const beatCount = left?.length ?? right?.length ?? 4;
  return { version: STALL_PATTERN_VERSION, beatCount, tracks: { left, right } };
}

function wallFlower(): StallPatternDraft {
  return pattern(["U", "R", "D", "L"], ["R", "D", "L", "U"]);
}

describe("compileStallPattern — wall 4-petal flower", () => {
  it("compiles deterministically without diagnostics", () => {
    const first = compileStallPattern(wallFlower());
    const second = compileStallPattern(wallFlower());

    expect(first.diagnostics).toHaveLength(0);
    expect(first.sequence).not.toBeNull();
    expect(second.sequence).toEqual(first.sequence);
  });

  it("produces four wall-plane segments per hand", () => {
    const { sequence } = compileStallPattern(wallFlower());

    expect(sequence?.rigs.map((rig) => rig.rigId)).toEqual(["left", "right"]);
    for (const rig of sequence?.rigs ?? []) {
      expect(rig.sequence.segments).toHaveLength(4);
      expect(rig.sequence.segments.every((segment) => segment.planeId === "wall")).toBe(true);
    }
  });

  it("produces engine-valid one-unit sequences", () => {
    const { sequence } = compileStallPattern(wallFlower());

    for (const rig of sequence?.rigs ?? []) {
      const prepared = prepareSequence(rig.sequence);
      expect(prepared.ok).toBe(true);
      if (prepared.ok) expect(prepared.prepared.totalDuration).toBeCloseTo(1, 12);
    }
  });
});

describe("compileStallPattern — mixed planes", () => {
  const mixedPattern = pattern(["U", "R", "D", "L"], ["F", "U", "B", "D"]);

  it("accepts back-hemisphere wheel arcs", () => {
    const result = compileStallPattern(mixedPattern);

    expect(result.diagnostics).toHaveLength(0);
    expect(result.sequence).not.toBeNull();
  });

  it("keeps each hand on the resolved plane", () => {
    const { sequence } = compileStallPattern(mixedPattern);
    const left = sequence?.rigs.find((rig) => rig.rigId === "left");
    const right = sequence?.rigs.find((rig) => rig.rigId === "right");

    expect(left?.sequence.segments.every((segment) => segment.planeId === "wall")).toBe(true);
    expect(right?.sequence.segments.every((segment) => segment.planeId === "wheel")).toBe(true);
  });
});

describe("compileStallPattern — diagnostics", () => {
  it("reports empty present tracks and no valid hands", () => {
    const { sequence, diagnostics } = compileStallPattern(pattern([null, null], [null, null]));

    expect(sequence).toBeNull();
    expect(diagnostics).toEqual([
      { code: "EMPTY_TRACK", hand: "left" },
      { code: "EMPTY_TRACK", hand: "right" },
      { code: "NO_VALID_HANDS" }
    ]);
  });

  it("reports one-mark tracks", () => {
    const { sequence, diagnostics } = compileStallPattern(pattern(["U", null], ["R", null]));

    expect(sequence).toBeNull();
    expect(diagnostics).toEqual([
      { code: "SINGLE_MARK_TRACK", hand: "left" },
      { code: "SINGLE_MARK_TRACK", hand: "right" },
      { code: "NO_VALID_HANDS" }
    ]);
  });

  it("reports every missing beat in a present track", () => {
    const { sequence, diagnostics } = compileStallPattern(pattern(["U", "R", null, null], null));

    expect(sequence).toBeNull();
    expect(
      diagnostics.filter(
        (diagnostic: StallGraphDiagnostic) => diagnostic.code === "MISSING_ROW_MARK"
      )
    ).toEqual([
      { code: "MISSING_ROW_MARK", hand: "left", beatIndex: 2 },
      { code: "MISSING_ROW_MARK", hand: "left", beatIndex: 3 }
    ]);
  });

  it("reports illegal edges without silently correcting them", () => {
    const { sequence, diagnostics } = compileStallPattern(pattern(["U", "D"], null));

    expect(sequence).toBeNull();
    expect(diagnostics).toContainEqual({
      code: "ILLEGAL_EDGE",
      hand: "left",
      edgeIndex: 0,
      from: "U",
      to: "D"
    });
  });

  it("compiles a valid hand while retaining diagnostics for an invalid present hand", () => {
    const { sequence, diagnostics } = compileStallPattern(
      pattern(["U", "R", "D", "L"], [null, null, null, null])
    );

    expect(sequence?.rigs.map((rig) => rig.rigId)).toEqual(["left"]);
    expect(diagnostics).toEqual([{ code: "EMPTY_TRACK", hand: "right" }]);
  });

  it("treats an absent track as intentionally absent", () => {
    const { sequence, diagnostics } = compileStallPattern(pattern(["U", "R", "D", "L"], null));

    expect(sequence?.rigs.map((rig) => rig.rigId)).toEqual(["left"]);
    expect(diagnostics).toHaveLength(0);
  });

  it("rejects a draft with no hands", () => {
    const result = compileStallPattern({
      version: STALL_PATTERN_VERSION,
      beatCount: 4,
      tracks: { left: null, right: null }
    });

    expect(result).toEqual({
      sequence: null,
      diagnostics: [{ code: "NO_VALID_HANDS" }]
    });
  });
});
