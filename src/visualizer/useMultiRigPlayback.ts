import {
  computed,
  ref,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref
} from "vue";

import { toCartesianMultiRigPose } from "@/engine/cartesian";
import {
  evalPreparedMultiRigSequenceAt,
  prepareMultiRigSequence,
  samplePreparedMultiRigSequence,
  type EvalMultiRigAtResult,
  type EvaluatedMultiRigPose,
  type MultiRigSequenceValidationError,
  type PreparedMultiRigSequence
} from "@/engine/multirig";
import type {
  CartesianMultiRigPose,
  MultiRigSequence,
  RelativeRigPose,
  RigId,
  TimeUnit,
  Vec2
} from "@/engine/types";

export type PlaybackEvalSuccess = {
  ok: true;
  evaluatedPoses: EvaluatedMultiRigPose;
  relativePoses: Record<RigId, RelativeRigPose>;
  cartesianPoses: CartesianMultiRigPose;
};

export type PlaybackEvalFailure =
  | { ok: false; reason: "INVALID_TIME" | "NEGATIVE_TIME" }
  | { ok: false; reason: "UNPREPARED_SEQUENCE" };

export type PlaybackEvaluateResult = PlaybackEvalSuccess | PlaybackEvalFailure;

export interface RigTrailSamples {
  hand: Vec2[];
  head: Vec2[];
}

export type MultiRigTrailSamples = Partial<Record<RigId, RigTrailSamples>>;

const TRAIL_POINT_EPSILON = 1e-9;

export interface MultiRigPlaybackController {
  readonly prepared: Ref<PreparedMultiRigSequence | null>;
  readonly prepareErrors: Ref<MultiRigSequenceValidationError[]>;
  readonly maxSequenceDuration: ComputedRef<TimeUnit>;
  readonly lastEvaluation: Ref<PlaybackEvaluateResult | null>;
  evaluate: (t: TimeUnit) => PlaybackEvaluateResult;
  sampleTrails: (t: TimeUnit, dt: TimeUnit, holdSteps?: number) => MultiRigTrailSamples;
  dispose: () => void;
}

function toRelativePoses(poses: EvaluatedMultiRigPose): Record<RigId, RelativeRigPose> {
  return Object.fromEntries(Object.entries(poses).map(([rigId, value]) => [rigId, value.pose]));
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

export function appendCurrentPoseToTrails(
  trails: MultiRigTrailSamples,
  currentPoses: CartesianMultiRigPose,
  holdSteps?: number
): MultiRigTrailSamples {
  const normalizedHoldSteps =
    holdSteps === undefined
      ? null
      : Number.isFinite(holdSteps)
        ? Math.floor(holdSteps)
        : Number.NaN;
  if (
    normalizedHoldSteps !== null &&
    (!Number.isFinite(normalizedHoldSteps) || normalizedHoldSteps < 2)
  ) {
    return {};
  }

  const rigIds = new Set([...Object.keys(trails), ...Object.keys(currentPoses)]);
  const nextTrails: MultiRigTrailSamples = {};

  for (const rigId of rigIds) {
    const currentPose = currentPoses[rigId];
    if (!currentPose) {
      continue;
    }

    const existing = trails[rigId];
    nextTrails[rigId] = {
      hand: appendTrailPoint(existing?.hand ?? [], currentPose.handPosition, normalizedHoldSteps),
      head: appendTrailPoint(existing?.head ?? [], currentPose.headPosition, normalizedHoldSteps)
    };
  }

  return nextTrails;
}

export function useMultiRigPlayback(
  sequence: MaybeRefOrGetter<MultiRigSequence>
): MultiRigPlaybackController {
  const prepared = ref<PreparedMultiRigSequence | null>(null);
  const prepareErrors = ref<MultiRigSequenceValidationError[]>([]);
  const lastEvaluation = ref<PlaybackEvaluateResult | null>(null);
  let trailCache: {
    prepared: PreparedMultiRigSequence;
    dt: TimeUnit;
    holdSteps: number | null;
    sampleIndex: number;
    trails: MultiRigTrailSamples;
  } | null = null;

  const stopWatching = watch(
    () => toValue(sequence),
    (nextSequence) => {
      const prepareResult = prepareMultiRigSequence(nextSequence);
      lastEvaluation.value = null;
      trailCache = null;

      if (!prepareResult.ok) {
        prepared.value = null;
        prepareErrors.value = prepareResult.errors;
        return;
      }

      prepared.value = prepareResult.prepared;
      prepareErrors.value = [];
    },
    { immediate: true }
  );

  const maxSequenceDuration = computed(() => prepared.value?.maxSequenceDuration ?? 0);

  const evaluate = (t: TimeUnit): PlaybackEvaluateResult => {
    if (!prepared.value) {
      const result: PlaybackEvalFailure = { ok: false, reason: "UNPREPARED_SEQUENCE" };
      lastEvaluation.value = result;
      return result;
    }

    const evalResult: EvalMultiRigAtResult = evalPreparedMultiRigSequenceAt(prepared.value, t);
    if (!evalResult.ok) {
      lastEvaluation.value = evalResult;
      return evalResult;
    }

    const relativePoses = toRelativePoses(evalResult.poses);
    const result: PlaybackEvalSuccess = {
      ok: true,
      evaluatedPoses: evalResult.poses,
      relativePoses,
      cartesianPoses: toCartesianMultiRigPose(relativePoses)
    };
    lastEvaluation.value = result;
    return result;
  };

  const dispose = () => {
    stopWatching();
  };

  const sampleTrails = (t: TimeUnit, dt: TimeUnit, holdSteps?: number): MultiRigTrailSamples => {
    if (!prepared.value) return {};
    if (!Number.isFinite(t) || !Number.isFinite(dt)) return {};
    if (t <= 0 || dt <= 0) return {};

    const sampleIndex = Math.floor(t / dt);

    const normalizedHoldSteps =
      holdSteps === undefined
        ? null
        : Number.isFinite(holdSteps)
          ? Math.floor(holdSteps)
          : Number.NaN;
    if (
      normalizedHoldSteps !== null &&
      (!Number.isFinite(normalizedHoldSteps) || normalizedHoldSteps < 2)
    ) {
      return {};
    }

    const startIndex =
      normalizedHoldSteps === null ? 0 : Math.max(0, sampleIndex - (normalizedHoldSteps - 1));

    let baseTrails =
      trailCache &&
      trailCache.prepared === prepared.value &&
      trailCache.dt === dt &&
      trailCache.holdSteps === normalizedHoldSteps &&
      trailCache.sampleIndex === sampleIndex
        ? trailCache.trails
        : null;

    if (!baseTrails) {
      const pointCount = sampleIndex - startIndex + 1;
      const times: TimeUnit[] = new Array(pointCount);
      for (let index = 0; index < pointCount; index += 1) {
        times[index] = (startIndex + index) * dt;
      }

      const results = samplePreparedMultiRigSequence(prepared.value, times);
      const trails = createEmptyTrails(prepared.value);

      for (const result of results) {
        if (!result.ok) return {};
        appendCartesianSample(trails, toCartesianMultiRigPose(toRelativePoses(result.poses)));
      }

      baseTrails = trails;
      trailCache = {
        prepared: prepared.value,
        dt,
        holdSteps: normalizedHoldSteps,
        sampleIndex,
        trails
      };
    }

    const lastSampleTime = sampleIndex * dt;
    const appendCurrentTip = t - lastSampleTime > Number.EPSILON * Math.max(1, Math.abs(t));
    if (!appendCurrentTip) {
      return baseTrails;
    }

    const currentEval = evalPreparedMultiRigSequenceAt(prepared.value, t);
    if (!currentEval.ok) return {};

    return appendCurrentPoseToTrails(
      baseTrails,
      toCartesianMultiRigPose(toRelativePoses(currentEval.poses)),
      normalizedHoldSteps ?? undefined
    );
  };

  return {
    prepared,
    prepareErrors,
    maxSequenceDuration,
    lastEvaluation,
    evaluate,
    sampleTrails,
    dispose
  };
}
