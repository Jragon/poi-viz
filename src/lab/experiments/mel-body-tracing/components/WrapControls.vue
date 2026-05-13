<script setup lang="ts">
import type { PoiBeatHand } from "@/lab/experiments/mel-body-tracing/beat-graph/types";
import DirectionControls from "@/lab/experiments/mel-body-tracing/components/DirectionControls.vue";
import {
  REEL_POSITION_LABELS,
  REEL_POSITION_OPTIONS
} from "@/lab/experiments/mel-body-tracing/explorers/reelRules";
import type {
  ReelDirection,
  ReelPosition
} from "@/lab/experiments/mel-body-tracing/explorers/reelTypes";
import {
  getValidPartners,
  isValidWrapPair
} from "@/lab/experiments/mel-body-tracing/explorers/wrapRules";
import type {
  WrapConfig,
  WrapOffset,
  WrapPositionPair
} from "@/lab/experiments/mel-body-tracing/explorers/wrapTypes";

const props = defineProps<{
  modelValue: WrapConfig;
  resolvedDirectionsLabel: string;
  summaryLabel: string;
  visibleTrackIds: readonly string[];
}>();

const emit = defineEmits<{
  "update:modelValue": [config: WrapConfig];
  "toggle-track": [trackId: string];
}>();

function getFirstValidPartner(position: ReelPosition): ReelPosition {
  const [firstPartner] = getValidPartners(position);
  if (!firstPartner) throw new Error(`expected at least one valid wrap partner for ${position}`);
  return firstPartner;
}

function setPairPosition(
  hand: PoiBeatHand,
  slot: keyof WrapPositionPair,
  position: ReelPosition
): void {
  const currentPair = props.modelValue[hand];
  let nextPair: WrapPositionPair = { ...currentPair, [slot]: position };

  if (slot === "a" && !isValidWrapPair(nextPair.a, nextPair.b)) {
    nextPair = { a: position, b: getFirstValidPartner(position) };
  }

  if (slot === "b" && !isValidWrapPair(nextPair.a, nextPair.b)) return;

  emit("update:modelValue", { ...props.modelValue, [hand]: nextPair });
}

function setDirection(direction: ReelDirection): void {
  emit("update:modelValue", { ...props.modelValue, direction });
}

function setOffset(offset: WrapOffset): void {
  emit("update:modelValue", { ...props.modelValue, offset });
}

function isTrackVisible(trackId: string): boolean {
  return props.visibleTrackIds.includes(trackId);
}

function handAccentClass(hand: PoiBeatHand): string {
  return hand === "left" ? "text-cyan-300" : "text-pink-300";
}

function pairButtonClass(
  hand: PoiBeatHand,
  slot: keyof WrapPositionPair,
  position: ReelPosition
): string {
  if (props.modelValue[hand][slot] === position)
    return "border-slate-200 bg-slate-100 text-slate-950";
  return "border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800";
}

function partnerButtonClass(hand: PoiBeatHand, position: ReelPosition): string {
  if (props.modelValue[hand].b === position) return "border-slate-200 bg-slate-100 text-slate-950";
  if (!isValidWrapPair(props.modelValue[hand].a, position)) {
    return "cursor-not-allowed border-slate-800 text-slate-600 opacity-55";
  }
  return "border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800";
}

function offsetButtonClass(offset: WrapOffset): string {
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

        <div class="mt-3 grid gap-2">
          <div class="grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-2">
            <p class="pt-1.5 font-mono text-xs text-slate-500">A</p>
            <div class="grid grid-cols-2 gap-1.5">
              <button
                v-for="position in REEL_POSITION_OPTIONS"
                :key="`${hand}-a-${position}`"
                type="button"
                class="rounded-md border px-2 py-1.5 text-left text-xs font-medium transition"
                :class="pairButtonClass(hand, 'a', position)"
                :aria-pressed="modelValue[hand].a === position"
                @click="setPairPosition(hand, 'a', position)"
              >
                {{ REEL_POSITION_LABELS[position] }}
              </button>
            </div>
          </div>

          <div class="grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-2">
            <p class="pt-1.5 font-mono text-xs text-slate-500">B</p>
            <div class="grid grid-cols-2 gap-1.5">
              <button
                v-for="position in REEL_POSITION_OPTIONS"
                :key="`${hand}-b-${position}`"
                type="button"
                class="rounded-md border px-2 py-1.5 text-left text-xs font-medium transition disabled:pointer-events-none"
                :class="partnerButtonClass(hand, position)"
                :aria-pressed="modelValue[hand].b === position"
                :disabled="!isValidWrapPair(modelValue[hand].a, position)"
                @click="setPairPosition(hand, 'b', position)"
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

  <section class="rounded-lg border border-slate-800 bg-slate-900/60">
    <div class="border-b border-slate-800 px-4 py-3">
      <h2 class="text-sm font-semibold text-slate-200">Right hand offset</h2>
    </div>
    <div class="grid gap-3 px-4 py-4 text-sm">
      <div class="grid grid-cols-6 gap-1.5">
        <button
          v-for="offset in [0, 1, 2, 3, 4, 5] as const"
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
      <p class="font-mono text-xs text-slate-500">{{ modelValue.offset }} half-beats</p>
    </div>
  </section>

  <section class="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
    <p class="text-xs uppercase tracking-[0.16em] text-slate-500">Resolved wrap</p>
    <p class="mt-1 font-mono text-sm font-semibold leading-6 text-amber-200">
      {{ summaryLabel }}
    </p>
  </section>
</template>
