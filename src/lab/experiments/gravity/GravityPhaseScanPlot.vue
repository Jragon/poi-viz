<script setup lang="ts">
import { computed } from "vue";

interface PhaseScanPoint {
  readonly phaseDeg: number;
  readonly speedRipple: number | null;
  readonly minimumTension: number | null;
}

const props = defineProps<{
  points: readonly PhaseScanPoint[];
  selectedPhase: number;
}>();

const WIDTH = 720;
const HEIGHT = 170;
const PAD_X = 24;
const PAD_Y = 20;

function xFor(phase: number): number {
  return PAD_X + (phase / 360) * (WIDTH - PAD_X * 2);
}

function pathFor(value: "speedRipple" | "minimumTension", min: number, max: number): string {
  const range = Math.max(max - min, 1e-6);
  return props.points
    .filter((point) => point[value] !== null)
    .map((point, index) => {
      const current = point[value] ?? 0;
      const x = xFor(point.phaseDeg).toFixed(2);
      const y = (HEIGHT - PAD_Y - ((current - min) / range) * (HEIGHT - PAD_Y * 2)).toFixed(2);
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

const rippleMax = computed(() => Math.max(0.01, ...props.points.map((point) => point.speedRipple ?? 0)) * 1.1);
const tensionMin = computed(() => Math.min(0, ...props.points.map((point) => point.minimumTension ?? 0)));
const tensionMax = computed(() => Math.max(1, ...props.points.map((point) => point.minimumTension ?? 0)));
const ripplePath = computed(() => pathFor("speedRipple", 0, rippleMax.value));
const tensionPath = computed(() => pathFor("minimumTension", tensionMin.value, tensionMax.value));
const selectedX = computed(() => xFor(Math.max(0, Math.min(360, props.selectedPhase))));
</script>

<template>
  <section class="grid gap-3 rounded-lg border border-ui-border-subtle bg-slate-950/70 p-3">
    <div class="grid gap-1">
      <h3 class="text-sm font-medium text-slate-200">What does hand phase cost?</h3>
      <p class="text-xs leading-5 text-slate-500">
        Each point reruns one complete poi loop with the same path shape, amplitude, and rate.
        Lower ripple is flatter; negative minimum tension means the tether releases.
      </p>
    </div>
    <div class="grid gap-3 lg:grid-cols-2">
      <div class="grid gap-1">
        <div class="flex justify-between text-[11px] text-slate-500">
          <span>speed ripple</span>
          <span>{{ (rippleMax * 100).toFixed(0) }}% max</span>
        </div>
        <svg :viewBox="`0 0 ${WIDTH} ${HEIGHT}`" class="h-auto w-full" role="img" aria-label="Speed ripple by hand phase">
          <line :x1="PAD_X" :x2="WIDTH - PAD_X" :y1="HEIGHT - PAD_Y" :y2="HEIGHT - PAD_Y" class="stroke-slate-700" />
          <line v-for="phase in [0, 90, 180, 270, 360]" :key="phase" :x1="xFor(phase)" :x2="xFor(phase)" y1="0" :y2="HEIGHT" class="stroke-slate-800" />
          <path :d="ripplePath" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" />
          <line :x1="selectedX" :x2="selectedX" y1="0" :y2="HEIGHT" class="stroke-amber-300" stroke-dasharray="3 4" />
          <text v-for="phase in [0, 90, 180, 270, 360]" :key="`ripple-${phase}`" :x="xFor(phase) - 8" :y="HEIGHT - 4" fill="currentColor" opacity="0.6" font-size="10">{{ phase }}°</text>
        </svg>
      </div>
      <div class="grid gap-1">
        <div class="flex justify-between text-[11px] text-slate-500">
          <span>minimum tension</span>
          <span>{{ tensionMin.toFixed(2) }} → {{ tensionMax.toFixed(2) }}</span>
        </div>
        <svg :viewBox="`0 0 ${WIDTH} ${HEIGHT}`" class="h-auto w-full" role="img" aria-label="Minimum tension by hand phase">
          <line :x1="PAD_X" :x2="WIDTH - PAD_X" :y1="HEIGHT - PAD_Y" :y2="HEIGHT - PAD_Y" class="stroke-slate-700" />
          <line :x1="PAD_X" :x2="WIDTH - PAD_X" :y1="HEIGHT - PAD_Y - ((0 - tensionMin) / Math.max(tensionMax - tensionMin, 1e-6)) * (HEIGHT - PAD_Y * 2)" :y2="HEIGHT - PAD_Y - ((0 - tensionMin) / Math.max(tensionMax - tensionMin, 1e-6)) * (HEIGHT - PAD_Y * 2)" class="stroke-rose-400/60" stroke-dasharray="4 4" />
          <line v-for="phase in [0, 90, 180, 270, 360]" :key="phase" :x1="xFor(phase)" :x2="xFor(phase)" y1="0" :y2="HEIGHT" class="stroke-slate-800" />
          <path :d="tensionPath" fill="none" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round" />
          <line :x1="selectedX" :x2="selectedX" y1="0" :y2="HEIGHT" class="stroke-amber-300" stroke-dasharray="3 4" />
          <text v-for="phase in [0, 90, 180, 270, 360]" :key="`tension-${phase}`" :x="xFor(phase) - 8" :y="HEIGHT - 4" fill="currentColor" opacity="0.6" font-size="10">{{ phase }}°</text>
        </svg>
      </div>
    </div>
    <p class="text-xs text-slate-500">The amber guide is the current phase. This is a scan, not an optimizer.</p>
  </section>
</template>
