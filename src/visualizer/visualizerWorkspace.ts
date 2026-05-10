import { inject, provide, type InjectionKey, type MaybeRefOrGetter } from "vue";

import type { TransportController } from "@/composables/useTransport";
import type { MultiRigSequence } from "@/engine/types";
import type { DisplaySettingsController } from "@/visualizer/useDisplaySettings";
import {
  useVisualizerCore,
  type VisualizerCoreController,
  type VisualizerCoreOptions
} from "@/visualizer/useVisualizerCore";
import {
  useVisualizerDisplay,
  type VisualizerDisplayOptions
} from "@/visualizer/useVisualizerDisplay";

export interface VisualizerWorkspaceOptions extends VisualizerCoreOptions {
  readonly display?: VisualizerDisplayOptions;
}

export interface VisualizerWorkspace {
  readonly core: VisualizerCoreController;
  readonly transport: TransportController;
  readonly display: DisplaySettingsController;
  dispose: () => void;
}

export const visualizerWorkspaceKey: InjectionKey<VisualizerWorkspace> =
  Symbol("visualizer-workspace");

export function createVisualizerWorkspace(
  sequence: MaybeRefOrGetter<MultiRigSequence>,
  options: VisualizerWorkspaceOptions = {}
): VisualizerWorkspace {
  const { display: displayOptions, ...coreOptions } = options;
  const core = useVisualizerCore(sequence, coreOptions);
  const display = useVisualizerDisplay(core, displayOptions);

  return {
    core,
    transport: core.transport,
    display,
    dispose: core.dispose
  };
}

export function provideVisualizerWorkspace(workspace: VisualizerWorkspace): VisualizerWorkspace {
  provide(visualizerWorkspaceKey, workspace);
  return workspace;
}

export function useVisualizerWorkspace(): VisualizerWorkspace {
  const workspace = inject(visualizerWorkspaceKey);
  if (!workspace) {
    throw new Error("No visualizer workspace provided in the current component tree");
  }

  return workspace;
}
