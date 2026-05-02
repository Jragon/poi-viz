<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";

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
import { createTransport } from "@/composables/useTransport";
import { createDefaultOverlaySettings } from "@/visualizer/overlaySettings";
import { useVisualizerCore } from "@/visualizer/useVisualizerCore";

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
const exportFeedbackMessage = ref<string | null>(null);
const metaDrafts = reactive<{ name: string | null; description: string | null }>({
  name: null,
  description: null
});
const globalOmegaUnit = ref<AuthoredOmegaUnit>("circles-per-unit");
let exportFeedbackTimeout: number | null = null;

const transport = createTransport();
const {
  rigOrder,
  cartesianPoses,
  trails,
  sceneWorldRadius,
  errorMessage: previewSessionErrorMessage
} = useVisualizerCore(() => lastValidCompiled.value.sequence, {
  transport,
  autoplay: true,
  resumeOnSequenceChange: true
});

const previewOverlaySettings = computed(() => createDefaultOverlaySettings(rigOrder.value));
const previewErrorMessage = computed(
  () => compileErrorMessage.value ?? previewSessionErrorMessage.value ?? null
);

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
  updateSegmentOmega,
  addSegmentRadiusProfileKey,
  updateSegmentRadiusProfileKey,
  deleteSegmentRadiusProfileKey,
  updateSegmentPlane
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

function setExportFeedbackMessage(message: string | null) {
  exportFeedbackMessage.value = message;

  if (exportFeedbackTimeout !== null) {
    window.clearTimeout(exportFeedbackTimeout);
    exportFeedbackTimeout = null;
  }

  if (message) {
    exportFeedbackTimeout = window.setTimeout(() => {
      exportFeedbackMessage.value = null;
      exportFeedbackTimeout = null;
    }, 2400);
  }
}

function copyTextWithExecCommand(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}

async function exportSelectedDocumentJson() {
  if (!selectedEntry.value) {
    return;
  }

  const exportedJson = JSON.stringify(selectedEntry.value, null, 2);

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(exportedJson);
    } else if (!copyTextWithExecCommand(exportedJson)) {
      throw new Error("Copy command failed");
    }

    setExportFeedbackMessage("Copied selected document JSON.");
  } catch {
    setExportFeedbackMessage("Could not copy JSON to clipboard.");
  }
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
  if (exportFeedbackTimeout !== null) {
    window.clearTimeout(exportFeedbackTimeout);
  }

  transport.dispose();
});
</script>

<template>
  <main class="mx-auto flex min-h-screen w-full max-w-[96rem] flex-col gap-6 px-6 py-8">
    <section class="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
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
              rows="1"
              class="min-h-12 w-full min-w-0 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400"
              :value="metaDrafts.description ?? selectedDocument?.description ?? ''"
              @input="metaDrafts.description = ($event.target as HTMLTextAreaElement).value"
              @blur="commitMetaDescription"
            />
          </label>
        </section>

        <section class="grid items-start gap-5 2xl:grid-cols-2">
          <article
            v-for="view in trackViews"
            :key="view.trackId"
            class="grid min-w-0 content-start gap-4 rounded-3xl border border-slate-800 bg-slate-900/55 p-4"
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
                @update:duration="
                  (value) => updateSegmentDuration(view.trackId, segmentIndex, value)
                "
                @update:plane="(value) => updateSegmentPlane(view.trackId, segmentIndex, value)"
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
                  (payload) =>
                    updateSegmentOmega(view.trackId, segmentIndex, payload.node, payload.value)
                "
                @add:radius-profile-key="
                  (payload) =>
                    addSegmentRadiusProfileKey(
                      view.trackId,
                      segmentIndex,
                      payload.node,
                      payload.key
                    )
                "
                @update:radius-profile-key="
                  (payload) =>
                    updateSegmentRadiusProfileKey(
                      view.trackId,
                      segmentIndex,
                      payload.node,
                      payload.keyIndex,
                      payload.field,
                      payload.value
                    )
                "
                @delete:radius-profile-key="
                  (payload) =>
                    deleteSegmentRadiusProfileKey(
                      view.trackId,
                      segmentIndex,
                      payload.node,
                      payload.keyIndex
                    )
                "
              />
            </template>
          </article>
        </section>
      </div>

      <aside class="grid min-w-0 gap-4 self-start xl:sticky xl:top-6">
        <section
          class="grid gap-2 rounded-3xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-300"
        >
          <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Document</p>
          <select
            class="w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none transition focus:border-sky-400"
            :value="selectedEntry?.id ?? ''"
            @change="onDocumentSelectionChange"
          >
            <option v-for="entry in library.documents.value" :key="entry.id" :value="entry.id">
              {{ entry.document.name }}
            </option>
          </select>
          <div class="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              class="rounded-lg bg-emerald-400 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-300"
              @click="library.createDocument()"
            >
              New
            </button>
            <button
              type="button"
              class="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500 disabled:opacity-50"
              :disabled="!selectedEntry"
              @click="selectedEntry && library.duplicateDocument(selectedEntry.id)"
            >
              Duplicate
            </button>
            <button
              type="button"
              class="rounded-lg border border-rose-800 px-3 py-2 text-sm text-rose-200 transition hover:border-rose-600 disabled:opacity-50"
              :disabled="library.documents.value.length <= 1 || !selectedEntry"
              @click="selectedEntry && library.deleteDocument(selectedEntry.id)"
            >
              Delete
            </button>
            <button
              type="button"
              class="rounded-lg border border-sky-700 px-3 py-2 text-sm text-sky-200 transition hover:border-sky-500 disabled:opacity-50"
              :disabled="!selectedEntry"
              @click="exportSelectedDocumentJson"
            >
              Export JSON
            </button>
          </div>
          <p v-if="exportFeedbackMessage" class="pt-1 text-xs text-sky-300">
            {{ exportFeedbackMessage }}
          </p>
        </section>

        <AuthoringPreviewPanel
          :error-message="previewErrorMessage"
          :cartesian-poses="cartesianPoses"
          :trails="trails"
          :rig-order="rigOrder"
          :scene-world-radius="sceneWorldRadius"
          :display-scale="1"
          :overlay-settings="previewOverlaySettings"
          :track-totals="trackTotals"
        />
      </aside>
    </section>
  </main>
</template>
