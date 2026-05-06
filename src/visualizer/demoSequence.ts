import { PI } from "@/engine/constants";
import type { MultiRigSequence, Segment } from "@/engine/types";

function makeSegment(durationUnits: number, handOmega: number, headOmega: number): Segment {
  return {
    durationUnits,
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

function makeSegmentAt(
  durationUnits: number,
  handPhase: number,
  headPhase: number,
  handOmega = 0,
  headOmega = 0
): Segment {
  return {
    durationUnits,
    hand: {
      startPose: { phaseAbs: handPhase, radius: 1 },
      driver: { kind: "circle", omega: handOmega }
    },
    head: {
      startPose: { phaseAbs: headPhase, radius: 1 },
      driver: { kind: "circle", omega: headOmega }
    }
  };
}

export const demoSequence: MultiRigSequence = {
  rigs: [
    {
      rigId: "left",
      sequence: {
        segments: [makeSegment(2 * PI, 1, 1), makeSegment(2 * PI, 1, -2)]
      }
    },
    {
      rigId: "right",
      sequence: {
        segments: [makeSegment(2 * PI, 1, 1), makeSegment(4 * PI, 1, 2)]
      }
    }
  ]
};

export const planeBreakDemoSequence: MultiRigSequence = {
  rigs: [
    {
      rigId: "left",
      sequence: {
        segments: [
          { ...makeSegmentAt(1, 0, PI), planeId: "wheel" },
          { ...makeSegmentAt(1, PI / 2, (3 * PI) / 2), planeId: "floor" }
        ]
      }
    }
  ]
};
