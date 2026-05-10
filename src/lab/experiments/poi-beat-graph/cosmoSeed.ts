import { POI_BEAT_LANES } from "@/lab/experiments/poi-beat-graph/graphHelpers";
import type { PoiBeatGraph, PoiBeatRow } from "@/lab/experiments/poi-beat-graph/types";

const LOW_COMMON_COSMO_SIDE_PATTERN = ["b", "b", "a", "b", "a", "a", "b", "a"] as const;

function makeLowCommonCosmoRows(nativeLowLane: "left-low" | "right-low"): readonly PoiBeatRow[] {
  const lanes = [
    nativeLowLane,
    nativeLowLane,
    "center",
    "center",
    nativeLowLane,
    nativeLowLane,
    "center",
    "center"
  ] as const;

  return lanes.map((laneId, step) => ({
    step,
    laneId,
    planeSide: LOW_COMMON_COSMO_SIDE_PATTERN[step]
  }));
}

export function createLowCommonCosmoBeatGraph(): PoiBeatGraph {
  return {
    cycleSteps: 8,
    lanes: POI_BEAT_LANES,
    tracks: [
      {
        id: "left",
        hand: "left",
        poiDirection: "counterclockwise",
        initialPhase: "up",
        rows: makeLowCommonCosmoRows("right-low")
      },
      {
        id: "right",
        hand: "right",
        poiDirection: "clockwise",
        initialPhase: "up",
        rows: makeLowCommonCosmoRows("left-low")
      }
    ]
  };
}
