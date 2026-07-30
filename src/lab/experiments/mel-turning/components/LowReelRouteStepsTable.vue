<script setup lang="ts">
import {
  lowReelRouteStateLocation,
  type LowReelRouteProjectionInterval,
  type LowReelRouteProjectionStep
} from "@/lab/experiments/mel-turning/model/lowReelRouteProjection";
import type { TurningHand } from "@/lab/experiments/mel-turning/model/turningTypes";

defineProps<{
  steps: readonly LowReelRouteProjectionStep[];
  activeStep?: number | null;
}>();

const emit = defineEmits<{
  selectStep: [step: number];
}>();

function nodeLabel(step: LowReelRouteProjectionStep, hand: TurningHand): string {
  const state = hand === "left" ? step.state.left : step.state.right;
  return `${lowReelRouteStateLocation(step.state, hand)} ${state.planeSide} ${state.phase}`;
}

function regionLabel(step: LowReelRouteProjectionStep): string {
  if (step.outgoingInterval?.kind === "body-turn") return "Turn";
  if (step.region === "turn-target") return "Recovery";
  return step.region;
}

function intervalLabel(interval: LowReelRouteProjectionInterval | null): string {
  if (!interval) return "End";
  if (interval.kind === "body-turn") {
    return `Body turn · L ${interval.leftAction} · R ${interval.rightAction}`;
  }
  if (interval.kind === "circle-extension") {
    return `Circle extension · L ${interval.leftAction} · R ${interval.rightAction}`;
  }
  if (interval.kind === "source-cycle") return "Source cycle";
  if (interval.kind === "target-cycle") return "Target cycle";
  return "Reel continuation";
}
</script>

<template>
  <section class="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/75">
    <header
      class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3"
    >
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Complete finite trace
        </p>
        <p class="mt-1 text-sm text-slate-300">Source cycle · shortest bridge · target cycle</p>
      </div>
      <p class="text-xs text-slate-500">Select a row to scrub playback</p>
    </header>

    <div class="overflow-x-auto">
      <table class="w-full min-w-[54rem] border-collapse text-left text-xs">
        <thead class="bg-slate-900/90 text-slate-400">
          <tr>
            <th class="border-b border-slate-800 px-3 py-2 font-semibold">Halfbeat</th>
            <th class="border-b border-slate-800 px-3 py-2 font-semibold">Facing</th>
            <th class="border-b border-slate-800 px-3 py-2 font-semibold">Region</th>
            <th class="border-b border-slate-800 px-3 py-2 font-semibold">Cyan · left</th>
            <th class="border-b border-slate-800 px-3 py-2 font-semibold">Red · right</th>
            <th class="border-b border-slate-800 px-3 py-2 font-semibold">Outgoing interval</th>
            <th class="border-b border-slate-800 px-3 py-2 font-semibold">Model</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="step in steps"
            :key="step.step"
            class="cursor-pointer border-b border-slate-800/80 align-top transition hover:bg-slate-900/80"
            :class="activeStep === step.step ? 'bg-sky-950/35' : ''"
            @click="emit('selectStep', step.step)"
          >
            <td class="px-3 py-2.5 font-mono text-slate-400">t{{ step.step }}</td>
            <td class="px-3 py-2.5 font-mono text-slate-300">{{ step.state.facing }}°</td>
            <td class="px-3 py-2.5 capitalize text-slate-400">
              {{ regionLabel(step) }}
            </td>
            <td class="px-3 py-2.5 font-mono text-cyan-200">
              {{ nodeLabel(step, "left") }}
            </td>
            <td class="px-3 py-2.5 font-mono text-rose-200">
              {{ nodeLabel(step, "right") }}
            </td>
            <td class="px-3 py-2.5 text-slate-300">
              {{ intervalLabel(step.outgoingInterval) }}
            </td>
            <td class="px-3 py-2.5">
              <span
                v-if="step.outgoingInterval"
                class="inline-flex rounded-full border px-2 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-[0.08em]"
                :class="
                  step.outgoingInterval.modelStatus === 'valid'
                    ? 'border-emerald-700/60 bg-emerald-950/25 text-emerald-200'
                    : 'border-amber-700/60 bg-amber-950/25 text-amber-200'
                "
              >
                {{ step.outgoingInterval.modelStatus }}
              </span>
              <span v-else class="text-slate-600">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
