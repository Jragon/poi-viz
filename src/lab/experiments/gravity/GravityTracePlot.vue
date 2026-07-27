<script setup lang="ts">
import { computed } from "vue";

import type { GravityTracePoint } from "./physics/types";

type TraceKey =
  | "normalizedWorldSpeed"
  | "normalizedRelativeSpeed"
  | "normalizedTension"
  | "normalizedEnergy"
  | "radiusRatio"
  | "normalizedTorque"
  | "normalizedPower";

const props = withDefaults(
  defineProps<{
    samples: readonly GravityTracePoint[];
    currentTime: number;
    value: TraceKey;
    title: string;
    color?: string;
    min?: number;
    max?: number;
  }>(),
  {
    color: "#38bdf8"
  }
);

const WIDTH = 720;
const HEIGHT = 170;
const PAD_X = 12;
const PAD_Y = 18;

const domain = computed(() => {
  const values = props.samples.map((sample) => sample[props.value] ?? 0);
  const minimum = Math.min(props.min ?? 0, ...values);
  const maximum = Math.max(props.max ?? 1, ...values);
  return { min: minimum, max: Math.max(maximum, minimum + 1e-6) };
});

function xFor(time: number): number {
  const end = props.samples.at(-1)?.time ?? 1;
  return PAD_X + (time / Math.max(end, 1e-6)) * (WIDTH - PAD_X * 2);
}

function yFor(value: number): number {
  const range = domain.value.max - domain.value.min;
  return HEIGHT - PAD_Y - ((value - domain.value.min) / range) * (HEIGHT - PAD_Y * 2);
}

const path = computed(() =>
  props.samples
    .map((sample, index) => {
      const x = xFor(sample.time).toFixed(2);
      const y = yFor(sample[props.value] ?? 0).toFixed(2);
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ")
);

const slackRegions = computed(() => {
  const regions: { readonly x: number; readonly width: number }[] = [];
  let start: number | null = null;
  props.samples.forEach((sample, index) => {
    const slack = sample.mode === "slack";
    if (slack && start === null) start = sample.time;
    if (!slack && start !== null) {
      const regionStart = start;
      regions.push({ x: xFor(regionStart), width: xFor(props.samples[index - 1]?.time ?? sample.time) - xFor(regionStart) });
      start = null;
    }
  });
  if (start !== null) {
    regions.push({ x: xFor(start), width: xFor(props.samples.at(-1)?.time ?? start) - xFor(start) });
  }
  return regions.filter((region) => region.width > 0.5);
});

const currentX = computed(() => xFor(props.currentTime));
</script>

<template>
  <section class="grid gap-2 rounded-lg border border-ui-border-subtle bg-slate-950/70 p-3">
    <div class="flex items-center justify-between gap-3">
      <h3 class="text-sm font-medium text-slate-200">{{ props.title }}</h3>
      <span class="font-mono text-[11px] text-slate-500">
        {{ domain.min.toFixed(2) }} → {{ domain.max.toFixed(2) }}
      </span>
    </div>
    <svg
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      class="h-auto w-full"
      role="img"
      :aria-label="props.title"
    >
      <line :x1="PAD_X" :x2="WIDTH - PAD_X" :y1="yFor(0)" :y2="yFor(0)" class="stroke-slate-700" />
      <rect
        v-for="(region, index) in slackRegions"
        :key="index"
        :x="region.x"
        y="0"
        :width="region.width"
        :height="HEIGHT"
        fill="#f59e0b"
        opacity="0.1"
      />
      <path :d="path" fill="none" :stroke="props.color" stroke-width="2.5" stroke-linecap="round" />
      <line
        :x1="currentX"
        :x2="currentX"
        y1="0"
        :y2="HEIGHT"
        class="stroke-slate-200/70"
        stroke-dasharray="3 4"
      />
    </svg>
  </section>
</template>
