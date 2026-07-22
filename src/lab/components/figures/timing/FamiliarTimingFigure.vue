<script setup lang="ts">
import LabFigureGrid from "@/lab/components/figures/LabFigureGrid.vue";
import LabFigurePanel from "@/lab/components/figures/LabFigurePanel.vue";
import PoiOrbitDiagram from "@/lab/components/figures/timing/PoiOrbitDiagram.vue";
import {
  QUARTER_TIMES,
  type OrbitDirection,
  type TimingOffset
} from "@/lab/components/figures/timing/timingMath";

interface FamiliarTimingPanel {
  readonly label: string;
  readonly title: string;
  readonly offset: TimingOffset;
  readonly leftDirection: OrbitDirection;
  readonly rightDirection: OrbitDirection;
}

const panels: readonly FamiliarTimingPanel[] = [
  {
    label: "A",
    title: "Same time · same direction",
    offset: 0,
    leftDirection: "positive",
    rightDirection: "positive"
  },
  {
    label: "B",
    title: "Split time · same direction",
    offset: 0.5,
    leftDirection: "positive",
    rightDirection: "positive"
  },
  {
    label: "C",
    title: "Same time · opposite directions",
    offset: 0,
    leftDirection: "positive",
    rightDirection: "negative"
  },
  {
    label: "D",
    title: "Split time · opposite directions",
    offset: 0.5,
    leftDirection: "positive",
    rightDirection: "negative"
  }
];
</script>

<template>
  <LabFigureGrid layout="two-up">
    <LabFigurePanel
      v-for="panel in panels"
      :key="panel.title"
      :label="panel.label"
      :title="panel.title"
    >
      <div class="grid grid-cols-4 gap-1 rounded-md bg-slate-950/70 p-1">
        <div v-for="time in QUARTER_TIMES" :key="time" class="grid min-w-0 gap-0.5">
          <PoiOrbitDiagram
            :downbeat-offset="panel.offset"
            :left-direction="panel.leftDirection"
            :right-direction="panel.rightDirection"
            :time="time"
            compact
          />
          <span class="text-center font-mono text-[10px] text-ui-text-muted">
            {{ time === 0 ? "0" : time === 0.25 ? "¼" : time === 0.5 ? "½" : "¾" }}
          </span>
        </div>
      </div>
    </LabFigurePanel>
  </LabFigureGrid>
</template>
