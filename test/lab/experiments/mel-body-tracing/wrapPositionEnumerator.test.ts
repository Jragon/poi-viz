import {
  DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS,
  buildBtbVisitRows,
  buildNormalVisitRows,
  createSeededRandom,
  generateWrapPositionGraph
} from "@/lab/experiments/mel-body-tracing/generators/wrapPositionEnumerator";
import { DEFAULT_POI_BEAT_COMPILER_OPTIONS, compilePoiBeatGraph } from "@/lab/experiments/mel-body-tracing/beat-graph/compileBeatGraph";
import type { PoiBeatGraph, PoiBeatHand, PoiBeatRow } from "@/lab/experiments/mel-body-tracing/beat-graph/types";
import { isValidWrapPair } from "@/lab/experiments/mel-body-tracing/explorers/wrapRules";
import { describe, expect, it } from "vitest";

function getTrackRows(graph: PoiBeatGraph, hand: PoiBeatHand): readonly PoiBeatRow[] {
  return graph.tracks.find((track) => track.hand === hand)?.rows ?? [];
}

function expectSequentialSteps(rows: readonly PoiBeatRow[]): void {
  expect(rows.map((row) => row.step)).toEqual(rows.map((_, step) => step));
}

function expectNoMoreThanTwoConsecutiveSameSurfaceRows(rows: readonly PoiBeatRow[]): void {
  let runKey = "";
  let runLength = 0;

  for (const row of rows) {
    const key = `${row.laneId}:${row.planeSide ?? ""}`;
    if (key === runKey) {
      runLength += 1;
    } else {
      runKey = key;
      runLength = 1;
    }

    expect(runLength).toBeLessThanOrEqual(2);
  }
}

function expectCompletedNormalVisitRows(
  rows: readonly PoiBeatRow[],
  positions: readonly Parameters<typeof buildNormalVisitRows>[0][],
  hand: PoiBeatHand,
  startStep: number
): void {
  const expectedRows = positions.flatMap((position, index) =>
    buildNormalVisitRows(position, hand, startStep + index * 3)
  );

  expect(rows.slice(startStep, startStep + expectedRows.length)).toEqual(expectedRows);
}

describe("wrapPositionEnumerator visit templates", () => {
  it("creates deterministic bounded pseudo-random values from a seed", () => {
    const a = createSeededRandom(1234);
    const b = createSeededRandom(1234);
    const c = createSeededRandom(4321);
    const values = [a(), a(), a()];

    expect(values).toEqual([0.7143076679203659, 0.20701311994343996, 0.7495418272446841]);
    expect(values).toEqual([b(), b(), b()]);
    expect(values).not.toEqual([c(), c(), c()]);
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it.each([Number.NaN, Infinity, -Infinity, 1.5])(
    "rejects non-finite or non-integer seed %s",
    (seed) => {
      expect(() => createSeededRandom(seed)).toThrow("Seed must be a finite integer");
    }
  );

  it("builds a normal front visit as position, position, center", () => {
    expect(buildNormalVisitRows("low-native", "right", 0)).toEqual([
      { step: 0, laneId: "right-low", planeSide: "b" },
      { step: 1, laneId: "right-low", planeSide: "b" },
      { step: 2, laneId: "center", planeSide: "a" }
    ]);
  });

  it("builds the low-native BTB visit with a front-compatible center exit", () => {
    expect(buildBtbVisitRows("low-native", "right", 0)).toEqual([
      { step: 0, laneId: "right-low", planeSide: "b" },
      { step: 1, laneId: "right-low", planeSide: "b" },
      { step: 2, laneId: "right-low", planeSide: "a" },
      { step: 3, laneId: "right-low", planeSide: "a" },
      { step: 4, laneId: "center", planeSide: "b" },
      { step: 5, laneId: "left-low", planeSide: "a" },
      { step: 6, laneId: "left-low", planeSide: "a" },
      { step: 7, laneId: "center", planeSide: "b" },
      { step: 8, laneId: "right-low", planeSide: "a" },
      { step: 9, laneId: "right-low", planeSide: "a" },
      { step: 10, laneId: "right-low", planeSide: "b" },
      { step: 11, laneId: "right-low", planeSide: "b" },
      { step: 12, laneId: "center", planeSide: "a" }
    ]);
  });

  it("builds the high-native BTB visit by staying at the same height", () => {
    expect(buildBtbVisitRows("high-native", "left", 3)).toEqual([
      { step: 3, laneId: "left-high", planeSide: "b" },
      { step: 4, laneId: "left-high", planeSide: "b" },
      { step: 5, laneId: "left-high", planeSide: "a" },
      { step: 6, laneId: "left-high", planeSide: "a" },
      { step: 7, laneId: "center", planeSide: "b" },
      { step: 8, laneId: "right-high", planeSide: "a" },
      { step: 9, laneId: "right-high", planeSide: "a" },
      { step: 10, laneId: "center", planeSide: "b" },
      { step: 11, laneId: "left-high", planeSide: "a" },
      { step: 12, laneId: "left-high", planeSide: "a" },
      { step: 13, laneId: "left-high", planeSide: "b" },
      { step: 14, laneId: "left-high", planeSide: "b" },
      { step: 15, laneId: "center", planeSide: "a" }
    ]);
  });
});

describe("generateWrapPositionGraph", () => {
  it("generates deterministic two-hand split-time-opposite graphs with btbChance 0", () => {
    const options = {
      ...DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS,
      targetPositionVisits: 8,
      seed: 77,
      btbChance: 0
    };

    const first = generateWrapPositionGraph(options);
    const second = generateWrapPositionGraph(options);
    const leftRows = getTrackRows(first.graph, "left");
    const rightRows = getTrackRows(first.graph, "right");

    expect(first).toEqual(second);
    expect(first.graph.tracks.map((track) => track.id)).toEqual(["left", "right"]);
    expect(first.graph.tracks.map((track) => track.poiDirection)).toEqual([
      "clockwise",
      "counterclockwise"
    ]);
    expect(first.graph.tracks.map((track) => track.initialPhase)).toEqual(["up", "up"]);
    expect(leftRows).toHaveLength(24);
    expect(rightRows).toHaveLength(24);
    expect(first.graph.cycleSteps).toBe(24);
    expect(first.visitedPositions.left).toHaveLength(8);
    expect(first.visitedPositions.right).toHaveLength(8);
    expect(first.btbVisits).toEqual({ left: 0, right: 0 });
    expectSequentialSteps(leftRows);
    expectSequentialSteps(rightRows);
  });

  it("uses only valid wrap partners between position changes, allowing same-position repeats only for BTB visits", () => {
    const result = generateWrapPositionGraph({
      ...DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS,
      targetPositionVisits: 16,
      seed: 8,
      btbChance: 0.5
    });

    for (const hand of ["left", "right"] as const) {
      let repeatedPositions = 0;
      const positions = result.visitedPositions[hand];

      for (let index = 0; index < positions.length - 1; index += 1) {
        const from = positions[index]!;
        const to = positions[index + 1]!;

        if (from === to) {
          repeatedPositions += 1;
        } else {
          expect(isValidWrapPair(from, to)).toBe(true);
        }
      }

      expect(repeatedPositions).toBeLessThanOrEqual(result.btbVisits[hand]);
    }
  });

  it("keeps both tracks synchronized with four completed normal visits plus one explicit sync row for BTB catch-up", () => {
    const result = generateWrapPositionGraph({
      ...DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS,
      targetPositionVisits: 1,
      seed: 1,
      btbChance: 1
    });
    const leftRows = getTrackRows(result.graph, "left");
    const rightRows = getTrackRows(result.graph, "right");

    expect(result.btbVisits).toEqual({ left: 1, right: 0 });
    expect(result.visitedPositions.left).toEqual(["low-native"]);
    expect(result.visitedPositions.right).toHaveLength(4);
    expect(leftRows).toEqual(buildBtbVisitRows("low-native", "left", 0));
    expectCompletedNormalVisitRows(
      rightRows,
      result.visitedPositions.right,
      "right",
      0
    );
    expect(rightRows.at(-1)).toEqual({ step: 12, laneId: "center", planeSide: "a" });
    expect(leftRows).toHaveLength(rightRows.length);
    expect(leftRows).toHaveLength(result.graph.cycleSteps);
    expect(rightRows).toHaveLength(result.graph.cycleSteps);
    expectSequentialSteps(leftRows);
    expectSequentialSteps(rightRows);
  });

  it("treats targetPositionVisits as a minimum when BTB catch-up adds completed normal visits", () => {
    const result = generateWrapPositionGraph({
      ...DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS,
      targetPositionVisits: 1,
      seed: 1,
      btbChance: 1
    });

    expect(result.visitedPositions.left).toHaveLength(1);
    expect(result.visitedPositions.right).toHaveLength(4);
    expect(result.visitedPositions.left.length).toBeGreaterThanOrEqual(1);
    expect(result.visitedPositions.right.length).toBeGreaterThanOrEqual(1);
  });

  it("gives the left hand BTB priority when both hands are eligible", () => {
    const result = generateWrapPositionGraph({
      ...DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS,
      targetPositionVisits: 1,
      seed: 99,
      btbChance: 1,
      leftStart: "high-native",
      rightStart: "high-native"
    });

    expect(result.btbVisits).toEqual({ left: 1, right: 0 });
    expect(getTrackRows(result.graph, "left")).toEqual(buildBtbVisitRows("high-native", "left", 0));
    expect(result.visitedPositions.right).toHaveLength(4);
  });

  it("allows the right hand to choose BTB when left starts non-native", () => {
    const result = generateWrapPositionGraph({
      ...DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS,
      targetPositionVisits: 1,
      seed: 5,
      btbChance: 1,
      leftStart: "low-non-native",
      rightStart: "low-native"
    });
    const leftRows = getTrackRows(result.graph, "left");
    const rightRows = getTrackRows(result.graph, "right");
    const compiled = compilePoiBeatGraph(result.graph, DEFAULT_POI_BEAT_COMPILER_OPTIONS);

    expect(result.btbVisits.right).toBeGreaterThan(0);
    expect(result.btbVisits.left).toBe(0);
    expect(rightRows).toEqual(buildBtbVisitRows("low-native", "right", 0));
    expect(leftRows).toHaveLength(rightRows.length);
    expect(leftRows).toHaveLength(result.graph.cycleSteps);
    expect(rightRows).toHaveLength(result.graph.cycleSteps);
    expect(compiled.diagnostics).toEqual([]);
  });

  it("derives initial phases from each configured start position and split-time direction", () => {
    const result = generateWrapPositionGraph({
      ...DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS,
      targetPositionVisits: 2,
      btbChance: 0,
      leftStart: "low-non-native",
      rightStart: "low-native"
    });

    expect(result.graph.tracks.map((track) => track.initialPhase)).toEqual(["down", "up"]);
  });

  it("compiles generated graphs without diagnostics", () => {
    const result = generateWrapPositionGraph({
      ...DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS,
      targetPositionVisits: 10,
      seed: 12,
      btbChance: 0.35
    });

    const compiled = compilePoiBeatGraph(result.graph, DEFAULT_POI_BEAT_COMPILER_OPTIONS);

    expect(compiled.diagnostics).toEqual([]);
    expect(compiled.sequence.rigs).toHaveLength(2);
    expect(compiled.sequence.rigs[0]?.sequence.segments).toHaveLength(result.graph.cycleSteps);
    expect(compiled.sequence.rigs[1]?.sequence.segments).toHaveLength(result.graph.cycleSteps);
  });

  it("never emits more than two consecutive rows on the same lane and plane side", () => {
    const result = generateWrapPositionGraph({
      ...DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS,
      targetPositionVisits: 18,
      seed: 4,
      btbChance: 0.8
    });

    expectNoMoreThanTwoConsecutiveSameSurfaceRows(getTrackRows(result.graph, "left"));
    expectNoMoreThanTwoConsecutiveSameSurfaceRows(getTrackRows(result.graph, "right"));
  });

  it.each([
    ["targetPositionVisits", Number.NaN, 0.5],
    ["targetPositionVisits", Infinity, 0.5],
    ["targetPositionVisits", -Infinity, 0.5],
    ["btbChance", 1, Number.NaN],
    ["btbChance", 1, Infinity],
    ["btbChance", 1, -Infinity]
  ] as const)("rejects non-finite %s", (_name, targetPositionVisits, btbChance) => {
    expect(() =>
      generateWrapPositionGraph({
        ...DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS,
        targetPositionVisits,
        btbChance
      })
    ).toThrow();
  });

  it("normalizes finite target visits and clamps finite BTB chance at boundaries", () => {
    const result = generateWrapPositionGraph({
      ...DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS,
      targetPositionVisits: 0.2,
      seed: 3,
      btbChance: 2
    });

    expect(result.visitedPositions.left.length).toBeGreaterThanOrEqual(1);
    expect(result.visitedPositions.right.length).toBeGreaterThanOrEqual(1);
    expect(result.btbVisits.left + result.btbVisits.right).toBeGreaterThan(0);
    expect(getTrackRows(result.graph, "left")).toHaveLength(getTrackRows(result.graph, "right").length);
  });
});
