<script setup lang="ts">
import LabFigureGrid from "@/lab/components/figures/LabFigureGrid.vue";
import LabFigurePanel from "@/lab/components/figures/LabFigurePanel.vue";
import PhaseWaveDiagram from "@/lab/components/figures/timing/PhaseWaveDiagram.vue";
import { classifyOffset, type TimingOffset } from "@/lab/components/figures/timing/timingMath";

const panelTitle = {
  same: "Same",
  "quarter-right": "R +¼",
  split: "Split",
  "quarter-left": "L +¼"
} as const;

const displayedOffsets: readonly {
  label: string;
  offset: TimingOffset;
}[] = [
  { label: "0/4", offset: 0 },
  { label: "1/4", offset: 0.75 },
  { label: "2/4", offset: 0.5 },
  { label: "3/4", offset: 0.25 }
];
</script>

<template>
  <div class="grid min-w-0 gap-3">
    <p class="text-xs leading-5 text-slate-400">
      Quarter labels name the downbeat that leads: R +¼ means right occurs one quarter before left.
    </p>
    <LabFigureGrid layout="four-strip">
      <LabFigurePanel
        v-for="item in displayedOffsets"
        :key="item.label"
        :label="item.label"
        :title="panelTitle[classifyOffset(item.offset)]"
      >
        <PhaseWaveDiagram :downbeat-offset="item.offset" compact />
      </LabFigurePanel>
    </LabFigureGrid>
  </div>
</template>
