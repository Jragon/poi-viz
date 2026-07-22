<script setup lang="ts">
import { computed, ref } from "vue";

import type { PlaneId } from "@/engine/types";
import EmbeddedVisualizer from "@/lab/components/EmbeddedVisualizer.vue";
import {
  buildElementaryQuarterTimeSequence,
  ELEMENTARY_PLANE_OPTIONS,
  ELEMENTARY_QUARTER_ARCS,
  ELEMENTARY_TIMING_OPTIONS,
  getAvailableElementaryArcIds,
  getElementaryTimingOption,
  isElementaryArcAvailableInPlane,
  isElementaryTimingAvailable,
  type ElementaryQuarterArcId,
  type ElementaryTimingMode
} from "./elementaryQuarterTime";

type HandId = "left" | "right";

const leftPlaneId = ref<PlaneId>("wall");
const leftArcId = ref<ElementaryQuarterArcId>("0-90");
const rightPlaneId = ref<PlaneId>("wall");
const rightArcId = ref<ElementaryQuarterArcId>("180-270");
const timingMode = ref<ElementaryTimingMode>("same");
const showStickFigure = ref(true);

const activeTiming = computed(() => getElementaryTimingOption(timingMode.value));
const sequence = computed(() =>
  buildElementaryQuarterTimeSequence({
    leftPlaneId: leftPlaneId.value,
    leftArcId: leftArcId.value,
    rightPlaneId: rightPlaneId.value,
    rightArcId: rightArcId.value,
    timingMode: timingMode.value
  })
);
const summary = computed(
  () =>
    `${activeTiming.value.label}: left ${leftPlaneId.value} ${leftArcId.value}, right ${rightPlaneId.value} ${rightArcId.value}, ${activeTiming.value.relation}.`
);

function getHandPlaneId(handId: HandId): PlaneId {
  return handId === "left" ? leftPlaneId.value : rightPlaneId.value;
}

function getFirstAvailableArcId(planeId: PlaneId): ElementaryQuarterArcId {
  const [firstAvailableArcId] = getAvailableElementaryArcIds(planeId);
  if (!firstAvailableArcId) {
    throw new Error(`Expected at least one elementary arc for ${planeId}`);
  }

  return firstAvailableArcId;
}

function isArcAvailable(handId: HandId, arcId: ElementaryQuarterArcId): boolean {
  return isElementaryArcAvailableInPlane(getHandPlaneId(handId), arcId);
}

function isTimingAvailable(timing: ElementaryTimingMode): boolean {
  return isElementaryTimingAvailable({
    leftPlaneId: leftPlaneId.value,
    leftArcId: leftArcId.value,
    rightPlaneId: rightPlaneId.value,
    rightArcId: rightArcId.value,
    timingMode: timing
  });
}

function ensureTimingModeAvailable() {
  if (isTimingAvailable(timingMode.value)) {
    return;
  }

  const availableTiming = ELEMENTARY_TIMING_OPTIONS.find((option) => isTimingAvailable(option.id));
  if (!availableTiming) {
    throw new Error("Expected at least one elementary timing mode to be available");
  }

  timingMode.value = availableTiming.id;
}

function isSelectedArc(handId: HandId, arcId: ElementaryQuarterArcId): boolean {
  return handId === "left" ? leftArcId.value === arcId : rightArcId.value === arcId;
}

function selectArc(handId: HandId, arcId: ElementaryQuarterArcId) {
  if (!isArcAvailable(handId, arcId)) {
    return;
  }

  if (handId === "left") {
    leftArcId.value = arcId;
    ensureTimingModeAvailable();
    return;
  }

  rightArcId.value = arcId;
  ensureTimingModeAvailable();
}

function selectPlane(handId: HandId, planeId: PlaneId) {
  if (handId === "left") {
    leftPlaneId.value = planeId;
    if (!isElementaryArcAvailableInPlane(planeId, leftArcId.value)) {
      leftArcId.value = getFirstAvailableArcId(planeId);
    }
    ensureTimingModeAvailable();
    return;
  }

  rightPlaneId.value = planeId;
  if (!isElementaryArcAvailableInPlane(planeId, rightArcId.value)) {
    rightArcId.value = getFirstAvailableArcId(planeId);
  }
  ensureTimingModeAvailable();
}

function selectTiming(nextTimingMode: ElementaryTimingMode) {
  if (!isTimingAvailable(nextTimingMode)) {
    return;
  }

  timingMode.value = nextTimingMode;
}

function setShowStickFigure(event: Event) {
  showStickFigure.value = (event.target as HTMLInputElement).checked;
}

function timingButtonClass(timing: ElementaryTimingMode) {
  if (!isTimingAvailable(timing)) {
    return "cursor-not-allowed bg-ui-surface text-ui-text-muted";
  }

  return timingMode.value === timing
    ? "bg-slate-100 text-slate-950"
    : "bg-slate-950 text-slate-400 hover:bg-slate-900 hover:text-slate-100";
}

function planeButtonClass(handId: HandId, planeId: PlaneId) {
  const selected = getHandPlaneId(handId) === planeId;

  if (selected && handId === "left") {
    return "border-sky-500 bg-sky-950/70 text-sky-100";
  }

  if (selected) {
    return "border-amber-300 bg-amber-950/55 text-amber-100";
  }

  return "border-ui-border-subtle bg-slate-950 text-ui-text-muted hover:border-slate-600 hover:text-slate-200";
}

function arcButtonClass(handId: HandId, arcId: ElementaryQuarterArcId) {
  const selected = isSelectedArc(handId, arcId);
  const available = isArcAvailable(handId, arcId);

  if (!available) {
    return "cursor-not-allowed border-ui-border-subtle bg-ui-surface text-ui-text-muted";
  }

  if (selected && handId === "left") {
    return "border-sky-400 bg-sky-950/70 text-sky-100 shadow-[0_0_0_1px_rgba(56,189,248,0.25)]";
  }

  if (selected) {
    return "border-amber-300 bg-amber-950/55 text-amber-100 shadow-[0_0_0_1px_rgba(252,211,77,0.25)]";
  }

  return "border-ui-border-subtle bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-slate-100";
}

function arcStrokeClass(handId: HandId, arcId: ElementaryQuarterArcId) {
  const selected = isSelectedArc(handId, arcId);

  if (!isArcAvailable(handId, arcId)) {
    return "stroke-slate-700";
  }

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
  <div class="lab-live-cell mx-auto grid max-w-4xl! gap-3">
    <section class="rounded-lg border border-ui-border-subtle bg-slate-950/55 p-3">
      <div class="grid gap-3 lg:grid-cols-[auto_auto_auto] lg:items-end lg:justify-center">
        <div class="grid gap-1.5">
          <div class="flex items-center justify-between gap-2">
            <p class="text-[0.65rem] uppercase tracking-[0.18em] text-sky-300">Left hand</p>
            <div class="grid grid-cols-3 overflow-hidden rounded-md border border-ui-border-subtle">
              <button
                v-for="plane in ELEMENTARY_PLANE_OPTIONS"
                :key="`left-plane-${plane.id}`"
                type="button"
                class="px-1.5 py-1 text-[0.65rem] font-medium transition"
                :class="planeButtonClass('left', plane.id)"
                @click="selectPlane('left', plane.id)"
              >
                {{ plane.label }}
              </button>
            </div>
          </div>
          <div class="grid grid-cols-4 gap-1.5">
            <button
              v-for="arc in ELEMENTARY_QUARTER_ARCS"
              :key="`left-${arc.id}`"
              type="button"
              class="group grid h-12 w-12 place-items-center rounded-md border transition"
              :class="arcButtonClass('left', arc.id)"
              :disabled="!isArcAvailable('left', arc.id)"
              :aria-label="`Left hand ${arc.label}`"
              :title="isArcAvailable('left', arc.id) ? arc.label : `Behind body in ${leftPlaneId}`"
              @click="selectArc('left', arc.id)"
            >
              <svg viewBox="0 0 48 48" aria-hidden="true" class="h-9 w-9">
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

        <div class="grid gap-1.5">
          <p class="text-[0.65rem] uppercase tracking-[0.18em] text-ui-text-muted lg:text-center">
            Timing
          </p>
          <div class="grid grid-cols-2 overflow-hidden rounded-md border border-ui-border-subtle">
            <button
              v-for="option in ELEMENTARY_TIMING_OPTIONS"
              :key="option.id"
              type="button"
              class="px-2.5 py-1.5 text-xs font-medium transition"
              :class="timingButtonClass(option.id)"
              :disabled="!isTimingAvailable(option.id)"
              :title="
                isTimingAvailable(option.id) ? option.label : 'Not available for this plane pair'
              "
              @click="selectTiming(option.id)"
            >
              {{ option.label }}
            </button>
          </div>
          <label
            class="flex items-center justify-center gap-2 text-xs font-medium text-slate-400 transition hover:text-slate-100"
          >
            <input
              type="checkbox"
              :checked="showStickFigure"
              class="h-3.5 w-3.5 accent-amber-400"
              @change="setShowStickFigure"
            />
            Stick figure
          </label>
        </div>

        <div class="grid gap-1.5">
          <div class="flex items-center justify-between gap-2">
            <p class="text-[0.65rem] uppercase tracking-[0.18em] text-amber-200">Right hand</p>
            <div class="grid grid-cols-3 overflow-hidden rounded-md border border-ui-border-subtle">
              <button
                v-for="plane in ELEMENTARY_PLANE_OPTIONS"
                :key="`right-plane-${plane.id}`"
                type="button"
                class="px-1.5 py-1 text-[0.65rem] font-medium transition"
                :class="planeButtonClass('right', plane.id)"
                @click="selectPlane('right', plane.id)"
              >
                {{ plane.label }}
              </button>
            </div>
          </div>
          <div class="grid grid-cols-4 gap-1.5">
            <button
              v-for="arc in ELEMENTARY_QUARTER_ARCS"
              :key="`right-${arc.id}`"
              type="button"
              class="group grid h-12 w-12 place-items-center rounded-md border transition"
              :class="arcButtonClass('right', arc.id)"
              :disabled="!isArcAvailable('right', arc.id)"
              :aria-label="`Right hand ${arc.label}`"
              :title="
                isArcAvailable('right', arc.id) ? arc.label : `Behind body in ${rightPlaneId}`
              "
              @click="selectArc('right', arc.id)"
            >
              <svg viewBox="0 0 48 48" aria-hidden="true" class="h-9 w-9">
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
      :show-body-rig="showStickFigure"
      size="mini"
    />
  </div>
</template>
