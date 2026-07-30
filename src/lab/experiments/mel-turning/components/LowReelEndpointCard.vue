<script setup lang="ts">
import { computed } from "vue";

import {
  buildTurningReelCycle,
  type TurningReelConfig,
  type TurningReelDirection,
  type TurningReelOffset,
  type TurningReelPosition
} from "@/lab/experiments/mel-turning/adapter/melBeatGraphAdapter";
import type {
  TurningDirection,
  TurningHand
} from "@/lab/experiments/mel-turning/model/turningTypes";

defineOptions({ name: "LowReelEndpointCard" });

interface DirectionOption {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  readonly value: TurningReelDirection;
}

const props = withDefaults(
  defineProps<{
    modelValue: TurningReelConfig;
    title: string;
    disabled?: boolean;
    directionLocked?: boolean;
    allowedOffsets?: readonly TurningReelOffset[];
    constraintMessage?: string;
    adjustmentMessage?: string;
  }>(),
  { disabled: false, directionLocked: false }
);

const emit = defineEmits<{
  "update:modelValue": [config: TurningReelConfig];
}>();

const LOW_REEL_POSITION_OPTIONS = [
  "low-native",
  "low-non-native",
  "low-back"
] as const satisfies readonly TurningReelPosition[];

const OFFSET_OPTIONS = [0, 1, 2, 3] as const;
const POSITION_LABELS: Readonly<Record<TurningReelPosition, string>> = {
  "low-native": "Low native",
  "low-non-native": "Low non-native",
  "low-back": "Low back"
};
const OFFSET_LABELS = {
  0: "Unison",
  1: "Chasing",
  2: "Counter",
  3: "Chasing"
} as const;

const DIRECTION_OPTIONS = [
  {
    id: "same-cw",
    label: "Same · CW",
    detail: "Both clockwise",
    value: { mode: "same", direction: "clockwise" }
  },
  {
    id: "same-ccw",
    label: "Same · CCW",
    detail: "Both counterclockwise",
    value: { mode: "same", direction: "counterclockwise" }
  },
  {
    id: "opposite-inwards",
    label: "Opposite · Inwards",
    detail: "Left CW · Right CCW",
    value: { mode: "opposite", flow: "inwards" }
  },
  {
    id: "opposite-outwards",
    label: "Opposite · Outwards",
    detail: "Left CCW · Right CW",
    value: { mode: "opposite", flow: "outwards" }
  }
] as const satisfies readonly DirectionOption[];

const resolvedState = computed(() => buildTurningReelCycle(props.modelValue));
const exactPositionsLabel = computed(
  () =>
    `Left ${POSITION_LABELS[props.modelValue.left]} · Right ${
      POSITION_LABELS[props.modelValue.right]
    }`
);
const exactOffsetLabel = computed(
  () => `${props.modelValue.offset} half-beats · ${OFFSET_LABELS[props.modelValue.offset]}`
);
const resolvedDirectionsLabel = computed(
  () =>
    `Left ${formatDirection(directionFor("left"))} · Right ${formatDirection(
      directionFor("right")
    )}`
);

function directionFor(hand: TurningHand): TurningDirection {
  const track = resolvedState.value.tracks.find((candidate) => candidate.hand === hand);
  if (!track) throw new Error(`Low-reel endpoint has no ${hand} track.`);
  return track.poiDirection;
}

function formatDirection(direction: TurningDirection): "CW" | "CCW" {
  return direction === "clockwise" ? "CW" : "CCW";
}

function setPosition(hand: TurningHand, position: TurningReelPosition): void {
  emit("update:modelValue", { ...props.modelValue, [hand]: position });
}

function setDirection(direction: TurningReelDirection): void {
  if (props.directionLocked) return;
  emit("update:modelValue", { ...props.modelValue, direction });
}

function setOffset(offset: TurningReelConfig["offset"]): void {
  if (!isOffsetAllowed(offset)) return;
  emit("update:modelValue", { ...props.modelValue, offset });
}

function isOffsetAllowed(offset: TurningReelOffset): boolean {
  return props.allowedOffsets?.includes(offset) ?? true;
}

function directionsEqual(left: TurningReelDirection, right: TurningReelDirection): boolean {
  if (left.mode !== right.mode) return false;
  if (left.mode === "same" && right.mode === "same") {
    return left.direction === right.direction;
  }
  if (left.mode === "opposite" && right.mode === "opposite") {
    return left.flow === right.flow;
  }
  return false;
}

function positionButtonClass(hand: TurningHand, position: TurningReelPosition): string {
  if (props.modelValue[hand] === position) {
    return hand === "left"
      ? "border-cyan-300 bg-cyan-950/70 text-cyan-100"
      : "border-rose-400 bg-rose-950/70 text-rose-100";
  }
  return "border-ui-border-strong bg-ui-surface text-ui-text-secondary hover:border-ui-focus hover:bg-ui-surface-raised";
}

function directionButtonClass(direction: TurningReelDirection): string {
  if (directionsEqual(props.modelValue.direction, direction)) {
    return "border-sky-300 bg-ui-selected text-ui-selected-text";
  }
  if (props.directionLocked) {
    return "cursor-not-allowed border-ui-border-subtle bg-ui-input text-ui-text-muted opacity-45";
  }
  return "border-ui-border-strong bg-ui-surface text-ui-text-secondary hover:border-ui-focus hover:bg-ui-surface-raised";
}

function offsetButtonClass(offset: TurningReelConfig["offset"]): string {
  if (props.modelValue.offset === offset) {
    return "border-sky-300 bg-sky-950/70 text-sky-100";
  }
  if (!isOffsetAllowed(offset)) {
    return "cursor-not-allowed border-ui-border-subtle bg-ui-input text-ui-text-muted opacity-40";
  }
  return "border-ui-border-strong bg-ui-surface text-ui-text-secondary hover:border-ui-focus hover:bg-ui-surface-raised";
}
</script>

<template>
  <section
    class="overflow-hidden rounded-lg border border-ui-border bg-ui-surface"
    :class="disabled ? 'opacity-70' : undefined"
  >
    <header
      class="flex flex-wrap items-start justify-between gap-3 border-b border-ui-border-subtle px-3 py-2.5"
    >
      <div>
        <p class="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-ui-text-muted">
          Exact Mel endpoint
        </p>
        <h2 class="mt-1 text-sm font-semibold text-slate-100">{{ title }}</h2>
      </div>
      <div
        class="flex items-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em]"
      >
        <span class="rounded-full border border-sky-500/50 bg-sky-950/50 px-2 py-1 text-sky-200">
          {{ resolvedState.timing }}
        </span>
        <span
          class="rounded-full border border-ui-border-strong bg-ui-input px-2 py-1 text-ui-text-secondary"
        >
          {{ resolvedState.patternType }}
        </span>
      </div>
    </header>

    <section class="border-b border-ui-border-subtle">
      <div class="border-b border-ui-border-subtle px-3 py-2">
        <h3 class="text-xs font-semibold uppercase tracking-[0.14em] text-ui-text-muted">
          Hand positions
        </h3>
      </div>
      <div class="grid gap-2 p-2.5 sm:grid-cols-2">
        <fieldset
          v-for="hand in ['left', 'right'] as const"
          :key="hand"
          class="min-w-0 rounded-md border border-ui-border-subtle bg-ui-input p-2.5"
          :disabled="disabled"
        >
          <legend class="px-1 text-xs font-semibold capitalize text-slate-200">
            <span :class="hand === 'left' ? 'text-cyan-300' : 'text-rose-400'">●</span>
            {{ hand }} hand
          </legend>
          <div class="mt-1.5 grid gap-1.5">
            <button
              v-for="position in LOW_REEL_POSITION_OPTIONS"
              :key="`${hand}-${position}`"
              type="button"
              class="min-h-8 rounded-md border px-2 py-1 text-left text-xs font-medium leading-tight transition"
              :class="positionButtonClass(hand, position)"
              :aria-pressed="modelValue[hand] === position"
              :disabled="disabled"
              @click="setPosition(hand, position)"
            >
              {{ POSITION_LABELS[position] }}
            </button>
          </div>
        </fieldset>
      </div>
    </section>

    <section class="border-b border-ui-border-subtle">
      <div
        class="flex items-center justify-between gap-2 border-b border-ui-border-subtle px-3 py-2"
      >
        <h3 class="text-xs font-semibold uppercase tracking-[0.14em] text-ui-text-muted">
          Direction
        </h3>
        <span
          v-if="directionLocked"
          class="rounded-full border border-sky-500/40 bg-sky-950/45 px-2 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-[0.12em] text-sky-200"
        >
          Derived from source
        </span>
      </div>
      <div class="grid gap-1.5 p-2.5 sm:grid-cols-2">
        <button
          v-for="option in DIRECTION_OPTIONS"
          :key="option.id"
          type="button"
          class="min-h-10 rounded-md border px-2.5 py-1.5 text-left transition"
          :class="directionButtonClass(option.value)"
          :aria-pressed="directionsEqual(modelValue.direction, option.value)"
          :disabled="disabled || directionLocked"
          @click="setDirection(option.value)"
        >
          <span class="block text-xs font-semibold">{{ option.label }}</span>
          <span class="mt-0.5 block text-[0.625rem] opacity-75">{{ option.detail }}</span>
        </button>
        <p
          v-if="constraintMessage"
          class="rounded-md border border-sky-500/30 bg-sky-950/25 px-2.5 py-2 text-[0.6875rem] leading-5 text-sky-100 sm:col-span-2"
        >
          {{ constraintMessage }}
        </p>
      </div>
    </section>

    <section class="border-b border-ui-border-subtle">
      <div
        class="flex items-center justify-between gap-3 border-b border-ui-border-subtle px-3 py-2"
      >
        <h3 class="text-xs font-semibold uppercase tracking-[0.14em] text-ui-text-muted">
          Right-hand offset
        </h3>
        <p class="font-mono text-[0.6875rem] text-sky-200">{{ exactOffsetLabel }}</p>
      </div>
      <div class="grid grid-cols-4 gap-1.5 p-2.5">
        <button
          v-for="offset in OFFSET_OPTIONS"
          :key="offset"
          type="button"
          class="min-h-10 rounded-md border px-1.5 py-1 text-center transition"
          :class="offsetButtonClass(offset)"
          :aria-label="`Set ${title} right-hand offset to ${offset} half-beats, ${OFFSET_LABELS[offset]}`"
          :aria-pressed="modelValue.offset === offset"
          :aria-disabled="!isOffsetAllowed(offset)"
          :disabled="disabled || !isOffsetAllowed(offset)"
          @click="setOffset(offset)"
        >
          <span class="block font-mono text-xs font-semibold">{{ offset }}</span>
          <span class="mt-0.5 block truncate text-[0.5625rem]">{{ OFFSET_LABELS[offset] }}</span>
        </button>
      </div>
      <p
        v-if="adjustmentMessage"
        class="border-t border-amber-500/20 bg-amber-950/20 px-3 py-2 text-[0.6875rem] leading-5 text-amber-100"
      >
        {{ adjustmentMessage }}
      </p>
    </section>

    <footer class="grid gap-2 bg-ui-surface-raised px-3 py-2.5">
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div>
          <p class="text-[0.625rem] font-semibold uppercase tracking-[0.13em] text-ui-text-muted">
            Timing
          </p>
          <p class="mt-0.5 font-mono text-sm font-semibold text-ui-text">
            {{ resolvedState.timing }}
          </p>
        </div>
        <div>
          <p class="text-[0.625rem] font-semibold uppercase tracking-[0.13em] text-ui-text-muted">
            Family
          </p>
          <p class="mt-0.5 text-sm font-semibold capitalize text-ui-text">
            {{ resolvedState.patternType }}
          </p>
        </div>
        <div class="col-span-2 sm:col-span-1">
          <p class="text-[0.625rem] font-semibold uppercase tracking-[0.13em] text-ui-text-muted">
            Poi directions
          </p>
          <p class="mt-0.5 font-mono text-xs text-ui-text-secondary">
            {{ resolvedDirectionsLabel }}
          </p>
        </div>
      </div>
      <p
        class="rounded-md border border-ui-border-subtle bg-ui-input px-2.5 py-1.5 font-mono text-[0.6875rem] leading-5 text-ui-text-secondary"
      >
        {{ exactPositionsLabel }} · offset {{ modelValue.offset }}
      </p>
    </footer>
  </section>
</template>
