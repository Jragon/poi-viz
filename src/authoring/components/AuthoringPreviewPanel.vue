<script setup lang="ts">
import type { AuthoredTrackId } from "@/authoring/types";
import PoiCanvasViewport from "@/visualizer/PoiCanvasViewport.vue";
import TransportControls from "@/visualizer/TransportControls.vue";
import { useVisualizerWorkspace } from "@/visualizer/visualizerWorkspace";

defineProps<{
  errorMessage: string | null;
  trackTotals: ReadonlyArray<{ trackId: AuthoredTrackId; totalDuration: number }>;
}>();

const { transport } = useVisualizerWorkspace();

function formatNumber(value: number, digits = 2): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "--";
}
</script>

<template>
  <div class="grid min-w-0 gap-4">
    <div
      v-if="errorMessage"
      class="rounded-3xl border border-rose-900/60 bg-rose-950/40 p-5 text-sm text-rose-100"
    >
      <p class="text-xs uppercase tracking-[0.22em] text-rose-300">Preview Error</p>
      <p class="mt-3">{{ errorMessage }}</p>
    </div>

    <section class="grid gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-4">
      <TransportControls />

      <PoiCanvasViewport :projection-drag-enabled="false" />

      <div
        class="grid gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300"
      >
        <div class="flex items-center justify-between gap-3">
          <span class="text-xs uppercase tracking-[0.2em] text-slate-500">Transport</span>
          <span
            >{{ formatNumber(transport.currentTime.value, 2) }} /
            {{ formatNumber(transport.duration.value, 2) }}</span
          >
        </div>
        <div
          v-for="entry in trackTotals"
          :key="`${entry.trackId}-summary`"
          class="flex items-center justify-between gap-3"
        >
          <span class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ entry.trackId }}</span>
          <span>{{ formatNumber(entry.totalDuration, 2) }} units</span>
        </div>
      </div>
    </section>
  </div>
</template>
