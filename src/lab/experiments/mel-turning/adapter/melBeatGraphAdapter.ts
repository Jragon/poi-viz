import {
  POI_BEAT_LANES,
  deriveRowStates
} from "@/lab/experiments/mel-body-tracing/beat-graph/graphHelpers";
import { compilePoiBeatGraph } from "@/lab/experiments/mel-body-tracing/beat-graph/compileBeatGraph";
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
  TurningHandPoint,
  TurningNode,
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
  readonly tracks: readonly TurningResolvedReelTrack[];
}

/**
 * A reel row with its hand point resolved by Mel's existing cyclic compiler.
 * `handPoint` remains in the performer's body-relative wall plane, including
 * for a target graph that will later be displayed at 180 degrees.
 */
export interface TurningResolvedReelNode extends TurningNode {
  readonly handPoint: TurningHandPoint;
}

export interface TurningResolvedReelTrack extends Omit<TurningTrack, "nodes"> {
  readonly nodes: readonly TurningResolvedReelNode[];
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
  const compiled = compilePoiBeatGraph(graph);
  const compiledRigById = new Map(
    compiled.sequence.rigs.map((rig) => [rig.rigId, rig.sequence] as const)
  );

  return {
    cycleSteps: graph.cycleSteps,
    timing: state.timing,
    patternType: state.patternType,
    tracks: graph.tracks.map((track) => {
      const symbolicTrack = deriveTurningTrackFromMel({
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
      });
      const compiledTrack = compiledRigById.get(track.id);
      if (!compiledTrack) {
        throw new Error(`Mel compiler returned no ${track.id} reel track.`);
      }

      return {
        ...symbolicTrack,
        nodes: symbolicTrack.nodes.map((node) => {
          const segment = compiledTrack.segments[node.step];
          if (!segment) {
            throw new Error(`Mel compiler returned no ${track.id} segment at t${node.step}.`);
          }

          return {
            ...node,
            handPoint: {
              x: Math.cos(segment.hand.startPose.phaseAbs) * segment.hand.startPose.radius,
              y: Math.sin(segment.hand.startPose.phaseAbs) * segment.hand.startPose.radius
            }
          };
        })
      };
    })
  };
}
