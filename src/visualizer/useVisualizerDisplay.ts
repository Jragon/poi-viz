import { computed } from "vue";

import {
  createDisplaySettingsController,
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
  const planeSideSeparationWorld = computed({
    get: () =>
      Math.max(
        core.session.planeSideADepthWorld.value,
        core.session.planeSideBDepthWorld.value
      ),
    set: (value: number) => {
      core.session.setPlaneSideDepthsWorld(value, value);
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
      projectionMode: {
        value: core.session.projectionMode,
        set: core.session.setProjectionMode
      },
      projectionYawDeg: {
        value: core.session.projectionYawDeg,
        set: core.session.setProjectionYawDeg
      },
      projectionPitchDeg: {
        value: core.session.projectionPitchDeg,
        set: core.session.setProjectionPitchDeg
      },
      planeSideSeparationWorld: {
        value: planeSideSeparationWorld,
        set: (value) => {
          planeSideSeparationWorld.value = value;
        }
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

  return createDisplaySettingsController(controllerOptions);
}
