<script setup lang="ts">
import { computed } from "vue";

import { useTransport } from "@/composables/useTransport";

const { currentTime, duration, speed, isPlaying, play, pause, setCurrentTime, setSpeed } =
  useTransport();

const currentTimeLabel = computed(() => currentTime.value.toFixed(2));
const durationLabel = computed(() => duration.value.toFixed(2));
const secondsPerUnit = computed(() => (1 / speed.value).toFixed(2));

function onScrub(event: Event) {
  const target = event.target as HTMLInputElement;
  setCurrentTime(Number(target.value));
}

function onSpeedChange(event: Event) {
  const target = event.target as HTMLInputElement;
  setSpeed(1 / Number(target.value));
}
</script>

<template>
  <section class="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
    <div class="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)_15rem] md:items-center">
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

      <label class="grid gap-1 text-xs uppercase tracking-[0.2em] text-slate-500">
        Seconds per Time Unit
        <input
          type="range"
          min="0.1"
          max="5"
          step="0.05"
          :value="secondsPerUnit"
          class="w-full accent-fuchsia-400"
          @input="onSpeedChange"
        />
      </label>

      <div class="grid w-full gap-1 text-sm text-slate-300 md:justify-self-end md:text-right">
        <p class="font-mono tabular-nums">{{ currentTimeLabel }} / {{ durationLabel }} units</p>
        <p class="font-mono text-xs uppercase tracking-[0.2em] text-slate-500 tabular-nums">
          {{ secondsPerUnit }} s / unit
        </p>
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
