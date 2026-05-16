/* eslint-disable @typescript-eslint/no-unused-vars -- Later enumerator tasks extend this fixture. */
import {
  DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS,
  buildBtbVisitRows,
  buildNormalVisitRows,
  createSeededRandom,
  generateWrapPositionGraph
} from "@/lab/experiments/mel-body-tracing/generators/wrapPositionEnumerator";
import {
  compilePoiBeatGraph,
  DEFAULT_POI_BEAT_COMPILER_OPTIONS
} from "@/lab/experiments/mel-body-tracing/beat-graph/compileBeatGraph";
import { isValidWrapPair } from "@/lab/experiments/mel-body-tracing/explorers/wrapRules";
import { describe, expect, it } from "vitest";

describe("wrapPositionEnumerator visit templates", () => {
  it("creates repeatable pseudo-random values from the same seed", () => {
    const a = createSeededRandom(1234);
    const b = createSeededRandom(1234);

    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

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
