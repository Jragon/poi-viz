import { evalSegment } from "@/engine/engine";
import { evalPreparedMultiRigSequenceAt, type PreparedMultiRigSequence } from "@/engine/multirig";
import {
  DEFAULT_PLANE_PROJECTION_SETTINGS,
  toProjectedMultiRigPose,
  type PlaneProjectionSettings
} from "@/engine/planeProjection";
import type {
  CartesianMultiRigPose,
  PlaneId,
  PlaneSide,
  RelativeRigPose,
  RigId,
  TimeUnit,
  Vec2
} from "@/engine/types";

type EvaluatedTrailPose = {
  pose: RelativeRigPose;
  planeId: PlaneId;
  planeSide?: PlaneSide;
};

export type TrailLoopMode = "auto" | "off";

export interface TrailSamplingOptions {
  readonly loopMode?: TrailLoopMode;
  readonly loopDuration?: TimeUnit;
}

export interface RigTrailSamples {
  hand: Vec2[];
  head: Vec2[];
}

export type MultiRigTrailSamples = Partial<Record<RigId, RigTrailSamples>>;

export const TRAIL_POINT_EPSILON = 1e-9;
export const TRAIL_CONTINUITY_EPSILON = 1e-6;
const TAU = 2 * Math.PI;

function timeMatches(a: TimeUnit, b: TimeUnit): boolean {
  return Math.abs(a - b) <= TRAIL_POINT_EPSILON * Math.max(1, Math.abs(a), Math.abs(b));
}

function wrapAngleDelta(delta: number): number {
  return positiveModulo(delta + Math.PI, TAU) - Math.PI;
}

function positiveModulo(value: TimeUnit, period: TimeUnit): TimeUnit {
  const result = value % period;
  return result < 0 ? result + period : result;
}

function normalizeLoopTime(value: TimeUnit, period: TimeUnit): TimeUnit {
  const wrapped = positiveModulo(value, period);
  if (timeMatches(wrapped, 0) || timeMatches(wrapped, period)) return 0;
  return wrapped;
}

function createEmptyTrails(prepared: PreparedMultiRigSequence): Record<RigId, RigTrailSamples> {
  const trails: Record<RigId, RigTrailSamples> = {};

  for (const rig of prepared.rigs) {
    trails[rig.rigId] = { hand: [], head: [] };
  }

  return trails;
}

function appendCartesianSample(
  trails: Record<RigId, RigTrailSamples>,
  cartesian: CartesianMultiRigPose
) {
  for (const [rigId, pose] of Object.entries(cartesian)) {
    const bucket = trails[rigId];
    if (!bucket) continue;
    bucket.hand.push(pose.handPosition);
    bucket.head.push(pose.headPosition);
  }
}

function pointsMatch(a: Vec2 | undefined, b: Vec2): boolean {
  if (!a) return false;
  return Math.abs(a.x - b.x) <= TRAIL_POINT_EPSILON && Math.abs(a.y - b.y) <= TRAIL_POINT_EPSILON;
}

function appendTrailPoint(
  points: readonly Vec2[],
  nextPoint: Vec2,
  maxPoints: number | null
): Vec2[] {
  const withTip = pointsMatch(points[points.length - 1], nextPoint)
    ? [...points]
    : [...points, nextPoint];

  if (maxPoints === null || withTip.length <= maxPoints) {
    return withTip;
  }

  return withTip.slice(withTip.length - maxPoints);
}

export function normalizeTrailHoldSteps(holdSteps?: number): number | null {
  if (holdSteps === undefined) return null;
  if (!Number.isFinite(holdSteps)) return Number.NaN;
  return Math.floor(holdSteps);
}

export function isValidNormalizedHoldSteps(holdSteps: number | null): boolean {
  return holdSteps === null || (Number.isFinite(holdSteps) && holdSteps >= 2);
}

export function appendCurrentPoseToTrails(
  trails: MultiRigTrailSamples,
  currentPoses: CartesianMultiRigPose,
  maxPoints: number | null
): MultiRigTrailSamples {
  if (!isValidNormalizedHoldSteps(maxPoints)) return {};

  const rigIds = new Set([...Object.keys(trails), ...Object.keys(currentPoses)]);
  const nextTrails: MultiRigTrailSamples = {};

  for (const rigId of rigIds) {
    const currentPose = currentPoses[rigId];
    if (!currentPose) {
      continue;
    }

    const existing = trails[rigId];
    nextTrails[rigId] = {
      hand: appendTrailPoint(existing?.hand ?? [], currentPose.handPosition, maxPoints),
      head: appendTrailPoint(existing?.head ?? [], currentPose.headPosition, maxPoints)
    };
  }

  return nextTrails;
}

function evalRigSequenceFromLeft(
  rig: PreparedMultiRigSequence["rigs"][number],
  tGlobal: TimeUnit
): EvaluatedTrailPose | null {
  const sequence = rig.prepared;
  if (!Number.isFinite(tGlobal) || tGlobal < 0 || sequence.totalDuration <= 0) return null;

  const wrappedTime = normalizeLoopTime(tGlobal, sequence.totalDuration);
  const segments = sequence.segments;

  if (timeMatches(wrappedTime, 0)) {
    const segment = segments[segments.length - 1];
    return {
      pose: evalSegment(segment, segment.endUnit - segment.startUnit),
      planeId: segment.planeId,
      ...(segment.planeSide !== undefined ? { planeSide: segment.planeSide } : {})
    };
  }

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (timeMatches(wrappedTime, segment.startUnit) && index > 0) {
      const previous = segments[index - 1];
      return {
        pose: evalSegment(previous, previous.endUnit - previous.startUnit),
        planeId: previous.planeId,
        ...(previous.planeSide !== undefined ? { planeSide: previous.planeSide } : {})
      };
    }

    if (segment.startUnit < wrappedTime && wrappedTime <= segment.endUnit) {
      return {
        pose: evalSegment(segment, wrappedTime - segment.startUnit),
        planeId: segment.planeId,
        ...(segment.planeSide !== undefined ? { planeSide: segment.planeSide } : {})
      };
    }
  }

  return null;
}

function evalMultiRigSequenceFromLeft(
  prepared: PreparedMultiRigSequence,
  tGlobal: TimeUnit
): Record<RigId, EvaluatedTrailPose> | null {
  const poses: Record<RigId, EvaluatedTrailPose> = {};

  for (const rig of prepared.rigs) {
    const pose = evalRigSequenceFromLeft(rig, tGlobal);
    if (!pose) return null;
    poses[rig.rigId] = pose;
  }

  return poses;
}

function nodePoseMatches(a: RelativeRigPose["handPose"], b: RelativeRigPose["handPose"]): boolean {
  return (
    Math.abs(wrapAngleDelta(a.phaseAbs - b.phaseAbs)) <= TRAIL_CONTINUITY_EPSILON &&
    Math.abs(a.radius - b.radius) <= TRAIL_CONTINUITY_EPSILON
  );
}

function relativePoseMatches(
  a: Record<RigId, EvaluatedTrailPose>,
  b: Record<RigId, EvaluatedTrailPose>
): boolean {
  for (const [rigId, value] of Object.entries(a)) {
    const other = b[rigId];
    if (!other) return false;
    if (value.planeId !== other.planeId) return false;
    if (value.planeSide !== other.planeSide) return false;
    if (!nodePoseMatches(value.pose.handPose, other.pose.handPose)) return false;
    if (!nodePoseMatches(value.pose.headPose, other.pose.headPose)) return false;
  }

  return Object.keys(a).length === Object.keys(b).length;
}

export function isContinuousAtLoopBoundary(
  prepared: PreparedMultiRigSequence,
  loopDuration: TimeUnit
): boolean {
  if (!Number.isFinite(loopDuration) || loopDuration <= 0) return false;

  const startEval = evalPreparedMultiRigSequenceAt(prepared, 0);
  if (!startEval.ok) return false;

  const endPoses = evalMultiRigSequenceFromLeft(prepared, loopDuration);
  if (!endPoses) return false;

  return relativePoseMatches(startEval.poses, endPoses);
}

export function sampleMultiRigTrailGrid(
  prepared: PreparedMultiRigSequence,
  sampleIndex: number,
  dt: TimeUnit,
  normalizedHoldSteps: number | null,
  loopDuration: TimeUnit | null,
  projectionSettings: PlaneProjectionSettings = DEFAULT_PLANE_PROJECTION_SETTINGS
): MultiRigTrailSamples {
  const effectiveLoopDuration = normalizedHoldSteps === null ? null : loopDuration;
  const startIndex = normalizedHoldSteps === null ? 0 : sampleIndex - (normalizedHoldSteps - 1);
  const boundedStartIndex = effectiveLoopDuration === null ? Math.max(0, startIndex) : startIndex;
  const pointCount = sampleIndex - boundedStartIndex + 1;
  const trails = createEmptyTrails(prepared);

  for (let index = 0; index < pointCount; index += 1) {
    const gridIndex = boundedStartIndex + index;
    const rawTime = gridIndex * dt;
    const sampleTime =
      effectiveLoopDuration === null ? rawTime : normalizeLoopTime(rawTime, effectiveLoopDuration);
    const result = evalPreparedMultiRigSequenceAt(prepared, sampleTime);
    if (!result.ok) return {};
    appendCartesianSample(trails, toProjectedMultiRigPose(result.poses, projectionSettings));
  }

  return trails;
}

export function shouldAppendCurrentTrailTip(t: TimeUnit, dt: TimeUnit): boolean {
  const sampleIndex = Math.floor(t / dt);
  const lastSampleTime = sampleIndex * dt;
  return t - lastSampleTime > Number.EPSILON * Math.max(1, Math.abs(t));
}
