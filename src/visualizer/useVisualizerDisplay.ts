import { computed, getCurrentInstance } from "vue";

import {
  createDisplaySettingsController,
  provideDisplaySettings,
  type DisplaySettingsController,
  type DisplaySettingsOptions,
  type ExternalDisplaySettingBindings,
  type StorageLike
} from "@/visualizer/useDisplaySettings";
import type { VisualizerCoreController } from "@/visualizer/useVisualizerCore";

export interface VisualizerDisplayOptions {
  readonly storage?: StorageLike | null;
  readonly storageKey?: string;
  readonly external?: ExternalDisplaySettingBindings;
}

export function useVisualizerDisplay(
  core: VisualizerCoreController,
  options: VisualizerDisplayOptions = {}
): DisplaySettingsController {
  const transportSecondsPerUnit = computed({
    get: () => 1 / core.transport.speed.value,
    set: (value: number) => {
      if (!Number.isFinite(value) || value <= 0) {
        return;
      }

      core.transport.setSpeed(1 / value);
    }
  });

  const controllerOptions: DisplaySettingsOptions = {
    rigOrder: core.rigOrder,
    external: {
      trailDecaySteps: {
        value: core.session.trailDecaySteps,
        set: core.session.setTrailDecaySteps
      },
      trailLoopMode: {
        value: core.session.trailLoopMode,
        set: core.session.setTrailLoopMode
      },
      transportSecondsPerUnit: {
        value: transportSecondsPerUnit,
        set: (value) => {
          transportSecondsPerUnit.value = value;
        }
      },
      ...options.external
    }
  };

  if (options.storage !== undefined) {
    controllerOptions.storage = options.storage;
  }

  if (options.storageKey !== undefined) {
    controllerOptions.storageKey = options.storageKey;
  }

  const controller = createDisplaySettingsController(controllerOptions);

  if (getCurrentInstance()) {
    provideDisplaySettings(controller);
  }

  return controller;
}
