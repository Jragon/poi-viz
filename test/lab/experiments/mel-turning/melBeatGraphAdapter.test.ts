import { describe, expect, it } from "vitest";

import {
  buildTurningReelCycle,
  type TurningReelConfig,
  type TurningReelDirection,
  type TurningReelPosition
} from "@/lab/experiments/mel-turning/adapter/melBeatGraphAdapter";

const POSITIONS = [
  "low-native",
  "low-non-native",
  "low-back"
] as const satisfies readonly TurningReelPosition[];
const DIRECTIONS = [
  { mode: "same", direction: "clockwise" },
  { mode: "same", direction: "counterclockwise" },
  { mode: "opposite", flow: "inwards" },
  { mode: "opposite", flow: "outwards" }
] as const satisfies readonly TurningReelDirection[];
const OFFSETS = [0, 1, 2, 3] as const;

function allLowReelConfigs(): readonly TurningReelConfig[] {
  return POSITIONS.flatMap((left) =>
    POSITIONS.flatMap((right) =>
      DIRECTIONS.flatMap((direction) =>
        OFFSETS.map((offset) => ({ left, right, direction, offset }))
      )
    )
  );
}

describe("Mel beat-graph turning adapter", () => {
  it("resolves every symbolic low-reel center row to its peripheral Mel hand anchor", () => {
    for (const config of allLowReelConfigs()) {
      const cycle = buildTurningReelCycle(config);

      for (const track of cycle.tracks) {
        const outside = track.nodes.find((node) => node.laneId !== "center");
        if (!outside) throw new Error(`Expected a ${track.hand} outside reel row.`);

        expect(track.nodes.some((node) => node.laneId === "center")).toBe(true);
        for (const node of track.nodes) {
          expect(node.handPoint.x).toBeCloseTo(outside.handPoint.x);
          expect(node.handPoint.y).toBeCloseTo(outside.handPoint.y);
          expect(Math.abs(node.handPoint.x)).toBeCloseTo(0.5);
          expect(node.handPoint.y).toBeCloseTo(-0.35);
        }
      }
    }
  });
});
