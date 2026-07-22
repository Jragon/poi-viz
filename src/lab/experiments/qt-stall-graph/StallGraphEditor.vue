<script setup lang="ts">
import { computed, ref, watch } from "vue";

import EmbeddedVisualizer from "@/lab/components/EmbeddedVisualizer.vue";
import type { Cardinal } from "@/lab/experiments/qt-stall-graph/cardinals";
import {
  compileStallPattern,
  type StallGraphDiagnostic
} from "@/lab/experiments/qt-stall-graph/compileStallGraph";
import type { StallPatternHand } from "@/lab/experiments/qt-stall-graph/stallPattern";
import {
  appendStallPatternBeat,
  deleteLastStallPatternBeat,
  rotateStallPatternCycleStart,
  setStallPatternNode,
  setStallPatternTrackPresent,
  shiftStallPatternTrack
} from "@/lab/experiments/qt-stall-graph/stallPatternTransforms";
import StallPatternGraph from "@/lab/experiments/qt-stall-graph/StallPatternGraph.vue";
import StallPatternGraphScroller from "@/lab/experiments/qt-stall-graph/StallPatternGraphScroller.vue";
import { useStallPatternUrlState } from "@/lab/experiments/qt-stall-graph/useStallPatternUrlState";
import PatternRegistryControls from "@/patterns/components/PatternRegistryControls.vue";
import { clonePatternSource } from "@/patterns/patternAdapters";
import { usePatternRegistry } from "@/patterns/usePatternRegistry";
import type { PatternEntry, PatternSource } from "@/patterns/types";
import { onBeforeRouteLeave, useRoute } from "vue-router";

const { draft, orientation, codec, codecError, reset } = useStallPatternUrlState();
const route = useRoute();
const registry = usePatternRegistry();
const loadedPatternId = ref<string | null>(null);
const savedBaseline = ref<string | null>(null);
const editingHand = ref<StallPatternHand>("left");
const copyStatus = ref("");

const compiled = computed(() => (draft.value ? compileStallPattern(draft.value) : null));
const sequence = computed(() => compiled.value?.sequence ?? null);
const diagnostics = computed(() => compiled.value?.diagnostics ?? []);
const canDeleteBeat = computed(() => (draft.value?.beatCount ?? 2) > 2);
const currentSource = computed<PatternSource | null>(() =>
  draft.value ? { kind: "stall-graph", draft: draft.value } : null
);
const isDirty = computed(
  () => draft.value !== null && JSON.stringify(draft.value) !== savedBaseline.value
);
const currentName = computed(
  () => registry.get(loadedPatternId.value ?? "")?.name ?? "Untitled Stall Graph"
);

function updateDraft(next: NonNullable<typeof draft.value>): void {
  draft.value = next;
  copyStatus.value = "";
}

function loadSelectedPattern(): void {
  if (route.query.p !== undefined) return;
  const selected = registry.selectedPattern.value;
  if (selected?.source.kind === "stall-graph") {
    const source = clonePatternSource(selected.source);
    if (source.kind !== "stall-graph") return;
    draft.value = source.draft;
    loadedPatternId.value = selected.id;
  } else {
    reset();
    loadedPatternId.value = null;
  }
  savedBaseline.value = draft.value ? JSON.stringify(draft.value) : null;
}

function openPattern(entry: PatternEntry): void {
  if (entry.source.kind !== "stall-graph") return;
  const source = clonePatternSource(entry.source);
  if (source.kind !== "stall-graph") return;
  draft.value = source.draft;
  loadedPatternId.value = entry.id;
  savedBaseline.value = JSON.stringify(draft.value);
}

function placeNode(payload: { readonly beatIndex: number; readonly cardinal: Cardinal }): void {
  if (!draft.value) return;
  const track = draft.value.tracks[editingHand.value];
  if (track === null) return;
  const nextCardinal = track[payload.beatIndex] === payload.cardinal ? null : payload.cardinal;
  updateDraft(setStallPatternNode(draft.value, editingHand.value, payload.beatIndex, nextCardinal));
}

function setEditingHand(hand: StallPatternHand): void {
  if (!draft.value) return;
  if (draft.value.tracks[hand] === null) {
    updateDraft(setStallPatternTrackPresent(draft.value, hand, true));
  }
  editingHand.value = hand;
}

function toggleTrack(hand: StallPatternHand): void {
  if (!draft.value) return;
  const present = draft.value.tracks[hand] !== null;
  if (present) {
    const otherHand = hand === "left" ? "right" : "left";
    if (draft.value.tracks[otherHand] === null) return;
    updateDraft(setStallPatternTrackPresent(draft.value, hand, false));
    if (editingHand.value === hand) editingHand.value = otherHand;
    return;
  }

  updateDraft(setStallPatternTrackPresent(draft.value, hand, true));
  editingHand.value = hand;
}

function shiftTrack(hand: StallPatternHand, delta: number): void {
  if (!draft.value) return;
  updateDraft(shiftStallPatternTrack(draft.value, hand, delta));
}

function rotateCycle(delta: number): void {
  if (!draft.value) return;
  updateDraft(rotateStallPatternCycleStart(draft.value, delta));
}

function appendBeat(): void {
  if (draft.value) updateDraft(appendStallPatternBeat(draft.value));
}

function deleteBeat(): void {
  if (draft.value) updateDraft(deleteLastStallPatternBeat(draft.value));
}

async function copyCodec(): Promise<void> {
  if (!codec.value) return;
  try {
    await navigator.clipboard.writeText(codec.value);
    copyStatus.value = "Copied";
  } catch {
    copyStatus.value = "Copy failed";
  }
}

function diagnosticText(diagnostic: StallGraphDiagnostic): string {
  const hand = diagnostic.hand ? ` ${diagnostic.hand}` : "";
  const beat = diagnostic.beatIndex !== undefined ? ` beat ${diagnostic.beatIndex + 1}` : "";
  const edge = diagnostic.from && diagnostic.to ? ` ${diagnostic.from}→${diagnostic.to}` : "";
  return `${diagnostic.code}${hand}${beat}${edge}`;
}

watch(registry.selectedPatternId, loadSelectedPattern, { immediate: true });

onBeforeRouteLeave(() => {
  if (!isDirty.value || typeof window === "undefined") return true;
  return window.confirm("Discard unsaved changes?");
});
</script>

<template>
  <div class="grid min-w-0 gap-4">
    <section class="min-w-0 overflow-hidden rounded-lg border border-ui-border bg-ui-surface">
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-ui-border-subtle px-4 py-3"
      >
        <div>
          <p class="text-xs font-medium uppercase tracking-[0.14em] text-ui-text-muted">
            Pattern editor
          </p>
          <h2 class="mt-1 text-sm font-semibold text-slate-200">
            {{ editingHand === "left" ? "Editing left hand" : "Editing right hand" }}
          </h2>
        </div>

        <div class="flex flex-wrap items-center gap-2 text-xs">
          <PatternRegistryControls
            editor-kind="stall-graph"
            :current-pattern-id="loadedPatternId"
            :current-source="currentSource"
            :current-name="currentName"
            :is-dirty="isDirty"
            @open="openPattern"
            @saved="
              (entry) => {
                loadedPatternId = entry.id;
                savedBaseline = draft ? JSON.stringify(draft) : null;
              }
            "
          />
          <button
            v-for="hand in ['left', 'right'] as const"
            :key="hand"
            type="button"
            class="rounded-md border px-2.5 py-1.5 font-semibold transition"
            :class="
              editingHand === hand
                ? hand === 'left'
                  ? 'border-cyan-400 bg-cyan-950/70 text-cyan-200'
                  : 'border-pink-400 bg-pink-950/70 text-pink-200'
                : 'border-ui-border-strong bg-ui-surface text-ui-text-secondary hover:border-ui-focus hover:bg-ui-surface-raised'
            "
            :aria-pressed="editingHand === hand"
            @click="setEditingHand(hand)"
          >
            Edit {{ hand === "left" ? "L" : "R" }}
          </button>
          <span class="mx-1 w-px bg-ui-border-subtle" aria-hidden="true" />
          <button
            type="button"
            class="rounded-md border px-2.5 py-1.5 transition"
            :class="
              orientation === 'horizontal'
                ? 'border-amber-400 bg-amber-950/60 text-amber-200'
                : 'border-ui-border-strong bg-ui-surface text-ui-text-secondary hover:border-ui-focus hover:bg-ui-surface-raised'
            "
            :aria-pressed="orientation === 'horizontal'"
            @click="orientation = 'horizontal'"
          >
            Horizontal
          </button>
          <button
            type="button"
            class="rounded-md border px-2.5 py-1.5 transition"
            :class="
              orientation === 'vertical'
                ? 'border-amber-400 bg-amber-950/60 text-amber-200'
                : 'border-ui-border-strong bg-ui-surface text-ui-text-secondary hover:border-ui-focus hover:bg-ui-surface-raised'
            "
            :aria-pressed="orientation === 'vertical'"
            @click="orientation = 'vertical'"
          >
            Vertical
          </button>
        </div>
      </div>

      <div v-if="codecError" class="m-4 rounded-md border border-red-900/60 bg-red-950/25 p-4">
        <p class="font-mono text-xs text-red-300">
          {{ codecError.code }} — {{ codecError.message }}
        </p>
        <button
          type="button"
          class="mt-3 rounded-md border border-red-800 px-3 py-1.5 text-xs text-red-200 transition hover:border-red-500"
          @click="reset"
        >
          Start a blank pattern
        </button>
      </div>

      <template v-else-if="draft">
        <div class="min-w-0 p-3">
          <StallPatternGraphScroller
            v-if="orientation === 'horizontal'"
            :draft="draft"
            density="editor"
            :editing-hand="editingHand"
            aria-label="Editable horizontal quarter-time stall pattern"
            @place-node="placeNode"
          />
          <div v-else class="max-h-[38rem] overflow-auto rounded-md bg-ui-stage">
            <StallPatternGraph
              :draft="draft"
              orientation="vertical"
              density="editor"
              :editing-hand="editingHand"
              :fit-to-container="false"
              aria-label="Editable vertical quarter-time stall pattern"
              @place-node="placeNode"
            />
          </div>
        </div>

        <div
          class="grid gap-3 border-t border-ui-border-subtle px-3 py-3 text-xs md:grid-cols-2 xl:grid-cols-4"
        >
          <div class="rounded-md border border-ui-border-subtle bg-ui-input p-2.5">
            <p class="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ui-text-muted">
              Beats
            </p>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="control-button"
                aria-label="Delete last beat"
                :disabled="!canDeleteBeat"
                @click="deleteBeat"
              >
                −
              </button>
              <span class="min-w-8 text-center font-mono text-slate-300">{{
                draft.beatCount
              }}</span>
              <button
                type="button"
                class="control-button"
                aria-label="Append beat"
                @click="appendBeat"
              >
                +
              </button>
            </div>
          </div>

          <div class="rounded-md border border-ui-border-subtle bg-ui-input p-2.5">
            <p class="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ui-text-muted">
              Track presence
            </p>
            <div class="flex gap-2">
              <button
                v-for="hand in ['left', 'right'] as const"
                :key="hand"
                type="button"
                class="rounded-md border px-2 py-1.5 transition"
                :class="
                  draft.tracks[hand] !== null
                    ? hand === 'left'
                      ? 'border-cyan-700 text-cyan-300'
                      : 'border-pink-700 text-pink-300'
                    : 'border-ui-border-strong bg-ui-surface text-ui-text-muted hover:border-ui-focus hover:bg-ui-surface-raised'
                "
                @click="toggleTrack(hand)"
              >
                {{ draft.tracks[hand] !== null ? "Remove" : "Add" }}
                {{ hand === "left" ? "L" : "R" }}
              </button>
            </div>
          </div>

          <div class="rounded-md border border-ui-border-subtle bg-ui-input p-2.5">
            <p class="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ui-text-muted">
              Hand offset
            </p>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="hand in ['left', 'right'] as const"
                :key="hand"
                class="inline-flex items-center gap-1"
              >
                <span :class="hand === 'left' ? 'text-cyan-300' : 'text-pink-300'">{{
                  hand === "left" ? "L" : "R"
                }}</span>
                <button
                  type="button"
                  class="control-button"
                  :disabled="draft.tracks[hand] === null"
                  :aria-label="`Move ${hand} hand one beat earlier`"
                  @click="shiftTrack(hand, -1)"
                >
                  ←
                </button>
                <button
                  type="button"
                  class="control-button"
                  :disabled="draft.tracks[hand] === null"
                  :aria-label="`Move ${hand} hand one beat later`"
                  @click="shiftTrack(hand, 1)"
                >
                  →
                </button>
              </span>
            </div>
          </div>

          <div class="rounded-md border border-ui-border-subtle bg-ui-input p-2.5">
            <p class="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ui-text-muted">
              Cycle start
            </p>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="control-button"
                aria-label="Move cycle start one beat earlier"
                @click="rotateCycle(-1)"
              >
                ←
              </button>
              <button
                type="button"
                class="control-button"
                aria-label="Move cycle start one beat later"
                @click="rotateCycle(1)"
              >
                →
              </button>
            </div>
          </div>
        </div>

        <div
          class="flex min-w-0 flex-wrap items-center gap-2 border-t border-ui-border-subtle px-3 py-2.5"
        >
          <code
            class="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded bg-slate-950 px-2.5 py-1.5 text-[11px] text-slate-400"
            >{{ codec }}</code
          >
          <button
            type="button"
            class="rounded-md border border-ui-border-strong bg-ui-surface px-2.5 py-1.5 text-xs text-ui-text-secondary transition hover:border-ui-focus hover:bg-ui-surface-raised hover:text-ui-text"
            @click="copyCodec"
          >
            Copy codec
          </button>
          <span class="min-w-14 text-xs text-ui-text-muted" role="status">{{ copyStatus }}</span>
        </div>
      </template>
    </section>

    <ul
      v-if="diagnostics.length > 0"
      class="rounded border border-red-900/40 bg-red-950/20 px-3 py-2 text-xs text-red-300"
    >
      <li v-for="(diagnostic, index) in diagnostics" :key="index" class="font-mono">
        {{ diagnosticText(diagnostic) }}
      </li>
    </ul>

    <EmbeddedVisualizer
      v-if="sequence"
      :sequence="sequence"
      title="Stall pattern preview"
      size="compact"
      :show-body-rig="true"
      projection-mode="auto"
    />
    <div
      v-else-if="draft"
      class="rounded border border-ui-border-subtle bg-slate-950/30 px-4 py-8 text-center text-xs text-ui-text-muted"
    >
      Fill one present hand with compatible quarter-turn stalls to preview it.
    </div>
  </div>
</template>

<style scoped>
.control-button {
  display: inline-grid;
  height: 1.75rem;
  width: 1.75rem;
  place-items: center;
  border-radius: 0.375rem;
  border: 1px solid rgb(51 65 85);
  color: rgb(226 232 240);
  transition-property: color, background-color, border-color;
}

.control-button:hover:not(:disabled) {
  border-color: rgb(100 116 139);
  background: rgb(30 41 59);
}

.control-button:disabled {
  cursor: not-allowed;
  border-color: rgb(30 41 59);
  color: rgb(71 85 105);
}
</style>
