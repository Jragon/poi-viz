<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { onBeforeRouteLeave } from "vue-router";

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
import PatternRegistryControls from "@/patterns/components/PatternRegistryControls.vue";
import { clonePatternSource } from "@/patterns/patternAdapters";
import { createDefaultAuthoringDocument } from "@/patterns/patternDefaults";
import { usePatternRegistry } from "@/patterns/usePatternRegistry";
import type { PatternSource } from "@/patterns/types";
import {
  createVisualizerWorkspace,
  provideVisualizerWorkspace
} from "@/visualizer/visualizerWorkspace";

const TRACK_IDS: readonly AuthoredTrackId[] = ["left", "right"];

const registry = usePatternRegistry();
const workingPatternId = ref<string | null>(null);
const workingDocument = ref<AuthoredSequenceDocument>(createDefaultAuthoringDocument());
const savedBaseline = ref(JSON.stringify(workingDocument.value));

const selectedEntry = computed<AuthoredDocumentEntry>(() => ({
  id: workingPatternId.value ?? "__unsaved-authoring__",
  document: workingDocument.value
}));
const selectedDocument = computed<AuthoredSequenceDocument>(() => workingDocument.value);
const currentPatternSource = computed<PatternSource>(() => ({
  kind: "authoring",
  document: workingDocument.value
}));
const isDirty = computed(() => JSON.stringify(workingDocument.value) !== savedBaseline.value);

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

const previewWorkspace = provideVisualizerWorkspace(
  createVisualizerWorkspace(() => lastValidCompiled.value.sequence, {
    autoplay: true,
    resumeOnSequenceChange: true
  })
);
const { transport } = previewWorkspace;
const { errorMessage: previewSessionErrorMessage } = previewWorkspace.core;

previewWorkspace.display.setDisplayScale(1);

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

const presentTrackCount = computed(() => trackViews.value.filter((view) => view.track).length);

const editor = useAuthoringEditor({
  selectedEntry,
  lastValidCompiled,
  selectedSegment,
  compileErrorMessage,
  persist: (_id, document) => {
    workingDocument.value = document;
  }
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
  updateSegmentPlane,
  updateSegmentPlaneSide
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

function loadSelectedPattern() {
  const selected = registry.selectedPattern.value;
  const source =
    selected?.source.kind === "authoring"
      ? clonePatternSource(selected.source)
      : { kind: "authoring" as const, document: createDefaultAuthoringDocument() };
  if (source.kind !== "authoring") return;

  workingPatternId.value = selected?.source.kind === "authoring" ? selected.id : null;
  workingDocument.value = source.document;
  savedBaseline.value = JSON.stringify(workingDocument.value);
  const nextCompiled = compileAuthoredDocument(workingDocument.value);
  if (!nextCompiled.ok) {
    compileErrorMessage.value = nextCompiled.errors.map((error) => error.code).join(", ");
    return;
  }

  metaDrafts.name = null;
  metaDrafts.description = null;
  selectedSegment.value = null;
  compileErrorMessage.value = null;
  lastValidCompiled.value = nextCompiled;
}

watch(registry.selectedPatternId, loadSelectedPattern, { immediate: true });

onBeforeRouteLeave(() => {
  if (!isDirty.value || typeof window === "undefined") return true;
  return window.confirm("Discard unsaved changes?");
});
</script>

<template>
  <main class="mx-auto flex min-h-screen w-full max-w-[96rem] flex-col gap-6 px-6 py-8">
    <section class="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
      <div class="grid min-w-0 gap-6">
        <section
          class="grid gap-4 rounded-3xl border border-ui-border p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
        >
          <label class="grid min-w-0 gap-2 text-sm text-ui-text-secondary">
            <span class="text-xs font-medium uppercase tracking-[0.14em] text-ui-text-muted"
              >Name</span
            >
            <input
              type="text"
              class="w-full min-w-0 rounded-2xl border border-ui-border-strong bg-ui-input px-4 py-3 text-ui-text transition focus:border-sky-400"
              :value="metaDrafts.name ?? selectedDocument?.name ?? ''"
              @input="metaDrafts.name = ($event.target as HTMLInputElement).value"
              @blur="commitMetaName"
            />
          </label>

          <label class="grid min-w-0 gap-2 text-sm text-ui-text-secondary">
            <span class="text-xs font-medium uppercase tracking-[0.14em] text-ui-text-muted"
              >Description</span
            >
            <textarea
              rows="1"
              class="min-h-12 w-full min-w-0 rounded-2xl border border-ui-border-strong bg-ui-input px-4 py-3 text-ui-text transition focus:border-sky-400"
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
            class="grid min-w-0 content-start gap-4 rounded-3xl border border-ui-border-subtle bg-ui-surface p-4"
          >
            <header class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-xs font-medium uppercase tracking-[0.14em] text-ui-text-muted">
                  {{ view.trackId }} track
                </p>
                <p class="mt-1 text-sm text-ui-text-secondary">
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
              class="rounded-2xl border border-dashed border-ui-border-strong bg-ui-input p-6 text-sm text-ui-text-secondary"
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
                @update:plane-side="
                  (value) => updateSegmentPlaneSide(view.trackId, segmentIndex, value)
                "
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
          class="grid gap-3 rounded-3xl border border-ui-border p-5 text-sm text-ui-text-secondary"
        >
          <p class="text-xs font-medium uppercase tracking-[0.14em] text-ui-text-muted">Pattern</p>
          <PatternRegistryControls
            editor-kind="authoring"
            variant="panel"
            :current-pattern-id="workingPatternId"
            :current-source="currentPatternSource"
            :current-name="selectedDocument.name"
            :is-dirty="isDirty"
            @saved="
              (entry) => {
                workingDocument.name = entry.name;
                workingDocument.description = entry.description;
                savedBaseline = JSON.stringify(workingDocument);
              }
            "
          />
        </section>

        <AuthoringPreviewPanel :error-message="previewErrorMessage" :track-totals="trackTotals" />
      </aside>
    </section>
  </main>
</template>
