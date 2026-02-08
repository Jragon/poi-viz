<script setup lang="ts">
import type { AngleUnit } from "@/state/angleUnits";
import type { UserPresetSummary } from "@/state/presetLibrary";
import type { SpeedUnit } from "@/state/speedUnits";
import { ref } from "vue";
import type { ExportPresetRequest } from "@/components/controls/types";

interface ControlsPresetLibraryPanelProps {
  userPresets: UserPresetSummary[];
  presetLibraryStatus: string;
  speedUnit: SpeedUnit;
  phaseUnit: AngleUnit;
}

const props = defineProps<ControlsPresetLibraryPanelProps>();

const emit = defineEmits<{
  (event: "save-user-preset", name: string): void;
  (event: "load-user-preset", presetId: string): void;
  (event: "delete-user-preset", presetId: string): void;
  (event: "export-user-preset", request: ExportPresetRequest): void;
  (event: "import-user-preset", file: File): void;
}>();

const presetNameDraft = ref("");
const importInputRef = ref<HTMLInputElement | null>(null);

function saveCurrentAsUserPreset(): void {
  emit("save-user-preset", presetNameDraft.value);
  presetNameDraft.value = "";
}

function loadUserPreset(presetId: string): void {
  emit("load-user-preset", presetId);
}

function deleteUserPreset(presetId: string): void {
  emit("delete-user-preset", presetId);
}

function exportUserPreset(presetId: string): void {
  emit("export-user-preset", {
    presetId,
    speedUnit: props.speedUnit,
    phaseUnit: props.phaseUnit
  });
}

function openImportPicker(): void {
  importInputRef.value?.click();
}

function onImportFileChange(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  const file = target.files?.[0];
  if (!file) {
    return;
  }

  emit("import-user-preset", file);
  target.value = "";
}

function formatSavedAt(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return date.toLocaleString();
}
</script>

<template>
  <details class="mt-4 rounded border border-zinc-800 p-3">
    <summary class="cursor-pointer text-xs uppercase tracking-wide text-zinc-400">Preset Library</summary>
    <div class="mt-3">
      <p class="text-xs text-zinc-500">
        Save patterns to app storage, reload them later, and export JSON files to build shared system presets.
      </p>

      <div class="mt-3 flex flex-wrap gap-2">
        <input
          v-model="presetNameDraft"
          class="min-w-[220px] flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
          type="text"
          maxlength="80"
          placeholder="Preset name"
          @keydown.enter.prevent="saveCurrentAsUserPreset"
        />
        <button
          class="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:border-zinc-500"
          type="button"
          @click="saveCurrentAsUserPreset"
        >
          Save Current
        </button>
        <button
          class="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:border-zinc-500"
          type="button"
          @click="openImportPicker"
        >
          Import JSON
        </button>
        <input ref="importInputRef" class="hidden" type="file" accept="application/json,.json" @change="onImportFileChange" />
      </div>

      <p v-if="props.presetLibraryStatus" class="mt-2 text-xs text-cyan-300">{{ props.presetLibraryStatus }}</p>

      <div v-if="props.userPresets.length === 0" class="mt-3 rounded border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-500">
        No saved presets yet.
      </div>

      <div v-else class="mt-3 grid gap-2">
        <div v-for="preset in props.userPresets" :key="preset.id" class="rounded border border-zinc-800 bg-zinc-900/40 p-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p class="text-sm font-medium text-zinc-100">{{ preset.name }}</p>
              <p class="text-xs text-zinc-500">{{ formatSavedAt(preset.savedAt) }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                class="rounded border border-zinc-700 px-2.5 py-1 text-xs hover:border-zinc-500"
                type="button"
                @click="loadUserPreset(preset.id)"
              >
                Load
              </button>
              <button
                class="rounded border border-zinc-700 px-2.5 py-1 text-xs hover:border-zinc-500"
                type="button"
                @click="exportUserPreset(preset.id)"
              >
                Export
              </button>
              <button
                class="rounded border border-zinc-700 px-2.5 py-1 text-xs hover:border-zinc-500"
                type="button"
                @click="deleteUserPreset(preset.id)"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </details>
</template>
