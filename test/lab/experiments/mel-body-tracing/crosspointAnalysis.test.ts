import {
  compilePoiBeatGraph,
  DEFAULT_POI_BEAT_COMPILER_OPTIONS
} from "@/lab/experiments/mel-body-tracing/beat-graph/compileBeatGraph";
import type {
  PoiBeatDirection,
  PoiBeatGraph,
  PoiBeatPhaseLabel,
  PoiBeatRow
} from "@/lab/experiments/mel-body-tracing/beat-graph/types";
import { createLowerWrapBeatGraph } from "@/lab/experiments/mel-body-tracing/beat-graph/lowerWrapSeed";
import { describe, expect, it } from "vitest";

function compileRows(
  rows: readonly PoiBeatRow[],
  poiDirection: PoiBeatDirection,
  initialPhase: PoiBeatPhaseLabel,
  handHorizontalOffset = DEFAULT_POI_BEAT_COMPILER_OPTIONS.handHorizontalOffset
) {
  const graph: PoiBeatGraph = {
    cycleSteps: rows.length,
    lanes: createLowerWrapBeatGraph().lanes,
    tracks: [
      {
        id: "single",
        hand: "right",
        poiDirection,
        initialPhase,
        rows
      }
    ]
  };

  return compilePoiBeatGraph(graph, {
    ...DEFAULT_POI_BEAT_COMPILER_OPTIONS,
    handHorizontalOffset
  });
}

describe("beat-graph crosspoint analysis", () => {
  it("rejects plane transitions on the body centerline", () => {
    const result = compileRows(
      [
        { step: 0, laneId: "center", planeSide: "a" },
        { step: 1, laneId: "center", planeSide: "b" }
      ],
      "clockwise",
      "up"
    );

    expect(result.crosspointDiagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "CENTERLINE_CROSSPOINT",
      "CENTERLINE_CROSSPOINT"
    ]);
    expect(result.analysis.tracks[0]?.intervals[0]?.sideMotion).toMatchObject({
      kind: "transition",
      crosspoint: { progress: 0.5, bodySide: null, legal: false }
    });
  });

  it("rejects an inward-pointing poi on the right body side", () => {
    const result = compileRows(
      [
        { step: 0, laneId: "right-low", planeSide: "a" },
        { step: 1, laneId: "right-low", planeSide: "b" }
      ],
      "counterclockwise",
      "up"
    );

    expect(result.crosspointDiagnostics[0]).toMatchObject({
      code: "POI_POINTS_THROUGH_BODY",
      intervalIndex: 0,
      crosspoint: {
        bodySide: "right",
        level: "low",
        poiDirection: "left",
        legal: false
      }
    });
  });

  it("classifies a direct high-to-low side transition as a mid crosspoint", () => {
    const result = compileRows(
      [
        { step: 0, laneId: "right-high", planeSide: "a" },
        { step: 1, laneId: "right-low", planeSide: "b" }
      ],
      "clockwise",
      "up"
    );
    const interval = result.analysis.tracks[0]?.intervals[0];

    expect(interval?.sideMotion).toMatchObject({
      kind: "transition",
      crosspoint: {
        bodySide: "right",
        level: "mid",
        poiDirection: "right",
        legal: true,
        handPoint: { y: 0 }
      }
    });
  });

  it("accepts an outward crosspoint immediately past the midline", () => {
    const result = compileRows(
      [
        { step: 0, laneId: "right-low", planeSide: "a" },
        { step: 1, laneId: "right-low", planeSide: "b" }
      ],
      "clockwise",
      "up",
      0.000001
    );
    const interval = result.analysis.tracks[0]?.intervals[0];

    expect(interval?.sideMotion).toMatchObject({
      kind: "transition",
      crosspoint: {
        bodySide: "right",
        poiDirection: "right",
        legal: true
      }
    });
  });
});
