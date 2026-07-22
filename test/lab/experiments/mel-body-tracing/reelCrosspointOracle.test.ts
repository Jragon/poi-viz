import { compilePoiBeatGraph } from "@/lab/experiments/mel-body-tracing/beat-graph/compileBeatGraph";
import { filterPoiBeatGraphTracks } from "@/lab/experiments/mel-body-tracing/beat-graph/graphHelpers";
import type {
  PoiBeatHand,
  PoiBeatResolvedInterval
} from "@/lab/experiments/mel-body-tracing/beat-graph/types";
import { buildReelBeatGraph } from "@/lab/experiments/mel-body-tracing/explorers/reelRules";
import type {
  ReelPosition,
  ReelDirection
} from "@/lab/experiments/mel-body-tracing/explorers/reelTypes";
import { describe, expect, it } from "vitest";

type Flow = Extract<ReelDirection, { mode: "opposite" }>["flow"];

interface ReelCrosspointOracleCase {
  readonly name: string;
  readonly position: ReelPosition;
  readonly left: readonly string[];
  readonly right: readonly string[];
}

const REEL_CROSSPOINT_ORACLE: readonly ReelCrosspointOracleCase[] = [
  {
    name: "high native",
    position: "high-native",
    left: ["1:B→A:left:high:left", "3:A→B:left:high:left"],
    right: ["1:B→A:right:high:right", "3:A→B:right:high:right"]
  },
  {
    name: "low native",
    position: "low-native",
    left: ["1:B→A:left:low:left", "3:A→B:left:low:left"],
    right: ["1:B→A:right:low:right", "3:A→B:right:low:right"]
  },
  {
    name: "high non-native",
    position: "high-non-native",
    left: ["1:B→A:right:high:right", "3:A→B:right:high:right"],
    right: ["1:B→A:left:high:left", "3:A→B:left:high:left"]
  },
  {
    name: "low non-native",
    position: "low-non-native",
    left: ["1:B→A:right:low:right", "3:A→B:right:low:right"],
    right: ["1:B→A:left:low:left", "3:A→B:left:low:left"]
  },
  {
    name: "high back",
    position: "high-back",
    left: ["1:A→B:right:high:right", "3:B→A:right:high:right"],
    right: ["1:A→B:left:high:left", "3:B→A:left:high:left"]
  },
  {
    name: "low back",
    position: "low-back",
    left: ["1:A→B:right:low:right", "3:B→A:right:low:right"],
    right: ["1:A→B:left:low:left", "3:B→A:left:low:left"]
  }
];

function crosspointSignature(interval: PoiBeatResolvedInterval): string | null {
  if (interval.sideMotion.kind !== "transition") return null;
  const crosspoint = interval.sideMotion.crosspoint;
  return [
    interval.index,
    `${interval.fromSide.toUpperCase()}→${interval.toSide.toUpperCase()}`,
    crosspoint.bodySide,
    crosspoint.level,
    crosspoint.poiDirection
  ].join(":");
}

function compileHandCase(position: ReelPosition, flow: Flow, hand: PoiBeatHand) {
  const graph = buildReelBeatGraph({
    left: position,
    right: position,
    direction: { mode: "opposite", flow },
    offset: 0
  });

  return compilePoiBeatGraph(filterPoiBeatGraphTracks(graph, [hand]));
}

describe("single-hand reel crosspoint oracle", () => {
  it.each(REEL_CROSSPOINT_ORACLE)(
    "matches $name for inward and outward flow",
    ({ position, left, right }) => {
      for (const flow of ["inwards", "outwards"] as const) {
        for (const [hand, expected] of [
          ["left", left],
          ["right", right]
        ] as const) {
          const result = compileHandCase(position, flow, hand);
          const track = result.analysis.tracks[0];

          expect(result.diagnostics).toEqual([]);
          expect(result.crosspointDiagnostics).toEqual([]);
          expect(track?.intervals.map(crosspointSignature).filter(Boolean)).toEqual(expected);
        }
      }
    }
  );
});
