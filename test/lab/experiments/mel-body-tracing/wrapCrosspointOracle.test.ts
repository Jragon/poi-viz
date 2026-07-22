import { compilePoiBeatGraph } from "@/lab/experiments/mel-body-tracing/beat-graph/compileBeatGraph";
import { filterPoiBeatGraphTracks } from "@/lab/experiments/mel-body-tracing/beat-graph/graphHelpers";
import type {
  PoiBeatHand,
  PoiBeatResolvedInterval
} from "@/lab/experiments/mel-body-tracing/beat-graph/types";
import { buildWrapBeatGraph } from "@/lab/experiments/mel-body-tracing/explorers/wrapRules";
import type { WrapPositionPair } from "@/lab/experiments/mel-body-tracing/explorers/wrapTypes";
import { describe, expect, it } from "vitest";

type Flow = "inwards" | "outwards";

interface WrapCrosspointOracleCase {
  readonly name: string;
  readonly pair: WrapPositionPair;
  readonly flow: Flow;
  readonly left: readonly string[];
  readonly right: readonly string[];
}

const HIGH_HORIZONTAL_LEFT = [
  "1:B→A:left:high:left",
  "2:A→B:right:high:right",
  "4:B→A:right:high:right",
  "5:A→B:left:high:left"
] as const;
const HIGH_HORIZONTAL_RIGHT = [
  "1:B→A:right:high:right",
  "2:A→B:left:high:left",
  "4:B→A:left:high:left",
  "5:A→B:right:high:right"
] as const;
const LOW_HORIZONTAL_LEFT = [
  "1:B→A:left:low:left",
  "2:A→B:right:low:right",
  "4:B→A:right:low:right",
  "5:A→B:left:low:left"
] as const;
const LOW_HORIZONTAL_RIGHT = [
  "1:B→A:right:low:right",
  "2:A→B:left:low:left",
  "4:B→A:left:low:left",
  "5:A→B:right:low:right"
] as const;

const WRAP_CROSSPOINT_ORACLE: readonly WrapCrosspointOracleCase[] = [
  {
    name: "low horizontal inward",
    pair: { a: "low-native", b: "low-non-native" },
    flow: "inwards",
    left: LOW_HORIZONTAL_LEFT,
    right: LOW_HORIZONTAL_RIGHT
  },
  {
    name: "low horizontal outward",
    pair: { a: "low-native", b: "low-non-native" },
    flow: "outwards",
    left: LOW_HORIZONTAL_LEFT,
    right: LOW_HORIZONTAL_RIGHT
  },
  {
    name: "high horizontal inward",
    pair: { a: "high-native", b: "high-non-native" },
    flow: "inwards",
    left: HIGH_HORIZONTAL_LEFT,
    right: HIGH_HORIZONTAL_RIGHT
  },
  {
    name: "high horizontal outward",
    pair: { a: "high-native", b: "high-non-native" },
    flow: "outwards",
    left: HIGH_HORIZONTAL_LEFT,
    right: HIGH_HORIZONTAL_RIGHT
  },
  {
    name: "diagonal high-to-low inward",
    pair: { a: "high-native", b: "low-non-native" },
    flow: "inwards",
    left: [
      "1:B→A:left:high:left",
      "2:A→B:right:low:right",
      "4:B→A:right:low:right",
      "5:A→B:left:high:left"
    ],
    right: [
      "1:B→A:right:high:right",
      "2:A→B:left:low:left",
      "4:B→A:left:low:left",
      "5:A→B:right:high:right"
    ]
  },
  {
    name: "diagonal high-to-low outward",
    pair: { a: "high-native", b: "low-non-native" },
    flow: "outwards",
    left: [
      "1:B→A:left:high:left",
      "2:A→B:right:low:right",
      "4:B→A:right:low:right",
      "5:A→B:left:high:left"
    ],
    right: [
      "1:B→A:right:high:right",
      "2:A→B:left:low:left",
      "4:B→A:left:low:left",
      "5:A→B:right:high:right"
    ]
  },
  {
    name: "diagonal low-to-high inward",
    pair: { a: "low-native", b: "high-non-native" },
    flow: "inwards",
    left: [
      "1:B→A:left:low:left",
      "2:A→B:right:high:right",
      "4:B→A:right:high:right",
      "5:A→B:left:low:left"
    ],
    right: [
      "1:B→A:right:low:right",
      "2:A→B:left:high:left",
      "4:B→A:left:high:left",
      "5:A→B:right:low:right"
    ]
  },
  {
    name: "diagonal low-to-high outward",
    pair: { a: "low-native", b: "high-non-native" },
    flow: "outwards",
    left: [
      "1:B→A:left:low:left",
      "2:A→B:right:high:right",
      "4:B→A:right:high:right",
      "5:A→B:left:low:left"
    ],
    right: [
      "1:B→A:right:low:right",
      "2:A→B:left:high:left",
      "4:B→A:left:high:left",
      "5:A→B:right:low:right"
    ]
  },
  {
    name: "vertical native inward",
    pair: { a: "high-native", b: "low-native" },
    flow: "inwards",
    left: ["1:A→B:left:low:left", "5:B→A:left:high:left"],
    right: ["1:A→B:right:low:right", "5:B→A:right:high:right"]
  },
  {
    name: "vertical native outward",
    pair: { a: "high-native", b: "low-native" },
    flow: "outwards",
    left: ["1:A→B:left:high:left", "5:B→A:left:low:left"],
    right: ["1:A→B:right:high:right", "5:B→A:right:low:right"]
  },
  {
    name: "vertical non-native inward",
    pair: { a: "high-non-native", b: "low-non-native" },
    flow: "inwards",
    left: ["1:A→B:right:high:right", "5:B→A:right:low:right"],
    right: ["1:A→B:left:high:left", "5:B→A:left:low:left"]
  },
  {
    name: "vertical non-native outward",
    pair: { a: "high-non-native", b: "low-non-native" },
    flow: "outwards",
    left: ["1:A→B:right:low:right", "5:B→A:right:high:right"],
    right: ["1:A→B:left:low:left", "5:B→A:left:high:left"]
  },
  {
    name: "high BTB inward",
    pair: { a: "high-native", b: "high-back" },
    flow: "inwards",
    left: [
      "1:A→B:left:high:left",
      "2:B→A:right:high:right",
      "4:A→B:right:high:right",
      "5:B→A:left:high:left"
    ],
    right: [
      "1:A→B:right:high:right",
      "2:B→A:left:high:left",
      "4:A→B:left:high:left",
      "5:B→A:right:high:right"
    ]
  },
  {
    name: "high BTB outward",
    pair: { a: "high-native", b: "high-back" },
    flow: "outwards",
    left: [
      "1:A→B:left:high:left",
      "2:B→A:right:high:right",
      "4:A→B:right:high:right",
      "5:B→A:left:high:left"
    ],
    right: [
      "1:A→B:right:high:right",
      "2:B→A:left:high:left",
      "4:A→B:left:high:left",
      "5:B→A:right:high:right"
    ]
  },
  {
    name: "low BTB inward",
    pair: { a: "low-native", b: "low-back" },
    flow: "inwards",
    left: [
      "1:A→B:left:low:left",
      "2:B→A:right:low:right",
      "4:A→B:right:low:right",
      "5:B→A:left:low:left"
    ],
    right: [
      "1:A→B:right:low:right",
      "2:B→A:left:low:left",
      "4:A→B:left:low:left",
      "5:B→A:right:low:right"
    ]
  },
  {
    name: "low BTB outward",
    pair: { a: "low-native", b: "low-back" },
    flow: "outwards",
    left: [
      "1:A→B:left:low:left",
      "2:B→A:right:low:right",
      "4:A→B:right:low:right",
      "5:B→A:left:low:left"
    ],
    right: [
      "1:A→B:right:low:right",
      "2:B→A:left:low:left",
      "4:A→B:left:low:left",
      "5:B→A:right:low:right"
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

function compileHandCase(
  pair: WrapPositionPair,
  flow: Flow,
  hand: PoiBeatHand
): ReturnType<typeof compilePoiBeatGraph> {
  const graph = buildWrapBeatGraph({
    left: pair,
    right: pair,
    direction: { mode: "opposite", flow },
    offset: 0
  });

  return compilePoiBeatGraph(filterPoiBeatGraphTracks(graph, [hand]));
}

describe("single-hand wrap crosspoint oracle", () => {
  it.each(WRAP_CROSSPOINT_ORACLE)("matches $name", ({ pair, flow, left, right }) => {
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
  });

  it.each([
    ["high-native", "low-native"],
    ["high-non-native", "low-non-native"],
    ["high-native", "high-non-native"],
    ["low-native", "low-non-native"],
    ["high-native", "low-non-native"],
    ["low-native", "high-non-native"],
    ["high-native", "high-back"],
    ["low-native", "low-back"]
  ] as const)("keeps reversed %s/%s wrap pairs legal", (positionA, positionB) => {
    const pair = { a: positionB, b: positionA } as WrapPositionPair;

    for (const flow of ["inwards", "outwards"] as const) {
      for (const hand of ["left", "right"] as const) {
        const result = compileHandCase(pair, flow, hand);
        expect(result.crosspointDiagnostics).toEqual([]);
      }
    }
  });
});
