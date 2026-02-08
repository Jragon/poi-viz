import { createPersistenceCoordinator } from "@/composables/persistenceCoordinator";
import { createTransportClock } from "@/composables/transportClock";
import { secondsToBeats } from "@/engine/math";
import { normalizeLoopBeat } from "@/render/math";
import {
  createPresetFileName,
  createPresetId,
  createUserPresetRecord,
  createUserPresetSummary,
  deserializeUserPresetFile,
  ensureUniquePresetId,
  getUserPreset,
  removeUserPreset,
  sanitizePresetName,
  serializeUserPresetFile,
  upsertUserPreset,
  type UserPresetRecord,
  type UserPresetSummary
} from "@/state/presetLibrary";
import type { AngleUnit } from "@/state/angleUnits";
import {
  setGlobalBoolean,
  setGlobalNumber,
  setGlobalPhaseReference,
  setHandNumber,
  setScrubBeat,
  togglePlayback,
  type GlobalBooleanKey,
  type GlobalNumberKey,
  type HandNumberKey
} from "@/state/actions";
import { createDefaultState } from "@/state/defaults";
import { applyThemeToDocument, getNextTheme, resolveInitialTheme, THEME_STORAGE_KEY, type Theme } from "@/state/theme";
import type { SpeedUnit } from "@/state/speedUnits";
import type { AppState, HandId, PhaseReference } from "@/types/state";
import { generateVTGState } from "@/vtg/generate";
import type { VTGDescriptor } from "@/vtg/types";
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch, type ComputedRef, type Ref } from "vue";

const SCRUB_DIVISIONS = 400;
const MIN_SCRUB_STEP = 0.001;
const COPY_LINK_LABEL_IDLE = "Copy Link";
const COPY_LINK_LABEL_SUCCESS = "Link Copied";
const COPY_LINK_LABEL_ERROR = "Copy Failed";
const COPY_LABEL_RESET_DELAY_MS = 1800;
const PRESET_LIBRARY_STATUS_RESET_DELAY_MS = 2400;

interface ExportPresetRequest {
  presetId: string;
  speedUnit: SpeedUnit;
  phaseUnit: AngleUnit;
}

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

function getStorageValue(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStorageValue(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore write failures (private mode, quota, disabled storage).
  }
}

function copyTextFallback(text: string): boolean {
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

function downloadTextFile(fileName: string, content: string): void {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}

/**
 * Owns app-level orchestration concerns used by the root shell.
 */
export function useAppOrchestrator(): AppOrchestrator {
  const state = reactive(createDefaultState());
  const copyLinkLabel = ref(COPY_LINK_LABEL_IDLE);
  const theme = ref<Theme>("dark");
  const isStaticView = ref(false);
  const presetLibraryStatus = ref("");
  const userPresetRecords = ref<UserPresetRecord[]>([]);
  const userPresetSummaries = computed(() => userPresetRecords.value.map(createUserPresetSummary));
  const themeButtonLabel = computed(() => (theme.value === "dark" ? "Light Theme" : "Dark Theme"));
  const loopedPlayheadBeats = computed(() => normalizeLoopBeat(state.global.t, state.global.loopBeats));
  const scrubStep = computed(() => Math.max(state.global.loopBeats / SCRUB_DIVISIONS, MIN_SCRUB_STEP));

  const persistenceCoordinator = createPersistenceCoordinator();
  const transportClock = createTransportClock(advancePlayhead);

  let copyLabelTimerId = 0;
  let presetLibraryStatusTimerId = 0;

  function commitState(nextState: AppState): void {
    state.global = nextState.global;
    state.hands = nextState.hands;
  }

  function persistPresetLibraryNow(): void {
    persistenceCoordinator.persistPresetLibraryNow(userPresetRecords.value);
  }

  function schedulePersistenceSync(): void {
    persistenceCoordinator.scheduleSessionStateSync(state);
  }

  function resetCopyLinkLabelSoon(): void {
    if (copyLabelTimerId !== 0) {
      window.clearTimeout(copyLabelTimerId);
    }
    copyLabelTimerId = window.setTimeout(() => {
      copyLinkLabel.value = COPY_LINK_LABEL_IDLE;
      copyLabelTimerId = 0;
    }, COPY_LABEL_RESET_DELAY_MS);
  }

  function resetPresetLibraryStatusSoon(): void {
    if (presetLibraryStatusTimerId !== 0) {
      window.clearTimeout(presetLibraryStatusTimerId);
    }
    presetLibraryStatusTimerId = window.setTimeout(() => {
      presetLibraryStatus.value = "";
      presetLibraryStatusTimerId = 0;
    }, PRESET_LIBRARY_STATUS_RESET_DELAY_MS);
  }

  function advancePlayhead(frameDeltaSeconds: number): void {
    if (!state.global.isPlaying) {
      return;
    }

    const beatsDelta = secondsToBeats(frameDeltaSeconds, state.global.bpm) * state.global.playSpeed;
    state.global.t += beatsDelta;
  }

  function handleTogglePlayback(): void {
    if (isStaticView.value) {
      return;
    }
    commitState(togglePlayback(state));
  }

  function handleSetScrub(beatValue: number): void {
    commitState(setScrubBeat(state, beatValue));
  }

  function handleSetStaticView(nextValue: boolean): void {
    isStaticView.value = nextValue;
    if (nextValue) {
      commitState(setGlobalBoolean(state, "isPlaying", false));
    }
  }

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

  function handleToggleTheme(): void {
    const nextTheme = getNextTheme(theme.value);
    theme.value = nextTheme;
    applyThemeToDocument(nextTheme);
    setStorageValue(THEME_STORAGE_KEY, nextTheme);
  }

  function handleApplyVTG(descriptor: VTGDescriptor): void {
    commitState(generateVTGState(descriptor, state, state.global.phaseReference));
  }

  async function handleCopyLink(): Promise<void> {
    const shareUrl = persistenceCoordinator.buildShareUrl(state, window.location.href);
    let copied = false;

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        copied = true;
      } catch {
        copied = false;
      }
    }

    if (!copied) {
      copied = copyTextFallback(shareUrl);
    }

    copyLinkLabel.value = copied ? COPY_LINK_LABEL_SUCCESS : COPY_LINK_LABEL_ERROR;
    resetCopyLinkLabelSoon();
  }

  function handleSaveUserPreset(name: string): void {
    const sanitizedName = sanitizePresetName(name);
    const existingByName = userPresetRecords.value.find((record) => record.name === sanitizedName);
    const now = new Date();

    const nextRecord = existingByName
      ? createUserPresetRecord(sanitizedName, state, now, existingByName.id)
      : createUserPresetRecord(
          sanitizedName,
          state,
          now,
          ensureUniquePresetId(userPresetRecords.value, createPresetId(sanitizedName, now))
        );

    userPresetRecords.value = upsertUserPreset(userPresetRecords.value, nextRecord);
    persistPresetLibraryNow();
    presetLibraryStatus.value = existingByName ? "Preset updated" : "Preset saved";
    resetPresetLibraryStatusSoon();
  }

  function handleLoadUserPreset(presetId: string): void {
    const preset = getUserPreset(userPresetRecords.value, presetId);
    if (!preset) {
      presetLibraryStatus.value = "Preset not found";
      resetPresetLibraryStatusSoon();
      return;
    }

    commitState(preset.state);
    presetLibraryStatus.value = `Loaded: ${preset.name}`;
    resetPresetLibraryStatusSoon();
  }

  function handleDeleteUserPreset(presetId: string): void {
    const preset = getUserPreset(userPresetRecords.value, presetId);
    if (!preset) {
      presetLibraryStatus.value = "Preset not found";
      resetPresetLibraryStatusSoon();
      return;
    }

    userPresetRecords.value = removeUserPreset(userPresetRecords.value, presetId);
    persistPresetLibraryNow();
    presetLibraryStatus.value = `Deleted: ${preset.name}`;
    resetPresetLibraryStatusSoon();
  }

  function handleExportUserPreset(request: ExportPresetRequest): void {
    const preset = getUserPreset(userPresetRecords.value, request.presetId);
    if (!preset) {
      presetLibraryStatus.value = "Preset not found";
      resetPresetLibraryStatusSoon();
      return;
    }

    const fileName = createPresetFileName(preset.name);
    const payload = serializeUserPresetFile(preset, {
      speedUnit: request.speedUnit,
      phaseUnit: request.phaseUnit
    });
    downloadTextFile(fileName, payload);
    presetLibraryStatus.value = `Exported: ${fileName}`;
    resetPresetLibraryStatusSoon();
  }

  async function handleImportUserPreset(file: File): Promise<void> {
    try {
      const content = await file.text();
      const defaults = createDefaultState();
      const importedPreset = deserializeUserPresetFile(content, defaults);
      if (!importedPreset) {
        presetLibraryStatus.value = "Import failed: invalid preset file";
        resetPresetLibraryStatusSoon();
        return;
      }

      const existing = getUserPreset(userPresetRecords.value, importedPreset.id);
      const nextPreset = existing
        ? importedPreset
        : {
            ...importedPreset,
            id: ensureUniquePresetId(userPresetRecords.value, importedPreset.id)
          };

      userPresetRecords.value = upsertUserPreset(userPresetRecords.value, nextPreset);
      persistPresetLibraryNow();
      presetLibraryStatus.value = existing ? `Updated import: ${nextPreset.name}` : `Imported: ${nextPreset.name}`;
      resetPresetLibraryStatusSoon();
    } catch {
      presetLibraryStatus.value = "Import failed: unreadable file";
      resetPresetLibraryStatusSoon();
    }
  }

  watch(
    state,
    () => {
      schedulePersistenceSync();
    },
    { deep: true }
  );

  onMounted(() => {
    const defaults = createDefaultState();
    theme.value = resolveInitialTheme(getStorageValue(THEME_STORAGE_KEY));
    applyThemeToDocument(theme.value);

    const hydration = persistenceCoordinator.resolveHydration(defaults, window.location.href);
    commitState(hydration.initialState);
    userPresetRecords.value = hydration.userPresetRecords;

    if (hydration.cleanHref !== window.location.href) {
      window.history.replaceState(null, "", hydration.cleanHref);
    }

    persistenceCoordinator.enableSessionSync();
    persistenceCoordinator.persistSessionStateNow(state);
    transportClock.start();
  });

  onBeforeUnmount(() => {
    transportClock.stop();
    persistenceCoordinator.disableSessionSync();
    if (copyLabelTimerId !== 0) {
      window.clearTimeout(copyLabelTimerId);
    }
    if (presetLibraryStatusTimerId !== 0) {
      window.clearTimeout(presetLibraryStatusTimerId);
    }
  });

  return {
    state,
    loopedPlayheadBeats,
    scrubStep,
    copyLinkLabel,
    theme,
    isStaticView,
    presetLibraryStatus,
    userPresetSummaries,
    themeButtonLabel,
    handleTogglePlayback,
    handleSetScrub,
    handleSetStaticView,
    handleSetGlobalNumber,
    handleSetGlobalBoolean,
    handleSetPhaseReference,
    handleSetHandNumber,
    handleToggleTheme,
    handleApplyVTG,
    handleCopyLink,
    handleSaveUserPreset,
    handleLoadUserPreset,
    handleDeleteUserPreset,
    handleExportUserPreset,
    handleImportUserPreset
  };
}
