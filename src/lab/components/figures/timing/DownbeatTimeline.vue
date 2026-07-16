<script setup lang="ts">
import { computed } from "vue";

import {
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

const events = computed(() => downbeatTimes(props.downbeatOffset));
const timelineX = (time: number) => 26 + time * 116;
const accessibleLabel = computed(
  () =>
    `Downbeat timeline. Left downbeat is at cycle time 0. Right downbeat is at ${formatOffset(props.downbeatOffset)}.`
);
</script>

<template>
  <svg
    role="img"
    :aria-label="accessibleLabel"
    viewBox="0 0 152 66"
    class="block h-auto w-full"
    :class="props.compact ? 'max-h-14' : 'max-h-20'"
  >
    <title>Bottom downbeat timeline</title>
    <desc>Separate left and right lanes show only the conventional bottom downbeats.</desc>

    <g aria-hidden="true">
      <line x1="26" y1="22" x2="142" y2="22" class="stroke-slate-700" />
      <line x1="26" y1="43" x2="142" y2="43" class="stroke-slate-700" />

      <text x="8" y="25" class="fill-cyan-300 text-[9px] font-bold">L</text>
      <text x="8" y="46" class="fill-pink-300 text-[9px] font-bold">R</text>

      <g v-for="(label, index) in ['0', '¼', '½', '¾', '1']" :key="label">
        <line
          :x1="timelineX(index / 4)"
          y1="17"
          :x2="timelineX(index / 4)"
          y2="48"
          class="stroke-slate-800"
        />
        <text
          :x="timelineX(index / 4)"
          y="61"
          text-anchor="middle"
          class="fill-slate-500 text-[8px]"
        >
          {{ label }}
        </text>
      </g>

      <circle :cx="timelineX(events.left)" cy="22" r="4" class="fill-cyan-300" />
      <circle :cx="timelineX(events.right)" cy="43" r="4" class="fill-pink-300" />
    </g>
  </svg>
</template>
