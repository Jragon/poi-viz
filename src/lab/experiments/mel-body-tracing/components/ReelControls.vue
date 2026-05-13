<script setup lang="ts">
import { computed } from "vue";

import type { PoiBeatHand } from "@/lab/experiments/mel-body-tracing/beat-graph/types";
import DirectionControls from "@/lab/experiments/mel-body-tracing/components/DirectionControls.vue";
import {
  REEL_OFFSET_LABELS,
  REEL_POSITION_LABELS,
  REEL_POSITION_OPTIONS
} from "@/lab/experiments/mel-body-tracing/explorers/reelRules";
import type {
  ReelConfig,
  ReelDirection,
  ReelPosition
} from "@/lab/experiments/mel-body-tracing/explorers/reelTypes";

const props = defineProps<{
  modelValue: ReelConfig;
  resolvedDirectionsLabel: string;
  summaryLabel: string;
  visibleTrackIds: readonly string[];
}>();

const emit = defineEmits<{
  "update:modelValue": [config: ReelConfig];
  "toggle-track": [trackId: string];
}>();

const offsetLabel = computed(
  () => `${props.modelValue.offset} half-beats · ${REEL_OFFSET_LABELS[props.modelValue.offset]}`
);

function setPosition(hand: PoiBeatHand, position: ReelPosition): void {
  emit("update:modelValue", { ...props.modelValue, [hand]: position });
}

function setDirection(direction: ReelDirection): void {
  emit("update:modelValue", { ...props.modelValue, direction });
}

function setOffset(offset: ReelConfig["offset"]): void {
  emit("update:modelValue", { ...props.modelValue, offset });
}

function isTrackVisible(trackId: string): boolean {
  return props.visibleTrackIds.includes(trackId);
}

function handAccentClass(hand: PoiBeatHand): string {
  return hand === "left" ? "text-cyan-300" : "text-pink-300";
}

function positionButtonClass(hand: PoiBeatHand, position: ReelPosition): string {
  if (props.modelValue[hand] === position) return "border-slate-200 bg-slate-100 text-slate-950";
  return "border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800";
}

function offsetButtonClass(offset: ReelConfig["offset"]): string {
  if (props.modelValue.offset === offset) return "border-sky-300 bg-sky-300 text-slate-950";
  return "border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800";
}

function visibilityButtonClass(trackId: string): string {
  if (isTrackVisible(trackId)) return "border-emerald-500/70 bg-emerald-500/15 text-emerald-200";
  return "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300";
}
</script>

<template>
  <section class="rounded-lg border border-slate-800 bg-slate-900/60">
    <div class="border-b border-slate-800 px-4 py-3">
      <h2 class="text-sm font-semibold text-slate-200">Hands</h2>
    </div>
    <div class="grid gap-3 px-4 py-4 text-sm">
      <div
        v-for="hand in ['left', 'right'] as const"
        :key="hand"
        class="rounded-md border border-slate-800 bg-slate-950/50 px-3 py-3"
      >
        <div class="flex items-center justify-between gap-3">
          <p class="font-medium capitalize text-slate-200">
            <span :class="handAccentClass(hand)">●</span>
            {{ hand }} hand
          </p>
          <button
            type="button"
            class="rounded-md border px-2.5 py-1 text-xs font-medium transition"
            :class="visibilityButtonClass(hand)"
            :aria-pressed="isTrackVisible(hand)"
            @click="emit('toggle-track', hand)"
          >
            {{ isTrackVisible(hand) ? "On" : "Off" }}
          </button>
        </div>

        <div class="mt-3 grid grid-cols-2 gap-2">
          <button
            v-for="position in REEL_POSITION_OPTIONS"
            :key="`${hand}-${position}`"
            type="button"
            class="rounded-md border px-2 py-1.5 text-left text-xs font-medium transition"
            :class="positionButtonClass(hand, position)"
            :aria-pressed="modelValue[hand] === position"
            @click="setPosition(hand, position)"
          >
            {{ REEL_POSITION_LABELS[position] }}
          </button>
        </div>
      </div>
    </div>
  </section>

  <DirectionControls
    :direction="modelValue.direction"
    :resolved-label="resolvedDirectionsLabel"
    @update:direction="setDirection"
  />

  <section class="rounded-lg border border-slate-800 bg-slate-900/60">
    <div class="border-b border-slate-800 px-4 py-3">
      <h2 class="text-sm font-semibold text-slate-200">Right hand offset</h2>
    </div>
    <div class="grid gap-3 px-4 py-4 text-sm">
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="offset in [0, 1, 2, 3] as const"
          :key="offset"
          type="button"
          class="rounded-md border px-3 py-2 text-xs font-medium transition"
          :class="offsetButtonClass(offset)"
          :aria-pressed="modelValue.offset === offset"
          @click="setOffset(offset)"
        >
          {{ offset }}
        </button>
      </div>
      <p class="font-mono text-xs text-slate-500">{{ offsetLabel }}</p>
    </div>
  </section>

  <section class="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
    <p class="text-xs uppercase tracking-[0.16em] text-slate-500">Resolved reel</p>
    <p class="mt-1 font-mono text-lg font-semibold text-amber-200">{{ summaryLabel }}</p>
  </section>
</template>
