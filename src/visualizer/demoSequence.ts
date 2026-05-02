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

function makeSegmentAt(
  handPhase: number,
  headPhase: number,
  handOmega = 0,
  headOmega = 0
): Segment {
  return {
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

export const planeBreakDemoSequence: MultiRigSequence = {
  rigs: [
    {
      rigId: "left",
      sequence: {
        segments: [
          { segment: makeSegmentAt(0, PI), durationUnits: 1, planeId: "wheel" },
          { segment: makeSegmentAt(PI / 2, (3 * PI) / 2), durationUnits: 1, planeId: "floor" }
        ]
      }
    }
  ]
};
