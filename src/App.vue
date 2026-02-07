<script setup lang="ts">
import Controls from "@/components/Controls.vue";
import PatternCanvas from "@/components/PatternCanvas.vue";
import WaveCanvas from "@/components/WaveCanvas.vue";
import { secondsToBeats } from "@/engine/math";
import { normalizeLoopBeat } from "@/render/math";
import {
  buildStateUrl,
  LOCAL_STORAGE_STATE_KEY,
  PERSISTENCE_DEBOUNCE_MS,
  resolveInitialState,
  serializeState,
  stripStateQueryParam
} from "@/state/persistence";
import {
  createPresetFileName,
  createPresetId,
  createUserPresetRecord,
  createUserPresetSummary,
  deserializeUserPresetFile,
  deserializeUserPresetLibrary,
  ensureUniquePresetId,
  getUserPreset,
  PRESET_LIBRARY_STORAGE_KEY,
  removeUserPreset,
  sanitizePresetName,
  serializeUserPresetFile,
  serializeUserPresetLibrary,
  upsertUserPreset,
  type UserPresetRecord
} from "@/state/presetLibrary";
import type { AngleUnit } from "@/state/angleUnits";
import type { SpeedUnit } from "@/state/speedUnits";
import {
  setGlobalBoolean,
  setGlobalNumber,
  setHandNumber,
  setScrubBeat,
  togglePlayback,
  type GlobalBooleanKey,
  type GlobalNumberKey,
  type HandNumberKey
} from "@/state/actions";
import { createDefaultState } from "@/state/defaults";
import type { AppState, HandId } from "@/types/state";
import { generateVTGState } from "@/vtg/generate";
import type { VTGDescriptor } from "@/vtg/types";
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

const state = reactive(createDefaultState());

const SCRUB_DIVISIONS = 400;
const MIN_SCRUB_STEP = 0.001;
const COPY_LINK_LABEL_IDLE = "Copy Link";
const COPY_LINK_LABEL_SUCCESS = "Link Copied";
const COPY_LINK_LABEL_ERROR = "Copy Failed";
const COPY_LABEL_RESET_DELAY_MS = 1800;
const PRESET_LIBRARY_STATUS_RESET_DELAY_MS = 2400;

let animationFrameId = 0;
let lastFrameTimeMs = 0;
let copyLabelTimerId = 0;
let persistenceTimerId = 0;
let presetLibraryStatusTimerId = 0;
let persistenceEnabled = false;

const loopedPlayheadBeats = computed(() => normalizeLoopBeat(state.global.t, state.global.loopBeats));
const scrubStep = computed(() => Math.max(state.global.loopBeats / SCRUB_DIVISIONS, MIN_SCRUB_STEP));
const copyLinkLabel = ref(COPY_LINK_LABEL_IDLE);
const presetLibraryStatus = ref("");
const userPresetRecords = ref<UserPresetRecord[]>([]);
const userPresetSummaries = computed(() => userPresetRecords.value.map(createUserPresetSummary));

interface ExportPresetRequest {
  presetId: string;
  speedUnit: SpeedUnit;
  phaseUnit: AngleUnit;
}

function commitState(nextState: AppState): void {
  state.global = nextState.global;
  state.hands = nextState.hands;
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

function getSessionStorageValue(): string | null {
  return getStorageValue(LOCAL_STORAGE_STATE_KEY);
}

function persistSessionStateNow(): void {
  setStorageValue(LOCAL_STORAGE_STATE_KEY, serializeState(state));
}

function getPresetLibraryStorageValue(): string | null {
  return getStorageValue(PRESET_LIBRARY_STORAGE_KEY);
}

function persistPresetLibraryNow(): void {
  setStorageValue(PRESET_LIBRARY_STORAGE_KEY, serializeUserPresetLibrary(userPresetRecords.value));
}

function schedulePersistenceSync(): void {
  if (!persistenceEnabled) {
    return;
  }

  if (persistenceTimerId !== 0) {
    window.clearTimeout(persistenceTimerId);
  }

  persistenceTimerId = window.setTimeout(() => {
    persistSessionStateNow();
    persistenceTimerId = 0;
  }, PERSISTENCE_DEBOUNCE_MS);
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

function advancePlayhead(frameDeltaSeconds: number): void {
  if (!state.global.isPlaying) {
    return;
  }

  const beatsDelta = secondsToBeats(frameDeltaSeconds, state.global.bpm) * state.global.playSpeed;
  state.global.t += beatsDelta;
}

function animationLoop(frameTimeMs: number): void {
  if (lastFrameTimeMs === 0) {
    lastFrameTimeMs = frameTimeMs;
  }

  const frameDeltaSeconds = (frameTimeMs - lastFrameTimeMs) / 1000;
  lastFrameTimeMs = frameTimeMs;

  advancePlayhead(frameDeltaSeconds);
  animationFrameId = requestAnimationFrame(animationLoop);
}

function handleTogglePlayback(): void {
  commitState(togglePlayback(state));
}

function handleSetScrub(beatValue: number): void {
  commitState(setScrubBeat(state, beatValue));
}

function handleSetGlobalNumber(key: GlobalNumberKey, value: number): void {
  commitState(setGlobalNumber(state, key, value));
}

function handleSetGlobalBoolean(key: GlobalBooleanKey, value: boolean): void {
  commitState(setGlobalBoolean(state, key, value));
}

function handleSetHandNumber(handId: HandId, key: HandNumberKey, value: number): void {
  commitState(setHandNumber(state, handId, key, value));
}

function handleApplyVTG(descriptor: VTGDescriptor): void {
  commitState(generateVTGState(descriptor, state));
}

async function handleCopyLink(): Promise<void> {
  const shareBaseUrl = stripStateQueryParam(window.location.href);
  const shareUrl = buildStateUrl(state, shareBaseUrl);
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
  const initialState = resolveInitialState(defaults, window.location.href, getSessionStorageValue());
  commitState(initialState);
  userPresetRecords.value = deserializeUserPresetLibrary(getPresetLibraryStorageValue(), defaults);

  const cleanUrl = stripStateQueryParam(window.location.href);
  if (cleanUrl !== window.location.href) {
    window.history.replaceState(null, "", cleanUrl);
  }

  persistenceEnabled = true;
  persistSessionStateNow();
  animationFrameId = requestAnimationFrame(animationLoop);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrameId);
  if (copyLabelTimerId !== 0) {
    window.clearTimeout(copyLabelTimerId);
  }
  if (persistenceTimerId !== 0) {
    window.clearTimeout(persistenceTimerId);
  }
  if (presetLibraryStatusTimerId !== 0) {
    window.clearTimeout(presetLibraryStatusTimerId);
  }
});
</script>

<template>
  <main class="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 p-4 text-zinc-100 md:p-6">
    <header class="rounded border border-zinc-800 bg-zinc-950/70 p-4">
      <div class="flex items-start justify-between gap-3">
        <h1 class="text-2xl font-semibold tracking-tight md:text-3xl">Poi Visuliser</h1>
        <button
          class="rounded border border-zinc-700 px-3 py-2 text-sm font-medium hover:border-zinc-500"
          type="button"
          @click="handleCopyLink"
        >
          {{ copyLinkLabel }}
        </button>
      </div>
    </header>

    <section class="grid gap-4 lg:grid-cols-12">
      <article
        class="flex h-[360px] flex-col rounded border border-zinc-800 bg-zinc-950/70 p-2 sm:h-[480px]"
        :class="state.global.showWaves ? 'lg:col-span-7' : 'lg:col-span-12'"
      >
        <h2 class="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Pattern Viewport</h2>
        <div class="min-h-0 flex-1">
          <PatternCanvas :state="state" :t-beats="state.global.t" />
        </div>
      </article>

      <article
        v-if="state.global.showWaves"
        class="flex h-[360px] flex-col rounded border border-zinc-800 bg-zinc-950/70 p-2 sm:h-[480px] lg:col-span-5"
      >
        <h2 class="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Waveform Inspector</h2>
        <div class="min-h-0 flex-1">
          <WaveCanvas :state="state" :t-beats="state.global.t" />
        </div>
      </article>

      <Controls
        :state="state"
        :looped-playhead-beats="loopedPlayheadBeats"
        :scrub-step="scrubStep"
        :user-presets="userPresetSummaries"
        :preset-library-status="presetLibraryStatus"
        @toggle-playback="handleTogglePlayback"
        @set-scrub="handleSetScrub"
        @set-global-number="handleSetGlobalNumber"
        @set-global-boolean="handleSetGlobalBoolean"
        @set-hand-number="handleSetHandNumber"
        @apply-vtg="handleApplyVTG"
        @save-user-preset="handleSaveUserPreset"
        @load-user-preset="handleLoadUserPreset"
        @delete-user-preset="handleDeleteUserPreset"
        @export-user-preset="handleExportUserPreset"
        @import-user-preset="handleImportUserPreset"
      />
    </section>
  </main>
</template>
