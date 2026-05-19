import { evalPreparedMultiRigSequenceAt, type PreparedMultiRigSequence } from "@/engine/multirig";
import { toWorldMultiRigPose } from "@/engine/planeProjection";
import type { RigId, TimeUnit, Vec3, WorldMultiRigPose } from "@/engine/types";
import {
  DEFAULT_PLANE_SIDE_DISPLAY_SETTINGS,
  applyPlaneSideTransitionOffsets,
  type PlaneSideDisplaySettings
} from "@/visualizer/planeSideDisplay";
import {
  TRAIL_POINT_EPSILON,
  getTrailGridSampleTimes,
  isContinuousAtLoopBoundary,
  isValidNormalizedHoldSteps,
  normalizeTrailHoldSteps,
  shouldAppendCurrentTrailTip,
  type TrailSamplingOptions
} from "@/visualizer/trailSampling";

export interface WorldRigTrailSamples {
  hand: Vec3[];
  head: Vec3[];
}

export type WorldMultiRigTrailSamples = Partial<Record<RigId, WorldRigTrailSamples>>;

function createEmptyTrails(
  prepared: PreparedMultiRigSequence
): Record<RigId, WorldRigTrailSamples> {
  const trails: Record<RigId, WorldRigTrailSamples> = {};

  for (const rig of prepared.rigs) {
    trails[rig.rigId] = { hand: [], head: [] };
  }

  return trails;
}

function appendWorldSample(
  trails: Record<RigId, WorldRigTrailSamples>,
  worldPoses: WorldMultiRigPose
): void {
  for (const [rigId, pose] of Object.entries(worldPoses)) {
    const bucket = trails[rigId];
    if (!bucket) continue;
    bucket.hand.push(pose.handPosition);
    bucket.head.push(pose.headPosition);
  }
}

function pointsMatch(a: Vec3 | undefined, b: Vec3): boolean {
  if (!a) return false;
  return (
    Math.abs(a.x - b.x) <= TRAIL_POINT_EPSILON &&
    Math.abs(a.y - b.y) <= TRAIL_POINT_EPSILON &&
    Math.abs(a.z - b.z) <= TRAIL_POINT_EPSILON
  );
}

function appendTrailPoint(
  points: readonly Vec3[],
  nextPoint: Vec3,
  maxPoints: number | null
): Vec3[] {
  const withTip = pointsMatch(points[points.length - 1], nextPoint)
    ? [...points]
    : [...points, nextPoint];

  if (maxPoints === null || withTip.length <= maxPoints) {
    return withTip;
  }

  return withTip.slice(withTip.length - maxPoints);
}

function appendCurrentPoseToWorldTrails(
  trails: WorldMultiRigTrailSamples,
  currentPoses: WorldMultiRigPose,
  maxPoints: number | null
): WorldMultiRigTrailSamples {
  if (!isValidNormalizedHoldSteps(maxPoints)) return {};

  const rigIds = new Set([...Object.keys(trails), ...Object.keys(currentPoses)]);
  const nextTrails: WorldMultiRigTrailSamples = {};

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

export function sampleMultiRigWorldTrailGrid(
  prepared: PreparedMultiRigSequence,
  sampleIndex: number,
  dt: TimeUnit,
  normalizedHoldSteps: number | null,
  loopDuration: TimeUnit | null,
  planeSideDisplaySettings: PlaneSideDisplaySettings = DEFAULT_PLANE_SIDE_DISPLAY_SETTINGS
): WorldMultiRigTrailSamples {
  const trails = createEmptyTrails(prepared);

  for (const sampleTime of getTrailGridSampleTimes(
    sampleIndex,
    dt,
    normalizedHoldSteps,
    loopDuration
  )) {
    const result = evalPreparedMultiRigSequenceAt(prepared, sampleTime);
    if (!result.ok) return {};

    appendWorldSample(
      trails,
      applyPlaneSideTransitionOffsets(
        toWorldMultiRigPose(result.poses),
        prepared,
        planeSideDisplaySettings
      )
    );
  }

  return trails;
}

export function sampleMultiRigWorldTrails(
  prepared: PreparedMultiRigSequence,
  t: TimeUnit,
  dt: TimeUnit,
  holdSteps?: number,
  options: TrailSamplingOptions = {},
  planeSideDisplaySettings: PlaneSideDisplaySettings = DEFAULT_PLANE_SIDE_DISPLAY_SETTINGS
): WorldMultiRigTrailSamples {
  if (!Number.isFinite(t) || !Number.isFinite(dt)) return {};
  if (t < 0 || dt <= 0) return {};

  const sampleIndex = Math.floor(t / dt);
  const normalizedHoldSteps = normalizeTrailHoldSteps(holdSteps);
  if (!isValidNormalizedHoldSteps(normalizedHoldSteps)) {
    return {};
  }

  const loopMode = options.loopMode ?? "off";
  const optionLoopDuration = options.loopDuration ?? 0;
  const loopDuration =
    Number.isFinite(optionLoopDuration) && optionLoopDuration > 0 ? optionLoopDuration : null;
  const isContinuous =
    loopMode === "auto" && loopDuration !== null
      ? isContinuousAtLoopBoundary(prepared, loopDuration)
      : false;
  const wrappedLoopDuration =
    loopMode === "auto" && isContinuous && normalizedHoldSteps !== null ? loopDuration : null;

  if (t === 0 && wrappedLoopDuration === null) return {};

  const baseTrails = sampleMultiRigWorldTrailGrid(
    prepared,
    sampleIndex,
    dt,
    normalizedHoldSteps,
    wrappedLoopDuration,
    planeSideDisplaySettings
  );

  if (!shouldAppendCurrentTrailTip(t, dt)) {
    return baseTrails;
  }

  const currentEval = evalPreparedMultiRigSequenceAt(prepared, t);
  if (!currentEval.ok) return {};

  return appendCurrentPoseToWorldTrails(
    baseTrails,
    applyPlaneSideTransitionOffsets(
      toWorldMultiRigPose(currentEval.poses),
      prepared,
      planeSideDisplaySettings
    ),
    normalizedHoldSteps
  );
}
