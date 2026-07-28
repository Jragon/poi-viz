import {
  POI_BEAT_LANES,
  deriveRowStates
} from "@/lab/experiments/mel-body-tracing/beat-graph/graphHelpers";
import type { PoiBeatTrack } from "@/lab/experiments/mel-body-tracing/beat-graph/types";
import type {
  TurningLane,
  TurningLaneId,
  TurningTrack,
  TurningTrackDraft
} from "@/lab/experiments/mel-turning/model/turningTypes";

/**
 * This is the only dependency seam from Mel Turning into Mel Body Tracing.
 * The turning experiment owns its public model; this adapter translates Mel's
 * lane and phase derivations into that model.
 */
export function getMelTurningLanes(): readonly TurningLane[] {
  return POI_BEAT_LANES.map((lane) => ({
    id: lane.id as TurningLaneId,
    label: lane.label
  }));
}

export function deriveTurningTrackFromMel(draft: TurningTrackDraft): TurningTrack {
  const melTrack: PoiBeatTrack = {
    id: draft.id,
    hand: draft.hand,
    poiDirection: draft.poiDirection,
    initialPhase: draft.initialPhase,
    rows: draft.rows.map((row) => ({
      step: row.step,
      laneId: row.laneId,
      planeSide: row.planeSide
    }))
  };

  return {
    id: draft.id,
    hand: draft.hand,
    poiDirection: draft.poiDirection,
    initialPhase: draft.initialPhase,
    nodes: deriveRowStates(melTrack).map((state) => ({
      step: state.row.step,
      laneId: state.row.laneId as TurningLaneId,
      planeSide: state.planeSide,
      phase: state.phaseLabel
    }))
  };
}
