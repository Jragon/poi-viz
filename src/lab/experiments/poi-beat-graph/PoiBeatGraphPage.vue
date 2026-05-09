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
  deriveLoopIntervals,
  deriveRowStates,
  movePoiBeatGraphRowLane
} from "@/lab/experiments/poi-beat-graph/graphHelpers";
import { createLowerWrapBeatGraph } from "@/lab/experiments/poi-beat-graph/lowerWrapSeed";
import PoiBeatGraph from "@/lab/experiments/poi-beat-graph/PoiBeatGraph.vue";
import type { PoiBeatLaneId } from "@/lab/experiments/poi-beat-graph/types";

const graph = ref(createLowerWrapBeatGraph());
const compilerOptions = DEFAULT_POI_BEAT_COMPILER_OPTIONS;
const compiled = computed(() => compilePoiBeatGraph(graph.value, compilerOptions));
const primaryTrack = computed(() => {
  const track = graph.value.tracks[0];
  if (!track) {
    throw new Error("PoiBeatGraphPage requires at least one track");
  }
  return track;
});
const rowStates = computed(() => deriveRowStates(primaryTrack.value));
const intervals = computed(() =>
  deriveLoopIntervals(primaryTrack.value, compilerOptions.halfBeatDuration)
);

function moveActiveLane(step: number, laneId: PoiBeatLaneId) {
  graph.value = movePoiBeatGraphRowLane(graph.value, primaryTrack.value.id, step, laneId);
}

function appendRow() {
  graph.value = appendPoiBeatGraphRow(graph.value);
}

function deleteRow() {
  graph.value = deletePoiBeatGraphLastRow(graph.value);
}
</script>

<template>
  <main class="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 md:px-8 md:py-10">
    <section class="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
      <div class="grid content-start gap-4">
        <header>
          <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Poi Beat Graph</p>
          <h1 class="mt-2 text-2xl font-semibold text-slate-50">Lower wrap seed</h1>
          <p class="mt-2 text-sm leading-6 text-slate-400">
            Graph-first sandbox: six half-beat rows compile into six engine intervals.
          </p>
        </header>

        <section class="rounded-lg border border-slate-800 bg-slate-900/60">
          <div class="border-b border-slate-800 px-4 py-3">
            <h2 class="text-sm font-semibold text-slate-200">Track</h2>
          </div>
          <dl class="grid grid-cols-2 gap-3 px-4 py-4 text-sm">
            <div>
              <dt class="text-xs uppercase tracking-[0.16em] text-slate-500">Hand</dt>
              <dd class="mt-1 capitalize text-slate-200">{{ primaryTrack.hand }}</dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-[0.16em] text-slate-500">Direction</dt>
              <dd class="mt-1 capitalize text-slate-200">{{ primaryTrack.poiDirection }}</dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-[0.16em] text-slate-500">Initial Phase</dt>
              <dd class="mt-1 uppercase text-slate-200">{{ primaryTrack.initialPhase }}</dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-[0.16em] text-slate-500">Half Beat</dt>
              <dd class="mt-1 font-mono text-slate-200">{{ compilerOptions.halfBeatDuration }}</dd>
            </div>
          </dl>
        </section>

        <PoiBeatGraph
          :graph="graph"
          :half-beat-duration="compilerOptions.halfBeatDuration"
          @select-lane="moveActiveLane"
          @append-row="appendRow"
          @delete-row="deleteRow"
        />

        <section class="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60">
          <div class="border-b border-slate-800 px-4 py-3">
            <h2 class="text-sm font-semibold text-slate-200">Rows</h2>
          </div>
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-950/70 text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th class="px-4 py-2">Step</th>
                <th class="px-4 py-2">Lane</th>
                <th class="px-4 py-2">Phase</th>
                <th class="px-4 py-2">Side</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              <tr v-for="state in rowStates" :key="state.row.step">
                <td class="px-4 py-2 font-mono text-slate-300">{{ state.row.step }}</td>
                <td class="px-4 py-2 text-slate-200">{{ state.row.laneId }}</td>
                <td class="px-4 py-2 uppercase text-slate-300">{{ state.phaseLabel }}</td>
                <td class="px-4 py-2 font-mono text-slate-300">{{ state.planeSide }}</td>
              </tr>
              <tr class="bg-slate-950/50 text-slate-400">
                <td class="px-4 py-2 font-mono">loop</td>
                <td class="px-4 py-2">{{ rowStates[0]?.row.laneId }}</td>
                <td class="px-4 py-2 uppercase">{{ rowStates[0]?.phaseLabel }}</td>
                <td class="px-4 py-2 font-mono">{{ rowStates[0]?.planeSide }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section class="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60">
          <div class="border-b border-slate-800 px-4 py-3">
            <h2 class="text-sm font-semibold text-slate-200">Intervals</h2>
          </div>
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-950/70 text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th class="px-4 py-2">Index</th>
                <th class="px-4 py-2">Steps</th>
                <th class="px-4 py-2">Kind</th>
                <th class="px-4 py-2">Side</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              <tr v-for="interval in intervals" :key="interval.index">
                <td class="px-4 py-2 font-mono text-slate-300">{{ interval.index }}</td>
                <td class="px-4 py-2 font-mono text-slate-300">
                  {{ interval.fromRow.step }} -> {{ interval.toRow.step }}
                </td>
                <td class="px-4 py-2 text-slate-200">{{ interval.kind }}</td>
                <td class="px-4 py-2 font-mono text-slate-300">{{ interval.planeSide }}</td>
              </tr>
            </tbody>
          </table>
        </section>

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
          title="Compiled lower wrap"
          summary="One engine segment per graph interval. Row-side maps to destination interval-side for this first slice."
          size="normal"
          projection-mode="orthographic"
          :projection-drag-enabled="false"
        />
      </div>
    </section>
  </main>
</template>
