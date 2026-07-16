<script setup lang="ts">
import { computed } from "vue";

import {
  buildHeightWavePath,
  downbeatTimes,
  formatOffset,
  type TimingOffset
} from "@/lab/components/figures/timing/timingMath";

const props = withDefaults(
  defineProps<{
    downbeatOffset?: TimingOffset;
    compact?: boolean;
  }>(),
  { downbeatOffset: 0, compact: false }
);

const plotLeft = 29;
const plotWidth = 113;
const plotTop = 13;
const amplitude = 22;
const events = computed(() => downbeatTimes(props.downbeatOffset));
const leftPath = computed(() =>
  buildHeightWavePath(events.value.left, plotWidth, plotTop, amplitude)
);
const rightPath = computed(() =>
  buildHeightWavePath(events.value.right, plotWidth, plotTop, amplitude)
);
const accessibleLabel = computed(
  () =>
    `Wall height over one circular cycle. The right bottom downbeat is offset by ${formatOffset(props.downbeatOffset)} from the left.`
);
</script>

<template>
  <div class="grid min-w-0 gap-1">
    <svg
      role="img"
      :aria-label="accessibleLabel"
      viewBox="0 0 152 82"
      class="block h-auto w-full"
      :class="props.compact ? 'max-h-20' : 'max-h-28'"
    >
      <title>Wall-plane height waves</title>
      <desc>
        Sine traces show each poi rising from bottom to top and returning to the conventional bottom
        downbeat.
      </desc>

      <g aria-hidden="true">
        <line x1="103" y1="7" x2="112" y2="7" class="stroke-cyan-300" stroke-width="2" />
        <text x="115" y="9" class="fill-cyan-300 text-[7px] font-bold">L</text>
        <line
          x1="124"
          y1="7"
          x2="133"
          y2="7"
          class="stroke-pink-300"
          stroke-width="2"
          stroke-dasharray="3 2"
        />
        <text x="136" y="9" class="fill-pink-300 text-[7px] font-bold">R</text>
        <line x1="29" y1="13" x2="142" y2="13" class="stroke-slate-800" />
        <line x1="29" y1="35" x2="142" y2="35" class="stroke-slate-800" />
        <line x1="29" y1="57" x2="142" y2="57" class="stroke-slate-800" />
        <text x="22" y="16" text-anchor="end" class="fill-slate-500 text-[8px]">top</text>
        <text x="22" y="38" text-anchor="end" class="fill-slate-500 text-[8px]">centre</text>
        <text x="22" y="60" text-anchor="end" class="fill-amber-200 text-[8px]">bottom</text>

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

        <text x="29" y="76" text-anchor="middle" class="fill-slate-500 text-[8px]">0</text>
        <text x="85.5" y="76" text-anchor="middle" class="fill-slate-500 text-[8px]">½</text>
        <text x="142" y="76" text-anchor="middle" class="fill-slate-500 text-[8px]">1</text>
      </g>
    </svg>
    <p class="text-center text-[10px] leading-4 text-slate-500">
      Vertical position on the wall plane
    </p>
  </div>
</template>
