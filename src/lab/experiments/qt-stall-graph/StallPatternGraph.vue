<script setup lang="ts">
import { computed } from "vue";

import type { PlaneId } from "@/engine/types";
import { CARDINAL_LABELS } from "@/lab/experiments/qt-stall-graph/cardinals";
import {
  buildStallGraphGeometry,
  type StallGraphBeatRange,
  type StallGraphDensity,
  type StallGraphOrientation,
  type StallGraphPointView
} from "@/lab/experiments/qt-stall-graph/stallGraphGeometry";
import type {
  StallPatternDraft,
  StallPatternHand
} from "@/lab/experiments/qt-stall-graph/stallPattern";
import { LAB_PLANE_COLORS } from "@/lab/planePresentation";

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
    fillContainer?: boolean;
    editingHand?: StallPatternHand | undefined;
    connectorColor?: "hand" | "plane";
  }>(),
  {
    orientation: "horizontal",
    density: "compact",
    showTerminal: true,
    activeBeat: null,
    ariaLabel: "Quarter-time stall pattern graph",
    showCardinalLabels: true,
    fitToContainer: true,
    fillContainer: false,
    connectorColor: "hand"
  }
);

const emit = defineEmits<{
  placeNode: [
    payload: {
      readonly beatIndex: number;
      readonly cardinal: import("@/lab/experiments/qt-stall-graph/cardinals").Cardinal;
    }
  ];
}>();

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
  if (props.connectorColor === "plane") return "";
  return hand === "left" ? "stroke-cyan-300" : "stroke-pink-300";
}

function connectorStroke(planeId: PlaneId | null): string | undefined {
  if (props.connectorColor !== "plane" || planeId === null) return undefined;
  return LAB_PLANE_COLORS[planeId];
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
    :class="
      props.fillContainer
        ? 'h-full w-full'
        : props.fitToContainer
          ? 'h-auto max-w-full'
          : 'max-w-none'
    "
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
        :stroke="connectorStroke(connector.planeId)"
        :stroke-width="geometry.layout.strokeWidth"
        :stroke-dasharray="
          props.connectorColor === 'plane' && connector.hand === 'right' ? '4 3' : undefined
        "
        stroke-linecap="round"
        :data-plane="connector.planeId ?? undefined"
        :data-hand="connector.hand"
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

    <g v-if="props.editingHand">
      <foreignObject
        v-for="target in geometry.clickTargets"
        :key="target.key"
        :x="target.x - 15"
        :y="target.y - 15"
        width="30"
        height="30"
      >
        <button
          type="button"
          class="grid h-[30px] w-[30px] place-items-center rounded-full bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
          :aria-label="`${props.editingHand} hand beat ${target.beatIndex + 1} ${CARDINAL_LABELS[target.cardinal]}`"
          @click="emit('placeNode', { beatIndex: target.beatIndex, cardinal: target.cardinal })"
        >
          <span class="sr-only">{{ target.cardinal }}</span>
        </button>
      </foreignObject>
    </g>
  </svg>
</template>
