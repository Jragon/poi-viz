<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { onBeforeRouteLeave, useRoute } from "vue-router";

import {
  compilePoiBeatGraph,
  DEFAULT_POI_BEAT_COMPILER_OPTIONS
} from "@/lab/experiments/mel-body-tracing/beat-graph/compileBeatGraph";
import { createLowCommonCosmoBeatGraph } from "@/lab/experiments/mel-body-tracing/beat-graph/cosmoSeed";
import {
  appendPoiBeatGraphRow,
  deletePoiBeatGraphLastRow,
  filterPoiBeatGraphTracks,
  findActivePoiBeatStep,
  movePoiBeatGraphRowLane,
  setPoiBeatGraphTrackDirection,
  setPoiBeatGraphTrackInitialPhase,
  shiftPoiBeatGraphTrackRows,
  togglePoiBeatGraphRowSide
} from "@/lab/experiments/mel-body-tracing/beat-graph/graphHelpers";
import type {
  PoiBeatDirection,
  PoiBeatLaneId,
  PoiBeatPhaseLabel,
  PoiBeatGraph as PoiBeatGraphData,
  PoiBeatTrack
} from "@/lab/experiments/mel-body-tracing/beat-graph/types";
import { useBeatGraphPngSequenceExport } from "@/lab/experiments/mel-body-tracing/beat-graph/useBeatGraphPngSequenceExport";
import { useBeatGraphUrlState } from "@/lab/experiments/mel-body-tracing/beat-graph/useBeatGraphUrlState";
import PoiBeatGraph from "@/lab/experiments/mel-body-tracing/components/PoiBeatGraph.vue";
import PoiBeatGraphDebugPanel from "@/lab/experiments/mel-body-tracing/components/PoiBeatGraphDebugPanel.vue";
import PatternRegistryControls from "@/patterns/components/PatternRegistryControls.vue";
import { clonePatternSource } from "@/patterns/patternAdapters";
import { usePatternRegistry } from "@/patterns/usePatternRegistry";
import type { PatternEntry, PatternSource } from "@/patterns/types";
import PoiCanvasViewport from "@/visualizer/PoiCanvasViewport.vue";
import {
  createVisualizerWorkspace,
  provideVisualizerWorkspace
} from "@/visualizer/visualizerWorkspace";

const { graph } = useBeatGraphUrlState(createLowCommonCosmoBeatGraph);
const route = useRoute();
const registry = usePatternRegistry();
const loadedPatternId = ref<string | null>(null);
const savedBaseline = ref<string | null>(null);
const compilerOptions = DEFAULT_POI_BEAT_COMPILER_OPTIONS;
const editingTrackId = ref(graph.value.tracks[0]?.id ?? "");
const visibleTrackIds = ref(graph.value.tracks.map((track) => track.id));
const showStickFigure = ref(true);
const beatGraphExportRoot = ref<HTMLElement | null>(null);
const activeStepOverride = ref<number | null>(null);
const visibleGraph = computed(() => filterPoiBeatGraphTracks(graph.value, visibleTrackIds.value));
const currentSource = computed<PatternSource>(() => ({ kind: "beat-graph", graph: graph.value }));
const isDirty = computed(() => JSON.stringify(graph.value) !== savedBaseline.value);
const currentName = computed(
  () => registry.get(loadedPatternId.value ?? "")?.name ?? "Untitled Beat Graph"
);
const compiled = computed(() => compilePoiBeatGraph(visibleGraph.value, compilerOptions));
const workspace = provideVisualizerWorkspace(
  createVisualizerWorkspace(() => compiled.value.sequence, {
    autoplay: true,
    resumeOnSequenceChange: true
  })
);
const { core, transport, display } = workspace;
const tracks = computed(() => graph.value.tracks);
const editingTrack = computed(() => {
  const track = graph.value.tracks.find((candidate) => candidate.id === editingTrackId.value);
  if (!track) {
    throw new Error("BeatGraphEditorPage requires at least one track");
  }
  return track;
});
const activeStep = computed(() =>
  findActivePoiBeatStep(
    transport.currentTime.value,
    graph.value.cycleSteps,
    compilerOptions.halfBeatDuration
  )
);
const renderedActiveStep = computed(() => activeStepOverride.value ?? activeStep.value);
const graphPngExport = useBeatGraphPngSequenceExport({
  getRootElement: () => beatGraphExportRoot.value,
  setActiveStepOverride: (step) => {
    activeStepOverride.value = step;
  }
});
const currentTimeLabel = computed(() => transport.currentTime.value.toFixed(2));
const durationLabel = computed(() => transport.duration.value.toFixed(2));
const activePlanesLabel = computed(() => {
  const planes = new Set(
    compiled.value.sequence.rigs.flatMap((rig) =>
      rig.sequence.segments.map((segment) => segment.planeId ?? "wall")
    )
  );
  return Array.from(planes).join(" / ");
});

// core.session.setProjectionMode("orthographic");
core.session.setProjectionMode("tilted");
core.session.setPlaneSideDepthsWorld(0.2, 0.2);
transport.setSpeed(1);
display.setOverlayVisibility("showHandTrails", false);
display.setOverlayVisibility("showHeadTrails", true);

watch(
  showStickFigure,
  (showBodyRig) => {
    display.setOverlayVisibility("showBodyRig", showBodyRig);
  },
  { immediate: true }
);

function moveActiveLane(step: number, laneId: PoiBeatLaneId) {
  graph.value = movePoiBeatGraphRowLane(graph.value, editingTrack.value.id, step, laneId);
}

function toggleActiveRowSide(step: number) {
  graph.value = togglePoiBeatGraphRowSide(graph.value, editingTrack.value.id, step);
}

function setEditingTrack(trackId: string) {
  if (!visibleTrackIds.value.includes(trackId)) return;
  editingTrackId.value = trackId;
}

function toggleTrackVisibility(trackId: string) {
  const visibleIds = new Set(visibleTrackIds.value);

  if (visibleIds.has(trackId)) {
    if (visibleIds.size <= 1) return;
    visibleIds.delete(trackId);
  } else {
    visibleIds.add(trackId);
  }

  visibleTrackIds.value = graph.value.tracks
    .map((track) => track.id)
    .filter((candidateId) => visibleIds.has(candidateId));

  if (!visibleIds.has(editingTrackId.value)) {
    const nextEditingTrackId = visibleTrackIds.value[0];
    if (nextEditingTrackId) editingTrackId.value = nextEditingTrackId;
  }
}

function setTrackDirection(trackId: string, direction: PoiBeatDirection) {
  graph.value = setPoiBeatGraphTrackDirection(graph.value, trackId, direction);
}

function setTrackInitialPhase(trackId: string, phase: PoiBeatPhaseLabel) {
  graph.value = setPoiBeatGraphTrackInitialPhase(graph.value, trackId, phase);
}

function shiftTrackRows(trackId: string, deltaSteps: number) {
  graph.value = shiftPoiBeatGraphTrackRows(graph.value, trackId, deltaSteps);
}

function appendRow() {
  graph.value = appendPoiBeatGraphRow(graph.value);
}

function deleteRow() {
  graph.value = deletePoiBeatGraphLastRow(graph.value);
}

function togglePlayback() {
  transport.toggle();
}

function onScrub(event: Event) {
  transport.setCurrentTime(Number((event.target as HTMLInputElement).value));
}

function setSpeed(value: number) {
  transport.setSpeed(value);
}

function loadGraph(graphValue: PoiBeatGraphData, patternId: string | null): void {
  graph.value = graphValue;
  loadedPatternId.value = patternId;
  visibleTrackIds.value = graphValue.tracks.map((track) => track.id);
  editingTrackId.value = graphValue.tracks[0]?.id ?? "";
  savedBaseline.value = JSON.stringify(graphValue);
}

function startNewPattern(): void {
  loadGraph(createLowCommonCosmoBeatGraph(), null);
}

function loadSelectedPattern(): void {
  if (route.query.s !== undefined || route.query.lt !== undefined || route.query.rt !== undefined) {
    return;
  }
  const selected = registry.selectedPattern.value;
  if (selected?.source.kind === "beat-graph") {
    const source = clonePatternSource(selected.source);
    if (source.kind !== "beat-graph") return;
    loadGraph(source.graph, selected.id);
  } else {
    loadGraph(createLowCommonCosmoBeatGraph(), null);
  }
}

function openPattern(entry: PatternEntry): void {
  if (entry.source.kind !== "beat-graph") return;
  const source = clonePatternSource(entry.source);
  if (source.kind !== "beat-graph") return;
  loadGraph(source.graph, entry.id);
}

function exportGraphPngSequence() {
  void graphPngExport
    .exportGraph({ graph: graph.value, halfBeatDuration: compilerOptions.halfBeatDuration })
    .catch(() => {});
}

const graphPngExportButtonLabel = computed(() =>
  graphPngExport.state.status === "running" ? "Exporting..." : "Export graph PNG sequence"
);

function isEditingTrack(trackId: string): boolean {
  return editingTrackId.value === trackId;
}

function isTrackVisible(trackId: string): boolean {
  return visibleTrackIds.value.includes(trackId);
}

function trackLabel(track: PoiBeatTrack): string {
  return `${track.hand} hand`;
}

function trackAccentClass(track: PoiBeatTrack): string {
  if (track.hand === "left") return "text-cyan-300";
  return "text-pink-300";
}

function editButtonClass(track: PoiBeatTrack): string {
  if (isEditingTrack(track.id)) return "border-sky-400 bg-sky-950/70 text-sky-100";
  return "border-ui-border-strong bg-ui-surface text-ui-text-secondary hover:border-ui-focus hover:bg-ui-surface-raised";
}

function visibilityButtonClass(track: PoiBeatTrack): string {
  if (isTrackVisible(track.id)) return "border-emerald-500/70 bg-emerald-500/15 text-emerald-200";
  return "border-ui-border-strong bg-ui-surface text-ui-text-muted hover:border-ui-focus hover:bg-ui-surface-raised hover:text-ui-text-secondary";
}

function directionButtonClass(track: PoiBeatTrack, direction: PoiBeatDirection): string {
  if (track.poiDirection === direction) {
    return "border-sky-300 bg-ui-selected text-ui-selected-text";
  }
  return "border-ui-border-strong bg-ui-surface text-ui-text-secondary hover:border-ui-focus hover:bg-ui-surface-raised hover:text-ui-text";
}

function phaseButtonClass(track: PoiBeatTrack, phase: PoiBeatPhaseLabel): string {
  if (track.initialPhase === phase) {
    return "border-sky-300 bg-ui-selected text-ui-selected-text";
  }
  return "border-ui-border-strong bg-ui-surface text-ui-text-secondary hover:border-ui-focus hover:bg-ui-surface-raised hover:text-ui-text";
}

watch(registry.selectedPatternId, loadSelectedPattern, { immediate: true });

onBeforeRouteLeave(() => {
  if (!isDirty.value || typeof window === "undefined") return true;
  return window.confirm("Discard unsaved changes?");
});
</script>

<template>
  <main class="min-h-screen bg-transparent px-5 py-5 text-ui-text md:px-8 lg:py-4">
    <div class="mx-auto grid max-w-[100rem] gap-3">
      <header class="grid gap-2">
        <div class="grid gap-3 md:flex md:items-start md:justify-between md:gap-6">
          <div>
            <p class="text-xs uppercase tracking-[0.2em] text-ui-text-muted">Mel body tracing</p>
            <h1 class="mt-2 text-2xl font-semibold text-slate-50">Beat Graph Editor</h1>
          </div>
          <div class="md:pt-1">
            <PatternRegistryControls
              editor-kind="beat-graph"
              :current-pattern-id="loadedPatternId"
              :current-source="currentSource"
              :current-name="currentName"
              :is-dirty="isDirty"
              @new="startNewPattern"
              @open="openPattern"
              @saved="
                (entry) => {
                  loadedPatternId = entry.id;
                  savedBaseline = JSON.stringify(graph);
                }
              "
            />
          </div>
        </div>
        <p class="text-sm leading-6 text-ui-text-secondary">
          Play around with the beat graphs from Mel's
          <a
            href="https://antispinner.gitbook.io/btf"
            target="_blank"
            rel="noreferrer"
            class="font-medium text-sky-300 underline decoration-sky-500/50 underline-offset-4 transition hover:text-sky-200"
          >
            Body Tracing Framework </a
          >. Click a column to move the active beat; click it again to switch the move behind the
          body.
        </p>
      </header>

      <section class="grid items-start gap-4 lg:grid-cols-[minmax(25rem,1fr)_minmax(0,2fr)]">
        <div ref="beatGraphExportRoot" class="grid min-w-0 content-start gap-2">
          <PoiBeatGraph
            :graph="graph"
            density="compact"
            :track-id="editingTrackId"
            :visible-track-ids="visibleTrackIds"
            :half-beat-duration="compilerOptions.halfBeatDuration"
            :active-step="renderedActiveStep"
            @select-lane="moveActiveLane"
            @toggle-side="toggleActiveRowSide"
            @append-row="appendRow"
            @delete-row="deleteRow"
          />

          <button
            type="button"
            class="h-9 rounded-md border border-ui-border-strong bg-ui-surface px-3 text-xs font-semibold text-ui-text-secondary transition hover:border-ui-focus hover:bg-ui-surface-raised hover:text-ui-text disabled:cursor-wait disabled:border-ui-border disabled:bg-ui-surface-raised disabled:text-ui-text-muted"
            :disabled="graphPngExport.state.status === 'running'"
            @click="exportGraphPngSequence"
          >
            {{ graphPngExportButtonLabel }}
          </button>
        </div>

        <div class="grid min-w-0 content-start gap-3 lg:sticky lg:top-4">
          <section class="rounded-lg border border-ui-border bg-ui-surface p-2">
            <h2 class="sr-only">Hand controls</h2>
            <div class="grid gap-2 text-sm md:grid-cols-2">
              <div
                v-for="track in tracks"
                :key="track.id"
                class="grid gap-2 rounded-md border border-ui-border-subtle bg-ui-input p-2.5"
              >
                <div class="flex min-w-0 items-center justify-between gap-2">
                  <p class="truncate font-medium capitalize text-slate-200">
                    <span :class="trackAccentClass(track)">●</span>
                    {{ trackLabel(track) }}
                  </p>
                  <div class="flex shrink-0 gap-1">
                    <button
                      type="button"
                      class="h-7 rounded-md border px-2 text-[0.6875rem] font-medium transition disabled:cursor-not-allowed disabled:border-ui-border disabled:bg-ui-surface-raised disabled:text-ui-text-muted"
                      :class="editButtonClass(track)"
                      :disabled="!isTrackVisible(track.id)"
                      :aria-pressed="isEditingTrack(track.id)"
                      @click="setEditingTrack(track.id)"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      class="h-7 rounded-md border px-2 text-[0.6875rem] font-medium transition"
                      :class="visibilityButtonClass(track)"
                      :aria-pressed="isTrackVisible(track.id)"
                      @click="toggleTrackVisibility(track.id)"
                    >
                      {{ isTrackVisible(track.id) ? "On" : "Off" }}
                    </button>
                  </div>
                </div>

                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <p
                      class="mb-1 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-sky-200"
                    >
                      Offset
                    </p>
                    <div class="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        class="h-7 rounded-md border border-ui-border-strong bg-ui-surface px-2 text-xs font-medium text-ui-text-secondary transition hover:border-ui-focus hover:bg-ui-surface-raised hover:text-ui-text"
                        :aria-label="`Shift ${trackLabel(track)} one beat earlier`"
                        @click="shiftTrackRows(track.id, -1)"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        class="h-7 rounded-md border border-ui-border-strong bg-ui-surface px-2 text-xs font-medium text-ui-text-secondary transition hover:border-ui-focus hover:bg-ui-surface-raised hover:text-ui-text"
                        :aria-label="`Shift ${trackLabel(track)} one beat later`"
                        @click="shiftTrackRows(track.id, 1)"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <p
                      class="mb-1 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-ui-text-muted"
                    >
                      Direction
                    </p>
                    <div class="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        class="h-7 rounded-md border px-1 text-xs font-medium transition"
                        :class="directionButtonClass(track, 'clockwise')"
                        :aria-pressed="track.poiDirection === 'clockwise'"
                        @click="setTrackDirection(track.id, 'clockwise')"
                      >
                        CW
                      </button>
                      <button
                        type="button"
                        class="h-7 rounded-md border px-1 text-xs font-medium transition"
                        :class="directionButtonClass(track, 'counterclockwise')"
                        :aria-pressed="track.poiDirection === 'counterclockwise'"
                        @click="setTrackDirection(track.id, 'counterclockwise')"
                      >
                        CCW
                      </button>
                    </div>
                  </div>

                  <div>
                    <p
                      class="mb-1 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-ui-text-muted"
                    >
                      Phase
                    </p>
                    <div class="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        class="h-7 rounded-md border px-1 text-xs font-medium transition"
                        :class="phaseButtonClass(track, 'up')"
                        :aria-pressed="track.initialPhase === 'up'"
                        @click="setTrackInitialPhase(track.id, 'up')"
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        class="h-7 rounded-md border px-1 text-xs font-medium transition"
                        :class="phaseButtonClass(track, 'down')"
                        :aria-pressed="track.initialPhase === 'down'"
                        @click="setTrackInitialPhase(track.id, 'down')"
                      >
                        Down
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section class="overflow-hidden rounded-lg border border-ui-border bg-ui-surface-raised">
            <header class="flex justify-end border-b border-ui-border-subtle px-4 py-3">
              <dl
                class="grid grid-cols-2 gap-x-5 gap-y-1 text-xs text-ui-text-secondary md:text-right"
              >
                <div>
                  <dt class="uppercase tracking-[0.18em] text-ui-text-muted">Time</dt>
                  <dd class="font-mono text-ui-text-secondary">
                    {{ currentTimeLabel }} / {{ durationLabel }}
                  </dd>
                </div>
                <div>
                  <dt class="uppercase tracking-[0.18em] text-ui-text-muted">Planes</dt>
                  <dd class="font-mono text-ui-text-secondary">{{ activePlanesLabel }}</dd>
                </div>
              </dl>
            </header>

            <div
              v-if="core.errorMessage.value"
              class="border-b border-rose-900/70 bg-rose-950/45 px-4 py-3 text-sm text-rose-100"
            >
              {{ core.errorMessage.value }}
            </div>

            <PoiCanvasViewport
              v-else
              class="min-h-80! rounded-none border-0 md:min-h-[clamp(18rem,40vh,30rem)]!"
              :projection-drag-enabled="true"
            />

            <div
              class="grid gap-3 border-t border-ui-border-subtle px-3 py-2.5 text-sm text-ui-text-secondary md:grid-cols-[auto_minmax(10rem,1fr)_auto] md:items-center"
            >
              <button
                type="button"
                class="h-8 rounded-md border border-ui-border-strong bg-ui-surface px-3 text-xs font-medium text-ui-text transition hover:border-ui-focus hover:bg-ui-surface-raised disabled:cursor-not-allowed disabled:border-ui-border disabled:bg-ui-surface-raised disabled:text-ui-text-muted"
                :disabled="transport.duration.value <= 0"
                @click="togglePlayback"
              >
                {{ transport.isPlaying.value ? "Pause" : "Play" }}
              </button>

              <label class="grid gap-1 text-xs uppercase tracking-[0.18em] text-ui-text-muted">
                Timeline
                <input
                  type="range"
                  min="0"
                  :max="transport.duration.value"
                  step="any"
                  :value="transport.currentTime.value"
                  class="w-full accent-sky-400"
                  :disabled="transport.duration.value <= 0"
                  @input="onScrub"
                />
              </label>

              <div
                class="hidden gap-1 text-xs uppercase tracking-[0.18em] text-ui-text-muted md:grid"
              >
                Speed
                <div
                  class="grid grid-cols-3 overflow-hidden rounded-md border border-ui-border-strong normal-case tracking-normal"
                >
                  <button
                    v-for="speed in [0.25, 0.5, 1]"
                    :key="speed"
                    type="button"
                    class="h-8 px-2 text-xs transition hover:bg-slate-800 hover:text-white"
                    :class="
                      transport.speed.value === speed
                        ? 'bg-sky-400 text-slate-950 hover:bg-sky-300 hover:text-slate-950'
                        : 'bg-ui-input text-ui-text-secondary'
                    "
                    @click="setSpeed(speed)"
                  >
                    {{ speed }}x
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <details class="rounded-lg border border-ui-border-subtle bg-ui-surface">
        <summary
          class="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-ui-text-muted transition hover:text-ui-text"
        >
          Debug data
        </summary>
        <div class="border-t border-ui-border-subtle p-3">
          <PoiBeatGraphDebugPanel
            :graph="graph"
            :analysis="compiled.analysis"
            :visible-track-ids="visibleTrackIds"
            :active-step="activeStep"
            :half-beat-duration="compilerOptions.halfBeatDuration"
            :current-time="transport.currentTime.value"
            :duration="transport.duration.value"
            :is-playing="transport.isPlaying.value"
          />
        </div>
      </details>
    </div>
  </main>
</template>
