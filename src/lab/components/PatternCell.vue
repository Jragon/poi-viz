<script setup lang="ts">
import { computed } from "vue";

import type { MultiRigSequence } from "@/engine/types";
import EmbeddedVisualizer from "@/lab/components/EmbeddedVisualizer.vue";
import { getFiveBeatSplitOppositeEarthHandRadiusShiftSequence } from "@/lab/experiments/archer-weaves/archerWeavesPatterns";
import { getPastedQuarterTimeSequence } from "@/lab/experiments/quarter-time/pastedQuarterTimePattern";

const props = defineProps<{
  id: string;
}>();

const patterns: Record<string, { title: string; summary: string; sequence: MultiRigSequence }> = {
  "archer-weaves-five-beat-radius-shift": {
    title: "5-beat split-op archer weave with hand radius shifts",
    summary:
      "An initial archer-weaves exhibit. The hand radius profiles are authored as time-keyed shifts to approximate the over-under arm path while keeping the pattern inside the current 2D segment model.",
    sequence: getFiveBeatSplitOppositeEarthHandRadiusShiftSequence()
  },
  "pasted-quarter-time": {
    title: "Pasted 3D quarter-time pattern",
    summary:
      "A first live exhibit for the lab-note format: the original authored pattern, compiled through the normal engine and displayed as an embedded visualizer cell.",
    sequence: getPastedQuarterTimeSequence()
  }
};

const pattern = computed(() => patterns[props.id] ?? null);
</script>

<template>
  <div class="lab-live-cell">
    <EmbeddedVisualizer
      v-if="pattern"
      :title="pattern.title"
      :summary="pattern.summary"
      :sequence="pattern.sequence"
    />
    <div
      v-else
      class="rounded-lg border border-rose-900/70 bg-rose-950/45 px-4 py-3 text-sm text-rose-100"
    >
      Unknown pattern cell: {{ props.id }}
    </div>
  </div>
</template>
