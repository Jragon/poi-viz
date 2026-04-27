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
  TimeUnit
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

export interface MultiRigPlaybackController {
  readonly prepared: Ref<PreparedMultiRigSequence | null>;
  readonly prepareErrors: Ref<MultiRigSequenceValidationError[]>;
  readonly maxSequenceDuration: ComputedRef<TimeUnit>;
  readonly lastEvaluation: Ref<PlaybackEvaluateResult | null>;
  evaluate: (t: TimeUnit) => PlaybackEvaluateResult;
  dispose: () => void;
}

function toRelativePoses(poses: EvaluatedMultiRigPose): Record<RigId, RelativeRigPose> {
  return Object.fromEntries(Object.entries(poses).map(([rigId, value]) => [rigId, value.pose]));
}

export function useMultiRigPlayback(
  sequence: MaybeRefOrGetter<MultiRigSequence>
): MultiRigPlaybackController {
  const prepared = ref<PreparedMultiRigSequence | null>(null);
  const prepareErrors = ref<MultiRigSequenceValidationError[]>([]);
  const lastEvaluation = ref<PlaybackEvaluateResult | null>(null);

  const stopWatching = watch(
    () => toValue(sequence),
    (nextSequence) => {
      const prepareResult = prepareMultiRigSequence(nextSequence);
      lastEvaluation.value = null;

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

  return {
    prepared,
    prepareErrors,
    maxSequenceDuration,
    lastEvaluation,
    evaluate,
    dispose
  };
}
