import { deriveRowStates } from "@/lab/experiments/mel-body-tracing/beat-graph/graphHelpers";
import type { PoiBeatTrack } from "@/lab/experiments/mel-body-tracing/beat-graph/types";
import type { ReelPosition } from "@/lab/experiments/mel-body-tracing/explorers/reelTypes";
import type { WrapConfig } from "@/lab/experiments/mel-body-tracing/explorers/wrapTypes";
import {
  buildWrapBeatGraph,
  buildWrapHandRows,
  deriveWrapInitialPhase,
  getValidPartners,
  isValidWrapPair,
  rotateWrapRows
} from "@/lab/experiments/mel-body-tracing/explorers/wrapRules";
import { describe, expect, it } from "vitest";

function getTrack(graph: ReturnType<typeof buildWrapBeatGraph>, trackId: string): PoiBeatTrack {
  const track = graph.tracks.find((candidate) => candidate.id === trackId);
  if (!track) throw new Error(`expected ${trackId} track`);
  return track;
}

describe("wrapRules", () => {
  it.each<[ReelPosition, readonly ReelPosition[]]>([
    ["high-native", ["low-native", "high-non-native", "low-non-native", "high-back"]],
    ["low-native", ["high-native", "high-non-native", "low-non-native", "low-back"]],
    ["high-non-native", ["high-native", "low-native", "low-non-native"]],
    ["low-non-native", ["high-native", "low-native", "high-non-native"]],
    ["high-back", ["high-native"]],
    ["low-back", ["low-native"]]
  ])("gets valid partners for %s", (position, expectedPartners) => {
    expect(getValidPartners(position)).toEqual(expectedPartners);
  });

  it("matches valid pairs symmetrically", () => {
    expect(isValidWrapPair("low-native", "low-back")).toBe(true);
    expect(isValidWrapPair("low-back", "low-native")).toBe(true);
    expect(isValidWrapPair("low-back", "high-native")).toBe(false);
    expect(isValidWrapPair("low-back", "low-non-native")).toBe(false);
  });

  it("builds non-BTB rows with front center plane sides", () => {
    expect(buildWrapHandRows({ a: "low-native", b: "low-non-native" }, "right")).toEqual([
      { step: 0, laneId: "right-low", planeSide: "b" },
      { step: 1, laneId: "right-low", planeSide: "b" },
      { step: 2, laneId: "center", planeSide: "a" },
      { step: 3, laneId: "left-low", planeSide: "b" },
      { step: 4, laneId: "left-low", planeSide: "b" },
      { step: 5, laneId: "center", planeSide: "a" }
    ]);
  });

  it("builds BTB rows with all plane sides inverted", () => {
    expect(buildWrapHandRows({ a: "low-native", b: "low-back" }, "right")).toEqual([
      { step: 0, laneId: "right-low", planeSide: "a" },
      { step: 1, laneId: "right-low", planeSide: "a" },
      { step: 2, laneId: "center", planeSide: "b" },
      { step: 3, laneId: "left-low", planeSide: "a" },
      { step: 4, laneId: "left-low", planeSide: "a" },
      { step: 5, laneId: "center", planeSide: "b" }
    ]);
  });

  it("preserves user-selected A/B order for reversed BTB pairs", () => {
    expect(buildWrapHandRows({ a: "low-back", b: "low-native" }, "right")).toEqual([
      { step: 0, laneId: "left-low", planeSide: "a" },
      { step: 1, laneId: "left-low", planeSide: "a" },
      { step: 2, laneId: "center", planeSide: "b" },
      { step: 3, laneId: "right-low", planeSide: "a" },
      { step: 4, laneId: "right-low", planeSide: "a" },
      { step: 5, laneId: "center", planeSide: "b" }
    ]);
  });

  it("right-rotates six-step offset rows and reassigns global steps", () => {
    const rows = buildWrapHandRows({ a: "low-native", b: "low-non-native" }, "right");

    expect(rotateWrapRows(rows, 1)).toEqual([
      { step: 0, laneId: "center", planeSide: "a" },
      { step: 1, laneId: "right-low", planeSide: "b" },
      { step: 2, laneId: "right-low", planeSide: "b" },
      { step: 3, laneId: "center", planeSide: "a" },
      { step: 4, laneId: "left-low", planeSide: "b" },
      { step: 5, laneId: "left-low", planeSide: "b" }
    ]);
    expect(rotateWrapRows(rows, 5).map((row) => row.laneId)).toEqual([
      "right-low",
      "center",
      "left-low",
      "left-low",
      "center",
      "right-low"
    ]);
    expect(rotateWrapRows(rows, 5).map((row) => row.step)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("derives vertical wrap phase from position A side and direction", () => {
    expect(deriveWrapInitialPhase("right", "clockwise", false, 0)).toBe("down");
    expect(deriveWrapInitialPhase("right", "counterclockwise", false, 0)).toBe("up");
    expect(deriveWrapInitialPhase("right", "clockwise", true, 5)).toBe("up");
  });

  it("builds a six-step graph with derived track direction and global phase", () => {
    const config: WrapConfig = {
      left: { a: "high-native", b: "low-native" },
      right: { a: "high-native", b: "low-native" },
      direction: { mode: "same", direction: "clockwise" },
      offset: 5
    };
    const graph = buildWrapBeatGraph(config);
    const left = getTrack(graph, "left");
    const right = getTrack(graph, "right");

    expect(graph.cycleSteps).toBe(6);
    expect(left.rows).toHaveLength(6);
    expect(right.rows).toHaveLength(6);
    expect(left.poiDirection).toBe("clockwise");
    expect(right.poiDirection).toBe("clockwise");
    expect(left.initialPhase).toBe("up");
    expect(right.initialPhase).toBe("up");
    expect(right.rows.map((row) => row.laneId)).toEqual([
      "right-high",
      "center",
      "right-low",
      "right-low",
      "center",
      "right-high"
    ]);
    expect(deriveRowStates(right).map((state) => state.phaseLabel)).toEqual([
      "up",
      "down",
      "up",
      "down",
      "up",
      "down"
    ]);
  });
});
