<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { compileAuthoredDocument } from "@/authoring/compile";
import type { AuthoredDocumentEntry } from "@/authoring/types";
import type { MultiRigSequence } from "@/engine/types";
import { usePatternRegistry } from "@/patterns/usePatternRegistry";
import PoiCanvasViewport from "@/visualizer/PoiCanvasViewport.vue";
import {
  createVisualizerWorkspace,
  provideVisualizerWorkspace
} from "@/visualizer/visualizerWorkspace";

function compileAuthoredSequence(entry: AuthoredDocumentEntry): MultiRigSequence | null {
  const result = compileAuthoredDocument(entry.document);

  return result.ok ? result.sequence : null;
}

const registry = usePatternRegistry();
const authoredDocuments = computed<AuthoredDocumentEntry[]>(() =>
  registry.entries.value.flatMap((entry) =>
    entry.source.kind === "authoring" ? [{ id: entry.id, document: entry.source.document }] : []
  )
);
const selectedSequenceId = ref(
  registry.selectedPattern.value?.source.kind === "authoring"
    ? registry.selectedPattern.value.id
    : (authoredDocuments.value[0]?.id ?? null)
);
const selectedDocument = computed(() => {
  if (!selectedSequenceId.value) {
    return null;
  }

  return authoredDocuments.value.find((entry) => entry.id === selectedSequenceId.value) ?? null;
});
const selectedDocumentName = computed(() => selectedDocument.value?.document.name ?? "No sequence");
const fallbackDocument = computed(() => authoredDocuments.value[0] ?? null);
const selectedSequence = computed<MultiRigSequence>(() => {
  const selected = selectedDocument.value;
  if (selected) {
    const sequence = compileAuthoredSequence(selected);
    if (sequence) {
      return sequence;
    }
  }

  const fallback = fallbackDocument.value;
  if (fallback) {
    const sequence = compileAuthoredSequence(fallback);
    if (sequence) {
      return sequence;
    }
  }

  return { rigs: [] };
});

const workspace = provideVisualizerWorkspace(
  createVisualizerWorkspace(selectedSequence, {
    autoplay: true,
    resumeOnSequenceChange: true,
    transportOptions: {
      initialSpeed: 0.35
    }
  })
);
const { core, transport, display } = workspace;

display.setOverlayVisibility("showBodyRig", true);
display.setOverlayVisibility("showHandTrails", true);
display.setOverlayVisibility("showHeadTrails", true);
display.setOverlayVisibility("showChainLines", true);
display.setOverlayVisibility("showNodeMarkers", true);

const durationLabel = computed(() => transport.duration.value.toFixed(2));
const timeLabel = computed(() => transport.currentTime.value.toFixed(2));
const speedLabel = computed(() => `${transport.speed.value.toFixed(2)}x`);
const statusText = computed(() => {
  if (core.errorMessage.value) {
    return core.errorMessage.value;
  }

  if (!core.worldPoses.value.left || !core.worldPoses.value.right) {
    return `${selectedDocumentName.value} / body solve waiting for left/right tracks`;
  }

  return `${selectedDocumentName.value} / main visualizer body overlay / shared r 1.00`;
});

function setSpeed(nextSpeed: number) {
  transport.setSpeed(nextSpeed);
}

function resetPlayback() {
  transport.reset();
}

watch(selectedSequenceId, () => {
  if (selectedSequenceId.value) registry.select(selectedSequenceId.value);
  transport.reset();
});

watch(
  () => authoredDocuments.value,
  (documents) => {
    if (
      selectedSequenceId.value &&
      documents.some((entry) => entry.id === selectedSequenceId.value)
    ) {
      return;
    }

    selectedSequenceId.value = documents[0]?.id ?? null;
  },
  { flush: "sync" }
);
</script>

<template>
  <div class="lab-live-cell mx-auto grid max-w-5xl! gap-3">
    <section
      class="grid gap-3 rounded-lg border border-ui-border-subtle bg-slate-950/65 p-3 shadow-[0_24px_120px_rgba(2,6,23,0.45)] md:p-4"
    >
      <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div class="grid gap-1">
          <p class="text-[0.68rem] font-medium uppercase tracking-[0.16em] text-teal-300">
            Sequence-driven body overlay
          </p>
          <p class="max-w-2xl text-sm leading-6 text-slate-300">
            Authored wall-plane sequences drive the poi through the main visualizer body overlay.
            Sequence radius 1 maps to the largest circle where both hands can occupy the same point.
          </p>
        </div>
        <div class="grid gap-2 md:min-w-80">
          <label
            class="grid gap-1 text-xs font-medium uppercase tracking-[0.16em] text-ui-text-muted"
          >
            Sequence
            <select
              v-model="selectedSequenceId"
              class="rounded-md border border-ui-border-strong bg-ui-input px-3 py-2 text-sm font-medium normal-case tracking-normal text-ui-text transition hover:border-ui-focus focus:border-teal-300"
            >
              <option v-if="authoredDocuments.length === 0" value="" disabled>
                No authored sequences
              </option>
              <option v-for="entry in authoredDocuments" :key="entry.id" :value="entry.id">
                {{ entry.document.name }}
              </option>
            </select>
          </label>
          <p
            class="rounded-md border border-ui-border-subtle bg-slate-900/80 px-3 py-1 text-xs tracking-[0.12em] text-slate-400 uppercase"
          >
            {{ statusText }}
          </p>
          <div class="flex flex-wrap items-center gap-2 text-sm">
            <button
              type="button"
              class="rounded-md border border-teal-400/45 bg-teal-500/10 px-4 py-2 font-medium text-teal-100 transition hover:border-teal-300 hover:bg-teal-500/20"
              @click="transport.toggle()"
            >
              {{ transport.isPlaying.value ? "Pause" : "Play" }}
            </button>
            <button
              type="button"
              class="rounded-md border border-ui-border-strong bg-ui-surface px-4 py-2 font-medium text-ui-text-secondary transition hover:border-ui-focus hover:bg-ui-surface-raised hover:text-ui-text"
              @click="resetPlayback"
            >
              Reset
            </button>
            <button
              v-for="speed in [0.25, 0.5, 1]"
              :key="speed"
              type="button"
              class="rounded-md border px-3 py-2 font-medium transition"
              :class="
                transport.speed.value === speed
                  ? 'border-teal-300 bg-teal-300 text-slate-950'
                  : 'border-ui-border-strong bg-ui-surface text-ui-text-secondary hover:border-ui-focus hover:bg-ui-surface-raised hover:text-ui-text'
              "
              @click="setSpeed(speed)"
            >
              {{ speed }}x
            </button>
          </div>
          <p class="text-xs uppercase tracking-[0.16em] text-ui-text-muted">
            t {{ timeLabel }} / {{ durationLabel }} / {{ speedLabel }}
          </p>
        </div>
      </div>

      <PoiCanvasViewport
        class="min-h-112! rounded-lg md:min-h-136!"
        :projection-drag-enabled="false"
      />

      <p class="text-sm leading-6 text-slate-400">
        This demo now exercises the main visualizer body overlay path instead of a custom POC
        canvas.
      </p>
    </section>
  </div>
</template>
