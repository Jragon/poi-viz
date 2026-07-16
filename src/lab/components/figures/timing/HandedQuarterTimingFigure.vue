<script setup lang="ts">
import LabFigureGrid from "@/lab/components/figures/LabFigureGrid.vue";
import LabFigurePanel from "@/lab/components/figures/LabFigurePanel.vue";
import PhaseWaveDiagram from "@/lab/components/figures/timing/PhaseWaveDiagram.vue";
import PoiOrbitDiagram from "@/lab/components/figures/timing/PoiOrbitDiagram.vue";
import type { TimingOffset } from "@/lab/components/figures/timing/timingMath";

const quarterForms: readonly {
  label: string;
  title: string;
  offset: TimingOffset;
  reference: string;
}[] = [
  {
    label: "R +¼",
    title: "Right downbeat one quarter later",
    offset: 0.25,
    reference: "Left is the reference"
  },
  {
    label: "L +¼",
    title: "Left downbeat one quarter later",
    offset: 0.75,
    reference: "Right is the reference"
  }
];
</script>

<template>
  <div class="grid min-w-0 gap-3">
    <LabFigureGrid layout="two-up">
      <LabFigurePanel
        v-for="form in quarterForms"
        :key="form.label"
        :label="form.label"
        :title="form.title"
      >
        <p class="text-[11px] text-slate-500">{{ form.reference }}</p>
        <div class="grid min-w-0 items-center gap-2 sm:grid-cols-2">
          <PoiOrbitDiagram :downbeat-offset="form.offset" :time="0" compact />
          <PhaseWaveDiagram :downbeat-offset="form.offset" compact />
        </div>
      </LabFigurePanel>
    </LabFigureGrid>
    <p class="text-center text-xs font-medium text-slate-300">
      Swap L ↔ R: R +¼ ↔ L +¼. Same 0/4 and split 2/4 remain unchanged.
    </p>
  </div>
</template>
