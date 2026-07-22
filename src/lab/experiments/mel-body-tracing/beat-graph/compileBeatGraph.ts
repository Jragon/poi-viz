import { PI } from "@/engine/constants";
import type {
  DriverEvalContext,
  MultiRigSequence,
  RelativeNodePose,
  Segment,
  TimeUnit,
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
  PoiBeatCrosspointLevel,
  PoiBeatCrosspointViolation,
  PoiBeatGraph,
  PoiBeatHorizontalDirection,
  PoiBeatInterval,
  PoiBeatLaneId,
  PoiBeatResolvedCrosspoint,
  PoiBeatResolvedInterval,
  PoiBeatResolvedPlan,
  PoiBeatResolvedTrack,
  PoiBeatRow,
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

export interface PoiBeatCrosspointDiagnostic {
  readonly code: PoiBeatCrosspointViolation;
  readonly trackId: string;
  readonly intervalIndex: number;
  readonly step: number;
  readonly laneId: PoiBeatLaneId;
  readonly crosspoint: PoiBeatResolvedCrosspoint;
}

export interface CompilePoiBeatGraphResult {
  readonly sequence: MultiRigSequence;
  readonly analysis: PoiBeatResolvedPlan;
  readonly diagnostics: readonly PoiBeatCompileDiagnostic[];
  readonly crosspointDiagnostics: readonly PoiBeatCrosspointDiagnostic[];
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

type CenterMediatedTransferKind =
  | "direct-transfer"
  | "repeated-center-transfer"
  | "cosmo-bounce"
  | "setup-plus-bounce"
  | "bounce-plus-setup";

interface CenterMediatedTransferWindow {
  readonly kind: CenterMediatedTransferKind;
  readonly sourceRow: PoiBeatRow;
  readonly destinationRow: PoiBeatRow;
  readonly centerRows: readonly PoiBeatRow[];
  readonly coveredIntervals: readonly PoiBeatInterval[];
  readonly entryInterval: PoiBeatInterval;
  readonly exitInterval: PoiBeatInterval;
  readonly localOffset: number;
  readonly totalDuration: number;
  readonly setupDuration?: number;
}

function evalHandPathCartesianPoint(keys: readonly HandPathKey[], tOffset: number): Vec2 {
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (!first || !last) {
    throw new Error("Hand path window requires at least one key");
  }

  if (tOffset <= first.tOffset) return first.point;
  if (tOffset >= last.tOffset) return last.point;

  for (let keyIndex = 0; keyIndex < keys.length - 1; keyIndex += 1) {
    const fromKey = keys[keyIndex];
    const toKey = keys[keyIndex + 1];
    if (!fromKey || !toKey) continue;
    if (!(fromKey.tOffset <= tOffset && tOffset <= toKey.tOffset)) continue;

    const duration = toKey.tOffset - fromKey.tOffset;
    const progress = duration <= 0 ? 1 : smootherstep((tOffset - fromKey.tOffset) / duration);
    return lerp2(fromKey.point, toKey.point, progress);
  }

  return last.point;
}

function evalHandPathPoint(
  keys: readonly HandPathKey[],
  tOffset: number,
  fallbackPhaseAbs: number
): RelativeNodePose {
  return cartesianToPolar(evalHandPathCartesianPoint(keys, tOffset), fallbackPhaseAbs);
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

function rowIsCenter(row: PoiBeatRow): boolean {
  return row.laneId === "center";
}

function intervalChangesSide(interval: PoiBeatInterval): boolean {
  return interval.fromSide !== interval.toSide;
}

function classifyCenterMediatedTransfer(
  centerRows: readonly PoiBeatRow[]
): CenterMediatedTransferKind | null {
  const sideSequence = centerRows.map((row) => deriveRowSide(row));

  if (sideSequence.length === 1) return "direct-transfer";

  if (sideSequence.length === 2) {
    return sideSequence[0] === sideSequence[1] ? "repeated-center-transfer" : "cosmo-bounce";
  }

  if (
    sideSequence.length === 3 &&
    sideSequence[0] === sideSequence[1] &&
    sideSequence[1] !== sideSequence[2]
  ) {
    return "setup-plus-bounce";
  }

  if (
    sideSequence.length === 3 &&
    sideSequence[0] !== sideSequence[1] &&
    sideSequence[1] === sideSequence[2]
  ) {
    return "bounce-plus-setup";
  }

  return null;
}

function getWindowLocalOffset(
  intervals: readonly PoiBeatInterval[],
  coveredIntervalIndices: readonly number[],
  activeIntervalIndex: number
): number | null {
  let localOffset = 0;

  for (const coveredIntervalIndex of coveredIntervalIndices) {
    if (coveredIntervalIndex === activeIntervalIndex) return localOffset;

    const interval = intervals[coveredIntervalIndex];
    if (!interval) return null;
    localOffset += interval.durationUnits;
  }

  return null;
}

function detectCenterMediatedTransferWindow(
  intervals: readonly PoiBeatInterval[],
  intervalIndex: number
): CenterMediatedTransferWindow | null {
  if (intervals.length < 2) return null;

  for (let centerRowCount = 3; centerRowCount >= 1; centerRowCount -= 1) {
    for (
      let entryIndex = intervalIndex - centerRowCount;
      entryIndex <= intervalIndex;
      entryIndex += 1
    ) {
      const entry = intervalAt(intervals, entryIndex);
      const exit = intervalAt(intervals, entryIndex + centerRowCount);
      if (!entry || !exit) continue;
      if (entry.laneMotion !== "lane-switch" || !rowIsCenter(entry.toRow)) continue;
      if (rowIsCenter(entry.fromRow)) continue;
      if (exit.laneMotion !== "lane-switch" || !rowIsCenter(exit.fromRow)) continue;
      if (rowIsCenter(exit.toRow)) continue;

      const centerRows: PoiBeatRow[] = [entry.toRow];
      const centerIntervals: PoiBeatInterval[] = [];
      let centerBlockIsValid = true;

      for (let centerOffset = 1; centerOffset < centerRowCount; centerOffset += 1) {
        const centerInterval = intervalAt(intervals, entryIndex + centerOffset);
        if (
          !centerInterval ||
          !rowIsCenter(centerInterval.fromRow) ||
          !rowIsCenter(centerInterval.toRow)
        ) {
          centerBlockIsValid = false;
          break;
        }

        centerIntervals.push(centerInterval);
        centerRows.push(centerInterval.toRow);
      }

      if (!centerBlockIsValid) continue;

      const coveredIntervalIndices = Array.from({ length: centerRowCount + 1 }, (_, offset) =>
        intervalIndexAt(intervals, entryIndex + offset)
      );
      if (new Set(coveredIntervalIndices).size !== coveredIntervalIndices.length) continue;
      if (!coveredIntervalIndices.includes(intervalIndex)) continue;

      const kind = classifyCenterMediatedTransfer(centerRows);
      if (!kind) continue;
      if (kind === "repeated-center-transfer" && centerIntervals[0]?.laneMotion !== "same-lane") {
        continue;
      }
      if (
        kind === "cosmo-bounce" &&
        (centerIntervals[0]?.laneMotion !== "same-lane" || !intervalChangesSide(centerIntervals[0]))
      ) {
        continue;
      }
      if (
        kind === "setup-plus-bounce" &&
        (centerIntervals[0]?.laneMotion !== "same-lane" ||
          intervalChangesSide(centerIntervals[0]) ||
          centerIntervals[1]?.laneMotion !== "same-lane" ||
          !intervalChangesSide(centerIntervals[1]))
      ) {
        continue;
      }
      if (
        kind === "bounce-plus-setup" &&
        (centerIntervals[0]?.laneMotion !== "same-lane" ||
          !intervalChangesSide(centerIntervals[0]) ||
          centerIntervals[1]?.laneMotion !== "same-lane" ||
          intervalChangesSide(centerIntervals[1]))
      ) {
        continue;
      }

      const localOffset = getWindowLocalOffset(intervals, coveredIntervalIndices, intervalIndex);
      if (localOffset === null) continue;

      const coveredIntervals = coveredIntervalIndices.map((coveredIntervalIndex) => {
        const interval = intervals[coveredIntervalIndex];
        if (!interval) throw new Error("expected center-mediated interval index to be valid");
        return interval;
      });
      const totalDuration = coveredIntervals.reduce(
        (duration, interval) => duration + interval.durationUnits,
        0
      );
      const setupDuration =
        kind === "setup-plus-bounce"
          ? entry.durationUnits + (centerIntervals[0]?.durationUnits ?? 0)
          : undefined;

      return {
        kind,
        sourceRow: entry.fromRow,
        destinationRow: exit.toRow,
        centerRows,
        coveredIntervals,
        entryInterval: entry,
        exitInterval: exit,
        localOffset,
        totalDuration,
        ...(setupDuration === undefined ? {} : { setupDuration })
      };
    }
  }

  return null;
}

function makeCosmoBouncePathWindow(
  window: CenterMediatedTransferWindow,
  options: PoiBeatCompilerOptions
): HandPathWindow | null {
  const bounceReferenceLaneId = getCosmoBounceReferenceLane(
    window.entryInterval,
    window.exitInterval
  );
  if (!bounceReferenceLaneId) return null;

  const bounceLaneId = mirrorPoiBeatLane(bounceReferenceLaneId);
  if (!bounceLaneId) return null;

  return {
    localOffset: window.localOffset,
    label: `cosmo bounce ${window.sourceRow.laneId} through ${bounceLaneId} to ${window.destinationRow.laneId}`,
    keys: [
      { tOffset: 0, point: laneToHandPoint(window.sourceRow.laneId, options) },
      { tOffset: window.totalDuration / 2, point: laneToHandPoint(bounceLaneId, options) },
      {
        tOffset: window.totalDuration,
        point: laneToHandPoint(window.destinationRow.laneId, options)
      }
    ]
  };
}

function makeSetupPlusBouncePathWindow(
  window: CenterMediatedTransferWindow,
  options: PoiBeatCompilerOptions
): HandPathWindow | null {
  if (!deriveRowIsBTB(window.destinationRow) || window.setupDuration === undefined) return null;

  const setupLaneId = mirrorPoiBeatLane(window.destinationRow.laneId);
  if (!setupLaneId) return null;

  const sideSwitchInterval = window.coveredIntervals[2];
  if (!sideSwitchInterval || !intervalChangesSide(sideSwitchInterval)) return null;

  const transferStart = window.setupDuration + sideSwitchInterval.durationUnits / 2;

  return {
    localOffset: window.localOffset,
    label: `center setup bounce ${window.sourceRow.laneId} through ${setupLaneId} to ${window.destinationRow.laneId}`,
    keys: [
      { tOffset: 0, point: laneToHandPoint(window.sourceRow.laneId, options) },
      { tOffset: window.setupDuration, point: laneToHandPoint(setupLaneId, options) },
      { tOffset: transferStart, point: laneToHandPoint(setupLaneId, options) },
      {
        tOffset: window.totalDuration,
        point: laneToHandPoint(window.destinationRow.laneId, options)
      }
    ]
  };
}

function makeBouncePlusSetupPathWindow(
  window: CenterMediatedTransferWindow,
  options: PoiBeatCompilerOptions
): HandPathWindow | null {
  if (!deriveRowIsBTB(window.sourceRow)) return null;

  const bounceLaneId = mirrorPoiBeatLane(window.sourceRow.laneId);
  if (!bounceLaneId) return null;

  const sideSwitchInterval = window.coveredIntervals[1];
  if (!sideSwitchInterval || !intervalChangesSide(sideSwitchInterval)) return null;

  const transferEnd =
    window.entryInterval.durationUnits + sideSwitchInterval.durationUnits / 2;
  const holdEnd = window.entryInterval.durationUnits + sideSwitchInterval.durationUnits;

  return {
    localOffset: window.localOffset,
    label: `center bounce setup ${window.sourceRow.laneId} through ${bounceLaneId} to ${window.destinationRow.laneId}`,
    keys: [
      { tOffset: 0, point: laneToHandPoint(window.sourceRow.laneId, options) },
      { tOffset: transferEnd, point: laneToHandPoint(bounceLaneId, options) },
      { tOffset: holdEnd, point: laneToHandPoint(bounceLaneId, options) },
      {
        tOffset: window.totalDuration,
        point: laneToHandPoint(window.destinationRow.laneId, options)
      }
    ]
  };
}

function makeCenterMediatedHandPathWindow(
  intervals: readonly PoiBeatInterval[],
  intervalIndex: number,
  options: PoiBeatCompilerOptions
): HandPathWindow | null {
  const window = detectCenterMediatedTransferWindow(intervals, intervalIndex);
  if (!window) return null;

  const start = laneToHandPoint(window.sourceRow.laneId, options);
  const end = laneToHandPoint(window.destinationRow.laneId, options);

  switch (window.kind) {
    case "direct-transfer":
      if (distance2(start, end) <= 1e-9) return null;

      return {
        localOffset: window.localOffset,
        label: `front transfer ${window.sourceRow.laneId} through center to ${window.destinationRow.laneId}`,
        keys: [
          { tOffset: 0, point: start },
          { tOffset: window.totalDuration, point: end }
        ]
      };
    case "repeated-center-transfer":
      return {
        localOffset: window.localOffset,
        label:
          distance2(start, end) <= 1e-9
            ? `center hold ${window.sourceRow.laneId} through center`
            : `front transfer ${window.sourceRow.laneId} through repeated center to ${window.destinationRow.laneId}`,
        keys: [
          { tOffset: 0, point: start },
          { tOffset: window.totalDuration, point: distance2(start, end) <= 1e-9 ? start : end }
        ]
      };
    case "cosmo-bounce":
      return makeCosmoBouncePathWindow(window, options);
    case "setup-plus-bounce":
      return makeSetupPlusBouncePathWindow(window, options);
    case "bounce-plus-setup":
      return makeBouncePlusSetupPathWindow(window, options);
  }
}

// TODO: Keep this as a local experiment workaround for now. If more pass-through
// cases appear, replace it with a generic transfer-window derivation step.
function makeHandPathWindow(
  intervals: readonly PoiBeatInterval[],
  intervalIndex: number,
  options: PoiBeatCompilerOptions
): HandPathWindow | null {
  return makeCenterMediatedHandPathWindow(intervals, intervalIndex, options);
}

const CROSSPOINT_CENTERLINE_EPSILON = 1e-9;

function resolveIntervalHandPoint(
  interval: PoiBeatInterval,
  pathWindow: HandPathWindow | null,
  options: PoiBeatCompilerOptions,
  tLocal: TimeUnit
): Vec2 {
  if (pathWindow) {
    return evalHandPathCartesianPoint(pathWindow.keys, pathWindow.localOffset + tLocal);
  }

  return evalHandPathCartesianPoint(
    [
      { tOffset: 0, point: laneToHandPoint(interval.fromRow.laneId, options) },
      {
        tOffset: interval.durationUnits,
        point: laneToHandPoint(interval.toRow.laneId, options)
      }
    ],
    tLocal
  );
}

function classifyCrosspointLevel(
  point: Vec2,
  options: PoiBeatCompilerOptions
): PoiBeatCrosspointLevel {
  const candidates = [
    { level: "low" as const, distance: Math.abs(point.y + options.handVerticalOffset) },
    { level: "mid" as const, distance: Math.abs(point.y) },
    { level: "high" as const, distance: Math.abs(point.y - options.handVerticalOffset) }
  ];

  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0]?.level ?? "mid";
}

function resolveHorizontalDirection(phaseAbs: number): PoiBeatHorizontalDirection {
  return Math.cos(phaseAbs) < 0 ? "left" : "right";
}

function resolveCrosspoint(
  track: PoiBeatTrack,
  interval: PoiBeatInterval,
  pathWindow: HandPathWindow | null,
  options: PoiBeatCompilerOptions,
  omega: number
): PoiBeatResolvedCrosspoint {
  const timeOffsetUnits = interval.durationUnits / 2;
  const handPoint = resolveIntervalHandPoint(interval, pathWindow, options, timeOffsetUnits);
  const phaseAbs = deriveRowState(track, interval.fromRow).phaseAbs + omega * timeOffsetUnits;
  const bodySide =
    Math.abs(handPoint.x) <= CROSSPOINT_CENTERLINE_EPSILON
      ? null
      : handPoint.x < 0
        ? "left"
        : "right";
  const poiDirection = resolveHorizontalDirection(phaseAbs);
  const violation =
    bodySide === null
      ? "CENTERLINE_CROSSPOINT"
      : bodySide !== poiDirection
        ? "POI_POINTS_THROUGH_BODY"
        : undefined;

  return {
    progress: 0.5,
    timeOffsetUnits,
    handPoint,
    phaseAbs,
    bodySide,
    level: classifyCrosspointLevel(handPoint, options),
    poiDirection,
    legal: violation === undefined,
    ...(violation ? { violation } : {})
  };
}

interface ResolvedTrackIntervalCompilation {
  readonly interval: PoiBeatResolvedInterval;
  readonly pathWindow: HandPathWindow | null;
}

interface CompiledTrack {
  readonly segments: Segment[];
  readonly analysis: PoiBeatResolvedTrack;
}

function compileTrack(
  graph: PoiBeatGraph,
  track: PoiBeatTrack,
  options: PoiBeatCompilerOptions,
  diagnostics: PoiBeatCompileDiagnostic[],
  crosspointDiagnostics: PoiBeatCrosspointDiagnostic[]
): CompiledTrack {
  if (track.rows.length === 0) {
    diagnostics.push({ code: "EMPTY_TRACK", trackId: track.id });
    return { segments: [], analysis: { trackId: track.id, intervals: [] } };
  }

  if (track.rows.length !== graph.cycleSteps) {
    diagnostics.push({ code: "ROW_COUNT_MISMATCH", trackId: track.id });
  }

  const omega = (getDirectionSign(track.poiDirection) * PI) / options.halfBeatDuration;
  const intervals = deriveLoopIntervals(track, options.halfBeatDuration);
  const resolvedIntervals: ResolvedTrackIntervalCompilation[] = intervals.map(
    (interval, intervalIndex) => {
      const pathWindow = makeHandPathWindow(intervals, intervalIndex, options);
      const sideMotion = intervalChangesSide(interval)
        ? {
            kind: "transition" as const,
            fromSide: interval.fromSide,
            toSide: interval.toSide,
            crosspoint: resolveCrosspoint(track, interval, pathWindow, options, omega)
          }
        : { kind: "hold" as const, side: interval.fromSide };

      if (sideMotion.kind === "transition" && sideMotion.crosspoint.violation) {
        crosspointDiagnostics.push({
          code: sideMotion.crosspoint.violation,
          trackId: track.id,
          intervalIndex,
          step: interval.fromRow.step,
          laneId: interval.fromRow.laneId,
          crosspoint: sideMotion.crosspoint
        });
      }

      return {
        interval: { ...interval, sideMotion },
        pathWindow
      };
    }
  );

  const segments = resolvedIntervals.map(({ interval, pathWindow }) => {
    const startPoint = laneToHandPoint(interval.fromRow.laneId, options);
    const endPoint = laneToHandPoint(interval.toRow.laneId, options);

    return {
      durationUnits: interval.durationUnits,
      planeId: "wall",
      planeSide: interval.toSide,
      ...(deriveRowIsBTB(interval.fromRow) ? { behindBody: true } : {}),
      hand: makeHandMotion(interval, startPoint, endPoint, pathWindow),
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
    } satisfies Segment;
  });

  return {
    segments,
    analysis: {
      trackId: track.id,
      intervals: resolvedIntervals.map(({ interval }) => interval)
    }
  };
}

export function compilePoiBeatGraph(
  graph: PoiBeatGraph,
  options: PoiBeatCompilerOptions = DEFAULT_POI_BEAT_COMPILER_OPTIONS
): CompilePoiBeatGraphResult {
  const diagnostics: PoiBeatCompileDiagnostic[] = [];
  const crosspointDiagnostics: PoiBeatCrosspointDiagnostic[] = [];
  const compiledTracks = graph.tracks.map((track) =>
    compileTrack(graph, track, options, diagnostics, crosspointDiagnostics)
  );
  const rigs = graph.tracks.map((track, trackIndex) => ({
    rigId: track.id,
    sequence: { segments: compiledTracks[trackIndex]?.segments ?? [] }
  }));

  return {
    sequence: { rigs },
    analysis: { tracks: compiledTracks.map((compiledTrack) => compiledTrack.analysis) },
    diagnostics,
    crosspointDiagnostics
  };
}
