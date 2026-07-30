import {
  POI_BEAT_LANES,
  deriveRowStates
} from "@/lab/experiments/mel-body-tracing/beat-graph/graphHelpers";
import type { PoiBeatTrack } from "@/lab/experiments/mel-body-tracing/beat-graph/types";
import {
  buildReelBeatGraph,
  deriveReelState
} from "@/lab/experiments/mel-body-tracing/explorers/reelRules";
import type {
  ReelConfig,
  ReelDirection,
  ReelOffset,
  ReelPatternType,
  ReelPosition,
  ReelTimingLabel
} from "@/lab/experiments/mel-body-tracing/explorers/reelTypes";
import type {
  TurningLane,
  TurningLaneId,
  TurningTrack,
  TurningTrackDraft
} from "@/lab/experiments/mel-turning/model/turningTypes";

export type TurningReelOffset = ReelOffset;

export type TurningReelDirection = ReelDirection;

export type TurningReelPosition = Extract<
  ReelPosition,
  "low-native" | "low-non-native" | "low-back"
>;

export interface TurningReelConfig {
  readonly left: TurningReelPosition;
  readonly right: TurningReelPosition;
  readonly direction: TurningReelDirection;
  readonly offset: TurningReelOffset;
}

export interface TurningReelCycle {
  readonly cycleSteps: number;
  readonly timing: ReelTimingLabel;
  readonly patternType: ReelPatternType;
  readonly tracks: readonly TurningTrack[];
}

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
  const draftRowsByStep = new Map(draft.rows.map((row) => [row.step, row] as const));
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
    nodes: deriveRowStates(melTrack).map((state) => {
      const draftRow = draftRowsByStep.get(state.row.step);
      if (!draftRow) {
        throw new Error(`Turning adapter lost draft row at t${state.row.step}.`);
      }

      return {
        step: state.row.step,
        laneId: state.row.laneId as TurningLaneId,
        planeSide: state.planeSide,
        phase: state.phaseLabel,
        handPlacement: draftRow.handPlacement ?? (state.isBTB ? "behind-body" : "wall")
      };
    })
  };
}

export function buildTurningReelCycle(config: TurningReelConfig): TurningReelCycle {
  const melConfig: ReelConfig = config;
  const graph = buildReelBeatGraph(melConfig);
  const state = deriveReelState(melConfig);

  return {
    cycleSteps: graph.cycleSteps,
    timing: state.timing,
    patternType: state.patternType,
    tracks: graph.tracks.map((track) =>
      deriveTurningTrackFromMel({
        id: track.id,
        hand: track.hand,
        poiDirection: track.poiDirection,
        initialPhase: track.initialPhase,
        rows: track.rows.map((row) => {
          if (!row.planeSide) {
            throw new Error(`Mel reel row t${row.step} has no plane side.`);
          }
          return {
            step: row.step,
            laneId: row.laneId as TurningLaneId,
            planeSide: row.planeSide
          };
        })
      })
    )
  };
}
