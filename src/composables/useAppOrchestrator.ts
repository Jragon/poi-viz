import { createPersistenceCoordinator } from "@/composables/persistenceCoordinator";
import { usePresetLibraryController, type ExportPresetRequest } from "@/composables/usePresetLibraryController";
import { useShareLinkController } from "@/composables/useShareLinkController";
import { useThemeController } from "@/composables/useThemeController";
import { useTransportController } from "@/composables/useTransportController";
import {
  setGlobalBoolean,
  setGlobalNumber,
  setGlobalPhaseReference,
  setHandNumber,
  type GlobalBooleanKey,
  type GlobalNumberKey,
  type HandNumberKey
} from "@/state/actions";
import { createDefaultState } from "@/state/defaults";
import type { UserPresetSummary } from "@/state/presetLibrary";
import type { Theme } from "@/state/theme";
import type { AppState, HandId, PhaseReference } from "@/types/state";
import { generateVTGState } from "@/vtg/generate";
import type { VTGDescriptor } from "@/vtg/types";
import { onBeforeUnmount, onMounted, reactive, ref, watch, type ComputedRef, type Ref } from "vue";

export interface AppOrchestrator {
  state: AppState;
  loopedPlayheadBeats: ComputedRef<number>;
  scrubStep: ComputedRef<number>;
  copyLinkLabel: Ref<string>;
  theme: Ref<Theme>;
  isStaticView: Ref<boolean>;
  presetLibraryStatus: Ref<string>;
  userPresetSummaries: ComputedRef<UserPresetSummary[]>;
  themeButtonLabel: ComputedRef<string>;
  handleTogglePlayback: () => void;
  handleSetScrub: (beatValue: number) => void;
  handleSetStaticView: (nextValue: boolean) => void;
  handleSetGlobalNumber: (key: GlobalNumberKey, value: number) => void;
  handleSetGlobalBoolean: (key: GlobalBooleanKey, value: boolean) => void;
  handleSetPhaseReference: (nextValue: PhaseReference) => void;
  handleSetHandNumber: (handId: HandId, key: HandNumberKey, value: number) => void;
  handleToggleTheme: () => void;
  handleApplyVTG: (descriptor: VTGDescriptor) => void;
  handleCopyLink: () => Promise<void>;
  handleSaveUserPreset: (name: string) => void;
  handleLoadUserPreset: (presetId: string) => void;
  handleDeleteUserPreset: (presetId: string) => void;
  handleExportUserPreset: (request: ExportPresetRequest) => void;
  handleImportUserPreset: (file: File) => Promise<void>;
}

/**
 * Owns app-level orchestration concerns used by the root shell.
 */
export function useAppOrchestrator(): AppOrchestrator {
  const state = reactive(createDefaultState());
  const isStaticView = ref(false);
  const persistenceCoordinator = createPersistenceCoordinator();

  function commitState(nextState: AppState): void {
    state.global = nextState.global;
    state.hands = nextState.hands;
  }

  const transportController = useTransportController({
    state,
    isStaticView,
    commitState
  });

  const themeController = useThemeController();

  const presetLibraryController = usePresetLibraryController({
    state,
    commitState,
    persistRecords: persistenceCoordinator.persistPresetLibraryNow
  });

  const shareLinkController = useShareLinkController({
    state,
    buildShareUrl: persistenceCoordinator.buildShareUrl
  });

  function handleSetGlobalNumber(key: GlobalNumberKey, value: number): void {
    commitState(setGlobalNumber(state, key, value));
  }

  function handleSetGlobalBoolean(key: GlobalBooleanKey, value: boolean): void {
    commitState(setGlobalBoolean(state, key, value));
  }

  function handleSetPhaseReference(nextValue: PhaseReference): void {
    commitState(setGlobalPhaseReference(state, "phaseReference", nextValue));
  }

  function handleSetHandNumber(handId: HandId, key: HandNumberKey, value: number): void {
    commitState(setHandNumber(state, handId, key, value));
  }

  function handleApplyVTG(descriptor: VTGDescriptor): void {
    commitState(generateVTGState(descriptor, state, state.global.phaseReference));
  }

  watch(
    state,
    () => {
      persistenceCoordinator.scheduleSessionStateSync(state);
    },
    { deep: true }
  );

  onMounted(() => {
    const defaults = createDefaultState();
    themeController.initializeTheme();

    const hydration = persistenceCoordinator.resolveHydration(defaults, window.location.href);
    commitState(hydration.initialState);
    presetLibraryController.setUserPresetRecords(hydration.userPresetRecords);

    if (hydration.cleanHref !== window.location.href) {
      window.history.replaceState(null, "", hydration.cleanHref);
    }

    persistenceCoordinator.enableSessionSync();
    persistenceCoordinator.persistSessionStateNow(state);
    transportController.startTransport();
  });

  onBeforeUnmount(() => {
    transportController.stopTransport();
    persistenceCoordinator.disableSessionSync();
    shareLinkController.dispose();
    presetLibraryController.dispose();
  });

  return {
    state,
    loopedPlayheadBeats: transportController.loopedPlayheadBeats,
    scrubStep: transportController.scrubStep,
    copyLinkLabel: shareLinkController.copyLinkLabel,
    theme: themeController.theme,
    isStaticView,
    presetLibraryStatus: presetLibraryController.presetLibraryStatus,
    userPresetSummaries: presetLibraryController.userPresetSummaries,
    themeButtonLabel: themeController.themeButtonLabel,
    handleTogglePlayback: transportController.handleTogglePlayback,
    handleSetScrub: transportController.handleSetScrub,
    handleSetStaticView: transportController.handleSetStaticView,
    handleSetGlobalNumber,
    handleSetGlobalBoolean,
    handleSetPhaseReference,
    handleSetHandNumber,
    handleToggleTheme: themeController.handleToggleTheme,
    handleApplyVTG,
    handleCopyLink: shareLinkController.handleCopyLink,
    handleSaveUserPreset: presetLibraryController.handleSaveUserPreset,
    handleLoadUserPreset: presetLibraryController.handleLoadUserPreset,
    handleDeleteUserPreset: presetLibraryController.handleDeleteUserPreset,
    handleExportUserPreset: presetLibraryController.handleExportUserPreset,
    handleImportUserPreset: presetLibraryController.handleImportUserPreset
  };
}
