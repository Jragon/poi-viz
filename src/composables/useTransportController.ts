import { useTransportClock } from "@/composables/useTransportClock";
import { secondsToBeats } from "@/engine/math";
import { normalizeLoopBeat } from "@/render/math";
import { setGlobalBoolean, setScrubBeat, togglePlayback } from "@/state/actions";
import type { AppState } from "@/types/state";
import { computed, type ComputedRef, type Ref } from "vue";

const SCRUB_DIVISIONS = 400;
const MIN_SCRUB_STEP = 0.001;

interface TransportControllerOptions {
  state: AppState;
  isStaticView: Ref<boolean>;
  commitState: (nextState: AppState) => void;
}

/**
 * Transport controller contract for playhead progression and transport handlers.
 */
export interface TransportController {
  loopedPlayheadBeats: ComputedRef<number>;
  scrubStep: ComputedRef<number>;
  handleTogglePlayback: () => void;
  handleSetScrub: (beatValue: number) => void;
  handleSetStaticView: (nextValue: boolean) => void;
  startTransport: () => void;
  stopTransport: () => void;
}

/**
 * Creates transport handlers and single-clock lifecycle wiring.
 */
export function useTransportController(options: TransportControllerOptions): TransportController {
  const { state, isStaticView, commitState } = options;

  function advancePlayhead(frameDeltaSeconds: number): void {
    if (!state.global.isPlaying) {
      return;
    }

    const beatsDelta = secondsToBeats(frameDeltaSeconds, state.global.bpm) * state.global.playSpeed;
    state.global.t += beatsDelta;
  }

  const transportClock = useTransportClock(advancePlayhead);

  return {
    loopedPlayheadBeats: computed(() => normalizeLoopBeat(state.global.t, state.global.loopBeats)),
    scrubStep: computed(() => Math.max(state.global.loopBeats / SCRUB_DIVISIONS, MIN_SCRUB_STEP)),
    handleTogglePlayback(): void {
      if (isStaticView.value) {
        return;
      }
      commitState(togglePlayback(state));
    },
    handleSetScrub(beatValue: number): void {
      commitState(setScrubBeat(state, beatValue));
    },
    handleSetStaticView(nextValue: boolean): void {
      isStaticView.value = nextValue;
      if (nextValue) {
        commitState(setGlobalBoolean(state, "isPlaying", false));
      }
    },
    startTransport(): void {
      transportClock.start();
    },
    stopTransport(): void {
      transportClock.stop();
    }
  };
}
