import { describe, expect, it } from "vitest";

import {
  buildTurningReelCycle,
  type TurningReelConfig,
  type TurningReelDirection,
  type TurningReelOffset,
  type TurningReelPosition
} from "@/lab/experiments/mel-turning/adapter/melBeatGraphAdapter";
import { searchLowReelDirectTurns } from "@/lab/experiments/mel-turning/model/lowReelDirectTurnSearch";

const LOW_POSITIONS: readonly TurningReelPosition[] = [
  "low-native",
  "low-non-native",
  "low-back"
] as const;
const DIRECTIONS: readonly TurningReelDirection[] = [
  { mode: "same", direction: "clockwise" },
  { mode: "same", direction: "counterclockwise" },
  { mode: "opposite", flow: "inwards" },
  { mode: "opposite", flow: "outwards" }
];
const OFFSETS: readonly TurningReelOffset[] = [0, 1, 2, 3];

const LEFT_WEAVE_SOURCE: TurningReelConfig = {
  left: "low-native",
  right: "low-non-native",
  direction: { mode: "same", direction: "clockwise" },
  offset: 3
};

const LEFT_WEAVE_TARGET: TurningReelConfig = {
  left: "low-native",
  right: "low-non-native",
  direction: { mode: "same", direction: "counterclockwise" },
  offset: 1
};

describe("Mel low-reel endpoint adapter", () => {
  it("compiles all 144 exact low-reel endpoint configurations deterministically", () => {
    let compiledCount = 0;

    for (const left of LOW_POSITIONS) {
      for (const right of LOW_POSITIONS) {
        for (const direction of DIRECTIONS) {
          for (const offset of OFFSETS) {
            const config = { left, right, direction, offset };
            const cycle = buildTurningReelCycle(config);

            expect(cycle.cycleSteps).toBe(4);
            expect(cycle.tracks).toHaveLength(2);
            expect(buildTurningReelCycle(config)).toEqual(cycle);
            compiledCount += 1;
          }
        }
      }
    }

    expect(compiledCount).toBe(144);
  });

  it("compiles all nine low placement pairs and preserves Mel BTB placement", () => {
    const patternTypes: string[] = [];

    for (const left of LOW_POSITIONS) {
      for (const right of LOW_POSITIONS) {
        const cycle = buildTurningReelCycle({
          left,
          right,
          direction: { mode: "same", direction: "clockwise" },
          offset: 0
        });
        const leftTrack = cycle.tracks.find((track) => track.hand === "left");
        const rightTrack = cycle.tracks.find((track) => track.hand === "right");

        expect(leftTrack?.nodes.map((node) => node.handPlacement)).toEqual(
          Array.from({ length: 4 }, () => (left === "low-back" ? "behind-body" : "wall"))
        );
        expect(rightTrack?.nodes.map((node) => node.handPlacement)).toEqual(
          Array.from({ length: 4 }, () => (right === "low-back" ? "behind-body" : "wall"))
        );
        patternTypes.push(cycle.patternType);
      }
    }

    expect(patternTypes.filter((patternType) => patternType === "weave")).toHaveLength(4);
    expect(patternTypes.filter((patternType) => patternType === "mill")).toHaveLength(5);
  });
});

describe("exact low-reel direct-turn search", () => {
  it.each(["left", "right"] as const)(
    "finds the two verified natural left-weave %s-turn alignments",
    (turnDirection) => {
      const result = searchLowReelDirectTurns({
        source: LEFT_WEAVE_SOURCE,
        target: LEFT_WEAVE_TARGET,
        turnDirection
      });
      const valid = result.candidates.filter((candidate) => candidate.topologyStatus === "valid");

      expect(result).toMatchObject({
        status: "valid",
        diagnostics: [],
        sourceTiming: "SS",
        targetTiming: "SS",
        sourcePatternType: "weave",
        targetPatternType: "weave"
      });
      expect(valid).toHaveLength(2);
      expect(
        valid.map((candidate) => [
          candidate.leftTopology.mechanism,
          candidate.rightTopology.mechanism
        ])
      ).toEqual([
        ["cross", "hold"],
        ["cross", "hold"]
      ]);
    }
  );

  it.each([
    [0, 0, "left", "SO", 4],
    [0, 0, "right", "SO", 4],
    [0, 2, "left", "SO", 2],
    [0, 2, "right", "SO", 2],
    [1, 1, "left", "TO", 2],
    [1, 1, "right", "TO", 2],
    [1, 3, "left", "TO", 2],
    [1, 3, "right", "TO", 2]
  ] as const)(
    "retains %i→%i %s-turn %s valid alignments inside the complete diagnostic set",
    (sourceOffset, targetOffset, turnDirection, timing, validCount) => {
      const result = searchLowReelDirectTurns({
        source: {
          left: "low-native",
          right: "low-non-native",
          direction: { mode: "opposite", flow: "inwards" },
          offset: sourceOffset
        },
        target: {
          left: "low-native",
          right: "low-non-native",
          direction: { mode: "opposite", flow: "outwards" },
          offset: targetOffset
        },
        turnDirection
      });

      expect(result.sourceTiming).toBe(timing);
      expect(result.targetTiming).toBe(timing);
      expect(
        result.candidates.filter((candidate) => candidate.topologyStatus === "valid")
      ).toHaveLength(validCount);
      expect(new Set(result.candidates.map((candidate) => candidate.id)).size).toBe(
        result.candidates.length
      );
    }
  );

  it("returns diagnostics instead of throwing for observer-direction incompatibility", () => {
    const result = searchLowReelDirectTurns({
      source: {
        left: "low-native",
        right: "low-native",
        direction: { mode: "opposite", flow: "inwards" },
        offset: 0
      },
      target: {
        left: "low-native",
        right: "low-native",
        direction: { mode: "opposite", flow: "inwards" },
        offset: 0
      },
      turnDirection: "left"
    });

    expect(result.status).toBe("invalid");
    expect(result.candidates).toEqual([]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: "TARGET_POI_DIRECTION_MISMATCH",
        hand: "left"
      }),
      expect.objectContaining({
        code: "TARGET_POI_DIRECTION_MISMATCH",
        hand: "right"
      })
    ]);
  });

  it("reports incompatible timing when no exact next-halfbeat phase alignment exists", () => {
    const result = searchLowReelDirectTurns({
      source: {
        left: "low-native",
        right: "low-non-native",
        direction: { mode: "same", direction: "clockwise" },
        offset: 0
      },
      target: {
        left: "low-native",
        right: "low-non-native",
        direction: { mode: "same", direction: "counterclockwise" },
        offset: 1
      },
      turnDirection: "left"
    });

    expect(result.status).toBe("invalid");
    expect(result.candidates).toEqual([]);
    expect(result.diagnostics).toEqual([expect.objectContaining({ code: "NO_PHASE_ALIGNMENT" })]);
  });

  it("supports independent mill and weave endpoints without implicit normal-edge splicing", () => {
    const input = {
      source: {
        left: "low-native",
        right: "low-native",
        direction: { mode: "same", direction: "clockwise" },
        offset: 0
      },
      target: {
        left: "low-native",
        right: "low-non-native",
        direction: { mode: "same", direction: "counterclockwise" },
        offset: 1
      },
      turnDirection: "right"
    } as const;
    const result = searchLowReelDirectTurns(input);

    expect(result.sourcePatternType).toBe("mill");
    expect(result.targetPatternType).toBe("weave");
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates.every((candidate) => candidate.source.facing === 0)).toBe(true);
    expect(result.candidates.every((candidate) => candidate.target.facing === 180)).toBe(true);
    expect(searchLowReelDirectTurns(input)).toEqual(result);
  });

  it("retains unresolved and invalid low-back alignments instead of dropping them", () => {
    const result = searchLowReelDirectTurns({
      source: {
        left: "low-back",
        right: "low-back",
        direction: { mode: "same", direction: "clockwise" },
        offset: 0
      },
      target: {
        left: "low-back",
        right: "low-back",
        direction: { mode: "same", direction: "counterclockwise" },
        offset: 0
      },
      turnDirection: "left"
    });
    const statuses = new Set(result.candidates.map((candidate) => candidate.topologyStatus));

    expect(result.sourceCycle.every((state) => state.left.handPlacement === "behind-body")).toBe(
      true
    );
    expect(result.sourceCycle.every((state) => state.right.handPlacement === "behind-body")).toBe(
      true
    );
    expect(statuses.has("unresolved")).toBe(true);
    expect(statuses.has("invalid")).toBe(true);
  });

  it("enumerates only exact next-halfbeat phase alignments with stable unique ids", () => {
    const result = searchLowReelDirectTurns({
      source: LEFT_WEAVE_SOURCE,
      target: LEFT_WEAVE_TARGET,
      turnDirection: "left"
    });

    expect(
      result.candidates.every(
        (candidate) =>
          candidate.source.left.phase !== candidate.target.left.phase &&
          candidate.source.right.phase !== candidate.target.right.phase
      )
    ).toBe(true);
    expect(new Set(result.candidates.map((candidate) => candidate.id)).size).toBe(
      result.candidates.length
    );
  });
});
