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
  <section class="grid gap-4 rounded-2xl border border-ui-border bg-ui-surface p-4">
    <div class="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-lg border border-transparent bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:border-ui-border-strong disabled:bg-ui-surface-raised disabled:text-ui-text-muted"
          :disabled="duration <= 0 || isPlaying"
          @click="play"
        >
          Play
        </button>
        <button
          type="button"
          class="rounded-lg border border-ui-border-strong bg-ui-surface px-4 py-2 text-sm font-medium text-ui-text-secondary transition hover:border-ui-focus hover:bg-ui-surface-raised hover:text-ui-text disabled:cursor-not-allowed disabled:border-ui-border-strong disabled:bg-ui-surface-raised disabled:text-ui-text-muted disabled:hover:border-ui-border-strong disabled:hover:bg-ui-surface-raised"
          :disabled="duration <= 0 || !isPlaying"
          @click="pause"
        >
          Pause
        </button>
      </div>

      <div
        class="grid w-full gap-1 text-sm text-ui-text-secondary md:justify-self-end md:text-right"
      >
        <p class="font-mono tabular-nums">{{ currentTimeLabel }} / {{ durationLabel }} units</p>
      </div>
    </div>

    <label class="grid gap-1 text-sm font-medium uppercase tracking-[0.14em] text-ui-text-muted">
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
