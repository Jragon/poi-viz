<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";

import FloatingPanel from "@/components/FloatingPanel.vue";
import { patternKindLabel } from "@/patterns/patternAdapters";
import { usePatternRegistry } from "@/patterns/usePatternRegistry";
import type { PatternEntry, PatternFolder, PatternKind, PatternSource } from "@/patterns/types";

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

type TreeNode =
  | { kind: "folder"; folder: PatternFolder; depth: number; hasChildren: boolean }
  | { kind: "pattern"; entry: PatternEntry; depth: number };

const TREE_INDENT_PX = 14;
const TREE_FOLDER_CONTENT_OFFSET_PX = 24;

function treeRowPadding(depth: number, includesFolderControl: boolean): string {
  const contentOffset = includesFolderControl ? 0 : TREE_FOLDER_CONTENT_OFFSET_PX;
  return `${4 + depth * TREE_INDENT_PX + contentOffset}px`;
}

const registry = usePatternRegistry();
const panelOpen = ref(false);
const saveAsOpen = ref(false);
const compatibleOnly = ref(Boolean(props.editorKind));
const expandedFolderIds = ref<Set<string>>(new Set());
const saveFolderId = ref<string | null>(null);
const newFolderOpen = ref(false);
const newFolderParentId = ref<string | null>(null);
const newFolderName = ref("");
const editingKind = ref<"pattern" | "folder" | null>(null);
const editingId = ref<string | null>(null);
const editingName = ref("");
const draftName = ref("");
const feedback = ref<string | null>(null);
const activeMenuKey = ref<string | null>(null);
const movePatternId = ref<string | null>(null);
const menuPosition = ref({ left: 0, top: 0 });
const menuAnchor = ref<{ top: number; bottom: number; right: number } | null>(null);
const menuRoot = ref<HTMLElement | null>(null);
const nameInput = ref<HTMLInputElement | null>(null);

const sortedFolders = computed(() =>
  [...registry.folders.value].sort((left, right) => left.name.localeCompare(right.name))
);

const visibleEntries = computed(() =>
  registry.entries.value
    .filter((entry) => !compatibleOnly.value || entry.source.kind === props.editorKind)
    .sort((left, right) => left.name.localeCompare(right.name))
);

function folderHasVisibleContent(folderId: string): boolean {
  if (visibleEntries.value.some((entry) => entry.folderId === folderId)) return true;
  return sortedFolders.value.some(
    (folder) => folder.parentId === folderId && folderHasVisibleContent(folder.id)
  );
}

function folderHasChildren(folderId: string): boolean {
  return (
    registry.entries.value.some((entry) => entry.folderId === folderId) ||
    registry.folders.value.some((folder) => folder.parentId === folderId)
  );
}

const treeNodes = computed<TreeNode[]>(() => {
  const nodes: TreeNode[] = [];

  function visit(parentId: string | null, depth: number) {
    for (const folder of sortedFolders.value.filter(
      (candidate) => candidate.parentId === parentId
    )) {
      if (compatibleOnly.value && !folderHasVisibleContent(folder.id)) continue;
      const hasChildren = folderHasChildren(folder.id);
      nodes.push({ kind: "folder", folder, depth, hasChildren });
      if (expandedFolderIds.value.has(folder.id)) visit(folder.id, depth + 1);
    }

    for (const entry of visibleEntries.value.filter(
      (candidate) => candidate.folderId === parentId
    )) {
      nodes.push({ kind: "pattern", entry, depth });
    }
  }

  visit(null, 0);
  return nodes;
});

const activeMenu = computed(() => {
  if (!activeMenuKey.value) return null;
  const [kind, id] = activeMenuKey.value.split(":", 2);
  if (kind === "pattern") return { kind: "pattern" as const, item: registry.get(id) };
  return {
    kind: "folder" as const,
    item: registry.folders.value.find((folder) => folder.id === id) ?? null
  };
});

const moveFolders = computed(() => sortedFolders.value);

function isCompatible(entry: PatternEntry) {
  return props.editorKind === undefined || entry.source.kind === props.editorKind;
}

function clearMenu() {
  activeMenuKey.value = null;
  movePatternId.value = null;
  menuAnchor.value = null;
}

function dismissMenu(event: MouseEvent) {
  if (!activeMenuKey.value && !movePatternId.value) return;
  const target = event.target;
  if (target instanceof Node && menuRoot.value?.contains(target)) return;
  clearMenu();
}

onMounted(() => document.addEventListener("click", dismissMenu));
onBeforeUnmount(() => document.removeEventListener("click", dismissMenu));

function openPanel() {
  compatibleOnly.value = Boolean(props.editorKind);
  feedback.value = null;
  clearMenu();
  panelOpen.value = true;
  expandSelectedAncestors();
}

function expandSelectedAncestors() {
  const selected = registry.selectedPattern.value;
  if (!selected) return;
  const next = new Set(expandedFolderIds.value);
  let folderId = selected.folderId;
  while (folderId) {
    next.add(folderId);
    folderId = registry.folders.value.find((folder) => folder.id === folderId)?.parentId ?? null;
  }
  expandedFolderIds.value = next;
}

function toggleFolder(folder: PatternFolder) {
  const next = new Set(expandedFolderIds.value);
  if (next.has(folder.id)) next.delete(folder.id);
  else next.add(folder.id);
  expandedFolderIds.value = next;
  saveFolderId.value = folder.id;
  clearMenu();
}

function openEntry(entry: PatternEntry) {
  if (!isCompatible(entry)) return;
  if (
    props.isDirty &&
    typeof window !== "undefined" &&
    !window.confirm("Discard unsaved changes?")
  ) {
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
  nextTick(() => nameInput.value?.focus());
}

function saveAs() {
  if (!props.currentSource) return;
  try {
    const entry = registry.saveAs(props.currentSource, {
      name: draftName.value,
      folderId: saveFolderId.value
    });
    emit("saved", entry);
    saveAsOpen.value = false;
    feedback.value = "Saved as " + entry.name;
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : "Could not save pattern";
  }
}

function beginNewFolder(parentId: string | null) {
  clearMenu();
  newFolderParentId.value = parentId;
  newFolderName.value = "";
  newFolderOpen.value = true;
  if (parentId) expandedFolderIds.value = new Set([...expandedFolderIds.value, parentId]);
  nextTick(() => nameInput.value?.focus());
}

function createFolder() {
  try {
    const folder = registry.createFolder(newFolderName.value, newFolderParentId.value);
    expandedFolderIds.value = new Set([...expandedFolderIds.value, folder.id]);
    saveFolderId.value = folder.id;
    newFolderOpen.value = false;
    feedback.value = "Folder created";
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : "Could not create folder";
  }
}

function beginRename(kind: "pattern" | "folder", id: string, name: string) {
  clearMenu();
  editingKind.value = kind;
  editingId.value = id;
  editingName.value = name;
  nextTick(() => nameInput.value?.focus());
}

function finishRename() {
  if (!editingKind.value || !editingId.value) return;
  const success =
    editingKind.value === "pattern"
      ? registry.updateMetadata(editingId.value, { name: editingName.value })
      : registry.updateFolder(editingId.value, editingName.value);
  feedback.value = success ? "Renamed" : "Name cannot be empty";
  if (success) {
    editingKind.value = null;
    editingId.value = null;
  }
}

function cancelEdit() {
  editingKind.value = null;
  editingId.value = null;
}

function openPatternMenu(entry: PatternEntry, event: MouseEvent) {
  event.stopPropagation();
  activeMenuKey.value = "pattern:" + entry.id;
  movePatternId.value = null;
  positionMenu(event.currentTarget as HTMLElement);
}

function openFolderMenu(folder: PatternFolder, event: MouseEvent) {
  event.stopPropagation();
  activeMenuKey.value = "folder:" + folder.id;
  movePatternId.value = null;
  positionMenu(event.currentTarget as HTMLElement);
}

function positionMenu(trigger: HTMLElement) {
  const rect = trigger.getBoundingClientRect();
  menuAnchor.value = { top: rect.top, bottom: rect.bottom, right: rect.right };
  updateMenuPosition();
}

function updateMenuPosition() {
  if (!menuAnchor.value) return;
  const width = movePatternId.value ? 176 : 144;
  const height = movePatternId.value ? 224 : 144;
  const left = Math.max(8, Math.min(menuAnchor.value.right - width, window.innerWidth - width - 8));
  const belowTop = menuAnchor.value.bottom + 4;
  const opensAbove =
    belowTop + height > window.innerHeight - 8 && menuAnchor.value.top - height - 4 >= 8;
  menuPosition.value = {
    left,
    top: opensAbove ? menuAnchor.value.top - height - 4 : belowTop
  };
}

function beginMove(entry: PatternEntry) {
  movePatternId.value = entry.id;
  nextTick(updateMenuPosition);
}

function moveTo(folderId: string | null) {
  if (!movePatternId.value) return;
  if (registry.move(movePatternId.value, folderId)) feedback.value = "Moved";
  clearMenu();
}

function deletePattern(entry: PatternEntry) {
  if (typeof window === "undefined" || !window.confirm("Delete " + entry.name + "?")) return;
  registry.delete(entry.id);
  feedback.value = "Deleted pattern";
  clearMenu();
}

function deleteFolder(folder: PatternFolder) {
  if (!registry.deleteFolder(folder.id)) {
    feedback.value = "Folder must be empty";
    clearMenu();
    return;
  }
  feedback.value = "Deleted folder";
  clearMenu();
}
</script>

<template>
  <div class="flex min-w-0 flex-wrap items-center gap-1.5">
    <button
      type="button"
      class="min-w-0 max-w-48 truncate rounded-md px-1.5 py-1 text-[11px] text-ui-text-secondary transition hover:bg-slate-800 hover:text-ui-text"
      :title="'Open ' + props.currentName"
      :aria-label="`Open pattern ${props.currentName}`"
      @click="openPanel"
    >
      {{ props.currentName }}{{ props.isDirty ? " *" : "" }}
      <span class="text-ui-text-muted" aria-hidden="true">⌄</span>
    </button>
    <button
      v-if="props.editorKind"
      type="button"
      class="rounded-md px-2 py-1 text-[11px] text-ui-text-secondary transition hover:bg-slate-800 hover:text-ui-text disabled:cursor-not-allowed disabled:text-ui-text-muted"
      :disabled="!props.currentPatternId || !props.currentSource || !props.isDirty"
      @click="saveCurrent"
    >
      Save
    </button>
    <button
      v-if="props.editorKind"
      type="button"
      class="rounded-md px-2 py-1 text-[11px] text-sky-300 transition hover:bg-sky-950/60 hover:text-sky-200"
      @click="beginSaveAs"
    >
      Save As…
    </button>

    <Teleport to="body">
      <FloatingPanel
        v-if="panelOpen"
        :storage-key="props.storageKey"
        compact
        @close="panelOpen = false"
      >
        <template #handle="{ close }">
          <div class="flex items-center justify-between gap-2">
            <p class="text-[11px] font-medium uppercase tracking-[0.14em] text-ui-text-muted">
              Patterns
            </p>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="rounded px-1.5 py-1 text-base leading-none text-ui-text-muted transition hover:bg-slate-800 hover:text-ui-text sm:focus-visible:opacity-100"
                aria-label="New folder"
                @click.stop="beginNewFolder(null)"
              >
                +
              </button>
              <button
                type="button"
                class="rounded px-1.5 py-1 text-base leading-none text-ui-text-muted transition hover:bg-slate-800 hover:text-ui-text sm:focus-visible:opacity-100"
                aria-label="Close pattern registry"
                @click.stop="close"
              >
                ×
              </button>
            </div>
          </div>
        </template>

        <div class="relative min-w-0 p-2 text-xs" @click="clearMenu">
          <label
            v-if="props.editorKind"
            class="mb-1.5 flex items-center gap-1.5 px-1 text-[11px] text-ui-text-secondary"
          >
            <input v-model="compatibleOnly" type="checkbox" class="h-3 w-3 accent-sky-400" />
            <span>Compatible patterns only</span>
          </label>

          <div
            v-if="newFolderOpen"
            class="mb-1 flex items-center gap-1 rounded border border-slate-700 bg-slate-900 px-1.5 py-1"
            @click.stop
          >
            <input
              ref="nameInput"
              v-model="newFolderName"
              type="text"
              placeholder="Folder name"
              class="min-w-0 flex-1 bg-transparent px-1 text-[11px] text-slate-100 placeholder:text-ui-text-muted"
              @keyup.enter="createFolder"
              @keyup.escape="newFolderOpen = false"
            />
            <button type="button" class="text-sky-300" @click="createFolder">✓</button>
            <button
              type="button"
              class="text-ui-text-muted hover:text-ui-text"
              aria-label="Cancel new folder"
              @click="newFolderOpen = false"
            >
              ×
            </button>
          </div>

          <div v-if="treeNodes.length > 0" class="grid gap-px">
            <template
              v-for="node in treeNodes"
              :key="node.kind === 'folder' ? node.folder.id : node.entry.id"
            >
              <div
                v-if="
                  node.kind === 'folder' && editingKind === 'folder' && editingId === node.folder.id
                "
                class="flex items-center gap-1 px-1 py-0.5"
                :style="{ paddingLeft: treeRowPadding(node.depth, true) }"
                @click.stop
              >
                <input
                  ref="nameInput"
                  v-model="editingName"
                  class="min-w-0 flex-1 rounded border border-ui-border-strong bg-ui-input px-1.5 py-1 text-[11px] text-slate-100"
                  @keyup.enter="finishRename"
                  @keyup.escape="cancelEdit"
                />
                <button
                  type="button"
                  class="text-sky-300"
                  aria-label="Confirm rename"
                  @click="finishRename"
                >
                  ✓
                </button>
              </div>
              <div
                v-else-if="
                  node.kind === 'pattern' &&
                  editingKind === 'pattern' &&
                  editingId === node.entry.id
                "
                class="flex items-center gap-1 px-1 py-0.5"
                :style="{ paddingLeft: treeRowPadding(node.depth, false) }"
                @click.stop
              >
                <input
                  ref="nameInput"
                  v-model="editingName"
                  class="min-w-0 flex-1 rounded border border-ui-border-strong bg-ui-input px-1.5 py-1 text-[11px] text-slate-100"
                  @keyup.enter="finishRename"
                  @keyup.escape="cancelEdit"
                />
                <button
                  type="button"
                  class="text-sky-300"
                  aria-label="Confirm rename"
                  @click="finishRename"
                >
                  ✓
                </button>
              </div>
              <div
                v-else-if="node.kind === 'folder'"
                class="group relative flex min-w-0 items-center rounded px-1 py-0.5 hover:bg-slate-900 max-sm:py-1.5"
                :style="{ paddingLeft: treeRowPadding(node.depth, true) }"
                @click.stop
              >
                <button
                  type="button"
                  class="flex min-w-0 flex-1 items-center gap-1.5 text-left text-[12px] text-ui-text-secondary"
                  :aria-expanded="expandedFolderIds.has(node.folder.id)"
                  :aria-label="`${expandedFolderIds.has(node.folder.id) ? 'Collapse' : 'Expand'} folder ${node.folder.name}`"
                  @click="toggleFolder(node.folder)"
                >
                  <span class="w-2 text-ui-text-muted" aria-hidden="true">{{
                    expandedFolderIds.has(node.folder.id) ? "⌄" : "›"
                  }}</span>
                  <span class="min-w-0 truncate">{{ node.folder.name }}</span>
                </button>
                <button
                  type="button"
                  class="rounded px-1 text-ui-text-muted hover:bg-slate-800 hover:text-ui-text sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                  aria-label="Folder actions"
                  @click.stop="openFolderMenu(node.folder, $event)"
                >
                  ⋯
                </button>
              </div>
              <div
                v-else-if="node.kind === 'pattern'"
                class="group relative flex min-w-0 items-center rounded px-1 py-0.5 max-sm:py-1.5"
                :class="
                  node.entry.id === registry.selectedPatternId.value
                    ? 'bg-ui-selected text-ui-selected-text hover:bg-ui-selected'
                    : 'hover:bg-slate-900'
                "
                :aria-current="
                  node.entry.id === registry.selectedPatternId.value ? 'true' : undefined
                "
                :style="{ paddingLeft: treeRowPadding(node.depth, false) }"
                :title="
                  isCompatible(node.entry) ? 'Open ' + node.entry.name : 'Incompatible pattern'
                "
                @click.stop
              >
                <button
                  type="button"
                  class="min-w-0 flex-1 truncate text-left text-[12px]"
                  :class="
                    isCompatible(node.entry)
                      ? node.entry.id === registry.selectedPatternId.value
                        ? 'text-ui-selected-text'
                        : 'text-ui-text-secondary'
                      : 'cursor-not-allowed text-ui-text-muted'
                  "
                  :disabled="!isCompatible(node.entry)"
                  @click="openEntry(node.entry)"
                >
                  {{ node.entry.name }}
                </button>
                <span
                  class="shrink-0 px-1 text-[10px] uppercase tracking-[0.12em] text-ui-text-muted"
                >
                  {{ patternKindLabel(node.entry.source.kind) }}
                </span>
                <button
                  type="button"
                  class="rounded px-1 text-ui-text-muted hover:bg-slate-800 hover:text-ui-text sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                  aria-label="Pattern actions"
                  @click.stop="openPatternMenu(node.entry, $event)"
                >
                  ⋯
                </button>
              </div>
            </template>
          </div>

          <p v-else class="px-1 py-3 text-[11px] text-ui-text-muted">
            {{ compatibleOnly ? "No compatible patterns." : "No patterns yet." }}
          </p>

          <div
            v-if="saveAsOpen"
            class="mt-2 flex items-center gap-1 border-t border-ui-border-subtle pt-2"
          >
            <input
              ref="nameInput"
              v-model="draftName"
              type="text"
              placeholder="Pattern name"
              class="min-w-0 flex-1 rounded border border-ui-border-strong bg-ui-input px-2 py-1.5 text-[11px] text-slate-100 placeholder:text-ui-text-muted"
              @keyup.enter="saveAs"
              @keyup.escape="saveAsOpen = false"
            />
            <button
              type="button"
              class="rounded bg-sky-400 px-2 py-1.5 text-[11px] font-medium text-slate-950"
              @click="saveAs"
            >
              Save
            </button>
          </div>

          <p v-if="feedback" class="px-1 pt-1 text-[10px] text-sky-300">{{ feedback }}</p>
        </div>
      </FloatingPanel>

      <div
        v-if="(activeMenu && activeMenu.item && !movePatternId) || movePatternId"
        ref="menuRoot"
        class="fixed z-[80] grid gap-0.5 rounded-lg border border-slate-700 bg-slate-900 p-1 text-[11px] shadow-2xl shadow-slate-950/80"
        :class="movePatternId ? 'max-h-56 w-44 overflow-y-auto' : 'w-36'"
        :style="{ left: `${menuPosition.left}px`, top: `${menuPosition.top}px` }"
        @click.stop
      >
        <template v-if="activeMenu && activeMenu.item && !movePatternId">
          <template v-if="activeMenu.kind === 'pattern'">
            <button
              type="button"
              class="rounded px-2 py-1.5 text-left text-slate-300 hover:bg-slate-800"
              @click="beginRename('pattern', activeMenu.item.id, activeMenu.item.name)"
            >
              Rename
            </button>
            <button
              type="button"
              class="rounded px-2 py-1.5 text-left text-slate-300 hover:bg-slate-800"
              @click="beginMove(activeMenu.item)"
            >
              Move to…
            </button>
            <button
              type="button"
              class="rounded px-2 py-1.5 text-left text-rose-300 hover:bg-rose-950/70"
              @click="deletePattern(activeMenu.item)"
            >
              Delete
            </button>
          </template>
          <template v-else>
            <button
              type="button"
              class="rounded px-2 py-1.5 text-left text-slate-300 hover:bg-slate-800"
              @click="beginRename('folder', activeMenu.item.id, activeMenu.item.name)"
            >
              Rename
            </button>
            <button
              type="button"
              class="rounded px-2 py-1.5 text-left text-slate-300 hover:bg-slate-800"
              @click="beginNewFolder(activeMenu.item.id)"
            >
              New subfolder
            </button>
            <button
              type="button"
              class="rounded px-2 py-1.5 text-left text-rose-300 hover:bg-rose-950/70"
              @click="deleteFolder(activeMenu.item)"
            >
              Delete
            </button>
          </template>
        </template>
        <template v-else-if="movePatternId">
          <p
            class="px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-ui-text-muted"
          >
            Move to
          </p>
          <button
            type="button"
            class="rounded px-2 py-1.5 text-left text-slate-300 hover:bg-slate-800"
            @click="moveTo(null)"
          >
            Top level
          </button>
          <button
            v-for="folder in moveFolders"
            :key="folder.id"
            type="button"
            class="truncate rounded px-2 py-1.5 text-left text-slate-300 hover:bg-slate-800"
            @click="moveTo(folder.id)"
          >
            {{ folder.name }}
          </button>
        </template>
      </div>
    </Teleport>
  </div>
</template>
