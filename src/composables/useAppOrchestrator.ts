import { usePersistenceCoordinator } from "@/composables/usePersistenceCoordinator";
import { usePresetLibraryController, type ExportPresetRequest } from "@/composables/usePresetLibraryController";
import { useShareLinkController } from "@/composables/useShareLinkController";
import { useThemeController } from "@/composables/useThemeController";
import { useTransportController } from "@/composables/useTransportController";
import { useVtgSequenceController } from "@/composables/useVtgSequenceController";
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
import type { VTGSequence, VTGSequenceSnapSetting } from "@/vtg/sequence";
import { generateVTGState } from "@/vtg/generate";
import type { VTGDescriptor, VTGPhaseDeg } from "@/vtg/types";
import { onBeforeUnmount, onMounted, reactive, ref, watch, type ComputedRef, type Ref } from "vue";

export interface AppOrchestrator {
  state: AppState;
  visualState: ComputedRef<AppState>;
  visualTBeats: ComputedRef<number>;
  loopedPlayheadBeats: ComputedRef<number>;
  transportLoopBeats: ComputedRef<number>;
  trailResetEpoch: Ref<number>;
  scrubStep: ComputedRef<number>;
  copyLinkLabel: Ref<string>;
  theme: Ref<Theme>;
  isStaticView: Ref<boolean>;
  presetLibraryStatus: Ref<string>;
  userPresetSummaries: ComputedRef<UserPresetSummary[]>;
  sequenceMode: Ref<boolean>;
  sequence: Ref<VTGSequence>;
  sequenceStatus: Ref<string>;
  sequenceSegments: ComputedRef<
    Array<{
      id: string;
      durationBeats: number;
      descriptor: VTGSequence["segments"][number]["descriptor"];
    }>
  >;
  selectedSequenceSegmentId: Ref<string | null>;
  selectedSequenceDescriptor: ComputedRef<VTGDescriptor | null>;
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
  handleSetSequenceMode: (enabled: boolean) => void;
  handleSetSequenceName: (name: string) => void;
  handleSetSequenceLoop: (loop: boolean) => void;
  handleSetSnapSetting: (snapSetting: VTGSequenceSnapSetting) => void;
  handleSetSequenceStartPhaseDeg: (startPhaseDeg: VTGPhaseDeg) => void;
  handleAddSequenceSegment: () => void;
  handleSelectSequenceSegment: (segmentId: string) => void;
  handleSetSelectedSequenceDurationBeats: (durationBeats: number) => void;
  handleMoveSelectedSequenceSegment: (direction: "up" | "down") => void;
  handleDeleteSelectedSequenceSegment: () => void;
  handleDuplicateSelectedSequenceSegment: () => void;
  handleExportSequence: () => void;
  handleImportSequence: (file: File) => Promise<void>;
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
  const persistenceCoordinator = usePersistenceCoordinator();

  function cloneAppState(nextState: AppState): AppState {
    return {
      global: { ...nextState.global },
      hands: {
        L: { ...nextState.hands.L },
        R: { ...nextState.hands.R }
      }
    };
  }

  function commitState(nextState: AppState): void {
    const cloned = cloneAppState(nextState);
    state.global = cloned.global;
    state.hands = cloned.hands;
  }

  const transportController = useTransportController({
    state,
    isStaticView,
    commitState
  });

  const sequenceController = useVtgSequenceController(state, transportController.absolutePlayheadBeats);

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
    if (sequenceController.sequenceMode.value) {
      sequenceController.handleReplaceSelectedDescriptor(descriptor);
      return;
    }
    commitState(generateVTGState(descriptor, state));
  }

  function handleSetSequenceMode(enabled: boolean): void {
    sequenceController.handleSetSequenceMode(enabled, state);
  }

  function handleLoadUserPreset(presetId: string): void {
    presetLibraryController.handleLoadUserPreset(presetId);
    transportController.setAbsolutePlayheadBeats(state.global.t);
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
    transportController.setAbsolutePlayheadBeats(hydration.initialState.global.t);
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
    sequenceController.dispose();
  });

  return {
    state,
    visualState: sequenceController.renderState,
    visualTBeats: sequenceController.renderBeat,
    loopedPlayheadBeats: sequenceController.transportPlayheadBeats,
    transportLoopBeats: sequenceController.transportLoopBeats,
    trailResetEpoch: sequenceController.trailResetEpoch,
    scrubStep: transportController.scrubStep,
    copyLinkLabel: shareLinkController.copyLinkLabel,
    theme: themeController.theme,
    isStaticView,
    presetLibraryStatus: presetLibraryController.presetLibraryStatus,
    userPresetSummaries: presetLibraryController.userPresetSummaries,
    sequenceMode: sequenceController.sequenceMode,
    sequence: sequenceController.sequence,
    sequenceStatus: sequenceController.sequenceStatus,
    sequenceSegments: sequenceController.segmentViews,
    selectedSequenceSegmentId: sequenceController.selectedSegmentId,
    selectedSequenceDescriptor: sequenceController.selectedSegmentDescriptorForVtgPanel,
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
    handleSetSequenceMode,
    handleSetSequenceName: sequenceController.handleSetSequenceName,
    handleSetSequenceLoop: sequenceController.handleSetSequenceLoop,
    handleSetSnapSetting: sequenceController.handleSetSnapSetting,
    handleSetSequenceStartPhaseDeg: sequenceController.handleSetSequenceStartPhaseDeg,
    handleAddSequenceSegment: () => sequenceController.handleAddSegmentFromCurrentState(state),
    handleSelectSequenceSegment: sequenceController.handleSelectSegment,
    handleSetSelectedSequenceDurationBeats: sequenceController.handleSetSelectedDurationBeats,
    handleMoveSelectedSequenceSegment: sequenceController.handleMoveSelectedSegment,
    handleDeleteSelectedSequenceSegment: sequenceController.handleDeleteSelectedSegment,
    handleDuplicateSelectedSequenceSegment: sequenceController.handleDuplicateSelectedSegment,
    handleExportSequence: sequenceController.handleExportSequence,
    handleImportSequence: sequenceController.handleImportSequence,
    handleCopyLink: shareLinkController.handleCopyLink,
    handleSaveUserPreset: presetLibraryController.handleSaveUserPreset,
    handleLoadUserPreset,
    handleDeleteUserPreset: presetLibraryController.handleDeleteUserPreset,
    handleExportUserPreset: presetLibraryController.handleExportUserPreset,
    handleImportUserPreset: presetLibraryController.handleImportUserPreset
  };
}
