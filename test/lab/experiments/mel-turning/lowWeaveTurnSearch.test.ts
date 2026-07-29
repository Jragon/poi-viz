import { describe, expect, it } from "vitest";

import { searchLowWeaveTurns } from "@/lab/experiments/mel-turning/model/lowWeaveTurnSearch";

describe("low-weave fixed-target turn search", () => {
  it.each(["left", "right"] as const)(
    "finds both natural SS offset 3 clockwise to offset 1 counterclockwise %s-turn phases",
    (turnDirection) => {
      const result = searchLowWeaveTurns({
        source: {
          direction: { mode: "same", direction: "clockwise" },
          offset: 3
        },
        target: {
          direction: { mode: "same", direction: "counterclockwise" },
          offset: 1
        },
        turnDirection
      });

      expect(result.sourceTiming).toBe("SS");
      expect(result.targetTiming).toBe("SS");
      expect(result.shortestBridgeHalfbeats).toBe(1);
      expect(result.paths).toHaveLength(2);
      expect(
        result.paths.map((path) => path.edges)
      ).toEqual([
        [
          {
            kind: "turn",
            turnDirection,
            leftMechanism: "cross",
            rightMechanism: "hold"
          }
        ],
        [
          {
            kind: "turn",
            turnDirection,
            leftMechanism: "cross",
            rightMechanism: "hold"
          }
        ]
      ]);
    }
  );

  it("rejects a target that changes observer-fixed poi direction", () => {
    expect(() =>
      searchLowWeaveTurns({
        source: {
          direction: { mode: "opposite", flow: "inwards" },
          offset: 0
        },
        target: {
          direction: { mode: "opposite", flow: "inwards" },
          offset: 0
        },
        turnDirection: "left"
      })
    ).toThrow(/preserve observer-fixed poi direction/);
  });

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
    "finds opposite-direction offset %i→%i %s-turn %s candidates",
    (sourceOffset, targetOffset, turnDirection, timing, candidateCount) => {
      const result = searchLowWeaveTurns({
        source: {
          direction: { mode: "opposite", flow: "inwards" },
          offset: sourceOffset
        },
        target: {
          direction: { mode: "opposite", flow: "outwards" },
          offset: targetOffset
        },
        turnDirection
      });

      expect(result.sourceTiming).toBe(timing);
      expect(result.targetTiming).toBe(timing);
      expect(result.shortestBridgeHalfbeats).toBe(1);
      expect(result.paths).toHaveLength(candidateCount);
      expect(
        result.paths.every(
          (path) =>
            path.states[0]?.facing === 0 &&
            path.states.at(-1)?.facing === 180 &&
            path.edges.length === 1 &&
            path.edges[0]?.kind === "turn"
        )
      ).toBe(true);
    }
  );
});
