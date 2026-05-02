<script setup lang="ts">
import { computed, ref } from "vue";

import EmbeddedVisualizer from "@/experiments/components/EmbeddedVisualizer.vue";
import {
  buildElementaryQuarterTimeSequence,
  ELEMENTARY_QUARTER_ARCS,
  ELEMENTARY_TIMING_OPTIONS,
  getElementaryTimingOption,
  type ElementaryQuarterArcId,
  type ElementaryTimingMode
} from "@/experiments/quarterTime/elementaryQuarterTime";

type HandId = "left" | "right";

const leftArcId = ref<ElementaryQuarterArcId>("0-90");
const rightArcId = ref<ElementaryQuarterArcId>("180-270");
const timingMode = ref<ElementaryTimingMode>("together");

const activeTiming = computed(() => getElementaryTimingOption(timingMode.value));
const sequence = computed(() =>
  buildElementaryQuarterTimeSequence({
    leftArcId: leftArcId.value,
    rightArcId: rightArcId.value,
    timingMode: timingMode.value
  })
);
const summary = computed(
  () =>
    `${activeTiming.value.label}: left ${leftArcId.value}, right ${rightArcId.value}, ${activeTiming.value.relation}.`
);

function isSelectedArc(handId: HandId, arcId: ElementaryQuarterArcId): boolean {
  return handId === "left" ? leftArcId.value === arcId : rightArcId.value === arcId;
}

function selectArc(handId: HandId, arcId: ElementaryQuarterArcId) {
  if (handId === "left") {
    leftArcId.value = arcId;
    return;
  }

  rightArcId.value = arcId;
}

function selectTiming(nextTimingMode: ElementaryTimingMode) {
  timingMode.value = nextTimingMode;
}

function arcButtonClass(handId: HandId, arcId: ElementaryQuarterArcId) {
  const selected = isSelectedArc(handId, arcId);

  if (selected && handId === "left") {
    return "border-sky-400 bg-sky-950/70 text-sky-100 shadow-[0_0_0_1px_rgba(56,189,248,0.25)]";
  }

  if (selected) {
    return "border-amber-300 bg-amber-950/55 text-amber-100 shadow-[0_0_0_1px_rgba(252,211,77,0.25)]";
  }

  return "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-slate-100";
}

function arcStrokeClass(handId: HandId, arcId: ElementaryQuarterArcId) {
  const selected = isSelectedArc(handId, arcId);

  if (selected && handId === "left") {
    return "stroke-sky-300";
  }

  if (selected) {
    return "stroke-amber-200";
  }

  return "stroke-slate-500 group-hover:stroke-slate-200";
}
</script>

<template>
  <div class="lab-live-cell grid gap-4">
    <section class="grid gap-4 border-y border-slate-800 py-4">
      <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-end">
        <div class="grid gap-2">
          <p class="text-xs uppercase tracking-[0.18em] text-sky-300">Left hand</p>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="arc in ELEMENTARY_QUARTER_ARCS"
              :key="`left-${arc.id}`"
              type="button"
              class="group grid aspect-square place-items-center rounded-md border transition"
              :class="arcButtonClass('left', arc.id)"
              :aria-label="`Left hand ${arc.label}`"
              :title="arc.label"
              @click="selectArc('left', arc.id)"
            >
              <svg viewBox="0 0 48 48" aria-hidden="true" class="h-11 w-11">
                <circle cx="24" cy="24" r="2" class="fill-slate-700" />
                <path
                  :d="arc.pathD"
                  fill="none"
                  stroke-linecap="round"
                  stroke-width="8"
                  class="stroke-slate-900"
                />
                <path
                  :d="arc.pathD"
                  fill="none"
                  stroke-linecap="round"
                  stroke-width="4"
                  :class="arcStrokeClass('left', arc.id)"
                />
                <circle
                  :cx="arc.startPoint.x"
                  :cy="arc.startPoint.y"
                  r="2.5"
                  class="fill-current"
                />
                <circle
                  :cx="arc.endPoint.x"
                  :cy="arc.endPoint.y"
                  r="2.5"
                  class="fill-current opacity-55"
                />
                <path
                  d="M 3 0 L -4 -4 L -2 0 L -4 4 Z"
                  class="fill-current"
                  :transform="`translate(${arc.endPoint.x} ${arc.endPoint.y}) rotate(${arc.arrowRotationDeg})`"
                />
              </svg>
            </button>
          </div>
        </div>

        <div class="grid gap-2">
          <p class="text-xs uppercase tracking-[0.18em] text-slate-500 md:text-center">Timing</p>
          <div class="grid grid-cols-2 overflow-hidden rounded-md border border-slate-800">
            <button
              v-for="option in ELEMENTARY_TIMING_OPTIONS"
              :key="option.id"
              type="button"
              class="px-3 py-2 text-sm font-medium transition"
              :class="
                timingMode === option.id
                  ? 'bg-slate-100 text-slate-950'
                  : 'bg-slate-950 text-slate-400 hover:bg-slate-900 hover:text-slate-100'
              "
              @click="selectTiming(option.id)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div class="grid gap-2">
          <p class="text-xs uppercase tracking-[0.18em] text-amber-200">Right hand</p>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="arc in ELEMENTARY_QUARTER_ARCS"
              :key="`right-${arc.id}`"
              type="button"
              class="group grid aspect-square place-items-center rounded-md border transition"
              :class="arcButtonClass('right', arc.id)"
              :aria-label="`Right hand ${arc.label}`"
              :title="arc.label"
              @click="selectArc('right', arc.id)"
            >
              <svg viewBox="0 0 48 48" aria-hidden="true" class="h-11 w-11">
                <circle cx="24" cy="24" r="2" class="fill-slate-700" />
                <path
                  :d="arc.pathD"
                  fill="none"
                  stroke-linecap="round"
                  stroke-width="8"
                  class="stroke-slate-900"
                />
                <path
                  :d="arc.pathD"
                  fill="none"
                  stroke-linecap="round"
                  stroke-width="4"
                  :class="arcStrokeClass('right', arc.id)"
                />
                <circle
                  :cx="arc.startPoint.x"
                  :cy="arc.startPoint.y"
                  r="2.5"
                  class="fill-current"
                />
                <circle
                  :cx="arc.endPoint.x"
                  :cy="arc.endPoint.y"
                  r="2.5"
                  class="fill-current opacity-55"
                />
                <path
                  d="M 3 0 L -4 -4 L -2 0 L -4 4 Z"
                  class="fill-current"
                  :transform="`translate(${arc.endPoint.x} ${arc.endPoint.y}) rotate(${arc.arrowRotationDeg})`"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>

    <EmbeddedVisualizer
      title="Elementary quarter-time loop"
      :summary="summary"
      :sequence="sequence"
      size="compact"
    />
  </div>
</template>
