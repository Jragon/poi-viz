import { compilePoiBeatGraph } from "@/lab/experiments/mel-body-tracing/beat-graph/compileBeatGraph";
import { filterPoiBeatGraphTracks } from "@/lab/experiments/mel-body-tracing/beat-graph/graphHelpers";
import type {
  PoiBeatHand,
  PoiBeatResolvedInterval
} from "@/lab/experiments/mel-body-tracing/beat-graph/types";
import { buildCosmoBeatGraph } from "@/lab/experiments/mel-body-tracing/explorers/cosmoRules";
import type { CosmoPositionPair } from "@/lab/experiments/mel-body-tracing/explorers/cosmoTypes";
import { describe, expect, it } from "vitest";

type Flow = "inwards" | "outwards";

interface CosmoCrosspointOracleCase {
  readonly name: string;
  readonly pair: CosmoPositionPair;
  readonly left: readonly string[];
  readonly right: readonly string[];
}

const COSMO_CROSSPOINT_ORACLE: readonly CosmoCrosspointOracleCase[] = [
  {
    name: "high common",
    pair: { a: "high-non-native", b: "high-back" },
    left: [
      "1:B→A:right:high:right",
      "2:A→B:left:high:left",
      "3:B→A:right:high:right",
      "5:A→B:right:high:right",
      "6:B→A:left:high:left",
      "7:A→B:right:high:right"
    ],
    right: [
      "1:B→A:left:high:left",
      "2:A→B:right:high:right",
      "3:B→A:left:high:left",
      "5:A→B:left:high:left",
      "6:B→A:right:high:right",
      "7:A→B:left:high:left"
    ]
  },
  {
    name: "low common",
    pair: { a: "low-non-native", b: "low-back" },
    left: [
      "1:B→A:right:low:right",
      "2:A→B:left:low:left",
      "3:B→A:right:low:right",
      "5:A→B:right:low:right",
      "6:B→A:left:low:left",
      "7:A→B:right:low:right"
    ],
    right: [
      "1:B→A:left:low:left",
      "2:A→B:right:low:right",
      "3:B→A:left:low:left",
      "5:A→B:left:low:left",
      "6:B→A:right:low:right",
      "7:A→B:left:low:left"
    ]
  },
  {
    name: "diagonal low-to-high",
    pair: { a: "low-non-native", b: "high-back" },
    left: [
      "1:B→A:right:low:right",
      "2:A→B:left:high:left",
      "3:B→A:right:high:right",
      "5:A→B:right:high:right",
      "6:B→A:left:high:left",
      "7:A→B:right:low:right"
    ],
    right: [
      "1:B→A:left:low:left",
      "2:A→B:right:high:right",
      "3:B→A:left:high:left",
      "5:A→B:left:high:left",
      "6:B→A:right:high:right",
      "7:A→B:left:low:left"
    ]
  },
  {
    name: "diagonal high-to-low",
    pair: { a: "high-non-native", b: "low-back" },
    left: [
      "1:B→A:right:high:right",
      "2:A→B:left:low:left",
      "3:B→A:right:low:right",
      "5:A→B:right:low:right",
      "6:B→A:left:low:left",
      "7:A→B:right:high:right"
    ],
    right: [
      "1:B→A:left:high:left",
      "2:A→B:right:low:right",
      "3:B→A:left:low:left",
      "5:A→B:left:low:left",
      "6:B→A:right:low:right",
      "7:A→B:left:high:left"
    ]
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

function compileHandCase(pair: CosmoPositionPair, flow: Flow, hand: PoiBeatHand) {
  const graph = buildCosmoBeatGraph({
    left: pair,
    right: pair,
    direction: { mode: "opposite", flow },
    offset: 0
  });

  return compilePoiBeatGraph(filterPoiBeatGraphTracks(graph, [hand]));
}

describe("single-hand cosmo crosspoint oracle", () => {
  it.each(COSMO_CROSSPOINT_ORACLE)(
    "matches $name for inward and outward flow",
    ({ pair, left, right }) => {
      for (const flow of ["inwards", "outwards"] as const) {
        for (const [hand, expected] of [
          ["left", left],
          ["right", right]
        ] as const) {
          const result = compileHandCase(pair, flow, hand);
          const track = result.analysis.tracks[0];

          expect(result.diagnostics).toEqual([]);
          expect(result.crosspointDiagnostics).toEqual([]);
          expect(track?.intervals.map(crosspointSignature).filter(Boolean)).toEqual(expected);
        }
      }
    }
  );
});
