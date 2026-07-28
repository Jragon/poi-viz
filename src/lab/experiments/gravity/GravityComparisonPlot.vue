<script setup lang="ts">
import { computed } from "vue";

import type { GravityTracePoint } from "./physics/types";

interface PlotMarker {
  readonly time: number;
  readonly label: string;
  readonly kind: "cardinal" | "event";
}

type ComparisonKey =
  | "normalizedWorldSpeed"
  | "normalizedRelativeSpeed"
  | "normalizedTension"
  | "normalizedEnergy"
  | "normalizedGravityPower"
  | "normalizedHandPower"
  | "normalizedDrivePower"
  | "radialHandVelocity"
  | "normalizedRadialHandVelocity"
  | "tangentialHandAcceleration"
  | "normalizedTangentialHandAcceleration"
  | "radialHandAcceleration"
  | "normalizedRadialHandAcceleration";

const props = withDefaults(
  defineProps<{
    fixedSamples: readonly GravityTracePoint[];
    movingSamples: readonly GravityTracePoint[];
    currentTime: number;
    value: ComparisonKey;
    title: string;
    markers?: readonly PlotMarker[];
    fixedColor?: string;
    movingColor?: string;
    min?: number;
    max?: number;
    target?: number | undefined;
  }>(),
  {
    fixedColor: "#64748b",
    movingColor: "#38bdf8"
  }
);

const WIDTH = 720;
const HEIGHT = 180;
const PAD_X = 12;
const PAD_Y = 18;

const domain = computed(() => {
  const values = [...props.fixedSamples, ...props.movingSamples].map((sample) => sample[props.value] ?? 0);
  const minimum = Math.min(props.min ?? 0, ...values);
  const maximum = Math.max(props.max ?? 1, ...values);
  return { min: minimum, max: Math.max(maximum, minimum + 1e-6) };
});

const endTime = computed(() => Math.max(
  props.fixedSamples.at(-1)?.time ?? 1,
  props.movingSamples.at(-1)?.time ?? 1
));

function xFor(time: number): number {
  return PAD_X + (time / Math.max(endTime.value, 1e-6)) * (WIDTH - PAD_X * 2);
}

function yFor(value: number): number {
  const range = domain.value.max - domain.value.min;
  return HEIGHT - PAD_Y - ((value - domain.value.min) / range) * (HEIGHT - PAD_Y * 2);
}

function pathFor(samples: readonly GravityTracePoint[]): string {
  return samples
    .map((sample, index) => {
      const x = xFor(sample.time).toFixed(2);
      const y = yFor(sample[props.value] ?? 0).toFixed(2);
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

const fixedPath = computed(() => pathFor(props.fixedSamples));
const movingPath = computed(() => pathFor(props.movingSamples));
const currentX = computed(() => xFor(props.currentTime));
const targetY = computed(() => props.target === undefined ? null : yFor(props.target));
</script>

<template>
  <section class="grid gap-2 rounded-lg border border-ui-border-subtle bg-slate-950/70 p-3">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h3 class="text-sm font-medium text-slate-200">{{ props.title }}</h3>
      <span class="flex gap-3 font-mono text-[11px] text-slate-500">
        <span><i class="mr-1 inline-block h-2 w-2 rounded-full" :style="{ backgroundColor: props.fixedColor }"></i>fixed</span>
        <span><i class="mr-1 inline-block h-2 w-2 rounded-full" :style="{ backgroundColor: props.movingColor }"></i>hand circle</span>
        <span v-if="props.target !== undefined" class="text-violet-300">target</span>
      </span>
    </div>
    <div class="flex justify-between font-mono text-[11px] text-slate-500">
      <span>{{ domain.min.toFixed(2) }}</span>
      <span>{{ domain.max.toFixed(2) }}</span>
    </div>
    <svg :viewBox="`0 0 ${WIDTH} ${HEIGHT}`" class="h-auto w-full" role="img" :aria-label="props.title">
      <line :x1="PAD_X" :x2="WIDTH - PAD_X" :y1="yFor(0)" :y2="yFor(0)" class="stroke-slate-700" />
      <path :d="fixedPath" fill="none" :stroke="props.fixedColor" stroke-width="2" stroke-linecap="round" />
      <path :d="movingPath" fill="none" :stroke="props.movingColor" stroke-width="2.5" stroke-linecap="round" />
      <line
        v-if="targetY !== null"
        :x1="PAD_X"
        :x2="WIDTH - PAD_X"
        :y1="targetY"
        :y2="targetY"
        stroke="#a78bfa"
        stroke-width="1.5"
        stroke-dasharray="7 5"
        opacity="0.85"
      />
      <g v-for="marker in props.markers ?? []" :key="`${marker.kind}-${marker.label}-${marker.time}`">
        <line
          :x1="xFor(marker.time)"
          :x2="xFor(marker.time)"
          y1="0"
          :y2="HEIGHT"
          :stroke="marker.kind === 'event' ? '#fb7185' : '#fbbf24'"
          :stroke-dasharray="marker.kind === 'event' ? '2 3' : '5 5'"
          opacity="0.55"
        />
        <text :x="xFor(marker.time) + 3" y="12" fill="currentColor" opacity="0.62" font-size="10">{{ marker.label }}</text>
      </g>
      <line :x1="currentX" :x2="currentX" y1="0" :y2="HEIGHT" class="stroke-slate-200/70" stroke-dasharray="3 4" />
    </svg>
  </section>
</template>
