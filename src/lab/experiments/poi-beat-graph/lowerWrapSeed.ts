import { POI_BEAT_LANES } from "@/lab/experiments/poi-beat-graph/graphHelpers";
import type { PoiBeatGraph } from "@/lab/experiments/poi-beat-graph/types";

export function createLowerWrapBeatGraph(): PoiBeatGraph {
  return {
    cycleSteps: 6,
    lanes: POI_BEAT_LANES,
    tracks: [
      {
        id: "right",
        hand: "right",
        poiDirection: "counterclockwise",
        initialPhase: "up",
        rows: [
          { step: 0, laneId: "right-low" },
          { step: 1, laneId: "right-low" },
          { step: 2, laneId: "center" },
          { step: 3, laneId: "left-low" },
          { step: 4, laneId: "left-low" },
          { step: 5, laneId: "center" }
        ]
      }
    ]
  };
}

export function createUpperWrapBeatGraph(): PoiBeatGraph {
  return {
    cycleSteps: 6,
    lanes: POI_BEAT_LANES,
    tracks: [
      {
        id: "right",
        hand: "right",
        poiDirection: "counterclockwise",
        initialPhase: "up",
        rows: [
          { step: 0, laneId: "right-high" },
          { step: 1, laneId: "right-high" },
          { step: 2, laneId: "center" },
          { step: 3, laneId: "left-high" },
          { step: 4, laneId: "left-high" },
          { step: 5, laneId: "center" }
        ]
      }
    ]
  };
}
