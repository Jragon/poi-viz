<script setup lang="ts">
import { computed } from "vue";

import type { TimeUnit } from "@/engine/types";
import {
  deriveLoopIntervals,
  deriveRowState,
  getOrderedRows,
  getPoiBeatLane
} from "@/lab/experiments/mel-body-tracing/beat-graph/graphHelpers";
import type {
  PoiBeatDerivedRowState,
  PoiBeatGraph,
  PoiBeatInterval,
  PoiBeatRow,
  PoiBeatTrack
} from "@/lab/experiments/mel-body-tracing/beat-graph/types";

const props = defineProps<{
  graph: PoiBeatGraph;
  visibleTrackIds?: readonly string[];
  activeStep: number | null;
  halfBeatDuration: TimeUnit;
  currentTime: TimeUnit;
  duration: TimeUnit;
  isPlaying: boolean;
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
  props.activeStep === null ? "none" : String(props.activeStep + 1)
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
  return `${cell.interval.index + 1} ${cell.interval.kind}`;
}

function displayStep(step: number): number {
  return step + 1;
}
</script>

<template>
  <section
    class="rounded-lg border border-ui-border-subtle bg-ui-surface text-sm text-ui-text-secondary"
  >
    <div class="border-b border-ui-border-subtle px-4 py-3">
      <p class="text-xs uppercase tracking-[0.16em] text-ui-text-muted">Debug</p>
      <h2 class="mt-1 text-sm font-semibold text-ui-text">Playback graph state</h2>
    </div>

    <div class="grid gap-4 px-4 py-4">
      <div class="overflow-x-auto rounded-md border border-ui-border-subtle">
        <table class="min-w-full divide-y divide-ui-border-subtle text-left text-xs">
          <thead class="bg-ui-stage text-ui-text-muted">
            <tr>
              <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Current</th>
              <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Duration</th>
              <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Step</th>
              <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">State</th>
              <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Tracks</th>
            </tr>
          </thead>
          <tbody class="bg-ui-input font-mono text-ui-text-secondary">
            <tr>
              <td class="whitespace-nowrap px-3 py-2">{{ currentTimeLabel }}</td>
              <td class="whitespace-nowrap px-3 py-2">{{ durationLabel }}</td>
              <td class="whitespace-nowrap px-3 py-2 text-amber-200">{{ activeStepLabel }}</td>
              <td class="whitespace-nowrap px-3 py-2">{{ playbackLabel }}</td>
              <td class="whitespace-nowrap px-3 py-2">{{ visibleTracks.length }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="grid gap-2">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-xs font-semibold uppercase tracking-[0.16em] text-ui-text-muted">
            Sequence Rows
          </h3>
          <p class="font-mono text-xs text-ui-text-muted">{{ sequenceRows.length }} steps</p>
        </div>

        <div
          v-if="sequenceRows.length > 0"
          class="overflow-x-auto rounded-md border border-ui-border-subtle"
        >
          <table class="min-w-full divide-y divide-ui-border-subtle text-left text-xs">
            <thead class="bg-ui-stage text-ui-text-muted">
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
                  class="border-l border-ui-border-subtle px-3 py-2 font-semibold uppercase tracking-[0.14em]"
                  colspan="5"
                >
                  <span :class="trackHeaderClass(track)">{{ trackHeaderLabel(track) }}</span>
                </th>
              </tr>
              <tr>
                <template v-for="track in visibleTracks" :key="`${track.id}-columns`">
                  <th
                    class="border-l border-ui-border-subtle px-3 py-2 font-semibold uppercase tracking-[0.14em]"
                  >
                    Lane
                  </th>
                  <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Phase</th>
                  <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Side</th>
                  <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">BTB</th>
                  <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Interval</th>
                </template>
              </tr>
            </thead>
            <tbody
              class="divide-y divide-ui-border-subtle bg-ui-input font-mono text-ui-text-secondary"
            >
              <tr
                v-for="row in sequenceRows"
                :key="row.key"
                :class="row.isActive ? 'bg-ui-selected/60 text-ui-selected-text' : ''"
                :data-active-debug-row="row.isActive ? 'true' : undefined"
              >
                <td class="whitespace-nowrap px-3 py-2 font-semibold">
                  {{ displayStep(row.step) }}
                </td>
                <td class="whitespace-nowrap px-3 py-2 text-ui-text-muted">
                  {{ formatTime(row.time) }}
                </td>
                <template v-for="cell in row.cells" :key="cell.track.id">
                  <td
                    class="whitespace-nowrap border-l border-ui-border-subtle px-3 py-2 text-ui-text"
                  >
                    {{ cell.laneLabel ?? "-" }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 text-ui-text-muted">
                    {{ cell.rowState?.phaseLabel ?? "-" }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 text-ui-text-muted">
                    {{ cell.rowState?.planeSide ?? "-" }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 text-ui-text-muted">
                    {{ cell.rowState ? (cell.rowState.isBTB ? "yes" : "no") : "-" }}
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 text-ui-text-muted">
                    {{ intervalLabel(cell) }}
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>

        <p
          v-else
          class="rounded-md border border-ui-border-subtle bg-ui-input px-3 py-2 text-xs text-ui-text-muted"
        >
          No sequence rows.
        </p>
      </div>
    </div>
  </section>
</template>
