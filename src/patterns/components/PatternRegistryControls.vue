<script setup lang="ts">
import { computed, ref } from "vue";

import FloatingPanel from "@/components/FloatingPanel.vue";
import { patternKindLabel } from "@/patterns/patternAdapters";
import { usePatternRegistry } from "@/patterns/usePatternRegistry";
import type { PatternEntry, PatternKind, PatternSource } from "@/patterns/types";

const props = withDefaults(
  defineProps<{
    editorKind?: PatternKind;
    currentPatternId?: string | null;
    currentSource?: PatternSource | null;
    currentName?: string;
    isDirty?: boolean;
    storageKey?: string;
  }>(),
  {
    currentPatternId: null,
    currentSource: null,
    currentName: "Untitled Pattern",
    isDirty: false,
    storageKey: "poi-v2:pattern-registry-panel"
  }
);

const emit = defineEmits<{
  open: [entry: PatternEntry];
  saved: [entry: PatternEntry];
}>();

const registry = usePatternRegistry();
const panelOpen = ref(false);
const saveAsOpen = ref(false);
const folderId = ref<string | null>(null);
const draftName = ref("");
const feedback = ref<string | null>(null);

const folders = computed(() =>
  registry.folders.value.filter((folder) => folder.parentId === folderId.value)
);
const entries = computed(() =>
  registry.entries.value
    .filter((entry) => entry.folderId === folderId.value)
    .sort((left, right) => left.name.localeCompare(right.name))
);
const currentFolder = computed(() =>
  folderId.value ? registry.folders.value.find((folder) => folder.id === folderId.value) ?? null : null
);
const isCompatible = (entry: PatternEntry) =>
  props.editorKind === undefined || entry.source.kind === props.editorKind;

function openPanel() {
  feedback.value = null;
  panelOpen.value = true;
}

function openEntry(entry: PatternEntry) {
  if (!isCompatible(entry)) return;
  if (props.isDirty && typeof window !== "undefined" && !window.confirm("Discard unsaved changes?")) {
    return;
  }
  registry.select(entry.id);
  emit("open", entry);
  panelOpen.value = false;
}

function saveCurrent() {
  if (!props.currentPatternId || !props.currentSource) return;
  if (!registry.save(props.currentPatternId, props.currentSource)) {
    feedback.value = "Could not save this pattern";
    return;
  }
  const entry = registry.get(props.currentPatternId);
  if (entry) emit("saved", entry);
  feedback.value = "Saved";
}

function beginSaveAs() {
  draftName.value = props.currentName;
  saveAsOpen.value = true;
  panelOpen.value = true;
  feedback.value = null;
}

function saveAs() {
  if (!props.currentSource) return;
  try {
    const entry = registry.saveAs(props.currentSource, {
      name: draftName.value,
      folderId: folderId.value
    });
    emit("saved", entry);
    saveAsOpen.value = false;
    feedback.value = "Saved as " + entry.name;
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : "Could not save pattern";
  }
}

function newFolder() {
  const name = typeof window === "undefined" ? "" : window.prompt("Folder name");
  if (!name) return;
  try {
    const folder = registry.createFolder(name, folderId.value);
    folderId.value = folder.id;
    feedback.value = "Created folder";
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : "Could not create folder";
  }
}

function renameSelected() {
  const selected = registry.selectedPattern.value;
  if (!selected || typeof window === "undefined") return;
  const name = window.prompt("Pattern name", selected.name);
  if (name) registry.updateMetadata(selected.id, { name });
}

function moveSelectedHere() {
  const selected = registry.selectedPattern.value;
  if (selected) registry.move(selected.id, folderId.value);
}

function deleteSelected() {
  const selected = registry.selectedPattern.value;
  if (!selected || typeof window === "undefined") return;
  if (window.confirm("Delete " + selected.name + "?")) {
    registry.delete(selected.id);
    feedback.value = "Deleted pattern";
  }
}

</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <span class="max-w-48 truncate text-xs text-slate-400" :title="props.currentName">
      {{ props.currentName }}{{ props.isDirty ? " *" : "" }}
    </span>
    <button
      type="button"
      class="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-200 transition hover:border-sky-500 hover:text-sky-200"
      @click="openPanel"
    >
      Open…
    </button>
    <button
      v-if="props.editorKind"
      type="button"
      class="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-200 transition hover:border-sky-500 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-40"
      :disabled="!props.currentPatternId || !props.currentSource || !props.isDirty"
      @click="saveCurrent"
    >
      Save
    </button>
    <button
      v-if="props.editorKind"
      type="button"
      class="rounded-lg border border-sky-700 px-2.5 py-1.5 text-xs text-sky-200 transition hover:border-sky-500"
      @click="beginSaveAs"
    >
      Save As…
    </button>

    <FloatingPanel
      v-if="panelOpen"
      :storage-key="props.storageKey"
      @close="panelOpen = false"
    >
      <template #handle="{ close }">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Patterns</p>
            <p class="mt-1 text-sm font-medium text-slate-200">
              {{ currentFolder?.name ?? "All Patterns" }}
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300"
            @click="close"
          >
            Close
          </button>
        </div>
      </template>

      <div class="grid gap-2 p-3 text-sm">
        <div v-if="currentFolder" class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300"
            @click="folderId = currentFolder.parentId"
          >
            Up
          </button>
          <span class="truncate text-xs text-slate-500">{{ currentFolder.name }}</span>
        </div>

        <div class="flex flex-wrap gap-1.5 border-b border-slate-800 pb-2">
          <button
            type="button"
            class="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300"
            @click="newFolder"
          >
            New Folder
          </button>
          <button
            type="button"
            class="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300 disabled:opacity-40"
            :disabled="!registry.selectedPattern.value"
            @click="moveSelectedHere"
          >
            Move Selected Here
          </button>
          <button
            type="button"
            class="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300 disabled:opacity-40"
            :disabled="!registry.selectedPattern.value"
            @click="renameSelected"
          >
            Rename
          </button>
          <button
            type="button"
            class="rounded-md border border-rose-900/70 px-2 py-1 text-[11px] text-rose-300 disabled:opacity-40"
            :disabled="!registry.selectedPattern.value"
            @click="deleteSelected"
          >
            Delete
          </button>
        </div>

        <button
          v-for="folder in folders"
          :key="folder.id"
          type="button"
          class="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2 text-left text-slate-200 transition hover:border-slate-600 hover:bg-slate-900"
          @click="folderId = folder.id"
        >
          <span>📁 {{ folder.name }}</span>
          <span class="text-xs text-slate-600">›</span>
        </button>

        <button
          v-for="entry in entries"
          :key="entry.id"
          type="button"
          class="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-35"
          :class="
            entry.id === registry.selectedPatternId.value
              ? 'border-sky-700 bg-sky-950/40'
              : 'border-slate-800 hover:border-slate-600 hover:bg-slate-900'
          "
          :disabled="!isCompatible(entry)"
          :title="
            isCompatible(entry)
              ? 'Open ' + entry.name
              : 'This is a ' + patternKindLabel(entry.source.kind) + ' pattern'
          "
          @click="openEntry(entry)"
        >
          <span class="min-w-0 truncate text-slate-200">{{ entry.name }}</span>
          <span class="shrink-0 text-[10px] uppercase tracking-wider text-slate-500">
            {{ patternKindLabel(entry.source.kind) }}
          </span>
        </button>

        <p v-if="folders.length === 0 && entries.length === 0" class="p-3 text-xs text-slate-500">
          This folder is empty.
        </p>

        <div v-if="saveAsOpen" class="mt-2 grid gap-2 border-t border-slate-800 pt-3">
          <label class="grid gap-1 text-xs text-slate-400">
            <span>Pattern name</span>
            <input
              v-model="draftName"
              type="text"
              class="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              @keyup.enter="saveAs"
            />
          </label>
          <button
            type="button"
            class="rounded-lg bg-sky-400 px-3 py-2 text-sm font-medium text-slate-950"
            @click="saveAs"
          >
            Save Pattern
          </button>
        </div>

        <p v-if="feedback" class="text-xs text-sky-300">{{ feedback }}</p>
      </div>
    </FloatingPanel>
  </div>
</template>
