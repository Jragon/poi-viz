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

const props = withDefaults(
  defineProps<{
    modelValue: ReelConfig;
    resolvedDirectionsLabel: string;
    summaryLabel: string;
    visibleTrackIds: readonly string[];
    showOffset?: boolean;
    showHands?: boolean;
    showDirection?: boolean;
    showSummary?: boolean;
  }>(),
  { showOffset: true, showHands: true, showDirection: true, showSummary: true }
);

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
  if (props.modelValue[hand] === position) return "border-cyan-300 bg-cyan-950/70 text-cyan-100";
  return "border-ui-border-strong bg-ui-surface text-ui-text-secondary hover:border-ui-focus hover:bg-ui-surface-raised";
}

function offsetButtonClass(offset: ReelConfig["offset"]): string {
  if (props.modelValue.offset === offset) return "border-sky-300 bg-sky-950/70 text-sky-100";
  return "border-ui-border-strong bg-ui-surface text-ui-text-secondary hover:border-ui-focus hover:bg-ui-surface-raised";
}

function visibilityButtonClass(trackId: string): string {
  if (isTrackVisible(trackId)) return "border-emerald-500/70 bg-emerald-500/15 text-emerald-200";
  return "border-ui-border-strong bg-ui-surface text-ui-text-muted hover:border-ui-focus hover:bg-ui-surface-raised hover:text-ui-text-secondary";
}
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-ui-border bg-ui-surface">
    <section v-if="showOffset" class="border-b border-ui-border-subtle bg-transparent">
      <div
        class="flex items-center justify-between gap-2 border-b border-ui-border-subtle px-3 py-2"
      >
        <h2 class="text-sm font-semibold text-slate-200">Right hand offset</h2>
        <p class="font-mono text-xs text-sky-200">{{ offsetLabel }}</p>
      </div>
      <div class="grid grid-cols-4 gap-1.5 p-2.5 text-sm">
        <button
          v-for="offset in [0, 1, 2, 3] as const"
          :key="offset"
          type="button"
          class="h-8 rounded-md border px-2 text-xs font-medium transition"
          :class="offsetButtonClass(offset)"
          :aria-label="`Set right hand offset to ${offset} half-beats, ${REEL_OFFSET_LABELS[offset]}`"
          :aria-pressed="modelValue.offset === offset"
          @click="setOffset(offset)"
        >
          {{ offset }}
        </button>
      </div>
    </section>

    <section v-if="showHands" class="border-b border-ui-border-subtle bg-transparent">
      <div class="border-b border-ui-border-subtle px-3 py-2">
        <h2 class="text-sm font-semibold text-slate-200">Hands</h2>
      </div>
      <div class="grid gap-2 p-2.5 text-sm">
        <div
          v-for="hand in ['left', 'right'] as const"
          :key="hand"
          class="rounded-md border border-ui-border-subtle bg-ui-input p-2.5"
        >
          <div class="flex items-center justify-between gap-3">
            <p class="font-medium capitalize text-slate-200">
              <span :class="handAccentClass(hand)">●</span>
              {{ hand }} hand
            </p>
            <button
              type="button"
              class="h-8 rounded-md border px-2 text-xs font-medium transition"
              :class="visibilityButtonClass(hand)"
              :aria-pressed="isTrackVisible(hand)"
              @click="emit('toggle-track', hand)"
            >
              {{ isTrackVisible(hand) ? "On" : "Off" }}
            </button>
          </div>

          <div class="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            <button
              v-for="position in REEL_POSITION_OPTIONS"
              :key="`${hand}-${position}`"
              type="button"
              class="min-h-8 rounded-md border px-2 py-1 text-left text-xs font-medium leading-tight transition"
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
      v-if="showDirection"
      embedded
      :direction="modelValue.direction"
      :resolved-label="resolvedDirectionsLabel"
      @update:direction="setDirection"
    />

    <section v-if="showSummary" class="bg-transparent px-3 py-2.5">
      <p class="text-xs font-medium uppercase tracking-[0.14em] text-ui-text-muted">
        Resolved reel
      </p>
      <p class="mt-1 font-mono text-lg font-semibold text-ui-text">{{ summaryLabel }}</p>
    </section>
  </div>
</template>
