import { getCurrentInstance, onBeforeUnmount } from "vue";

import { usePhaseMetronome, type PhaseMetronomeController } from "@/visualizer/usePhaseMetronome";
import type { VisualizerCoreController } from "@/visualizer/useVisualizerCore";

export interface VisualizerMetronomeOptions {
  readonly onRuleAdded?: () => void;
}

export function useVisualizerMetronome(
  core: VisualizerCoreController,
  options: VisualizerMetronomeOptions = {}
): PhaseMetronomeController {
  const metronome = usePhaseMetronome({
    currentFrame: core.session.currentFrame,
    prepared: core.session.playback.prepared,
    currentTime: core.transport.currentTime,
    duration: core.transport.duration,
    isPlaying: core.transport.isPlaying,
    speed: core.transport.speed,
    unitsPerSecond: core.transport.unitsPerSecond,
    onRuleAdded:
      options.onRuleAdded ??
      (() => {
        core.transport.reset();
      })
  });

  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      metronome.dispose();
    });
  }

  return metronome;
}
