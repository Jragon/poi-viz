import {
  computed,
  ref,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref
} from "vue";

import {
  evalPreparedMultiRigSequenceAt,
  prepareMultiRigSequence,
  type EvalMultiRigAtResult,
  type EvaluatedMultiRigPose,
  type MultiRigSequenceValidationError,
  type PreparedMultiRigSequence
} from "@/engine/multirig";
import {
  DEFAULT_PLANE_PROJECTION_SETTINGS,
  toProjectedMultiRigPose,
  toWorldMultiRigPose,
  type PlaneProjectionSettings,
  type ProjectionMode
} from "@/engine/planeProjection";
import type {
  CartesianMultiRigPose,
  MultiRigSequence,
  RelativeRigPose,
  RigId,
  TimeUnit,
  WorldMultiRigPose
} from "@/engine/types";
import {
  appendCurrentPoseToTrails,
  isContinuousAtLoopBoundary,
  isValidNormalizedHoldSteps,
  normalizeTrailHoldSteps,
  sampleMultiRigTrailGrid,
  shouldAppendCurrentTrailTip,
  type MultiRigTrailSamples,
  type TrailLoopMode,
  type TrailSamplingOptions
} from "@/visualizer/trailSampling";

export type {
  MultiRigTrailSamples,
  RigTrailSamples,
  TrailLoopMode,
  TrailSamplingOptions
} from "@/visualizer/trailSampling";

export type PlaybackEvalSuccess = {
  ok: true;
  evaluatedPoses: EvaluatedMultiRigPose;
  relativePoses: Record<RigId, RelativeRigPose>;
  worldPoses: WorldMultiRigPose;
  cartesianPoses: CartesianMultiRigPose;
};

export type PlaybackEvalFailure =
  | { ok: false; reason: "INVALID_TIME" | "NEGATIVE_TIME" }
  | { ok: false; reason: "UNPREPARED_SEQUENCE" };

export type PlaybackEvaluateResult = PlaybackEvalSuccess | PlaybackEvalFailure;

export interface MultiRigPlaybackController {
  readonly prepared: Ref<PreparedMultiRigSequence | null>;
  readonly prepareErrors: Ref<MultiRigSequenceValidationError[]>;
  readonly maxSequenceDuration: ComputedRef<TimeUnit>;
  readonly lastEvaluation: Ref<PlaybackEvaluateResult | null>;
  evaluate: (t: TimeUnit) => PlaybackEvaluateResult;
  sampleTrails: (
    t: TimeUnit,
    dt: TimeUnit,
    holdSteps?: number,
    options?: TrailSamplingOptions
  ) => MultiRigTrailSamples;
  dispose: () => void;
}

function toRelativePoses(poses: EvaluatedMultiRigPose): Record<RigId, RelativeRigPose> {
  return Object.fromEntries(Object.entries(poses).map(([rigId, value]) => [rigId, value.pose]));
}

export function useMultiRigPlayback(
  sequence: MaybeRefOrGetter<MultiRigSequence>,
  projectionSettings: MaybeRefOrGetter<PlaneProjectionSettings> = DEFAULT_PLANE_PROJECTION_SETTINGS
): MultiRigPlaybackController {
  const prepared = ref<PreparedMultiRigSequence | null>(null);
  const prepareErrors = ref<MultiRigSequenceValidationError[]>([]);
  const lastEvaluation = ref<PlaybackEvaluateResult | null>(null);
  let trailCache: {
    prepared: PreparedMultiRigSequence;
    dt: TimeUnit;
    holdSteps: number | null;
    sampleIndex: number;
    loopMode: TrailLoopMode;
    loopDuration: TimeUnit | null;
    isContinuous: boolean;
    projectionMode: ProjectionMode;
    projectionYawDeg: number;
    projectionPitchDeg: number;
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
    const currentProjectionSettings = toValue(projectionSettings);
    const result: PlaybackEvalSuccess = {
      ok: true,
      evaluatedPoses: evalResult.poses,
      relativePoses,
      worldPoses: toWorldMultiRigPose(evalResult.poses),
      cartesianPoses: toProjectedMultiRigPose(evalResult.poses, currentProjectionSettings)
    };
    lastEvaluation.value = result;
    return result;
  };

  const dispose = () => {
    stopWatching();
  };

  const sampleTrails = (
    t: TimeUnit,
    dt: TimeUnit,
    holdSteps?: number,
    options: TrailSamplingOptions = {}
  ): MultiRigTrailSamples => {
    if (!prepared.value) return {};
    if (!Number.isFinite(t) || !Number.isFinite(dt)) return {};
    if (t < 0 || dt <= 0) return {};

    const sampleIndex = Math.floor(t / dt);
    const normalizedHoldSteps = normalizeTrailHoldSteps(holdSteps);
    if (!isValidNormalizedHoldSteps(normalizedHoldSteps)) {
      return {};
    }

    const loopMode = options.loopMode ?? "off";
    const currentProjectionSettings = toValue(projectionSettings);
    const optionLoopDuration = options.loopDuration ?? 0;
    const loopDuration =
      Number.isFinite(optionLoopDuration) && optionLoopDuration > 0 ? optionLoopDuration : null;
    const isContinuous =
      loopMode === "auto" && loopDuration !== null
        ? isContinuousAtLoopBoundary(prepared.value, loopDuration)
        : false;
    const wrappedLoopDuration =
      loopMode === "auto" && isContinuous && normalizedHoldSteps !== null ? loopDuration : null;

    if (t === 0 && wrappedLoopDuration === null) return {};

    let baseTrails =
      trailCache &&
      trailCache.prepared === prepared.value &&
      trailCache.dt === dt &&
      trailCache.holdSteps === normalizedHoldSteps &&
      trailCache.sampleIndex === sampleIndex &&
      trailCache.loopMode === loopMode &&
      trailCache.loopDuration === wrappedLoopDuration &&
      trailCache.isContinuous === isContinuous &&
      trailCache.projectionMode === currentProjectionSettings.mode &&
      trailCache.projectionYawDeg === currentProjectionSettings.yawDeg &&
      trailCache.projectionPitchDeg === currentProjectionSettings.pitchDeg
        ? trailCache.trails
        : null;

    if (!baseTrails) {
      baseTrails = sampleMultiRigTrailGrid(
        prepared.value,
        sampleIndex,
        dt,
        normalizedHoldSteps,
        wrappedLoopDuration,
        currentProjectionSettings
      );
      trailCache = {
        prepared: prepared.value,
        dt,
        holdSteps: normalizedHoldSteps,
        sampleIndex,
        loopMode,
        loopDuration: wrappedLoopDuration,
        isContinuous,
        projectionMode: currentProjectionSettings.mode,
        projectionYawDeg: currentProjectionSettings.yawDeg,
        projectionPitchDeg: currentProjectionSettings.pitchDeg,
        trails: baseTrails
      };
    }

    if (!shouldAppendCurrentTrailTip(t, dt)) {
      return baseTrails;
    }

    const currentEval = evalPreparedMultiRigSequenceAt(prepared.value, t);
    if (!currentEval.ok) return {};

    return appendCurrentPoseToTrails(
      baseTrails,
      toProjectedMultiRigPose(currentEval.poses, currentProjectionSettings),
      normalizedHoldSteps
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
