<script setup lang="ts">
import { computed, ref, watch } from "vue";

import {
  compilePoiBeatGraph,
  DEFAULT_POI_BEAT_COMPILER_OPTIONS
} from "@/lab/experiments/poi-beat-graph/compileBeatGraph";
import { createLowCommonCosmoBeatGraph } from "@/lab/experiments/poi-beat-graph/cosmoSeed";
import {
  appendPoiBeatGraphRow,
  deletePoiBeatGraphLastRow,
  filterPoiBeatGraphTracks,
  findActivePoiBeatStep,
  movePoiBeatGraphRowLane,
  setPoiBeatGraphTrackDirection,
  setPoiBeatGraphTrackInitialPhase,
  togglePoiBeatGraphRowSide
} from "@/lab/experiments/poi-beat-graph/graphHelpers";
import PoiBeatGraph from "@/lab/experiments/poi-beat-graph/PoiBeatGraph.vue";
import PoiBeatGraphDebugPanel from "@/lab/experiments/poi-beat-graph/PoiBeatGraphDebugPanel.vue";
import type {
  PoiBeatDirection,
  PoiBeatLaneId,
  PoiBeatPhaseLabel,
  PoiBeatTrack
} from "@/lab/experiments/poi-beat-graph/types";
import PoiCanvasViewport from "@/visualizer/PoiCanvasViewport.vue";
import {
  createVisualizerWorkspace,
  provideVisualizerWorkspace
} from "@/visualizer/visualizerWorkspace";

const graph = ref(createLowCommonCosmoBeatGraph());
const compilerOptions = DEFAULT_POI_BEAT_COMPILER_OPTIONS;
const editingTrackId = ref(graph.value.tracks[0]?.id ?? "");
const visibleTrackIds = ref(graph.value.tracks.map((track) => track.id));
const showStickFigure = ref(false);
const visibleGraph = computed(() => filterPoiBeatGraphTracks(graph.value, visibleTrackIds.value));
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
    throw new Error("PoiBeatGraphPage requires at least one track");
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

core.session.setProjectionMode("orthographic");
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

function setShowStickFigure(event: Event) {
  showStickFigure.value = (event.target as HTMLInputElement).checked;
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
  if (isEditingTrack(track.id)) return "border-slate-200 bg-slate-100 text-slate-950";
  return "border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800";
}

function visibilityButtonClass(track: PoiBeatTrack): string {
  if (isTrackVisible(track.id)) return "border-emerald-500/70 bg-emerald-500/15 text-emerald-200";
  return "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300";
}

function directionButtonClass(track: PoiBeatTrack, direction: PoiBeatDirection): string {
  if (track.poiDirection === direction) return "border-slate-200 bg-slate-100 text-slate-950";
  return "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200";
}

function phaseButtonClass(track: PoiBeatTrack, phase: PoiBeatPhaseLabel): string {
  if (track.initialPhase === phase) return "border-slate-200 bg-slate-100 text-slate-950";
  return "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200";
}
</script>

<template>
  <main class="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 md:px-8 md:py-10">
    <section class="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
      <div class="grid content-start gap-4">
        <header>
          <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Poi Beat Graph</p>
          <h1 class="mt-2 text-2xl font-semibold text-slate-50">Low common cosmo</h1>
          <p class="mt-2 text-sm leading-6 text-slate-400">
            One shared grid edits mirrored left and right hand tracks against the same half-beat
            rows.
          </p>
        </header>

        <section class="rounded-lg border border-slate-800 bg-slate-900/60">
          <div class="border-b border-slate-800 px-4 py-3">
            <h2 class="text-sm font-semibold text-slate-200">Hands</h2>
          </div>
          <div class="grid gap-3 px-4 py-4 text-sm">
            <div
              v-for="track in tracks"
              :key="track.id"
              class="rounded-md border border-slate-800 bg-slate-950/50 px-3 py-3"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="font-medium capitalize text-slate-200">
                    <span :class="trackAccentClass(track)">●</span>
                    {{ trackLabel(track) }}
                  </p>
                  <p class="mt-0.5 font-mono text-xs text-slate-500">{{ track.id }}</p>
                </div>

                <div class="flex shrink-0 gap-2">
                  <button
                    type="button"
                    class="rounded-md border px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
                    :class="editButtonClass(track)"
                    :disabled="!isTrackVisible(track.id)"
                    :aria-pressed="isEditingTrack(track.id)"
                    @click="setEditingTrack(track.id)"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    class="rounded-md border px-2.5 py-1 text-xs font-medium transition"
                    :class="visibilityButtonClass(track)"
                    :aria-pressed="isTrackVisible(track.id)"
                    @click="toggleTrackVisibility(track.id)"
                  >
                    {{ isTrackVisible(track.id) ? "On" : "Off" }}
                  </button>
                </div>
              </div>

              <div class="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  class="rounded-md border px-2 py-1 text-xs font-medium transition"
                  :class="directionButtonClass(track, 'clockwise')"
                  :aria-pressed="track.poiDirection === 'clockwise'"
                  @click="setTrackDirection(track.id, 'clockwise')"
                >
                  CW
                </button>
                <button
                  type="button"
                  class="rounded-md border px-2 py-1 text-xs font-medium transition"
                  :class="directionButtonClass(track, 'counterclockwise')"
                  :aria-pressed="track.poiDirection === 'counterclockwise'"
                  @click="setTrackDirection(track.id, 'counterclockwise')"
                >
                  CCW
                </button>
              </div>

              <div class="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  class="rounded-md border px-2 py-1 text-xs font-medium uppercase transition"
                  :class="phaseButtonClass(track, 'up')"
                  :aria-pressed="track.initialPhase === 'up'"
                  @click="setTrackInitialPhase(track.id, 'up')"
                >
                  Up
                </button>
                <button
                  type="button"
                  class="rounded-md border px-2 py-1 text-xs font-medium uppercase transition"
                  :class="phaseButtonClass(track, 'down')"
                  :aria-pressed="track.initialPhase === 'down'"
                  @click="setTrackInitialPhase(track.id, 'down')"
                >
                  Down
                </button>
              </div>
            </div>
          </div>
        </section>

        <PoiBeatGraph
          :graph="graph"
          :track-id="editingTrackId"
          :visible-track-ids="visibleTrackIds"
          :half-beat-duration="compilerOptions.halfBeatDuration"
          :active-step="activeStep"
          @select-lane="moveActiveLane"
          @toggle-side="toggleActiveRowSide"
          @append-row="appendRow"
          @delete-row="deleteRow"
        />
      </div>

      <div class="grid content-start gap-6">
        <label
          class="ml-auto flex items-center gap-2 text-xs font-medium text-slate-400 transition hover:text-slate-100"
        >
          <input
            type="checkbox"
            :checked="showStickFigure"
            class="h-3.5 w-3.5 accent-amber-400"
            @change="setShowStickFigure"
          />
          Stick figure
        </label>

        <section class="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/80">
          <header
            class="grid gap-3 border-b border-slate-800 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
          >
            <div class="min-w-0">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Live Cell</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-100">Compiled low common cosmo</h2>
              <p class="mt-1 text-sm leading-6 text-slate-400">
                Visible hand tracks compile into separate rigs with authored front/behind side
                metadata.
              </p>
            </div>

            <dl class="grid grid-cols-2 gap-x-5 gap-y-1 text-xs text-slate-400 md:text-right">
              <div>
                <dt class="uppercase tracking-[0.18em] text-slate-600">Time</dt>
                <dd class="font-mono text-slate-300">
                  {{ currentTimeLabel }} / {{ durationLabel }}
                </dd>
              </div>
              <div>
                <dt class="uppercase tracking-[0.18em] text-slate-600">Planes</dt>
                <dd class="font-mono text-slate-300">{{ activePlanesLabel }}</dd>
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
            class="min-h-112! rounded-none border-0 md:min-h-136!"
            :projection-drag-enabled="false"
          />

          <div
            class="grid gap-4 border-t border-slate-800 px-4 py-3 text-sm text-slate-300 md:grid-cols-[auto_minmax(10rem,1fr)_auto] md:items-center"
          >
            <button
              type="button"
              class="rounded-md border border-slate-700 px-3 py-2 font-medium text-slate-100 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:text-slate-500"
              :disabled="transport.duration.value <= 0"
              @click="togglePlayback"
            >
              {{ transport.isPlaying.value ? "Pause" : "Play" }}
            </button>

            <label class="grid gap-1 text-xs uppercase tracking-[0.18em] text-slate-500">
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

            <div class="hidden gap-1 text-xs uppercase tracking-[0.18em] text-slate-500 md:grid">
              Speed
              <div
                class="grid grid-cols-3 overflow-hidden rounded-md border border-slate-700 normal-case tracking-normal"
              >
                <button
                  v-for="speed in [0.25, 0.5, 1]"
                  :key="speed"
                  type="button"
                  class="px-3 py-2 text-sm transition hover:bg-slate-800 hover:text-white"
                  :class="
                    transport.speed.value === speed
                      ? 'bg-sky-400 text-slate-950 hover:bg-sky-300 hover:text-slate-950'
                      : 'bg-slate-950 text-slate-200'
                  "
                  @click="setSpeed(speed)"
                >
                  {{ speed }}x
                </button>
              </div>
            </div>
          </div>
        </section>

        <PoiBeatGraphDebugPanel
          :graph="graph"
          :visible-track-ids="visibleTrackIds"
          :active-step="activeStep"
          :half-beat-duration="compilerOptions.halfBeatDuration"
          :current-time="transport.currentTime.value"
          :duration="transport.duration.value"
          :is-playing="transport.isPlaying.value"
          :diagnostics="compiled.diagnostics"
        />
      </div>
    </section>
  </main>
</template>
