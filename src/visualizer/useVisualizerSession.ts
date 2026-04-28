import {
  computed,
  ref,
  toValue,
  watch,
  watchEffect,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref
} from "vue";

import { createTransport, type TransportController } from "@/composables/useTransport";
import type { MultiRigSequence } from "@/engine/types";
import {
  useMultiRigPlayback,
  type MultiRigPlaybackController,
  type MultiRigTrailSamples,
  type PlaybackEvaluateResult
} from "@/visualizer/useMultiRigPlayback";

export const TRAIL_STEP_FIXED = 0.01;
export const TRAIL_DECAY_MIN = 2;
export const TRAIL_DECAY_MAX = 250;
export const TRAIL_DECAY_DEFAULT = 100;

export interface VisualizerSession {
  readonly transport: TransportController;
  readonly playback: MultiRigPlaybackController;
  readonly currentFrame: Ref<PlaybackEvaluateResult | null>;
  readonly currentTrails: ComputedRef<MultiRigTrailSamples>;
  readonly trailDecaySteps: Ref<number>;
  readonly errorMessage: ComputedRef<string | null>;
  readonly isReady: ComputedRef<boolean>;
  setTrailDecaySteps: (value: number) => void;
  dispose: () => void;
}

function clampTrailDecaySteps(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return TRAIL_DECAY_DEFAULT;
  return Math.min(Math.max(Math.floor(value), TRAIL_DECAY_MIN), TRAIL_DECAY_MAX);
}

function formatPrepareErrors(codes: readonly { code: string }[]): string {
  return codes.map((error) => error.code).join(", ");
}

export function useVisualizerSession(
  sequence: MaybeRefOrGetter<MultiRigSequence>,
  transport: TransportController = createTransport()
): VisualizerSession {
  const playback = useMultiRigPlayback(() => toValue(sequence));
  const currentFrame = ref<PlaybackEvaluateResult | null>(null);
  const trailDecaySteps = ref<number>(TRAIL_DECAY_DEFAULT);

  const stopDurationWatch = watch(
    () => playback.maxSequenceDuration.value,
    (nextDuration) => {
      transport.pause();
      transport.reset();
      transport.setDuration(nextDuration);
      currentFrame.value = null;
    },
    { immediate: true }
  );

  const stopEvaluationWatch = watchEffect(() => {
    if (!playback.prepared.value) {
      currentFrame.value = null;
      return;
    }

    const result = playback.evaluate(transport.currentTime.value);
    currentFrame.value = result;

    if (!result.ok) {
      transport.pause();
    }
  });

  const currentTrails = computed<MultiRigTrailSamples>(() => {
    if (!playback.prepared.value) return {};
    const t = transport.currentTime.value;
    if (t <= 0) return {};
    return playback.sampleTrails(t, TRAIL_STEP_FIXED, trailDecaySteps.value);
  });

  const setTrailDecaySteps = (value: number) => {
    trailDecaySteps.value = clampTrailDecaySteps(value);
  };

  const errorMessage = computed(() => {
    if (playback.prepareErrors.value.length > 0) {
      return `Sequence validation failed: ${formatPrepareErrors(playback.prepareErrors.value)}`;
    }

    if (currentFrame.value && !currentFrame.value.ok) {
      return `Playback evaluation failed: ${currentFrame.value.reason}`;
    }

    return null;
  });

  const isReady = computed(() => playback.prepared.value !== null && errorMessage.value === null);

  const dispose = () => {
    stopEvaluationWatch();
    stopDurationWatch();
    playback.dispose();
  };

  return {
    transport,
    playback,
    currentFrame,
    currentTrails,
    trailDecaySteps,
    errorMessage,
    isReady,
    setTrailDecaySteps,
    dispose
  };
}
