<script setup lang="ts">
import { computed } from "vue";

import {
  buildHeightWavePath,
  describeTimingOffset,
  downbeatTimes,
  normalizePhase,
  wallHeightAtTime,
  type TimingOffset
} from "@/lab/components/figures/timing/timingMath";

const props = defineProps<{
  downbeatOffset?: TimingOffset;
  compact?: boolean;
  fluid?: boolean;
  time?: number;
}>();

const plotLeft = 42;
const plotWidth = 113;
const plotTop = 13;
const amplitude = 22;
const downbeatOffset = computed(() => props.downbeatOffset ?? 0);
const events = computed(() => downbeatTimes(downbeatOffset.value));
const leftPath = computed(() =>
  buildHeightWavePath(events.value.left, plotWidth, plotTop, amplitude)
);
const rightPath = computed(() =>
  buildHeightWavePath(events.value.right, plotWidth, plotTop, amplitude)
);
const playheadTime = computed(() => normalizePhase(props.time ?? 0));
const playheadX = computed(() => plotLeft + playheadTime.value * plotWidth);
const waveY = (downbeatTime: number) =>
  plotTop + amplitude - wallHeightAtTime(playheadTime.value, downbeatTime) * amplitude;
const leftMarkerY = computed(() => waveY(events.value.left));
const rightMarkerY = computed(() => waveY(events.value.right));
const markersCoincide = computed(() => Math.abs(leftMarkerY.value - rightMarkerY.value) < 0.01);
function semicirclePath(y: number, side: "left" | "right"): string {
  const sweep = side === "left" ? 0 : 1;
  return `M ${playheadX.value} ${y - 4} A 4 4 0 0 ${sweep} ${playheadX.value} ${y + 4} Z`;
}
const accessibleLabel = computed(
  () => `Wall height over one circular cycle. ${describeTimingOffset(downbeatOffset.value)}`
);
</script>

<template>
  <div class="grid min-w-0 gap-1">
    <svg
      role="img"
      :aria-label="accessibleLabel"
      viewBox="0 0 165 82"
      class="block h-auto w-full"
      :class="props.fluid ? 'max-h-none' : props.compact ? 'max-h-24' : 'max-h-28'"
    >
      <title>Wall-plane height waves</title>
      <desc>
        Sine traces show each poi rising from bottom to top and returning to the conventional bottom
        downbeat.
      </desc>

      <g aria-hidden="true">
        <line x1="116" y1="7" x2="125" y2="7" class="stroke-cyan-300" stroke-width="2" />
        <text x="128" y="9" class="fill-cyan-300 text-[7px] font-bold">L</text>
        <line
          x1="137"
          y1="7"
          x2="146"
          y2="7"
          class="stroke-pink-300"
          stroke-width="2"
          stroke-dasharray="3 2"
        />
        <text x="149" y="9" class="fill-pink-300 text-[7px] font-bold">R</text>
        <line x1="42" y1="13" x2="155" y2="13" class="stroke-slate-800" />
        <line x1="42" y1="35" x2="155" y2="35" class="stroke-slate-800" />
        <line x1="42" y1="57" x2="155" y2="57" class="stroke-slate-800" />
        <text x="35" y="16" text-anchor="end" class="fill-slate-500 text-[8px]">top</text>
        <text x="35" y="38" text-anchor="end" class="fill-slate-500 text-[8px]">centre</text>
        <text x="35" y="60" text-anchor="end" class="fill-amber-200 text-[8px]">bottom</text>

        <path
          :d="leftPath"
          :transform="`translate(${plotLeft} 0)`"
          class="fill-none stroke-cyan-300"
          stroke-width="2"
        />
        <path
          :d="rightPath"
          :transform="`translate(${plotLeft} 0)`"
          class="fill-none stroke-pink-300"
          stroke-width="2"
          stroke-dasharray="4 2"
        />

        <circle :cx="plotLeft + events.left * plotWidth" cy="57" r="3.5" class="fill-cyan-300" />
        <circle :cx="plotLeft + events.right * plotWidth" cy="57" r="3.5" class="fill-pink-300" />

        <g v-if="props.time !== undefined" class="phase-wave-diagram__playhead">
          <line
            :x1="playheadX"
            y1="11"
            :x2="playheadX"
            y2="62"
            class="stroke-amber-200/70"
            stroke-width="1.5"
          />
          <template v-if="markersCoincide">
            <path :d="semicirclePath(leftMarkerY, 'left')" class="fill-cyan-300" />
            <path :d="semicirclePath(rightMarkerY, 'right')" class="fill-pink-300" />
          </template>
          <template v-else>
            <circle :cx="playheadX" :cy="leftMarkerY" r="4" class="fill-cyan-300" />
            <circle :cx="playheadX" :cy="rightMarkerY" r="4" class="fill-pink-300" />
          </template>
        </g>

        <text x="42" y="76" text-anchor="middle" class="fill-slate-500 text-[8px]">0</text>
        <text x="98.5" y="76" text-anchor="middle" class="fill-slate-500 text-[8px]">½</text>
        <text x="155" y="76" text-anchor="middle" class="fill-slate-500 text-[8px]">1</text>
      </g>
    </svg>
    <p class="text-center text-[10px] leading-4 text-slate-500">
      Vertical position on the wall plane
    </p>
  </div>
</template>
