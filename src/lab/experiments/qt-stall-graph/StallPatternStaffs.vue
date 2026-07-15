<script setup lang="ts">
import { computed } from "vue";

import type {
  StallGraphBeatRange,
  StallGraphDensity
} from "@/lab/experiments/qt-stall-graph/stallGraphGeometry";
import type { StallPatternDraft } from "@/lab/experiments/qt-stall-graph/stallPattern";
import StallPatternGraph from "@/lab/experiments/qt-stall-graph/StallPatternGraph.vue";

const props = withDefaults(
  defineProps<{
    draft: StallPatternDraft;
    beatsPerStaff?: number;
    density?: StallGraphDensity;
  }>(),
  {
    beatsPerStaff: 8,
    density: "compact"
  }
);

const ranges = computed<readonly StallGraphBeatRange[]>(() => {
  if (!Number.isInteger(props.beatsPerStaff) || props.beatsPerStaff < 1) {
    throw new Error("Stall pattern beatsPerStaff must be a positive integer");
  }

  const result: StallGraphBeatRange[] = [];
  for (let start = 0; start < props.draft.beatCount; start += props.beatsPerStaff) {
    result.push({
      start,
      count: Math.min(props.beatsPerStaff, props.draft.beatCount - start)
    });
  }
  return result;
});
</script>

<template>
  <div class="grid gap-3">
    <div v-for="range in ranges" :key="range.start" class="overflow-hidden">
      <StallPatternGraph
        :draft="props.draft"
        orientation="horizontal"
        :density="props.density"
        :beat-range="range"
        :aria-label="`Quarter-time stall pattern beats ${range.start + 1} to ${range.start + range.count}`"
      />
    </div>
  </div>
</template>
