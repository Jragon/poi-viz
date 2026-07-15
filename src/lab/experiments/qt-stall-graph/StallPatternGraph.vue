<script setup lang="ts">
import { computed } from "vue";

import {
  buildStallGraphGeometry,
  type StallGraphBeatRange,
  type StallGraphDensity,
  type StallGraphOrientation,
  type StallGraphPointView
} from "@/lab/experiments/qt-stall-graph/stallGraphGeometry";
import type { StallPatternDraft } from "@/lab/experiments/qt-stall-graph/stallPattern";

const props = withDefaults(
  defineProps<{
    draft: StallPatternDraft;
    orientation?: StallGraphOrientation;
    density?: StallGraphDensity;
    beatRange?: StallGraphBeatRange;
    showTerminal?: boolean;
    activeBeat?: number | null;
    ariaLabel?: string;
    showCardinalLabels?: boolean;
    fitToContainer?: boolean;
  }>(),
  {
    orientation: "horizontal",
    density: "compact",
    showTerminal: true,
    activeBeat: null,
    ariaLabel: "Quarter-time stall pattern graph",
    showCardinalLabels: true,
    fitToContainer: true
  }
);

const geometry = computed(() =>
  buildStallGraphGeometry(props.draft, {
    orientation: props.orientation,
    density: props.density,
    ...(props.beatRange ? { beatRange: props.beatRange } : {}),
    showTerminal: props.showTerminal,
    activeBeat: props.activeBeat
  })
);

function connectorClass(hand: "left" | "right", isLegal: boolean): string {
  if (!isLegal) return "stroke-red-400";
  return hand === "left" ? "stroke-cyan-300" : "stroke-pink-300";
}

function pointClass(point: StallGraphPointView): string {
  if (point.hand === "left") return "fill-slate-950 stroke-cyan-300";
  return "fill-slate-950 stroke-pink-300";
}

function pointRadius(point: StallGraphPointView): number {
  return point.isShared && point.hand === "right"
    ? geometry.value.layout.sharedNodeRadius
    : geometry.value.layout.nodeRadius;
}
</script>

<template>
  <svg
    role="img"
    :aria-label="props.ariaLabel"
    :viewBox="`0 0 ${geometry.width} ${geometry.height}`"
    :width="geometry.width"
    :height="geometry.height"
    class="block text-slate-400"
    :class="props.fitToContainer ? 'h-auto max-w-full' : 'max-w-none'"
    :data-orientation="geometry.orientation"
  >
    <g aria-hidden="true">
      <line
        v-for="line in geometry.cardinalLines"
        :key="line.key"
        :x1="line.x1"
        :y1="line.y1"
        :x2="line.x2"
        :y2="line.y2"
        class="stroke-slate-800"
        stroke-width="1"
      />
      <line
        v-for="line in geometry.beatLines"
        :key="line.key"
        :x1="line.x1"
        :y1="line.y1"
        :x2="line.x2"
        :y2="line.y2"
        class="stroke-slate-800/70"
        stroke-width="1"
      />
    </g>

    <line
      v-if="geometry.activeLine"
      :x1="geometry.activeLine.x1"
      :y1="geometry.activeLine.y1"
      :x2="geometry.activeLine.x2"
      :y2="geometry.activeLine.y2"
      class="stroke-amber-300/35"
      :stroke-width="geometry.layout.nodeRadius * 2.5"
    />

    <g aria-hidden="true">
      <text
        v-for="label in props.showCardinalLabels ? geometry.cardinalLabels : []"
        :key="label.key"
        :x="label.x"
        :y="label.y"
        :text-anchor="label.textAnchor"
        :dominant-baseline="label.dominantBaseline"
        class="fill-slate-400 font-medium"
        :font-size="geometry.layout.labelFontSize"
      >
        {{ label.text }}
      </text>
      <text
        v-for="label in geometry.beatLabels"
        :key="label.key"
        :x="label.x"
        :y="label.y"
        :text-anchor="label.textAnchor"
        :dominant-baseline="label.dominantBaseline"
        class="fill-slate-500 font-mono"
        :class="label.isTerminal ? 'opacity-60' : ''"
        :font-size="geometry.layout.labelFontSize"
      >
        {{ label.text }}
      </text>
    </g>

    <g aria-hidden="true">
      <line
        v-for="connector in geometry.connectors"
        :key="connector.key"
        :x1="connector.x1"
        :y1="connector.y1"
        :x2="connector.x2"
        :y2="connector.y2"
        :class="connectorClass(connector.hand, connector.isLegal)"
        :stroke-width="geometry.layout.strokeWidth"
        stroke-linecap="round"
      />
    </g>

    <g aria-hidden="true">
      <circle
        v-for="point in geometry.points"
        :key="point.key"
        :cx="point.x"
        :cy="point.y"
        :r="pointRadius(point)"
        :class="pointClass(point)"
        :stroke-width="geometry.layout.strokeWidth"
        :stroke-dasharray="point.isTerminal ? '2 2' : undefined"
      />
    </g>
  </svg>
</template>
