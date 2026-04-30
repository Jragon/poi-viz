import { getCurrentInstance, onBeforeUnmount } from "vue";

import {
  createPngSequenceExporter,
  type ExportController,
  type PngSequenceExporterDependencies,
  type PngSequenceExportState
} from "@/visualizer/exportPngSequence";
import { cloneOverlaySettings } from "@/visualizer/overlaySettings";
import type { DisplaySettingsController } from "@/visualizer/useDisplaySettings";
import type { VisualizerCoreController } from "@/visualizer/useVisualizerCore";

export interface VisualizerExportController {
  readonly state: ExportController["state"];
  start: () => Promise<void>;
  cancel: () => void;
}

export function useVisualizerExport(
  core: VisualizerCoreController,
  display: DisplaySettingsController,
  dependencies: PngSequenceExporterDependencies = {}
): VisualizerExportController {
  const exporter = createPngSequenceExporter(dependencies);

  const cancel = () => {
    exporter.cancel();
  };

  const start = async () => {
    const wasPlaying = core.transport.isPlaying.value;
    core.transport.pause();

    try {
      await exporter.start({
        sequence: core.sequence.value,
        sequenceSummary: core.sequenceSummary.value,
        rigOrder: core.rigOrder.value,
        sceneWorldRadius: core.sceneWorldRadius.value,
        displayScale: display.displayScale.value,
        trailDecaySteps: core.session.trailDecaySteps.value,
        trailLoopMode: core.session.trailLoopMode.value,
        overlaySettings: cloneOverlaySettings(display.overlaySettings.value)
      });
    } finally {
      if (wasPlaying) {
        core.transport.play();
      }
    }
  };

  if (getCurrentInstance()) {
    onBeforeUnmount(cancel);
  }

  return {
    state: exporter.state,
    start,
    cancel
  };
}

export type { PngSequenceExportState };
