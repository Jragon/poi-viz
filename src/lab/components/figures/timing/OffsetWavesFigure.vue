<script setup lang="ts">
import LabFigureGrid from "@/lab/components/figures/LabFigureGrid.vue";
import LabFigurePanel from "@/lab/components/figures/LabFigurePanel.vue";
import DownbeatTimeline from "@/lab/components/figures/timing/DownbeatTimeline.vue";
import PhaseWaveDiagram from "@/lab/components/figures/timing/PhaseWaveDiagram.vue";
import {
  classifyOffset,
  formatOffset,
  TIMING_OFFSETS
} from "@/lab/components/figures/timing/timingMath";

const panelTitle = {
  same: "Same",
  "quarter-right": "R +¼",
  split: "Split",
  "quarter-left": "L +¼"
} as const;
</script>

<template>
  <div class="grid min-w-0 gap-3">
    <p class="text-xs leading-5 text-slate-400">
      Reference: left downbeat = 0. Offset = right downbeat − left downbeat, modulo one cycle.
    </p>
    <LabFigureGrid layout="four-strip">
      <LabFigurePanel
        v-for="offset in TIMING_OFFSETS"
        :key="offset"
        :label="formatOffset(offset)"
        :title="panelTitle[classifyOffset(offset)]"
      >
        <PhaseWaveDiagram :downbeat-offset="offset" compact />
        <DownbeatTimeline :downbeat-offset="offset" compact />
      </LabFigurePanel>
    </LabFigureGrid>
  </div>
</template>
