<script setup lang="ts">
import { computed, onBeforeUnmount, provide, reactive, ref, watch } from "vue";

import { findActiveSegmentIndex } from "@/authoring/activeSegment";
import { compileAuthoredDocument } from "@/authoring/compile";
import AuthoringPreviewPanel from "@/authoring/components/AuthoringPreviewPanel.vue";
import AuthoringSegmentCard from "@/authoring/components/AuthoringSegmentCard.vue";
import type {
  AuthoredDocumentEntry,
  AuthoredOmegaUnit,
  AuthoredSequenceDocument,
  AuthoredTrackId
} from "@/authoring/types";
import { useAuthoringEditor, type SelectedSegment } from "@/authoring/useAuthoringEditor";
import { useAuthoringLibrary } from "@/authoring/useAuthoringLibrary";
import { createTransport, transportKey } from "@/composables/useTransport";
import { useVisualizerSession } from "@/visualizer/useVisualizerSession";

const TRACK_IDS: readonly AuthoredTrackId[] = ["left", "right"];

const library = useAuthoringLibrary();
const selectedEntry = computed<AuthoredDocumentEntry | null>(() => library.selectedDocument.value);
const selectedDocument = computed<AuthoredSequenceDocument | null>(
  () => selectedEntry.value?.document ?? null
);

const initialCompiled = (() => {
  const entry = selectedEntry.value;
  if (!entry) {
    throw new Error("Authoring page requires at least one seeded document");
  }

  const result = compileAuthoredDocument(entry.document);
  if (!result.ok) {
    throw new Error(`Seeded authored document is invalid: ${result.errors[0]?.code ?? "UNKNOWN"}`);
  }

  return result;
})();

const lastValidCompiled = ref(initialCompiled);
const compileErrorMessage = ref<string | null>(null);
const selectedSegment = ref<SelectedSegment>(null);
const metaDrafts = reactive<{ name: string | null; description: string | null }>({
  name: null,
  description: null
});
const globalOmegaUnit = ref<AuthoredOmegaUnit>("circles-per-unit");

const transport = createTransport();
provide(transportKey, transport);

const preview = useVisualizerSession(() => lastValidCompiled.value.sequence, transport, {
  autoplay: true,
  resumeOnSequenceChange: true
});

const rigOrder = computed(() => lastValidCompiled.value.sequence.rigs.map((rig) => rig.rigId));
const cartesianPoses = computed(() =>
  preview.currentFrame.value?.ok ? preview.currentFrame.value.cartesianPoses : {}
);
const trails = computed(() => preview.currentTrails.value);
const previewErrorMessage = computed(
  () => compileErrorMessage.value ?? preview.errorMessage.value ?? null
);
const sceneWorldRadius = computed(() => {
  const prepared = preview.playback.prepared.value;
  if (!prepared) {
    return 2;
  }

  return prepared.rigs.reduce((maxRadius, rig) => {
    const rigMaxRadius = rig.prepared.placements.reduce((maxPlacementRadius, placement) => {
      const chainRadius =
        placement.segment.hand.startPose.radius + placement.segment.head.startPose.radius;
      return Math.max(maxPlacementRadius, chainRadius);
    }, 0);

    return Math.max(maxRadius, rigMaxRadius);
  }, 2);
});

const trackViews = computed(() =>
  TRACK_IDS.map((trackId) => {
    const boundaries = lastValidCompiled.value.boundariesByTrack[trackId] ?? [];
    return {
      trackId,
      track: selectedDocument.value?.tracks[trackId],
      boundaries,
      totalDuration: boundaries.at(-1)?.endUnit ?? 0,
      activeSegmentIndex: findActiveSegmentIndex(boundaries, transport.currentTime.value)
    };
  })
);

const trackTotals = computed(() =>
  trackViews.value.map((view) => ({ trackId: view.trackId, totalDuration: view.totalDuration }))
);

const selectedDocumentId = computed(() => selectedEntry.value?.id ?? null);

const presentTrackCount = computed(() => trackViews.value.filter((view) => view.track).length);

const editor = useAuthoringEditor({
  selectedEntry,
  lastValidCompiled,
  selectedSegment,
  compileErrorMessage,
  persist: (id, document) => library.updateDocument(id, document)
});

const {
  addSegment,
  duplicateSegment,
  deleteSegment,
  updateSegmentDuration,
  updateSegmentStartPose,
  updateSegmentOmega
} = editor;

function formatNumber(value: number, digits = 2): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "--";
}

function selectSegment(trackId: AuthoredTrackId, segmentIndex: number) {
  selectedSegment.value = { trackId, segmentIndex };
}

function jumpToSegmentStart(trackId: AuthoredTrackId, segmentIndex: number) {
  const boundary = lastValidCompiled.value.boundariesByTrack[trackId]?.[segmentIndex];
  if (!boundary) {
    return;
  }

  selectedSegment.value = { trackId, segmentIndex };
  transport.pause();
  transport.setCurrentTime(boundary.startUnit);
}

function commitMetaName() {
  if (metaDrafts.name === null) return;
  const next = metaDrafts.name;
  metaDrafts.name = null;
  editor.updateDocumentName(next);
}

function commitMetaDescription() {
  if (metaDrafts.description === null) return;
  const next = metaDrafts.description;
  metaDrafts.description = null;
  editor.updateDocumentDescription(next);
}

function onDocumentSelectionChange(event: Event) {
  const id = (event.target as HTMLSelectElement).value || null;
  library.selectDocument(id);
}

function isSelected(trackId: AuthoredTrackId, segmentIndex: number): boolean {
  return (
    selectedSegment.value?.trackId === trackId &&
    selectedSegment.value?.segmentIndex === segmentIndex
  );
}

function canDeleteSegment(_trackId: AuthoredTrackId, totalSegmentsInTrack: number): boolean {
  if (totalSegmentsInTrack > 1) return true;
  return presentTrackCount.value > 1;
}

watch(selectedDocumentId, (nextId, previousId) => {
  if (!nextId || nextId === previousId) {
    return;
  }

  const entry = selectedEntry.value;
  if (!entry) {
    return;
  }

  const nextCompiled = compileAuthoredDocument(entry.document);
  if (!nextCompiled.ok) {
    compileErrorMessage.value = nextCompiled.errors.map((error) => error.code).join(", ");
    return;
  }

  metaDrafts.name = null;
  metaDrafts.description = null;
  selectedSegment.value = null;
  compileErrorMessage.value = null;
  lastValidCompiled.value = nextCompiled;
});

onBeforeUnmount(() => {
  preview.dispose();
  transport.dispose();
});
</script>

<template>
  <main class="mx-auto flex min-h-screen w-full max-w-360 flex-col gap-6 px-6 py-8">
    <header
      class="grid gap-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
    >
      <div>
        <p class="text-xs uppercase tracking-[0.22em] text-slate-500">Sequence Authoring</p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-100">
          Continuity-first editor with live preview
        </h1>
        <p class="mt-3 max-w-3xl text-sm text-slate-400">
          Edit authored tracks on blur, keep boundaries legible, and preview exactly with the same
          looping rules as the main visualizer.
        </p>
      </div>

      <div
        class="grid gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300"
      >
        <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Document</p>
        <select
          class="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
          :value="selectedEntry?.id ?? ''"
          @change="onDocumentSelectionChange"
        >
          <option v-for="entry in library.documents.value" :key="entry.id" :value="entry.id">
            {{ entry.document.name }}
          </option>
        </select>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-xl bg-emerald-400 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-300"
            @click="library.createDocument()"
          >
            New
          </button>
          <button
            type="button"
            class="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500"
            :disabled="!selectedEntry"
            @click="selectedEntry && library.duplicateDocument(selectedEntry.id)"
          >
            Duplicate
          </button>
          <button
            type="button"
            class="rounded-xl border border-rose-800 px-3 py-2 text-sm text-rose-200 transition hover:border-rose-600 disabled:opacity-50"
            :disabled="library.documents.value.length <= 1 || !selectedEntry"
            @click="selectedEntry && library.deleteDocument(selectedEntry.id)"
          >
            Delete
          </button>
        </div>
      </div>
    </header>

    <section class="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <div class="grid min-w-0 gap-6">
        <section
          class="grid gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
        >
          <label class="grid min-w-0 gap-2 text-sm text-slate-300">
            <span class="text-xs uppercase tracking-[0.2em] text-slate-500">Name</span>
            <input
              type="text"
              class="w-full min-w-0 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400"
              :value="metaDrafts.name ?? selectedDocument?.name ?? ''"
              @input="metaDrafts.name = ($event.target as HTMLInputElement).value"
              @blur="commitMetaName"
            />
          </label>

          <label class="grid min-w-0 gap-2 text-sm text-slate-300">
            <span class="text-xs uppercase tracking-[0.2em] text-slate-500">Description</span>
            <textarea
              rows="3"
              class="w-full min-w-0 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400"
              :value="metaDrafts.description ?? selectedDocument?.description ?? ''"
              @input="metaDrafts.description = ($event.target as HTMLTextAreaElement).value"
              @blur="commitMetaDescription"
            />
          </label>

          <label class="grid min-w-0 gap-2 text-sm text-slate-300 lg:col-span-2">
            <span class="text-xs uppercase tracking-[0.2em] text-slate-500">Omega Unit</span>
            <select
              class="w-full min-w-0 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400"
              :value="globalOmegaUnit"
              @change="
                globalOmegaUnit = ($event.target as HTMLSelectElement).value as AuthoredOmegaUnit
              "
            >
              <option value="circles-per-unit">circles / unit</option>
              <option value="radians-per-unit">rad / unit</option>
            </select>
          </label>
        </section>

        <section class="grid gap-5 2xl:grid-cols-2">
          <article
            v-for="view in trackViews"
            :key="view.trackId"
            class="grid min-w-0 gap-4 rounded-3xl border border-slate-800 bg-slate-900/55 p-4"
          >
            <header class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-[0.22em] text-slate-500">
                  {{ view.trackId }} track
                </p>
                <p class="mt-1 text-sm text-slate-400">
                  Total {{ formatNumber(view.totalDuration, 2) }} units
                </p>
              </div>
              <button
                type="button"
                class="rounded-xl bg-sky-400 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-300"
                @click="addSegment(view.trackId)"
              >
                {{ view.track ? "Add Segment" : "Add Track" }}
              </button>
            </header>

            <div
              v-if="!view.track"
              class="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-sm text-slate-400"
            >
              This side is absent from the authored document.
            </div>

            <template v-else>
              <AuthoringSegmentCard
                v-for="(segment, segmentIndex) in view.track.segments"
                :key="`${view.trackId}-${segmentIndex}`"
                :segment="segment"
                :boundary="view.boundaries[segmentIndex]"
                :segment-index="segmentIndex"
                :omega-unit="globalOmegaUnit"
                :is-active="view.activeSegmentIndex === segmentIndex"
                :is-selected="isSelected(view.trackId, segmentIndex)"
                :can-delete="canDeleteSegment(view.trackId, view.track.segments.length)"
                :show-boundary-row="segmentIndex > 0"
                @select="selectSegment(view.trackId, segmentIndex)"
                @duplicate="duplicateSegment(view.trackId, segmentIndex)"
                @delete="deleteSegment(view.trackId, segmentIndex)"
                @jump-to-boundary="jumpToSegmentStart(view.trackId, segmentIndex)"
                @jump-to-start="jumpToSegmentStart(view.trackId, segmentIndex)"
                @update:duration="(value) => updateSegmentDuration(view.trackId, segmentIndex, value)"
                @update:start-pose="
                  (payload) =>
                    updateSegmentStartPose(
                      view.trackId,
                      segmentIndex,
                      payload.node,
                      payload.field,
                      payload.value
                    )
                "
                @update:omega="
                  (payload) => updateSegmentOmega(view.trackId, segmentIndex, payload.node, payload.value)
                "
              />
            </template>
          </article>
        </section>
      </div>

      <AuthoringPreviewPanel
        :error-message="previewErrorMessage"
        :cartesian-poses="cartesianPoses"
        :trails="trails"
        :rig-order="rigOrder"
        :scene-world-radius="sceneWorldRadius"
        :track-totals="trackTotals"
      />
    </section>
  </main>
</template>
