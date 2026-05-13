import { deriveRowStates } from "@/lab/experiments/mel-body-tracing/beat-graph/graphHelpers";
import type { PoiBeatTrack } from "@/lab/experiments/mel-body-tracing/beat-graph/types";
import {
  buildHandRows,
  buildReelBeatGraph,
  deriveInitialPhase,
  deriveReelState,
  mapPositionToBodySide,
  mapPositionToLane,
  resolveDirections,
  rotateRows
} from "@/lab/experiments/mel-body-tracing/explorers/reelRules";
import type { ReelConfig } from "@/lab/experiments/mel-body-tracing/explorers/reelTypes";
import { describe, expect, it } from "vitest";

function getTrack(graph: ReturnType<typeof buildReelBeatGraph>, trackId: string): PoiBeatTrack {
  const track = graph.tracks.find((candidate) => candidate.id === trackId);
  if (!track) throw new Error(`expected ${trackId} track`);
  return track;
}

describe("reelRules", () => {
  it("maps back positions to the non-native side", () => {
    expect(mapPositionToLane("low-back", "right")).toBe("left-low");
    expect(mapPositionToLane("high-back", "right")).toBe("left-high");
    expect(mapPositionToLane("low-back", "left")).toBe("right-low");
    expect(mapPositionToLane("high-back", "left")).toBe("right-high");
  });

  it("maps native and non-native positions to body sides", () => {
    expect(mapPositionToBodySide("low-native", "left")).toBe("left");
    expect(mapPositionToBodySide("low-native", "right")).toBe("right");
    expect(mapPositionToBodySide("low-non-native", "left")).toBe("right");
    expect(mapPositionToBodySide("low-non-native", "right")).toBe("left");
    expect(mapPositionToBodySide("low-back", "right")).toBe("left");
  });

  it("builds front and BTB row side patterns", () => {
    expect(buildHandRows("low-native", "right")).toEqual([
      { step: 0, laneId: "right-low", planeSide: "b" },
      { step: 1, laneId: "right-low", planeSide: "b" },
      { step: 2, laneId: "center", planeSide: "a" },
      { step: 3, laneId: "center", planeSide: "a" }
    ]);

    expect(buildHandRows("low-back", "right")).toEqual([
      { step: 0, laneId: "left-low", planeSide: "a" },
      { step: 1, laneId: "left-low", planeSide: "a" },
      { step: 2, laneId: "center", planeSide: "b" },
      { step: 3, laneId: "center", planeSide: "b" }
    ]);
  });

  it("right-rotates offset rows and reassigns global steps", () => {
    const rows = buildHandRows("low-native", "right");

    expect(rotateRows(rows, 1)).toEqual([
      { step: 0, laneId: "center", planeSide: "a" },
      { step: 1, laneId: "right-low", planeSide: "b" },
      { step: 2, laneId: "right-low", planeSide: "b" },
      { step: 3, laneId: "center", planeSide: "a" }
    ]);
    expect(rotateRows(rows, 2).map((row) => row.laneId)).toEqual([
      "center",
      "center",
      "right-low",
      "right-low"
    ]);
    expect(rotateRows(rows, 3).map((row) => row.step)).toEqual([0, 1, 2, 3]);
  });

  it("resolves same and opposite direction controls", () => {
    expect(resolveDirections({ mode: "same", direction: "clockwise" })).toEqual({
      left: "clockwise",
      right: "clockwise"
    });
    expect(resolveDirections({ mode: "same", direction: "counterclockwise" })).toEqual({
      left: "counterclockwise",
      right: "counterclockwise"
    });
    expect(resolveDirections({ mode: "opposite", flow: "inwards" })).toEqual({
      left: "clockwise",
      right: "counterclockwise"
    });
    expect(resolveDirections({ mode: "opposite", flow: "outwards" })).toEqual({
      left: "counterclockwise",
      right: "clockwise"
    });
  });

  it("derives initial phases from body side, direction, and offset parity", () => {
    expect(deriveInitialPhase("right", "counterclockwise", false, 0)).toBe("up");
    expect(deriveInitialPhase("right", "clockwise", false, 0)).toBe("down");
    expect(deriveInitialPhase("left", "counterclockwise", false, 0)).toBe("down");
    expect(deriveInitialPhase("left", "clockwise", false, 0)).toBe("up");
    expect(deriveInitialPhase("right", "clockwise", true, 1)).toBe("up");
    expect(deriveInitialPhase("right", "clockwise", true, 2)).toBe("down");
  });

  it.each<[string, ReelConfig, string, string]>([
    [
      "both-low-native, offset 0, same CW",
      {
        left: "low-native",
        right: "low-native",
        direction: { mode: "same", direction: "clockwise" },
        offset: 0
      },
      "SS",
      "mill"
    ],
    [
      "both-low-native, offset 1, same CW",
      {
        left: "low-native",
        right: "low-native",
        direction: { mode: "same", direction: "clockwise" },
        offset: 1
      },
      "TS",
      "mill"
    ],
    [
      "both-low-native, offset 0, opposite inwards",
      {
        left: "low-native",
        right: "low-native",
        direction: { mode: "opposite", flow: "inwards" },
        offset: 0
      },
      "TO",
      "mill"
    ],
    [
      "right-low-native + left-low-non-native, offset 0, same CW",
      {
        left: "low-non-native",
        right: "low-native",
        direction: { mode: "same", direction: "clockwise" },
        offset: 0
      },
      "TS",
      "weave"
    ],
    [
      "right-low-back + left-low-native, offset 0, same CW",
      {
        left: "low-native",
        right: "low-back",
        direction: { mode: "same", direction: "clockwise" },
        offset: 0
      },
      "TS",
      "weave"
    ]
  ])("derives %s", (_name, config, expectedTiming, expectedPatternType) => {
    const state = deriveReelState(config);

    expect(state.timing).toBe(expectedTiming);
    expect(state.patternType).toBe(expectedPatternType);
  });

  it("builds a four-step graph with derived track direction and global phase", () => {
    const graph = buildReelBeatGraph({
      left: "low-native",
      right: "low-native",
      direction: { mode: "same", direction: "clockwise" },
      offset: 1
    });
    const left = getTrack(graph, "left");
    const right = getTrack(graph, "right");

    expect(graph.cycleSteps).toBe(4);
    expect(graph.lanes.map((lane) => lane.id)).toEqual([
      "left-high",
      "left-low",
      "center",
      "right-low",
      "right-high"
    ]);
    expect(left.poiDirection).toBe("clockwise");
    expect(right.poiDirection).toBe("clockwise");
    expect(left.initialPhase).toBe("up");
    expect(right.initialPhase).toBe("up");
    expect(right.rows.map((row) => row.laneId)).toEqual([
      "center",
      "right-low",
      "right-low",
      "center"
    ]);
    expect(deriveRowStates(right).map((state) => state.phaseLabel)).toEqual([
      "up",
      "down",
      "up",
      "down"
    ]);
  });
});
