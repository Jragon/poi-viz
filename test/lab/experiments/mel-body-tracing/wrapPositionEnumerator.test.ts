import {
  buildBtbVisitRows,
  buildNormalVisitRows,
  createSeededRandom
} from "@/lab/experiments/mel-body-tracing/generators/wrapPositionEnumerator";
import { describe, expect, it } from "vitest";

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
