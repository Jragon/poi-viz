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

function smootherstep(value: number): number {
  const t = clamp01(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
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
  context: DriverEvalContext,
  localOffset = 0,
  durationUnits = context.durationUnits
): RelativeNodePose {
  const progress = smootherstep((context.tLocal + localOffset) / durationUnits);
  if (progress <= 0) return worldPointToPose(start);
  if (progress >= 1) return worldPointToPose(end);

  return cartesianToPolar(lerp2(start, end, progress), startPose.phaseAbs);
}

interface HandTransferWindow {
  readonly start: Vec2;
  readonly end: Vec2;
  readonly localOffset: number;
  readonly durationUnits: number;
  readonly label: string;
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
  endPoint: Vec2,
  transferWindow: HandTransferWindow | null
): Segment["hand"] {
  if (distance2(startPoint, endPoint) <= 1e-9) {
    return {
      startPose: worldPointToPose(startPoint),
      driver: { kind: "circle", omega: 0 }
    };
  }

  const transferStart = transferWindow?.start ?? startPoint;
  const transferEnd = transferWindow?.end ?? endPoint;
  const localOffset = transferWindow?.localOffset ?? 0;
  const durationUnits = transferWindow?.durationUnits;

  return {
    startPose: worldPointToPose(startPoint),
    driver: {
      kind: "runtime",
      label:
        transferWindow?.label ??
        `front transfer ${interval.fromRow.laneId} to ${interval.toRow.laneId}`,
      evalPose: (startPose, context) =>
        evalSmoothTransferHand(
          startPose,
          transferStart,
          transferEnd,
          context,
          localOffset,
          durationUnits
        )
    }
  };
}

// TODO: Keep this as a local experiment workaround for now. If more pass-through
// cases appear, replace it with a generic transfer-window derivation step.
function makeCenterPassThroughWindow(
  intervals: readonly PoiBeatInterval[],
  intervalIndex: number,
  options: PoiBeatCompilerOptions
): HandTransferWindow | null {
  const interval = intervals[intervalIndex];
  if (!interval || interval.kind !== "lane-switch") return null;

  const previous = intervals[(intervalIndex - 1 + intervals.length) % intervals.length];
  const next = intervals[(intervalIndex + 1) % intervals.length];

  if (interval.toRow.laneId === "center" && next?.kind === "lane-switch") {
    const start = laneToHandPoint(interval.fromRow.laneId, options);
    const end = laneToHandPoint(next.toRow.laneId, options);
    if (!start || !end || distance2(start, end) <= 1e-9) return null;

    return {
      start,
      end,
      localOffset: 0,
      durationUnits: interval.durationUnits + next.durationUnits,
      label: `front transfer ${interval.fromRow.laneId} through center to ${next.toRow.laneId}`
    };
  }

  if (interval.fromRow.laneId === "center" && previous?.kind === "lane-switch") {
    const start = laneToHandPoint(previous.fromRow.laneId, options);
    const end = laneToHandPoint(interval.toRow.laneId, options);
    if (!start || !end || distance2(start, end) <= 1e-9) return null;

    return {
      start,
      end,
      localOffset: previous.durationUnits,
      durationUnits: previous.durationUnits + interval.durationUnits,
      label: `front transfer ${previous.fromRow.laneId} through center to ${interval.toRow.laneId}`
    };
  }

  return null;
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

  for (const [intervalIndex, interval] of intervals.entries()) {
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
      hand: makeHandMotion(
        interval,
        startPoint,
        endPoint,
        makeCenterPassThroughWindow(intervals, intervalIndex, options)
      ),
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
