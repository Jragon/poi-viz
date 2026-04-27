import { PI } from "@/engine/constants";
import type { MultiRigSequence, Segment } from "@/engine/types";

function makeSegment(handOmega: number, headOmega: number): Segment {
  return {
    hand: {
      startPose: { phaseAbs: 0, radius: 1 },
      driver: { kind: "circle", omega: handOmega }
    },
    head: {
      startPose: { phaseAbs: 0, radius: 1 },
      driver: { kind: "circle", omega: headOmega }
    }
  };
}

export const demoSequence: MultiRigSequence = {
  rigs: [
    {
      rigId: "left",
      sequence: {
        segments: [
          { segment: makeSegment(1, 1), durationUnits: 2 * PI },
          { segment: makeSegment(1, -2), durationUnits: 2 * PI }
        ]
      }
    },
    {
      rigId: "right",
      sequence: {
        segments: [
          { segment: makeSegment(1, 1), durationUnits: 2 * PI },
          { segment: makeSegment(1, 2), durationUnits: 4 * PI }
        ]
      }
    }
  ]
};
