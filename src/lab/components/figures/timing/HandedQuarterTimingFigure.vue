<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import PhaseWaveDiagram from "@/lab/components/figures/timing/PhaseWaveDiagram.vue";
import PoiOrbitDiagram from "@/lab/components/figures/timing/PoiOrbitDiagram.vue";
import {
  describeTimingOffset,
  normalizePhase,
  type OrbitDirection,
  type TimingOffset
} from "@/lab/components/figures/timing/timingMath";

const timingOptions: readonly {
  label: string;
  offset: TimingOffset;
}[] = [
  { label: "Same", offset: 0 },
  { label: "R +¼", offset: 0.75 },
  { label: "Split", offset: 0.5 },
  { label: "L +¼", offset: 0.25 }
];

const directionOptions: readonly {
  label: string;
  value: "same" | "opposite";
}[] = [
  { label: "Same direction", value: "same" },
  { label: "Opposite directions", value: "opposite" }
];

const CYCLE_DURATION_MS = 4000;
const selectedOffset = ref<TimingOffset>(0);
const selectedDirection = ref<"same" | "opposite">("same");
const cycleTime = ref(0);
const playing = ref(true);
const rightDirection = computed<OrbitDirection>(() =>
  selectedDirection.value === "same" ? "positive" : "negative"
);
const timingDescription = computed(() => describeTimingOffset(selectedOffset.value));

let animationFrame: number | null = null;
let previousTimestamp: number | null = null;

function cancelAnimation(): void {
  if (animationFrame !== null) cancelAnimationFrame(animationFrame);
  animationFrame = null;
  previousTimestamp = null;
}

function animate(timestamp: number): void {
  if (!playing.value) return;
  if (previousTimestamp !== null) {
    cycleTime.value = normalizePhase(
      cycleTime.value + (timestamp - previousTimestamp) / CYCLE_DURATION_MS
    );
  }
  previousTimestamp = timestamp;
  animationFrame = requestAnimationFrame(animate);
}

function startAnimation(): void {
  cancelAnimation();
  if (playing.value) animationFrame = requestAnimationFrame(animate);
}

function restart(): void {
  cycleTime.value = 0;
  previousTimestamp = null;
}

function selectTiming(offset: TimingOffset): void {
  selectedOffset.value = offset;
  restart();
}

function selectDirection(direction: "same" | "opposite"): void {
  selectedDirection.value = direction;
  restart();
}

function togglePlayback(): void {
  playing.value = !playing.value;
  if (playing.value) startAnimation();
  else cancelAnimation();
}

onMounted(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) playing.value = false;
  startAnimation();
});

onBeforeUnmount(cancelAnimation);
</script>

<template>
  <div class="mx-auto grid w-full max-w-[44rem] min-w-0 gap-4">
    <div class="grid gap-2 sm:grid-cols-2">
      <fieldset class="grid gap-1.5">
        <legend class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Timing
        </legend>
        <div class="grid grid-cols-4 gap-1">
          <button
            v-for="option in timingOptions"
            :key="option.label"
            type="button"
            class="rounded-md border px-2 py-1.5 text-xs font-semibold transition"
            :class="
              selectedOffset === option.offset
                ? 'border-cyan-300 bg-cyan-300/15 text-cyan-100'
                : 'border-slate-700 bg-slate-950/70 text-slate-400 hover:border-slate-500'
            "
            :aria-pressed="selectedOffset === option.offset"
            @click="selectTiming(option.offset)"
          >
            {{ option.label }}
          </button>
        </div>
      </fieldset>

      <fieldset class="grid gap-1.5">
        <legend class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Direction
        </legend>
        <div class="grid grid-cols-2 gap-1">
          <button
            v-for="option in directionOptions"
            :key="option.value"
            type="button"
            class="rounded-md border px-2 py-1.5 text-xs font-semibold transition"
            :class="
              selectedDirection === option.value
                ? 'border-pink-300 bg-pink-300/15 text-pink-100'
                : 'border-slate-700 bg-slate-950/70 text-slate-400 hover:border-slate-500'
            "
            :aria-pressed="selectedDirection === option.value"
            @click="selectDirection(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </fieldset>
    </div>

    <div class="flex min-w-0 items-center justify-between gap-3">
      <p class="min-w-0 text-xs text-slate-400">{{ timingDescription }}</p>
      <button
        type="button"
        class="shrink-0 rounded-md border border-slate-700 bg-slate-950/50 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:border-slate-500"
        :aria-label="playing ? 'Pause timing animation' : 'Play timing animation'"
        @click="togglePlayback"
      >
        {{ playing ? "Pause" : "Play" }}
      </button>
    </div>

    <div
      class="grid min-w-0 items-center justify-items-center gap-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,22rem)] sm:justify-center sm:gap-5"
    >
      <div class="w-full max-w-60 sm:max-w-none">
        <PoiOrbitDiagram
          :downbeat-offset="selectedOffset"
          left-direction="positive"
          :right-direction="rightDirection"
          :time="cycleTime"
          fluid
        />
      </div>
      <div class="w-full max-w-sm sm:max-w-none">
        <PhaseWaveDiagram :downbeat-offset="selectedOffset" :time="cycleTime" fluid />
      </div>
    </div>

    <p class="text-center text-xs font-medium text-slate-300">
      Direction changes the route around the circle, not the wall-height timing graph.
    </p>
  </div>
</template>
