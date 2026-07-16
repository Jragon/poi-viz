<script setup lang="ts">
import { computed } from "vue";

import EmbeddedVisualizer from "@/lab/components/EmbeddedVisualizer.vue";
import StallPatternStrip from "@/lab/experiments/qt-stall-graph/StallPatternStrip.vue";
import { useStallPatternSelection } from "@/lab/experiments/qt-stall-graph/useStallPatternSelection";
import { WALL_PLANE_TIMING_MATRIX } from "@/lab/experiments/qt-stall-graph/wallPlaneTimingPatterns";

const patterns = WALL_PLANE_TIMING_MATRIX.flatMap((row) => row.patterns);
const { selectedCodec, selection, select } = useStallPatternSelection(patterns);
const selectedPattern = computed(() =>
  patterns.find((pattern) => pattern.codec === selectedCodec.value)
);
const selectionSummary = computed(
  () =>
    `${selectedPattern.value?.ariaLabel ?? selectedPattern.value?.label ?? "Pattern"} · ${selectedCodec.value ?? ""}`
);
</script>

<template>
  <div class="grid min-w-0 gap-4">
    <p class="text-xs text-slate-400">
      Right <span class="font-mono text-pink-300">URDL</span> is fixed. Select a graph for one
      shared preview.
    </p>
    <section
      v-for="row in WALL_PLANE_TIMING_MATRIX"
      :key="row.id"
      class="grid min-w-0 gap-2"
      :aria-labelledby="`timing-row-${row.id}`"
    >
      <h4
        :id="`timing-row-${row.id}`"
        class="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400"
      >
        {{ row.label }}
      </h4>
      <StallPatternStrip
        :patterns="row.patterns"
        :ariaLabel="`${row.label} timing offsets`"
        :selected-codec="selectedCodec"
        selectable
        @select="select"
      />
    </section>

    <EmbeddedVisualizer
      v-if="selection"
      :sequence="selection.sequence"
      title="Selected timing and direction"
      :summary="selectionSummary"
      size="compact"
      :autoplay="false"
      :show-body-rig="true"
      projection-mode="auto"
    />
  </div>
</template>
