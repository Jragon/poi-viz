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
  type PlaybackEvaluateResult
} from "@/visualizer/useMultiRigPlayback";

export interface VisualizerSession {
  readonly transport: TransportController;
  readonly playback: MultiRigPlaybackController;
  readonly currentFrame: Ref<PlaybackEvaluateResult | null>;
  readonly errorMessage: ComputedRef<string | null>;
  readonly isReady: ComputedRef<boolean>;
  dispose: () => void;
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
    errorMessage,
    isReady,
    dispose
  };
}
