<script setup lang="ts">
import { computed } from "vue";

import type { TimeUnit } from "@/engine/types";
import type { PoiBeatCompileDiagnostic } from "@/lab/experiments/poi-beat-graph/compileBeatGraph";
import {
  deriveLoopIntervals,
  deriveRowState,
  getOrderedRows,
  getPoiBeatLane
} from "@/lab/experiments/poi-beat-graph/graphHelpers";
import type {
  PoiBeatDerivedRowState,
  PoiBeatGraph,
  PoiBeatInterval,
  PoiBeatRow,
  PoiBeatTrack
} from "@/lab/experiments/poi-beat-graph/types";

const props = defineProps<{
  graph: PoiBeatGraph;
  visibleTrackIds?: readonly string[];
  activeStep: number | null;
  halfBeatDuration: TimeUnit;
  currentTime: TimeUnit;
  duration: TimeUnit;
  isPlaying: boolean;
  diagnostics: readonly PoiBeatCompileDiagnostic[];
}>();

interface TrackStepCell {
  readonly track: PoiBeatTrack;
  readonly row: PoiBeatRow | null;
  readonly rowState: PoiBeatDerivedRowState | null;
  readonly interval: PoiBeatInterval | null;
  readonly laneLabel: string | null;
}

interface SequenceDebugRow {
  readonly key: string;
  readonly step: number;
  readonly time: TimeUnit;
  readonly isActive: boolean;
  readonly cells: readonly TrackStepCell[];
}

const visibleTrackIds = computed(
  () => new Set(props.visibleTrackIds ?? props.graph.tracks.map((track) => track.id))
);
const visibleTracks = computed(() =>
  props.graph.tracks.filter((track) => visibleTrackIds.value.has(track.id))
);
const sequenceRows = computed<readonly SequenceDebugRow[]>(() => {
  const stepCount = Math.max(0, Math.floor(props.graph.cycleSteps));

  return Array.from({ length: stepCount }, (_, step) => {
    const cells = visibleTracks.value.map((track) => {
      const row = getOrderedRows(track).find((candidate) => candidate.step === step) ?? null;
      const rowState = row ? deriveRowState(track, row) : null;
      const interval = row
        ? (deriveLoopIntervals(track, props.halfBeatDuration).find(
            (candidate) => candidate.fromRow.step === row.step
          ) ?? null)
        : null;

      return {
        track,
        row,
        rowState,
        interval,
        laneLabel: row ? getPoiBeatLane(row.laneId).label : null
      };
    });

    return {
      key: `step-${step}`,
      step,
      time: step * props.halfBeatDuration,
      isActive: props.activeStep === step,
      cells
    };
  });
});
const currentTimeLabel = computed(() => props.currentTime.toFixed(2));
const durationLabel = computed(() => props.duration.toFixed(2));
const activeStepLabel = computed(() =>
  props.activeStep === null ? "none" : String(props.activeStep)
);
const playbackLabel = computed(() => (props.isPlaying ? "playing" : "paused"));

function formatTime(value: TimeUnit): string {
  return value.toFixed(2);
}

function trackHeaderLabel(track: PoiBeatTrack): string {
  return `${track.hand} hand`;
}

function trackHeaderClass(track: PoiBeatTrack): string {
  return track.hand === "left" ? "text-cyan-300" : "text-pink-300";
}

function intervalLabel(cell: TrackStepCell): string {
  if (!cell.interval) return "-";
  return `${cell.interval.index} ${cell.interval.kind}`;
}

function diagnosticKey(diagnostic: PoiBeatCompileDiagnostic): string {
  return `${diagnostic.code}-${diagnostic.trackId}-${diagnostic.intervalIndex ?? "track"}-${diagnostic.step ?? "none"}-${diagnostic.laneId ?? "none"}`;
}
</script>

<template>
  <section class="rounded-lg border border-slate-800 bg-slate-900/60 text-sm text-slate-300">
    <div class="border-b border-slate-800 px-4 py-3">
      <p class="text-xs uppercase tracking-[0.16em] text-slate-500">Debug</p>
      <h2 class="mt-1 text-sm font-semibold text-slate-200">Playback graph state</h2>
    </div>

    <div class="grid gap-4 px-4 py-4">
      <div class="overflow-x-auto rounded-md border border-slate-800">
        <table class="min-w-full divide-y divide-slate-800 text-left text-xs">
          <thead class="bg-slate-950/80 text-slate-500">
            <tr>
              <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Current</th>
              <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Duration</th>
              <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Step</th>
              <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">State</th>
              <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Tracks</th>
              <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Diagnostics</th>
            </tr>
          </thead>
          <tbody class="bg-slate-950/60 font-mono text-slate-300">
            <tr>
              <td class="whitespace-nowrap px-3 py-2">{{ currentTimeLabel }}</td>
              <td class="whitespace-nowrap px-3 py-2">{{ durationLabel }}</td>
              <td class="whitespace-nowrap px-3 py-2 text-amber-200">{{ activeStepLabel }}</td>
              <td class="whitespace-nowrap px-3 py-2">{{ playbackLabel }}</td>
              <td class="whitespace-nowrap px-3 py-2">{{ visibleTracks.length }}</td>
              <td class="whitespace-nowrap px-3 py-2">{{ diagnostics.length }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="grid gap-2">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Sequence Rows
          </h3>
          <p class="font-mono text-xs text-slate-500">{{ sequenceRows.length }} steps</p>
        </div>

        <div
          v-if="sequenceRows.length > 0"
          class="overflow-x-auto rounded-md border border-slate-800"
        >
          <table class="min-w-full divide-y divide-slate-800 text-left text-xs">
            <thead class="bg-slate-950/80 text-slate-500">
              <tr>
                <th class="w-14 px-3 py-2 font-semibold uppercase tracking-[0.14em]" rowspan="2">
                  Step
                </th>
                <th class="w-20 px-3 py-2 font-semibold uppercase tracking-[0.14em]" rowspan="2">
                  Time
                </th>
                <th
                  v-for="track in visibleTracks"
                  :key="track.id"
                  class="border-l border-slate-800 px-3 py-2 font-semibold uppercase tracking-[0.14em]"
                  colspan="4"
                >
                  <span :class="trackHeaderClass(track)">{{ trackHeaderLabel(track) }}</span>
                </th>
              </tr>
              <tr>
                <template v-for="track in visibleTracks" :key="`${track.id}-columns`">
                  <th
                    class="border-l border-slate-800 px-3 py-2 font-semibold uppercase tracking-[0.14em]"
                  >
                    Lane
                  </th>
                  <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Phase</th>
                  <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Side</th>
                  <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Interval</th>
                </template>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-900 bg-slate-950/60 font-mono text-slate-300">
              <tr
                v-for="row in sequenceRows"
                :key="row.key"
                :class="row.isActive ? 'bg-amber-400/10 text-amber-100' : ''"
                :data-active-debug-row="row.isActive ? 'true' : undefined"
              >
                <td class="whitespace-nowrap px-3 py-2 font-semibold">
                  {{ row.step }}
                </td>
                <td class="whitespace-nowrap px-3 py-2 text-slate-400">
                  {{ formatTime(row.time) }}
                </td>
                <template v-for="cell in row.cells" :key="cell.track.id">
                  <td class="whitespace-nowrap border-l border-slate-900 px-3 py-2 text-slate-200">
                    {{ cell.laneLabel ?? "-" }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 text-slate-400">
                    {{ cell.rowState?.phaseLabel ?? "-" }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 text-slate-400">
                    {{ cell.rowState?.planeSide ?? "-" }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 text-slate-400">
                    {{ intervalLabel(cell) }}
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>

        <p
          v-else
          class="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-500"
        >
          No sequence rows.
        </p>
      </div>

      <div class="grid gap-2 border-t border-slate-800 pt-4">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Compiler Diagnostics
          </h3>
          <p class="font-mono text-xs text-slate-500">{{ diagnostics.length }}</p>
        </div>

        <div
          v-if="diagnostics.length > 0"
          class="overflow-x-auto rounded-md border border-amber-800/70"
        >
          <table class="min-w-full divide-y divide-amber-900/70 text-left text-xs">
            <thead class="bg-amber-950/40 text-amber-200/70">
              <tr>
                <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Code</th>
                <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Track</th>
                <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Interval</th>
                <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Step</th>
                <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Lane</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-amber-950/70 bg-amber-950/25 font-mono text-amber-100">
              <tr v-for="diagnostic in diagnostics" :key="diagnosticKey(diagnostic)">
                <td class="whitespace-nowrap px-3 py-2">{{ diagnostic.code }}</td>
                <td class="whitespace-nowrap px-3 py-2">{{ diagnostic.trackId }}</td>
                <td class="whitespace-nowrap px-3 py-2">
                  {{ diagnostic.intervalIndex ?? "-" }}
                </td>
                <td class="whitespace-nowrap px-3 py-2">{{ diagnostic.step ?? "-" }}</td>
                <td class="whitespace-nowrap px-3 py-2">{{ diagnostic.laneId ?? "-" }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p
          v-else
          class="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-500"
        >
          No compiler diagnostics.
        </p>
      </div>
    </div>
  </section>
</template>
