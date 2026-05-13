import {
  buildCosmoBeatGraph,
  buildCosmoHandRows,
  buildCosmoTemplate,
  deriveCosmoInitialPhase,
  getValidCosmoPartners,
  isValidCosmoPair,
  isVerticalPair,
  rotateCosmoRows
} from "@/lab/experiments/cosmo-explorer/cosmoRules";
import type {
  CosmoBackPosition,
  CosmoConfig,
  CosmoFrontPosition
} from "@/lab/experiments/cosmo-explorer/types";
import { deriveRowStates } from "@/lab/experiments/poi-beat-graph/graphHelpers";
import type { PoiBeatDirection, PoiBeatTrack } from "@/lab/experiments/poi-beat-graph/types";
import { describe, expect, it } from "vitest";

function getTrack(graph: ReturnType<typeof buildCosmoBeatGraph>, trackId: string): PoiBeatTrack {
  const track = graph.tracks.find((candidate) => candidate.id === trackId);
  if (!track) throw new Error(`expected ${trackId} track`);
  return track;
}

function expectRightTrackStates(
  config: CosmoConfig,
  expected: readonly (readonly [string, string, string])[]
): void {
  const right = getTrack(buildCosmoBeatGraph(config), "right");
  expect(
    deriveRowStates(right).map((state) => [state.row.laneId, state.planeSide, state.phaseLabel])
  ).toEqual(expected);
}

describe("cosmoRules", () => {
  it.each<[CosmoFrontPosition, readonly CosmoBackPosition[]]>([
    ["high-native", ["low-back"]],
    ["low-native", ["high-back"]],
    ["high-non-native", ["high-back", "low-back"]],
    ["low-non-native", ["high-back", "low-back"]]
  ])("gets valid BTB partners for %s", (position, expectedPartners) => {
    expect(getValidCosmoPartners(position)).toEqual(expectedPartners);
  });

  it("rejects impossible native-to-BTB same-height pairs", () => {
    expect(isValidCosmoPair("high-native", "high-back")).toBe(false);
    expect(isValidCosmoPair("low-native", "low-back")).toBe(false);
    expect(isValidCosmoPair("high-native", "low-back")).toBe(true);
    expect(isValidCosmoPair("low-native", "high-back")).toBe(true);
  });

  it("detects vertical pairs from native front positions", () => {
    expect(isVerticalPair({ a: "high-native", b: "low-back" })).toBe(true);
    expect(isVerticalPair({ a: "low-native", b: "high-back" })).toBe(true);
    expect(isVerticalPair({ a: "high-non-native", b: "high-back" })).toBe(false);
    expect(isVerticalPair({ a: "low-non-native", b: "low-back" })).toBe(false);
  });

  it("builds the generic cosmo row template", () => {
    expect(
      buildCosmoHandRows({ a: "low-non-native", b: "high-back" }, "right", "counterclockwise")
    ).toEqual([
      { step: 0, laneId: "left-low", planeSide: "b" },
      { step: 1, laneId: "left-low", planeSide: "b" },
      { step: 2, laneId: "center", planeSide: "a" },
      { step: 3, laneId: "center", planeSide: "b" },
      { step: 4, laneId: "left-high", planeSide: "a" },
      { step: 5, laneId: "left-high", planeSide: "a" },
      { step: 6, laneId: "center", planeSide: "b" },
      { step: 7, laneId: "center", planeSide: "a" }
    ]);
  });

  it.each<[string, CosmoFrontPosition, CosmoBackPosition, PoiBeatDirection, readonly string[]]>([
    [
      "low vertical inwards",
      "high-native",
      "low-back",
      "counterclockwise",
      ["CF", "CF", "CB", "B", "B", "CB", "A", "A"]
    ],
    [
      "low vertical outwards",
      "high-native",
      "low-back",
      "clockwise",
      ["CF", "CF", "A", "A", "CB", "B", "B", "CB"]
    ],
    [
      "high vertical inwards",
      "low-native",
      "high-back",
      "counterclockwise",
      ["CF", "CF", "A", "A", "CB", "B", "B", "CB"]
    ],
    [
      "high vertical outwards",
      "low-native",
      "high-back",
      "clockwise",
      ["CF", "CF", "CB", "B", "B", "CB", "A", "A"]
    ]
  ])("selects the %s template", (_name, positionA, positionB, direction, expectedTemplate) => {
    expect(buildCosmoTemplate({ a: positionA, b: positionB }, "right", direction)).toEqual(
      expectedTemplate
    );
  });

  it("derives vertical same-direction templates per hand", () => {
    const pair = { a: "high-native", b: "low-back" } as const;

    expect(buildCosmoTemplate(pair, "left", "clockwise")).toEqual([
      "CF",
      "CF",
      "CB",
      "B",
      "B",
      "CB",
      "A",
      "A"
    ]);
    expect(buildCosmoTemplate(pair, "right", "clockwise")).toEqual([
      "CF",
      "CF",
      "A",
      "A",
      "CB",
      "B",
      "B",
      "CB"
    ]);
  });

  it("right-rotates eight-step offset rows and reassigns global steps", () => {
    const rows = buildCosmoHandRows({ a: "low-non-native", b: "low-back" }, "right", "clockwise");

    expect(rotateCosmoRows(rows, 1)).toEqual([
      { step: 0, laneId: "center", planeSide: "a" },
      { step: 1, laneId: "left-low", planeSide: "b" },
      { step: 2, laneId: "left-low", planeSide: "b" },
      { step: 3, laneId: "center", planeSide: "a" },
      { step: 4, laneId: "center", planeSide: "b" },
      { step: 5, laneId: "left-low", planeSide: "a" },
      { step: 6, laneId: "left-low", planeSide: "a" },
      { step: 7, laneId: "center", planeSide: "b" }
    ]);
    expect(rotateCosmoRows(rows, 7).map((row) => row.step)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("derives cosmo phase from position A side, direction, and offset", () => {
    expect(deriveCosmoInitialPhase("left", "counterclockwise", false, 0)).toBe("down");
    expect(deriveCosmoInitialPhase("left", "clockwise", false, 0)).toBe("up");
    expect(deriveCosmoInitialPhase("left", "counterclockwise", true, 1)).toBe("up");
  });

  it("builds the low common cosmo example", () => {
    expectRightTrackStates(
      {
        left: { a: "low-non-native", b: "low-back" },
        right: { a: "low-non-native", b: "low-back" },
        direction: { mode: "same", direction: "counterclockwise" },
        offset: 0
      },
      [
        ["left-low", "b", "down"],
        ["left-low", "b", "up"],
        ["center", "a", "down"],
        ["center", "b", "up"],
        ["left-low", "a", "down"],
        ["left-low", "a", "up"],
        ["center", "b", "down"],
        ["center", "a", "up"]
      ]
    );
  });

  it("builds the upper diagonal cosmo example", () => {
    expectRightTrackStates(
      {
        left: { a: "low-non-native", b: "high-back" },
        right: { a: "low-non-native", b: "high-back" },
        direction: { mode: "same", direction: "counterclockwise" },
        offset: 0
      },
      [
        ["left-low", "b", "down"],
        ["left-low", "b", "up"],
        ["center", "a", "down"],
        ["center", "b", "up"],
        ["left-high", "a", "down"],
        ["left-high", "a", "up"],
        ["center", "b", "down"],
        ["center", "a", "up"]
      ]
    );
  });

  it("builds the low vertical cosmo inwards example", () => {
    expectRightTrackStates(
      {
        left: { a: "high-native", b: "low-back" },
        right: { a: "high-native", b: "low-back" },
        direction: { mode: "opposite", flow: "inwards" },
        offset: 0
      },
      [
        ["center", "a", "up"],
        ["center", "a", "down"],
        ["center", "b", "up"],
        ["left-low", "a", "down"],
        ["left-low", "a", "up"],
        ["center", "b", "down"],
        ["right-high", "b", "up"],
        ["right-high", "b", "down"]
      ]
    );
  });

  it("builds the low vertical cosmo outwards example", () => {
    expectRightTrackStates(
      {
        left: { a: "high-native", b: "low-back" },
        right: { a: "high-native", b: "low-back" },
        direction: { mode: "opposite", flow: "outwards" },
        offset: 0
      },
      [
        ["center", "a", "down"],
        ["center", "a", "up"],
        ["right-high", "b", "down"],
        ["right-high", "b", "up"],
        ["center", "b", "down"],
        ["left-low", "a", "up"],
        ["left-low", "a", "down"],
        ["center", "b", "up"]
      ]
    );
  });

  it("builds the high vertical cosmo inwards example", () => {
    expectRightTrackStates(
      {
        left: { a: "low-native", b: "high-back" },
        right: { a: "low-native", b: "high-back" },
        direction: { mode: "opposite", flow: "inwards" },
        offset: 0
      },
      [
        ["center", "a", "up"],
        ["center", "a", "down"],
        ["right-low", "b", "up"],
        ["right-low", "b", "down"],
        ["center", "b", "up"],
        ["left-high", "a", "down"],
        ["left-high", "a", "up"],
        ["center", "b", "down"]
      ]
    );
  });

  it("builds the high vertical cosmo outwards example", () => {
    expectRightTrackStates(
      {
        left: { a: "low-native", b: "high-back" },
        right: { a: "low-native", b: "high-back" },
        direction: { mode: "opposite", flow: "outwards" },
        offset: 0
      },
      [
        ["center", "a", "down"],
        ["center", "a", "up"],
        ["center", "b", "down"],
        ["left-high", "a", "up"],
        ["left-high", "a", "down"],
        ["center", "b", "up"],
        ["right-low", "b", "down"],
        ["right-low", "b", "up"]
      ]
    );
  });
});
