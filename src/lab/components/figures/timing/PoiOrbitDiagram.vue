<script setup lang="ts">
import { computed } from "vue";

import {
  describeTimingOffset,
  downbeatTimes,
  formatCycleTime,
  formatDirection,
  phaseAtTime,
  phaseToPoint,
  type OrbitDirection,
  type TimingOffset
} from "@/lab/components/figures/timing/timingMath";

const props = withDefaults(
  defineProps<{
    downbeatOffset?: TimingOffset;
    leftDirection?: OrbitDirection;
    rightDirection?: OrbitDirection;
    time?: number;
    compact?: boolean;
    fluid?: boolean;
  }>(),
  {
    downbeatOffset: 0,
    leftDirection: "positive",
    rightDirection: "positive",
    time: 0,
    compact: false
  }
);

const events = computed(() => downbeatTimes(props.downbeatOffset));
const leftPoint = computed(() =>
  phaseToPoint(phaseAtTime(props.time, events.value.left, props.leftDirection), 76, 72, 48)
);
const rightPoint = computed(() =>
  phaseToPoint(phaseAtTime(props.time, events.value.right, props.rightDirection), 76, 72, 48)
);
const pointsCoincide = computed(
  () =>
    Math.abs(leftPoint.value.x - rightPoint.value.x) < 0.01 &&
    Math.abs(leftPoint.value.y - rightPoint.value.y) < 0.01
);
const coincidentLeftMarker = computed(() => {
  const { x, y } = leftPoint.value;
  return `M ${x} ${y - 6} A 6 6 0 0 0 ${x} ${y + 6} Z`;
});
const coincidentRightMarker = computed(() => {
  const { x, y } = rightPoint.value;
  return `M ${x} ${y - 6} A 6 6 0 0 1 ${x} ${y + 6} Z`;
});
const accessibleLabel = computed(
  () =>
    `Wall-plane orbit at cycle time ${formatCycleTime(props.time)}. ` +
    `Left travels ${formatDirection(props.leftDirection)}; right travels ${formatDirection(props.rightDirection)}. ` +
    describeTimingOffset(props.downbeatOffset)
);
</script>

<template>
  <svg
    role="img"
    :aria-label="accessibleLabel"
    viewBox="0 0 152 150"
    class="block h-auto w-full"
    :class="props.fluid ? 'max-h-none' : props.compact ? 'max-h-32' : 'max-h-44'"
  >
    <title>Wall-plane circular timing snapshot</title>
    <desc>
      Left and right poi share one circular orbit. Only the conventional bottom downbeat is marked.
    </desc>

    <g aria-hidden="true">
      <circle cx="76" cy="72" r="48" class="fill-none stroke-slate-700" stroke-width="1.5" />

      <g class="fill-slate-500 text-[10px] font-semibold">
        <text x="76" y="12" text-anchor="middle">U</text>
        <text x="137" y="75" text-anchor="middle">R</text>
        <text x="76" y="137" text-anchor="middle">D</text>
        <text x="15" y="75" text-anchor="middle">L</text>
      </g>

      <path
        d="M 68 126 L 76 136 L 84 126 Z"
        class="poi-orbit-diagram__down-marker fill-amber-300/75"
      />

      <line
        x1="76"
        y1="72"
        :x2="leftPoint.x"
        :y2="leftPoint.y"
        class="stroke-cyan-300"
        stroke-width="2.5"
      />
      <circle
        v-if="!pointsCoincide"
        :cx="leftPoint.x"
        :cy="leftPoint.y"
        r="5"
        class="fill-cyan-300"
      />
      <text
        v-if="!pointsCoincide"
        :x="leftPoint.x"
        :y="leftPoint.y + 2.5"
        text-anchor="middle"
        class="fill-slate-950 text-[7px] font-bold"
      >
        L
      </text>

      <line
        x1="76"
        y1="72"
        :x2="rightPoint.x"
        :y2="rightPoint.y"
        class="stroke-pink-300"
        stroke-width="2.5"
        stroke-dasharray="4 2"
      />
      <circle
        v-if="!pointsCoincide"
        :cx="rightPoint.x"
        :cy="rightPoint.y"
        r="5"
        class="fill-pink-300"
      />
      <text
        v-if="!pointsCoincide"
        :x="rightPoint.x"
        :y="rightPoint.y + 2.5"
        text-anchor="middle"
        class="fill-slate-950 text-[7px] font-bold"
      >
        R
      </text>

      <g v-if="pointsCoincide" class="poi-orbit-diagram__combined-marker">
        <path :d="coincidentLeftMarker" class="fill-cyan-300" />
        <path :d="coincidentRightMarker" class="fill-pink-300" />
        <text
          :x="leftPoint.x - 2.5"
          :y="leftPoint.y + 2.5"
          text-anchor="middle"
          class="fill-slate-950 text-[6px] font-bold"
        >
          L
        </text>
        <text
          :x="rightPoint.x + 2.5"
          :y="rightPoint.y + 2.5"
          text-anchor="middle"
          class="fill-slate-950 text-[6px] font-bold"
        >
          R
        </text>
      </g>

      <text x="100" y="11" text-anchor="middle" class="fill-cyan-300 text-[10px] font-bold">
        L {{ props.leftDirection === "positive" ? "↺" : "↻" }}
      </text>
      <text x="130" y="11" text-anchor="middle" class="fill-pink-300 text-[10px] font-bold">
        R {{ props.rightDirection === "positive" ? "↺" : "↻" }}
      </text>
    </g>
  </svg>
</template>
