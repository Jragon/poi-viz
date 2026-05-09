<script setup lang="ts">
import { computed, ref } from "vue";

import EmbeddedVisualizer from "@/lab/components/EmbeddedVisualizer.vue";
import {
  compilePoiBeatGraph,
  DEFAULT_POI_BEAT_COMPILER_OPTIONS
} from "@/lab/experiments/poi-beat-graph/compileBeatGraph";
import {
  appendPoiBeatGraphRow,
  deletePoiBeatGraphLastRow,
  filterPoiBeatGraphTracks,
  movePoiBeatGraphRowLane,
  setPoiBeatGraphTrackDirection,
  setPoiBeatGraphTrackInitialPhase
} from "@/lab/experiments/poi-beat-graph/graphHelpers";
import { createTwoHandLowWrapBeatGraph } from "@/lab/experiments/poi-beat-graph/lowerWrapSeed";
import PoiBeatGraph from "@/lab/experiments/poi-beat-graph/PoiBeatGraph.vue";
import type {
  PoiBeatDirection,
  PoiBeatLaneId,
  PoiBeatPhaseLabel,
  PoiBeatTrack
} from "@/lab/experiments/poi-beat-graph/types";

const graph = ref(createTwoHandLowWrapBeatGraph());
const compilerOptions = DEFAULT_POI_BEAT_COMPILER_OPTIONS;
const editingTrackId = ref(graph.value.tracks[0]?.id ?? "");
const visibleTrackIds = ref(graph.value.tracks.map((track) => track.id));
const visibleGraph = computed(() => filterPoiBeatGraphTracks(graph.value, visibleTrackIds.value));
const compiled = computed(() => compilePoiBeatGraph(visibleGraph.value, compilerOptions));
const tracks = computed(() => graph.value.tracks);
const editingTrack = computed(() => {
  const track = graph.value.tracks.find((candidate) => candidate.id === editingTrackId.value);
  if (!track) {
    throw new Error("PoiBeatGraphPage requires at least one track");
  }
  return track;
});
function moveActiveLane(step: number, laneId: PoiBeatLaneId) {
  graph.value = movePoiBeatGraphRowLane(graph.value, editingTrack.value.id, step, laneId);
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

function appendRow() {
  graph.value = appendPoiBeatGraphRow(graph.value);
}

function deleteRow() {
  graph.value = deletePoiBeatGraphLastRow(graph.value);
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
          <h1 class="mt-2 text-2xl font-semibold text-slate-50">Together opposites low wrap</h1>
          <p class="mt-2 text-sm leading-6 text-slate-400">
            One shared grid edits left and right hand tracks against the same half-beat rows.
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
          @select-lane="moveActiveLane"
          @append-row="appendRow"
          @delete-row="deleteRow"
        />

        <section
          v-if="compiled.diagnostics.length > 0"
          class="rounded-lg border border-amber-800 bg-amber-950/40 px-4 py-3 text-sm text-amber-100"
        >
          <h2 class="font-semibold">Compiler diagnostics</h2>
          <ul class="mt-2 grid gap-1 font-mono text-xs">
            <li
              v-for="diagnostic in compiled.diagnostics"
              :key="`${diagnostic.code}-${diagnostic.intervalIndex ?? 'track'}-${diagnostic.step ?? 'none'}`"
            >
              {{ diagnostic.code }} track={{ diagnostic.trackId }}
              <template v-if="diagnostic.intervalIndex !== undefined">
                interval={{ diagnostic.intervalIndex }}
              </template>
              <template v-if="diagnostic.step !== undefined"> step={{ diagnostic.step }} </template>
              <template v-if="diagnostic.laneId"> lane={{ diagnostic.laneId }} </template>
            </li>
          </ul>
        </section>
      </div>

      <div class="grid content-start gap-6">
        <EmbeddedVisualizer
          :sequence="compiled.sequence"
          title="Compiled two-hand low wrap"
          summary="Visible hand tracks compile into separate rigs while the graph data stays intact."
          size="normal"
          projection-mode="orthographic"
          :projection-drag-enabled="false"
        />
      </div>
    </section>
  </main>
</template>
