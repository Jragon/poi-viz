<script setup lang="ts">
import type { PoiBeatHand } from "@/lab/experiments/mel-body-tracing/beat-graph/types";
import DirectionControls from "@/lab/experiments/mel-body-tracing/components/DirectionControls.vue";
import {
  COSMO_BACK_POSITION_OPTIONS,
  COSMO_FRONT_POSITION_OPTIONS,
  COSMO_OFFSET_OPTIONS,
  getValidCosmoPartners,
  isValidCosmoPair
} from "@/lab/experiments/mel-body-tracing/explorers/cosmoRules";
import type {
  CosmoBackPosition,
  CosmoConfig,
  CosmoFrontPosition,
  CosmoOffset,
  CosmoPositionPair
} from "@/lab/experiments/mel-body-tracing/explorers/cosmoTypes";
import { REEL_POSITION_LABELS } from "@/lab/experiments/mel-body-tracing/explorers/reelRules";
import type { ReelDirection } from "@/lab/experiments/mel-body-tracing/explorers/reelTypes";

const props = defineProps<{
  modelValue: CosmoConfig;
  resolvedDirectionsLabel: string;
  summaryLabel: string;
  visibleTrackIds: readonly string[];
}>();

const emit = defineEmits<{
  "update:modelValue": [config: CosmoConfig];
  "toggle-track": [trackId: string];
}>();

function getFirstValidPartner(position: CosmoFrontPosition): CosmoBackPosition {
  const [firstPartner] = getValidCosmoPartners(position);
  if (!firstPartner) throw new Error(`expected at least one valid cosmo partner for ${position}`);
  return firstPartner;
}

function setFrontPosition(hand: PoiBeatHand, position: CosmoFrontPosition): void {
  const currentPair = props.modelValue[hand];
  const nextPair: CosmoPositionPair = {
    a: position,
    b: isValidCosmoPair(position, currentPair.b) ? currentPair.b : getFirstValidPartner(position)
  };

  emit("update:modelValue", { ...props.modelValue, [hand]: nextPair });
}

function setBackPosition(hand: PoiBeatHand, position: CosmoBackPosition): void {
  const currentPair = props.modelValue[hand];
  if (!isValidCosmoPair(currentPair.a, position)) return;

  emit("update:modelValue", { ...props.modelValue, [hand]: { ...currentPair, b: position } });
}

function setDirection(direction: ReelDirection): void {
  emit("update:modelValue", { ...props.modelValue, direction });
}

function setOffset(offset: CosmoOffset): void {
  emit("update:modelValue", { ...props.modelValue, offset });
}

function isTrackVisible(trackId: string): boolean {
  return props.visibleTrackIds.includes(trackId);
}

function handAccentClass(hand: PoiBeatHand): string {
  return hand === "left" ? "text-cyan-300" : "text-pink-300";
}

function frontButtonClass(hand: PoiBeatHand, position: CosmoFrontPosition): string {
  if (props.modelValue[hand].a === position) return "border-cyan-300 bg-cyan-950/70 text-cyan-100";
  return "border-ui-border-strong bg-ui-surface text-ui-text-secondary hover:border-ui-focus hover:bg-ui-surface-raised";
}

function backButtonClass(hand: PoiBeatHand, position: CosmoBackPosition): string {
  if (props.modelValue[hand].b === position) return "border-cyan-300 bg-cyan-950/70 text-cyan-100";
  if (!isValidCosmoPair(props.modelValue[hand].a, position)) {
    return "cursor-not-allowed border-ui-border-subtle bg-ui-surface text-ui-text-muted";
  }
  return "border-ui-border-strong bg-ui-surface text-ui-text-secondary hover:border-ui-focus hover:bg-ui-surface-raised";
}

function offsetButtonClass(offset: CosmoOffset): string {
  if (props.modelValue.offset === offset) return "border-sky-300 bg-sky-950/70 text-sky-100";
  return "border-ui-border-strong bg-ui-surface text-ui-text-secondary hover:border-ui-focus hover:bg-ui-surface-raised";
}

function visibilityButtonClass(trackId: string): string {
  if (isTrackVisible(trackId)) return "border-emerald-500/70 bg-emerald-500/15 text-emerald-200";
  return "border-ui-border-strong bg-ui-surface text-ui-text-muted hover:border-ui-focus hover:bg-ui-surface-raised hover:text-ui-text-secondary";
}
</script>

<template>
  <section class="rounded-lg border border-ui-border bg-ui-surface">
    <div class="border-b border-ui-border-subtle px-4 py-3">
      <h2 class="text-sm font-semibold text-slate-200">Hands</h2>
    </div>
    <div class="grid gap-3 px-4 py-4 text-sm">
      <div
        v-for="hand in ['left', 'right'] as const"
        :key="hand"
        class="rounded-md border border-ui-border-subtle bg-ui-input px-3 py-3"
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

        <div class="mt-3 grid gap-2">
          <div class="grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-2">
            <p class="pt-1.5 font-mono text-xs text-ui-text-muted">A</p>
            <div class="grid grid-cols-2 gap-1.5">
              <button
                v-for="position in COSMO_FRONT_POSITION_OPTIONS"
                :key="`${hand}-a-${position}`"
                type="button"
                class="rounded-md border px-2 py-1.5 text-left text-xs font-medium transition"
                :class="frontButtonClass(hand, position)"
                :aria-pressed="modelValue[hand].a === position"
                @click="setFrontPosition(hand, position)"
              >
                {{ REEL_POSITION_LABELS[position] }}
              </button>
            </div>
          </div>

          <div class="grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-2">
            <p class="pt-1.5 font-mono text-xs text-ui-text-muted">B</p>
            <div class="grid grid-cols-2 gap-1.5">
              <button
                v-for="position in COSMO_BACK_POSITION_OPTIONS"
                :key="`${hand}-b-${position}`"
                type="button"
                class="rounded-md border px-2 py-1.5 text-left text-xs font-medium transition disabled:pointer-events-none"
                :class="backButtonClass(hand, position)"
                :aria-pressed="modelValue[hand].b === position"
                :disabled="!isValidCosmoPair(modelValue[hand].a, position)"
                @click="setBackPosition(hand, position)"
              >
                {{ REEL_POSITION_LABELS[position] }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <DirectionControls
    :direction="modelValue.direction"
    :resolved-label="resolvedDirectionsLabel"
    @update:direction="setDirection"
  />

  <section class="rounded-lg border border-ui-border bg-ui-surface">
    <div class="border-b border-ui-border-subtle px-4 py-3">
      <h2 class="text-sm font-semibold text-slate-200">Right hand offset</h2>
    </div>
    <div class="grid gap-3 px-4 py-4 text-sm">
      <div class="grid grid-cols-8 gap-1.5">
        <button
          v-for="offset in COSMO_OFFSET_OPTIONS"
          :key="offset"
          type="button"
          class="rounded-md border px-2 py-2 text-xs font-medium transition"
          :class="offsetButtonClass(offset)"
          :aria-pressed="modelValue.offset === offset"
          @click="setOffset(offset)"
        >
          {{ offset }}
        </button>
      </div>
      <p class="font-mono text-xs text-ui-text-muted">{{ modelValue.offset }} half-beats</p>
    </div>
  </section>

  <section class="rounded-lg border border-ui-border bg-ui-surface px-4 py-3">
    <p class="text-xs font-medium uppercase tracking-[0.14em] text-ui-text-muted">Resolved cosmo</p>
    <p class="mt-1 font-mono text-sm font-semibold leading-6 text-amber-200">
      {{ summaryLabel }}
    </p>
  </section>
</template>
