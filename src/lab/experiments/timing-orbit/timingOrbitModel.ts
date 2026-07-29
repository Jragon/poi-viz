import { evalPreparedSequenceAt, prepareSequence, type PreparedSequence } from "@/engine/sequence";
import type {
  MultiRigSequence,
  RelativeNodePose,
  RuntimeDriver,
  Segment,
  SequenceSpec
} from "@/engine/types";

export const TIMING_ORBIT_LEFT_RIG_ID = "left";
export const TIMING_ORBIT_RIGHT_RIG_ID = "right";
export const TIMING_ORBIT_DEFAULT_LEFT_QUANTIZATION = 4;
export const TIMING_ORBIT_DEFAULT_RIGHT_QUANTIZATION = 8;
export const TIMING_ORBIT_MIN_QUANTIZATION = 1;
export const TIMING_ORBIT_MAX_QUANTIZATION = 64;
export const TIMING_ORBIT_MAX_AUTO_REPEATS = 64;
export const TIMING_ORBIT_MAX_AUTO_HORIZON = 256;
export const TIMING_ORBIT_MAX_DERIVED_SEGMENTS = 4096;
export const TIMING_ORBIT_MAX_SHARED_SLOTS = 4096;

const TIME_EPSILON = 1e-9;
const PERIOD_MATCH_EPSILON = 1e-8;

export type TimingOrbitRigId =
  | typeof TIMING_ORBIT_LEFT_RIG_ID
  | typeof TIMING_ORBIT_RIGHT_RIG_ID;

export interface TimingOrbitPeriods {
  readonly left: number;
  readonly right: number;
}

export type TimingOrbitPeriodResult =
  | { readonly ok: true; readonly periods: TimingOrbitPeriods }
  | {
      readonly ok: false;
      readonly reason: "MISSING_LEFT_TRACK" | "MISSING_RIGHT_TRACK" | "INVALID_TRACK";
    };

export type TimingOrbitHorizon =
  | {
      readonly kind: "joint-period";
      readonly duration: number;
      readonly leftRepeats: number;
      readonly rightRepeats: number;
    }
  | {
      readonly kind: "bounded-window";
      readonly duration: number;
      readonly reason: "NO_SMALL_JOINT_PERIOD";
    };

export interface TimingOrbitEvent {
  readonly time: number;
  readonly landmarkIndex: number;
}

export interface TimingOrbitCoincidence {
  readonly time: number;
  readonly leftLandmarkIndex: number;
  readonly rightLandmarkIndex: number;
}

export interface TimingOrbitPosition {
  readonly localTime: number;
  readonly cycleProgress: number;
  readonly previousLandmarkIndex: number;
  readonly nextLandmarkIndex: number;
  readonly intervalProgress: number;
}

export type TimingOrbitSequenceResult =
  | { readonly ok: true; readonly sequence: MultiRigSequence }
  | {
      readonly ok: false;
      readonly reason:
        | "INVALID_HORIZON"
        | "MISSING_LEFT_TRACK"
        | "MISSING_RIGHT_TRACK"
        | "INVALID_TRACK"
        | "TOO_MANY_DERIVED_SEGMENTS";
    };

function approximatelyEqual(left: number, right: number): boolean {
  return (
    Math.abs(left - right) <=
    PERIOD_MATCH_EPSILON * Math.max(1, Math.abs(left), Math.abs(right))
  );
}

function normalizeNearBoundary(value: number, period: number): number {
  const wrapped = ((value % period) + period) % period;
  if (wrapped <= TIME_EPSILON || period - wrapped <= TIME_EPSILON) return 0;
  return wrapped;
}

function totalDuration(sequence: SequenceSpec): number {
  return sequence.segments.reduce((total, segment) => total + segment.durationUnits, 0);
}

function getRigSequence(
  sequence: MultiRigSequence,
  rigId: TimingOrbitRigId
): SequenceSpec | null {
  return sequence.rigs.find((rig) => rig.rigId === rigId)?.sequence ?? null;
}

function isValidPeriod(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function getTimingOrbitPeriods(sequence: MultiRigSequence): TimingOrbitPeriodResult {
  const leftSequence = getRigSequence(sequence, TIMING_ORBIT_LEFT_RIG_ID);
  if (!leftSequence) return { ok: false, reason: "MISSING_LEFT_TRACK" };

  const rightSequence = getRigSequence(sequence, TIMING_ORBIT_RIGHT_RIG_ID);
  if (!rightSequence) return { ok: false, reason: "MISSING_RIGHT_TRACK" };

  const left = totalDuration(leftSequence);
  const right = totalDuration(rightSequence);
  if (!isValidPeriod(left) || !isValidPeriod(right)) {
    return { ok: false, reason: "INVALID_TRACK" };
  }

  return { ok: true, periods: { left, right } };
}

export function resolveTimingOrbitHorizon(
  periods: TimingOrbitPeriods,
  maxRepeats = TIMING_ORBIT_MAX_AUTO_REPEATS,
  maxHorizon = TIMING_ORBIT_MAX_AUTO_HORIZON
): TimingOrbitHorizon {
  if (
    !isValidPeriod(periods.left) ||
    !isValidPeriod(periods.right) ||
    !Number.isSafeInteger(maxRepeats) ||
    maxRepeats < 1 ||
    !isValidPeriod(maxHorizon)
  ) {
    return {
      kind: "bounded-window",
      duration: Math.min(
        Math.max(
          isValidPeriod(periods.left) ? periods.left : 1,
          isValidPeriod(periods.right) ? periods.right : 1
        ),
        isValidPeriod(maxHorizon) ? maxHorizon : TIMING_ORBIT_MAX_AUTO_HORIZON
      ),
      reason: "NO_SMALL_JOINT_PERIOD"
    };
  }

  for (let leftRepeats = 1; leftRepeats <= maxRepeats; leftRepeats += 1) {
    const duration = periods.left * leftRepeats;
    if (duration > maxHorizon + TIME_EPSILON) break;

    const rightRepeats = Math.round(duration / periods.right);
    if (rightRepeats < 1 || rightRepeats > maxRepeats) continue;
    if (!approximatelyEqual(duration, periods.right * rightRepeats)) continue;

    return {
      kind: "joint-period",
      duration,
      leftRepeats,
      rightRepeats
    };
  }

  return {
    kind: "bounded-window",
    duration: Math.min(Math.max(periods.left, periods.right), maxHorizon),
    reason: "NO_SMALL_JOINT_PERIOD"
  };
}

export function normalizeTimingOrbitOffset(offset: number, period: number): number {
  if (!Number.isFinite(offset) || !isValidPeriod(period)) return 0;
  return normalizeNearBoundary(offset, period);
}

export function buildTimingOrbitEvents(
  period: number,
  quantization: number,
  horizon: number,
  offset = 0
): TimingOrbitEvent[] {
  if (
    !isValidPeriod(period) ||
    !Number.isSafeInteger(quantization) ||
    quantization < 1 ||
    !isValidPeriod(horizon)
  ) {
    return [];
  }

  const normalizedOffset = normalizeTimingOrbitOffset(offset, period);
  const quantum = period / quantization;
  const firstOrdinal = Math.ceil((normalizedOffset - TIME_EPSILON) / quantum);
  const events: TimingOrbitEvent[] = [];

  for (let ordinal = firstOrdinal; ; ordinal += 1) {
    const rawTime = ordinal * quantum - normalizedOffset;
    if (rawTime >= horizon - TIME_EPSILON) break;
    if (rawTime < -TIME_EPSILON) continue;

    const time = Math.abs(rawTime) <= TIME_EPSILON ? 0 : rawTime;
    const landmarkIndex = ((ordinal % quantization) + quantization) % quantization;
    events.push({ time, landmarkIndex });
  }

  return events;
}

export function findTimingOrbitCoincidences(
  leftEvents: readonly TimingOrbitEvent[],
  rightEvents: readonly TimingOrbitEvent[],
  tolerance = 1e-7
): TimingOrbitCoincidence[] {
  if (!Number.isFinite(tolerance) || tolerance < 0) return [];

  const coincidences: TimingOrbitCoincidence[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < leftEvents.length && rightIndex < rightEvents.length) {
    const left = leftEvents[leftIndex];
    const right = rightEvents[rightIndex];
    if (!left || !right) break;

    const delta = left.time - right.time;
    if (Math.abs(delta) <= tolerance) {
      coincidences.push({
        time: (left.time + right.time) / 2,
        leftLandmarkIndex: left.landmarkIndex,
        rightLandmarkIndex: right.landmarkIndex
      });
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    if (delta < 0) leftIndex += 1;
    else rightIndex += 1;
  }

  return coincidences;
}

export function timingOrbitPositionAt(
  time: number,
  period: number,
  quantization: number,
  offset = 0
): TimingOrbitPosition | null {
  if (
    !Number.isFinite(time) ||
    time < 0 ||
    !isValidPeriod(period) ||
    !Number.isSafeInteger(quantization) ||
    quantization < 1
  ) {
    return null;
  }

  const localTime = normalizeNearBoundary(
    time + normalizeTimingOrbitOffset(offset, period),
    period
  );
  const cycleProgress = localTime / period;
  const landmarkPosition = cycleProgress * quantization;
  const nearestInteger = Math.round(landmarkPosition);
  const normalizedPosition = approximatelyEqual(landmarkPosition, nearestInteger)
    ? nearestInteger
    : landmarkPosition;
  const previousOrdinal = Math.floor(normalizedPosition);
  const intervalProgress = normalizedPosition - previousOrdinal;
  const previousLandmarkIndex =
    ((previousOrdinal % quantization) + quantization) % quantization;

  return {
    localTime,
    cycleProgress,
    previousLandmarkIndex,
    nextLandmarkIndex: (previousLandmarkIndex + 1) % quantization,
    intervalProgress
  };
}

function integerGreatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a;
}

function integerLeastCommonMultiple(left: number, right: number): number {
  return Math.abs((left / integerGreatestCommonDivisor(left, right)) * right);
}

export function resolveTimingOrbitSharedStep(
  horizon: TimingOrbitHorizon,
  leftQuantization: number,
  rightQuantization: number
): number | null {
  if (
    horizon.kind !== "joint-period" ||
    !Number.isSafeInteger(leftQuantization) ||
    leftQuantization < 1 ||
    !Number.isSafeInteger(rightQuantization) ||
    rightQuantization < 1
  ) {
    return null;
  }

  const leftIntervals = horizon.leftRepeats * leftQuantization;
  const rightIntervals = horizon.rightRepeats * rightQuantization;
  if (!Number.isSafeInteger(leftIntervals) || !Number.isSafeInteger(rightIntervals)) return null;

  const sharedSlots = integerLeastCommonMultiple(leftIntervals, rightIntervals);
  if (
    !Number.isSafeInteger(sharedSlots) ||
    sharedSlots < 1 ||
    sharedSlots > TIMING_ORBIT_MAX_SHARED_SLOTS
  ) {
    return null;
  }

  return horizon.duration / sharedSlots;
}

export function snapTimingOrbitOffset(offset: number, step: number, period: number): number {
  if (!Number.isFinite(offset) || !isValidPeriod(step) || !isValidPeriod(period)) return 0;
  return normalizeTimingOrbitOffset(Math.round(offset / step) * step, period);
}

function createSampledDriver(
  prepared: PreparedSequence,
  sourceStart: number,
  node: "hand" | "head",
  label: string
): RuntimeDriver {
  return {
    kind: "runtime",
    label,
    evalPose: (_startPose: RelativeNodePose, context) => {
      const result = evalPreparedSequenceAt(prepared, sourceStart + context.tLocal);
      if (!result.ok) {
        throw new Error(`Timing orbit ${node} evaluation failed: ${result.reason}`);
      }
      return node === "hand" ? result.pose.handPose : result.pose.headPose;
    }
  };
}

function buildObservedRigSequence(
  source: SequenceSpec,
  horizon: number,
  offset: number,
  rigId: TimingOrbitRigId
): SequenceSpec | null {
  const preparedResult = prepareSequence(source);
  if (!preparedResult.ok) return null;

  const prepared = preparedResult.prepared;
  const period = prepared.totalDuration;
  const normalizedOffset = normalizeTimingOrbitOffset(offset, period);
  const segments: Segment[] = [];
  let cursor = 0;

  while (cursor < horizon - TIME_EPSILON) {
    if (segments.length >= TIMING_ORBIT_MAX_DERIVED_SEGMENTS) return null;

    const sourceTime = normalizeNearBoundary(normalizedOffset + cursor, period);
    const sample = evalPreparedSequenceAt(prepared, sourceTime);
    if (!sample.ok) return null;

    const sourceSegment = prepared.segments[sample.segmentIndex];
    if (!sourceSegment) return null;

    const sourceRemaining = sourceSegment.endUnit - sourceTime;
    const horizonRemaining = horizon - cursor;
    const durationUnits = Math.min(sourceRemaining, horizonRemaining);
    if (!Number.isFinite(durationUnits) || durationUnits <= 0) return null;

    const segmentOrdinal = segments.length;
    segments.push({
      durationUnits,
      planeId: sourceSegment.planeId,
      ...(sourceSegment.planeSide !== undefined
        ? { planeSide: sourceSegment.planeSide }
        : {}),
      ...(sourceSegment.behindBody !== undefined
        ? { behindBody: sourceSegment.behindBody }
        : {}),
      hand: {
        startPose: sample.pose.handPose,
        driver: createSampledDriver(
          prepared,
          sourceTime,
          "hand",
          `timing-orbit-${rigId}-hand-${segmentOrdinal}`
        )
      },
      head: {
        startPose: sample.pose.headPose,
        driver: createSampledDriver(
          prepared,
          sourceTime,
          "head",
          `timing-orbit-${rigId}-head-${segmentOrdinal}`
        )
      }
    });

    cursor += durationUnits;
    if (Math.abs(horizon - cursor) <= TIME_EPSILON) cursor = horizon;
  }

  return { segments };
}

export function buildTimingOrbitSequence(
  source: MultiRigSequence,
  horizon: number,
  rightOffset: number
): TimingOrbitSequenceResult {
  if (!isValidPeriod(horizon)) return { ok: false, reason: "INVALID_HORIZON" };

  const leftSource = getRigSequence(source, TIMING_ORBIT_LEFT_RIG_ID);
  if (!leftSource) return { ok: false, reason: "MISSING_LEFT_TRACK" };

  const rightSource = getRigSequence(source, TIMING_ORBIT_RIGHT_RIG_ID);
  if (!rightSource) return { ok: false, reason: "MISSING_RIGHT_TRACK" };

  const left = buildObservedRigSequence(leftSource, horizon, 0, TIMING_ORBIT_LEFT_RIG_ID);
  const right = buildObservedRigSequence(
    rightSource,
    horizon,
    rightOffset,
    TIMING_ORBIT_RIGHT_RIG_ID
  );
  if (!left || !right) {
    const leftPrepared = prepareSequence(leftSource);
    const rightPrepared = prepareSequence(rightSource);
    if (!leftPrepared.ok || !rightPrepared.ok) return { ok: false, reason: "INVALID_TRACK" };
    return { ok: false, reason: "TOO_MANY_DERIVED_SEGMENTS" };
  }

  return {
    ok: true,
    sequence: {
      rigs: [
        { rigId: TIMING_ORBIT_LEFT_RIG_ID, sequence: left },
        { rigId: TIMING_ORBIT_RIGHT_RIG_ID, sequence: right }
      ]
    }
  };
}
