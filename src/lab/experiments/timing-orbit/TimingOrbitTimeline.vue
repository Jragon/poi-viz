<script setup lang="ts">
import { computed } from "vue";

import type {
  TimingOrbitCoincidence,
  TimingOrbitEvent
} from "./timingOrbitModel";

const props = defineProps<{
  horizon: number;
  currentTime: number;
  leftEvents: readonly TimingOrbitEvent[];
  rightEvents: readonly TimingOrbitEvent[];
  coincidences: readonly TimingOrbitCoincidence[];
}>();

const MAX_VISIBLE_MARKERS_PER_SERIES = 640;

function downsampleMarkers<T>(values: readonly T[]): readonly T[] {
  if (values.length <= MAX_VISIBLE_MARKERS_PER_SERIES) return values;
  const stride = Math.ceil(values.length / MAX_VISIBLE_MARKERS_PER_SERIES);
  return values.filter((_value, index) => index % stride === 0);
}

const visibleLeftEvents = computed(() => downsampleMarkers(props.leftEvents));
const visibleRightEvents = computed(() => downsampleMarkers(props.rightEvents));
const visibleCoincidences = computed(() => downsampleMarkers(props.coincidences));

const axisTicks = computed(() =>
  Array.from({ length: 6 }, (_, index) => {
    const time = (props.horizon * index) / 5;
    return {
      index,
      time,
      left: `${(index / 5) * 100}%`
    };
  })
);

const cursorLeft = computed(() => {
  if (!Number.isFinite(props.horizon) || props.horizon <= 0) return "0%";
  const progress = Math.min(Math.max(props.currentTime / props.horizon, 0), 1);
  return `${progress * 100}%`;
});

function eventLeft(time: number): string {
  if (!Number.isFinite(props.horizon) || props.horizon <= 0) return "0%";
  return `${Math.min(Math.max(time / props.horizon, 0), 1) * 100}%`;
}

function formatTime(value: number): string {
  if (!Number.isFinite(value)) return "--";
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(2);
}
</script>

<template>
  <section
    class="grid min-w-0 gap-3"
    role="img"
    :aria-label="`Two timing lanes over ${formatTime(horizon)} units. Left has ${leftEvents.length} landmarks, right has ${rightEvents.length}, with ${coincidences.length} coincidences.`"
  >
    <div class="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3">
      <span class="text-xs font-medium uppercase tracking-[0.16em] text-sky-300">Left</span>
      <div class="relative h-14 overflow-hidden rounded-md bg-ui-input">
        <div class="absolute inset-x-0 top-1/2 h-px bg-ui-border-strong" />
        <span
          class="absolute inset-y-0 z-10 w-px -translate-x-1/2 bg-emerald-300/80"
          :style="{ left: cursorLeft }"
          aria-hidden="true"
        />
        <span
          v-for="(event, index) in visibleLeftEvents"
          :key="`left-${index}-${event.time}`"
          class="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400"
          :style="{ left: eventLeft(event.time) }"
          :aria-label="`Left landmark ${event.landmarkIndex} at ${formatTime(event.time)}`"
        />
      </div>
    </div>

    <div class="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3">
      <span class="text-xs font-medium uppercase tracking-[0.16em] text-fuchsia-300">Right</span>
      <div class="relative h-14 overflow-hidden rounded-md bg-ui-input">
        <div class="absolute inset-x-0 top-1/2 h-px bg-ui-border-strong" />
        <span
          class="absolute inset-y-0 z-10 w-px -translate-x-1/2 bg-emerald-300/80"
          :style="{ left: cursorLeft }"
          aria-hidden="true"
        />
        <span
          v-for="(event, index) in visibleRightEvents"
          :key="`right-${index}-${event.time}`"
          class="absolute top-1/2 h-3 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-fuchsia-400"
          :style="{ left: eventLeft(event.time) }"
          :aria-label="`Right landmark ${event.landmarkIndex} at ${formatTime(event.time)}`"
        />
      </div>
    </div>

    <div class="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] gap-3">
      <span class="pt-0.5 text-xs font-medium uppercase tracking-[0.16em] text-amber-300">
        Align
      </span>
      <div class="relative h-8 border-t border-ui-border-subtle">
        <span
          class="absolute inset-y-0 z-10 w-px -translate-x-1/2 bg-emerald-300/80"
          :style="{ left: cursorLeft }"
          aria-hidden="true"
        />
        <span
          v-for="(coincidence, index) in visibleCoincidences"
          :key="`coincidence-${index}-${coincidence.time}`"
          class="absolute top-0 h-3 w-px -translate-x-1/2 bg-amber-300"
          :style="{ left: eventLeft(coincidence.time) }"
          :aria-label="`Coincidence at ${formatTime(coincidence.time)}`"
        />
        <span
          v-for="tick in axisTicks"
          :key="`tick-${tick.time}`"
          class="absolute top-3 font-mono text-[10px] text-ui-text-muted"
          :class="
            tick.index === 0
              ? 'translate-x-0'
              : tick.index === axisTicks.length - 1
                ? '-translate-x-full'
                : '-translate-x-1/2'
          "
          :style="{ left: tick.left }"
        >
          {{ formatTime(tick.time) }}
        </span>
      </div>
    </div>

  </section>
</template>
