<script setup lang="ts">
import { computed } from "vue";

import { useVisualizerWorkspace } from "@/visualizer/visualizerWorkspace";

const { transport } = useVisualizerWorkspace();
const { currentTime, duration, isPlaying, play, pause, setCurrentTime } = transport;

const currentTimeLabel = computed(() => currentTime.value.toFixed(2));
const durationLabel = computed(() => duration.value.toFixed(2));

function onScrub(event: Event) {
  const target = event.target as HTMLInputElement;
  setCurrentTime(Number(target.value));
}
</script>

<template>
  <section class="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
    <div class="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
          :disabled="duration <= 0 || isPlaying"
          @click="play"
        >
          Play
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
          :disabled="duration <= 0 || !isPlaying"
          @click="pause"
        >
          Pause
        </button>
      </div>

      <div class="grid w-full gap-1 text-sm text-slate-300 md:justify-self-end md:text-right">
        <p class="font-mono tabular-nums">{{ currentTimeLabel }} / {{ durationLabel }} units</p>
      </div>
    </div>

    <label class="grid gap-1 text-xs uppercase tracking-[0.2em] text-slate-500">
      Timeline
      <input
        type="range"
        min="0"
        :max="duration"
        step="any"
        :value="currentTime"
        class="w-full accent-sky-400"
        :disabled="duration <= 0"
        @input="onScrub"
      />
    </label>
  </section>
</template>
