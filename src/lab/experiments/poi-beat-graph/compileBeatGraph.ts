import { PI } from "@/engine/constants";
import type {
  DriverEvalContext,
  MultiRigSequence,
  RelativeNodePose,
  Segment,
  Vec2
} from "@/engine/types";
import {
  deriveLoopIntervals,
  deriveRowState,
  getDirectionSign,
  getPoiBeatLane
} from "@/lab/experiments/poi-beat-graph/graphHelpers";
import type {
  PoiBeatCompilerOptions,
  PoiBeatGraph,
  PoiBeatInterval,
  PoiBeatLaneId,
  PoiBeatTrack
} from "@/lab/experiments/poi-beat-graph/types";

export const DEFAULT_POI_BEAT_COMPILER_OPTIONS: PoiBeatCompilerOptions = {
  halfBeatDuration: 0.5,
  headRadius: 0.6,
  handOffset: 0.5
};

export type PoiBeatCompileDiagnosticCode =
  | "EMPTY_TRACK"
  | "ROW_COUNT_MISMATCH"
  | "UNSUPPORTED_HIGH_LANE"
  | "CENTER_STATIONARY_INTERVAL";

export interface PoiBeatCompileDiagnostic {
  readonly code: PoiBeatCompileDiagnosticCode;
  readonly trackId: string;
  readonly intervalIndex?: number;
  readonly step?: number;
  readonly laneId?: PoiBeatLaneId;
}

export interface CompilePoiBeatGraphResult {
  readonly sequence: MultiRigSequence;
  readonly diagnostics: readonly PoiBeatCompileDiagnostic[];
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function lerp2(a: Vec2, b: Vec2, progress: number): Vec2 {
  return {
    x: a.x + (b.x - a.x) * progress,
    y: a.y + (b.y - a.y) * progress
  };
}

function distance2(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function cartesianToPolar(point: Vec2, fallbackPhaseAbs: number): RelativeNodePose {
  const radius = Math.hypot(point.x, point.y);
  if (radius <= 1e-12) {
    return { phaseAbs: fallbackPhaseAbs, radius: 0 };
  }

  return {
    phaseAbs: Math.atan2(point.y, point.x),
    radius
  };
}

function worldPointToPose(point: Vec2): RelativeNodePose {
  return cartesianToPolar(point, 0);
}

function evalSmoothTransferHand(
  startPose: RelativeNodePose,
  start: Vec2,
  end: Vec2,
  context: DriverEvalContext
): RelativeNodePose {
  const progress = smoothstep(context.tLocal / context.durationUnits);
  if (progress <= 0) return worldPointToPose(start);
  if (progress >= 1) return worldPointToPose(end);

  return cartesianToPolar(lerp2(start, end, progress), startPose.phaseAbs);
}

function laneToHandPoint(laneId: PoiBeatLaneId, options: PoiBeatCompilerOptions): Vec2 | null {
  const lane = getPoiBeatLane(laneId);
  if (lane.vertical === "high") return null;

  switch (lane.lateral) {
    case "left":
      return { x: -options.handOffset, y: 0 };
    case "center":
      return { x: 0, y: 0 };
    case "right":
      return { x: options.handOffset, y: 0 };
  }
}

function makeHandMotion(
  interval: PoiBeatInterval,
  startPoint: Vec2,
  endPoint: Vec2
): Segment["hand"] {
  if (distance2(startPoint, endPoint) <= 1e-9) {
    return {
      startPose: worldPointToPose(startPoint),
      driver: { kind: "circle", omega: 0 }
    };
  }

  return {
    startPose: worldPointToPose(startPoint),
    driver: {
      kind: "runtime",
      label: `front transfer ${interval.fromRow.laneId} to ${interval.toRow.laneId}`,
      evalPose: (startPose, context) =>
        evalSmoothTransferHand(startPose, startPoint, endPoint, context)
    }
  };
}

function compileTrack(
  graph: PoiBeatGraph,
  track: PoiBeatTrack,
  options: PoiBeatCompilerOptions,
  diagnostics: PoiBeatCompileDiagnostic[]
): Segment[] {
  if (track.rows.length === 0) {
    diagnostics.push({ code: "EMPTY_TRACK", trackId: track.id });
    return [];
  }

  if (track.rows.length !== graph.cycleSteps) {
    diagnostics.push({ code: "ROW_COUNT_MISMATCH", trackId: track.id });
  }

  const omega = (getDirectionSign(track.poiDirection) * PI) / options.halfBeatDuration;
  const intervals = deriveLoopIntervals(track, options.halfBeatDuration);
  const segments: Segment[] = [];

  for (const interval of intervals) {
    const startPoint = laneToHandPoint(interval.fromRow.laneId, options);
    const endPoint = laneToHandPoint(interval.toRow.laneId, options);

    if (!startPoint) {
      diagnostics.push({
        code: "UNSUPPORTED_HIGH_LANE",
        trackId: track.id,
        intervalIndex: interval.index,
        step: interval.fromRow.step,
        laneId: interval.fromRow.laneId
      });
      continue;
    }

    if (!endPoint) {
      diagnostics.push({
        code: "UNSUPPORTED_HIGH_LANE",
        trackId: track.id,
        intervalIndex: interval.index,
        step: interval.toRow.step,
        laneId: interval.toRow.laneId
      });
      continue;
    }

    if (interval.kind === "same-lane" && interval.fromRow.laneId === "center") {
      diagnostics.push({
        code: "CENTER_STATIONARY_INTERVAL",
        trackId: track.id,
        intervalIndex: interval.index,
        step: interval.fromRow.step,
        laneId: interval.fromRow.laneId
      });
    }

    segments.push({
      durationUnits: interval.durationUnits,
      planeId: "wall",
      planeSide: interval.planeSide,
      hand: makeHandMotion(interval, startPoint, endPoint),
      head: {
        startPose: {
          phaseAbs: deriveRowState(track, interval.fromRow).phaseAbs,
          radius: options.headRadius
        },
        driver: {
          kind: "circle",
          omega
        }
      }
    });
  }

  return segments;
}

export function compilePoiBeatGraph(
  graph: PoiBeatGraph,
  options: PoiBeatCompilerOptions = DEFAULT_POI_BEAT_COMPILER_OPTIONS
): CompilePoiBeatGraphResult {
  const diagnostics: PoiBeatCompileDiagnostic[] = [];
  const rigs = graph.tracks.map((track) => ({
    rigId: track.id,
    sequence: {
      segments: compileTrack(graph, track, options, diagnostics)
    }
  }));

  return {
    sequence: { rigs },
    diagnostics
  };
}
