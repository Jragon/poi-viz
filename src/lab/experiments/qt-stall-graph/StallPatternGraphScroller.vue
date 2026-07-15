<script setup lang="ts">
import { computed } from "vue";

import { CARDINAL_ORDER } from "@/lab/experiments/qt-stall-graph/cardinals";
import {
  buildStallGraphGeometry,
  type StallGraphDensity
} from "@/lab/experiments/qt-stall-graph/stallGraphGeometry";
import type { StallPatternDraft } from "@/lab/experiments/qt-stall-graph/stallPattern";
import StallPatternGraph from "@/lab/experiments/qt-stall-graph/StallPatternGraph.vue";

const props = withDefaults(
  defineProps<{
    draft: StallPatternDraft;
    density?: StallGraphDensity;
    activeBeat?: number | null;
    ariaLabel?: string;
  }>(),
  {
    density: "editor",
    activeBeat: null,
    ariaLabel: "Scrollable horizontal quarter-time stall pattern graph"
  }
);

const geometry = computed(() =>
  buildStallGraphGeometry(props.draft, {
    orientation: "horizontal",
    density: props.density,
    activeBeat: props.activeBeat
  })
);
const labelPanelWidth = computed(
  () => geometry.value.layout.leftPad - geometry.value.layout.nodeRadius - 2
);

function labelTop(index: number): string {
  return `${geometry.value.layout.topPad + index * geometry.value.layout.cardinalGap}px`;
}
</script>

<template>
  <div class="relative isolate min-w-0 max-w-full overflow-hidden rounded-md bg-slate-950">
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-y-0 left-0 z-10 border-r border-slate-800/80 bg-slate-950/95 shadow-[10px_0_16px_rgba(2,6,23,0.88)]"
      :style="{
        width: `${labelPanelWidth}px`,
        height: `${geometry.height}px`
      }"
    >
      <span
        v-for="(cardinal, index) in CARDINAL_ORDER"
        :key="cardinal"
        class="absolute right-2 -translate-y-1/2 text-slate-400"
        :style="{
          top: labelTop(index),
          fontSize: `${geometry.layout.labelFontSize}px`
        }"
      >
        {{ cardinal }}
      </span>
    </div>

    <div class="overflow-x-auto overscroll-x-contain">
      <StallPatternGraph
        :draft="props.draft"
        orientation="horizontal"
        :density="props.density"
        :active-beat="props.activeBeat"
        :aria-label="props.ariaLabel"
        :show-cardinal-labels="false"
        :fit-to-container="false"
      />
    </div>
  </div>
</template>
