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
  deriveRowIsBTB,
  deriveRowSide,
  deriveRowState,
  getDirectionSign,
  getPoiBeatLane
} from "@/lab/experiments/mel-body-tracing/beat-graph/graphHelpers";
import type {
  PoiBeatCompilerOptions,
  PoiBeatGraph,
  PoiBeatInterval,
  PoiBeatLaneId,
  PoiBeatTrack
} from "@/lab/experiments/mel-body-tracing/beat-graph/types";

export const DEFAULT_POI_BEAT_COMPILER_OPTIONS: PoiBeatCompilerOptions = {
  halfBeatDuration: 0.5,
  headRadius: 0.6,
  handHorizontalOffset: 0.5,
  handVerticalOffset: 0.35
};

export type PoiBeatCompileDiagnosticCode = "EMPTY_TRACK" | "ROW_COUNT_MISMATCH";

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

interface HandPathKey {
  readonly tOffset: number;
  readonly point: Vec2;
}

interface HandPathWindow {
  readonly keys: readonly HandPathKey[];
  readonly localOffset: number;
  readonly label: string;
}

function evalHandPathPoint(
  keys: readonly HandPathKey[],
  tOffset: number,
  fallbackPhaseAbs: number
): RelativeNodePose {
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (!first || !last) {
    throw new Error("Hand path window requires at least one key");
  }

  if (tOffset <= first.tOffset) return worldPointToPose(first.point);
  if (tOffset >= last.tOffset) return worldPointToPose(last.point);

  for (let keyIndex = 0; keyIndex < keys.length - 1; keyIndex += 1) {
    const fromKey = keys[keyIndex];
    const toKey = keys[keyIndex + 1];
    if (!fromKey || !toKey) continue;
    if (!(fromKey.tOffset <= tOffset && tOffset <= toKey.tOffset)) continue;

    const duration = toKey.tOffset - fromKey.tOffset;
    const progress = duration <= 0 ? 1 : smootherstep((tOffset - fromKey.tOffset) / duration);
    return cartesianToPolar(lerp2(fromKey.point, toKey.point, progress), fallbackPhaseAbs);
  }

  return worldPointToPose(last.point);
}

function evalHandPathWindow(
  window: HandPathWindow,
  startPose: RelativeNodePose,
  context: DriverEvalContext
): RelativeNodePose {
  return evalHandPathPoint(window.keys, context.tLocal + window.localOffset, startPose.phaseAbs);
}

function laneToHandPoint(laneId: PoiBeatLaneId, options: PoiBeatCompilerOptions): Vec2 {
  const lane = getPoiBeatLane(laneId);
  const y =
    lane.vertical === "high"
      ? options.handVerticalOffset
      : lane.vertical === "low"
        ? -options.handVerticalOffset
        : 0;

  switch (lane.lateral) {
    case "left":
      return { x: -options.handHorizontalOffset, y };
    case "center":
      return { x: 0, y: 0 };
    case "right":
      return { x: options.handHorizontalOffset, y };
  }
}

function mirrorPoiBeatLane(laneId: PoiBeatLaneId): PoiBeatLaneId | null {
  switch (laneId) {
    case "left-high":
      return "right-high";
    case "left-low":
      return "right-low";
    case "right-low":
      return "left-low";
    case "right-high":
      return "left-high";
    case "center":
      return null;
  }
}

function getCosmoBounceReferenceLane(
  entry: PoiBeatInterval,
  exit: PoiBeatInterval
): PoiBeatLaneId | null {
  const entryIsBTB = deriveRowIsBTB(entry.fromRow);
  const exitIsBTB = deriveRowIsBTB(exit.toRow);

  if (entryIsBTB && !exitIsBTB) return entry.fromRow.laneId;
  if (exitIsBTB && !entryIsBTB) return exit.toRow.laneId;
  if (entry.fromRow.laneId === exit.toRow.laneId) return entry.fromRow.laneId;
  return null;
}

function makeHandMotion(
  interval: PoiBeatInterval,
  startPoint: Vec2,
  endPoint: Vec2,
  pathWindow: HandPathWindow | null
): Segment["hand"] {
  if (pathWindow) {
    return {
      startPose: evalHandPathPoint(pathWindow.keys, pathWindow.localOffset, 0),
      driver: {
        kind: "runtime",
        label: pathWindow.label,
        evalPose: (startPose, context) => evalHandPathWindow(pathWindow, startPose, context)
      }
    };
  }

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
        evalHandPathPoint(
          [
            { tOffset: 0, point: startPoint },
            { tOffset: context.durationUnits, point: endPoint }
          ],
          context.tLocal,
          startPose.phaseAbs
        )
    }
  };
}

function intervalAt(
  intervals: readonly PoiBeatInterval[],
  index: number
): PoiBeatInterval | undefined {
  if (intervals.length === 0) return undefined;
  return intervals[((index % intervals.length) + intervals.length) % intervals.length];
}

function intervalIndexAt(intervals: readonly PoiBeatInterval[], index: number): number {
  return ((index % intervals.length) + intervals.length) % intervals.length;
}

function makeCosmoBounceWindow(
  intervals: readonly PoiBeatInterval[],
  intervalIndex: number,
  options: PoiBeatCompilerOptions
): HandPathWindow | null {
  if (intervals.length < 3) return null;

  for (const entryIndex of [intervalIndex, intervalIndex - 1, intervalIndex - 2]) {
    const sideSwitchIndex = entryIndex + 1;
    const exitIndex = entryIndex + 2;
    const entry = intervalAt(intervals, entryIndex);
    const sideSwitch = intervalAt(intervals, sideSwitchIndex);
    const exit = intervalAt(intervals, exitIndex);
    if (!entry || !sideSwitch || !exit) continue;
    if (
      ![
        intervalIndexAt(intervals, entryIndex),
        intervalIndexAt(intervals, sideSwitchIndex),
        intervalIndexAt(intervals, exitIndex)
      ].includes(intervalIndex)
    ) {
      continue;
    }

    if (entry.kind !== "lane-switch" || entry.toRow.laneId !== "center") continue;
    if (sideSwitch.kind !== "center-side-switch") continue;
    if (exit.kind !== "lane-switch" || exit.fromRow.laneId !== "center") continue;

    const bounceReferenceLaneId = getCosmoBounceReferenceLane(entry, exit);
    if (!bounceReferenceLaneId) continue;

    const bounceLaneId = mirrorPoiBeatLane(bounceReferenceLaneId);
    if (!bounceLaneId) continue;

    const entryDuration = entry.durationUnits;
    const switchDuration = sideSwitch.durationUnits;
    const exitDuration = exit.durationUnits;
    const totalDuration = entryDuration + switchDuration + exitDuration;
    const localOffset =
      intervalIndex === intervalIndexAt(intervals, entryIndex)
        ? 0
        : intervalIndex === intervalIndexAt(intervals, sideSwitchIndex)
          ? entryDuration
          : entryDuration + switchDuration;

    return {
      localOffset,
      label: `cosmo bounce ${entry.fromRow.laneId} through ${bounceLaneId} to ${exit.toRow.laneId}`,
      keys: [
        { tOffset: 0, point: laneToHandPoint(entry.fromRow.laneId, options) },
        { tOffset: totalDuration / 2, point: laneToHandPoint(bounceLaneId, options) },
        { tOffset: totalDuration, point: laneToHandPoint(exit.toRow.laneId, options) }
      ]
    };
  }

  return null;
}

// TODO: Keep this as a local experiment workaround for now. If more pass-through
// cases appear, replace it with a generic transfer-window derivation step.
function makeHandPathWindow(
  intervals: readonly PoiBeatInterval[],
  intervalIndex: number,
  options: PoiBeatCompilerOptions
): HandPathWindow | null {
  const cosmoBounceWindow = makeCosmoBounceWindow(intervals, intervalIndex, options);
  if (cosmoBounceWindow) return cosmoBounceWindow;

  const interval = intervals[intervalIndex];
  if (!interval || interval.kind !== "lane-switch") return null;

  const previous = intervals[(intervalIndex - 1 + intervals.length) % intervals.length];
  const next = intervals[(intervalIndex + 1) % intervals.length];

  if (
    interval.toRow.laneId === "center" &&
    next?.kind === "lane-switch" &&
    deriveRowSide(next.fromRow) === interval.planeSide
  ) {
    const start = laneToHandPoint(interval.fromRow.laneId, options);
    const end = laneToHandPoint(next.toRow.laneId, options);
    if (distance2(start, end) <= 1e-9) return null;

    return {
      localOffset: 0,
      label: `front transfer ${interval.fromRow.laneId} through center to ${next.toRow.laneId}`,
      keys: [
        { tOffset: 0, point: start },
        { tOffset: interval.durationUnits + next.durationUnits, point: end }
      ]
    };
  }

  if (
    interval.fromRow.laneId === "center" &&
    previous?.kind === "lane-switch" &&
    previous.planeSide === deriveRowSide(interval.fromRow)
  ) {
    const start = laneToHandPoint(previous.fromRow.laneId, options);
    const end = laneToHandPoint(interval.toRow.laneId, options);
    if (distance2(start, end) <= 1e-9) return null;

    return {
      localOffset: previous.durationUnits,
      label: `front transfer ${previous.fromRow.laneId} through center to ${interval.toRow.laneId}`,
      keys: [
        { tOffset: 0, point: start },
        { tOffset: previous.durationUnits + interval.durationUnits, point: end }
      ]
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

    segments.push({
      durationUnits: interval.durationUnits,
      planeId: "wall",
      planeSide: interval.planeSide,
      ...(deriveRowIsBTB(interval.fromRow) ? { behindBody: true } : {}),
      hand: makeHandMotion(
        interval,
        startPoint,
        endPoint,
        makeHandPathWindow(intervals, intervalIndex, options)
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
