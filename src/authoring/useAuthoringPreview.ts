import {
  computed,
  ref,
  watch,
  watchEffect,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref
} from "vue";

import { createTransport, type TransportController } from "@/composables/useTransport";
import type { MultiRigSequence, TimeUnit } from "@/engine/types";
import {
  useMultiRigPlayback,
  type MultiRigPlaybackController,
  type MultiRigTrailSamples,
  type PlaybackEvaluateResult
} from "@/visualizer/useMultiRigPlayback";
import { TRAIL_DECAY_DEFAULT, TRAIL_STEP_FIXED } from "@/visualizer/useVisualizerSession";

export interface AuthoringPreviewSession {
  readonly transport: TransportController;
  readonly playback: MultiRigPlaybackController;
  readonly currentFrame: Ref<PlaybackEvaluateResult | null>;
  readonly currentTrails: ComputedRef<MultiRigTrailSamples>;
  readonly errorMessage: Ref<string | null>;
  readonly isReady: ComputedRef<boolean>;
  dispose: () => void;
}

function formatPrepareErrors(codes: readonly { code: string }[]): string {
  return codes.map((error) => error.code).join(", ");
}

export function useAuthoringPreview(
  sequence: MaybeRefOrGetter<MultiRigSequence>,
  consumeRestartTime: () => TimeUnit | null,
  transport: TransportController = createTransport()
): AuthoringPreviewSession {
  const playback = useMultiRigPlayback(sequence);
  const currentFrame = ref<PlaybackEvaluateResult | null>(null);
  const errorMessage = ref<string | null>(null);

  const stopPreparedWatch = watch(
    () => playback.prepared.value,
    (prepared) => {
      if (!prepared) {
        errorMessage.value = playback.prepareErrors.value.length
          ? `Sequence validation failed: ${formatPrepareErrors(playback.prepareErrors.value)}`
          : null;
        return;
      }

      const wasPlaying = transport.isPlaying.value;
      const nextRestartTime = consumeRestartTime();

      transport.pause();
      transport.setDuration(prepared.maxSequenceDuration);
      if (nextRestartTime !== null) {
        transport.setCurrentTime(nextRestartTime);
      }

      currentFrame.value = playback.evaluate(transport.currentTime.value);
      errorMessage.value = null;

      if (wasPlaying && transport.duration.value > 0) {
        transport.play();
      }
    },
    { immediate: true }
  );

  const stopEvalWatch = watchEffect(() => {
    if (!playback.prepared.value) {
      return;
    }

    const result = playback.evaluate(transport.currentTime.value);
    currentFrame.value = result;

    if (!result.ok) {
      transport.pause();
      errorMessage.value = `Playback evaluation failed: ${result.reason}`;
      return;
    }

    errorMessage.value = null;
  });

  const currentTrails = computed<MultiRigTrailSamples>(() => {
    if (!playback.prepared.value) return {};
    const t = transport.currentTime.value;
    if (t <= 0) return {};
    return playback.sampleTrails(t, TRAIL_STEP_FIXED, TRAIL_DECAY_DEFAULT);
  });

  const isReady = computed(
    () => playback.prepared.value !== null && currentFrame.value?.ok === true && !errorMessage.value
  );

  return {
    transport,
    playback,
    currentFrame,
    currentTrails,
    errorMessage,
    isReady,
    dispose: () => {
      stopPreparedWatch();
      stopEvalWatch();
      playback.dispose();
    }
  };
}
