<script setup lang="ts">
import type { PoiBeatDirection } from "@/lab/experiments/mel-body-tracing/beat-graph/types";
import type { ReelDirection } from "@/lab/experiments/mel-body-tracing/explorers/reelTypes";

const props = defineProps<{
  direction: ReelDirection;
  resolvedLabel: string;
}>();

const emit = defineEmits<{
  "update:direction": [direction: ReelDirection];
}>();

function setDirectionMode(mode: ReelDirection["mode"]): void {
  if (props.direction.mode === mode) return;
  emit(
    "update:direction",
    mode === "same" ? { mode, direction: "clockwise" } : { mode, flow: "inwards" }
  );
}

function setSameDirection(direction: PoiBeatDirection): void {
  emit("update:direction", { mode: "same", direction });
}

function setOppositeFlow(flow: "inwards" | "outwards"): void {
  emit("update:direction", { mode: "opposite", flow });
}

function directionModeButtonClass(mode: ReelDirection["mode"]): string {
  if (props.direction.mode === mode) return "border-slate-200 bg-slate-100 text-slate-950";
  return "border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800";
}

function sameDirectionButtonClass(direction: PoiBeatDirection): string {
  if (props.direction.mode === "same" && props.direction.direction === direction) {
    return "border-slate-200 bg-slate-100 text-slate-950";
  }
  return "border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800";
}

function oppositeFlowButtonClass(flow: "inwards" | "outwards"): string {
  if (props.direction.mode === "opposite" && props.direction.flow === flow) {
    return "border-slate-200 bg-slate-100 text-slate-950";
  }
  return "border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800";
}
</script>

<template>
  <section class="rounded-lg border border-slate-800 bg-slate-900/60">
    <div class="border-b border-slate-800 px-4 py-3">
      <h2 class="text-sm font-semibold text-slate-200">Direction</h2>
    </div>
    <div class="grid gap-3 px-4 py-4 text-sm">
      <div class="grid grid-cols-2 gap-2">
        <button
          type="button"
          class="rounded-md border px-3 py-2 text-xs font-medium transition"
          :class="directionModeButtonClass('same')"
          :aria-pressed="direction.mode === 'same'"
          @click="setDirectionMode('same')"
        >
          Same
        </button>
        <button
          type="button"
          class="rounded-md border px-3 py-2 text-xs font-medium transition"
          :class="directionModeButtonClass('opposite')"
          :aria-pressed="direction.mode === 'opposite'"
          @click="setDirectionMode('opposite')"
        >
          Opposite
        </button>
      </div>

      <div v-if="direction.mode === 'same'" class="grid grid-cols-2 gap-2">
        <button
          type="button"
          class="rounded-md border px-3 py-2 text-xs font-medium transition"
          :class="sameDirectionButtonClass('clockwise')"
          :aria-pressed="direction.direction === 'clockwise'"
          @click="setSameDirection('clockwise')"
        >
          CW
        </button>
        <button
          type="button"
          class="rounded-md border px-3 py-2 text-xs font-medium transition"
          :class="sameDirectionButtonClass('counterclockwise')"
          :aria-pressed="direction.direction === 'counterclockwise'"
          @click="setSameDirection('counterclockwise')"
        >
          CCW
        </button>
      </div>

      <div v-else class="grid grid-cols-2 gap-2">
        <button
          type="button"
          class="rounded-md border px-3 py-2 text-xs font-medium transition"
          :class="oppositeFlowButtonClass('inwards')"
          :aria-pressed="direction.flow === 'inwards'"
          @click="setOppositeFlow('inwards')"
        >
          Inwards
        </button>
        <button
          type="button"
          class="rounded-md border px-3 py-2 text-xs font-medium transition"
          :class="oppositeFlowButtonClass('outwards')"
          :aria-pressed="direction.flow === 'outwards'"
          @click="setOppositeFlow('outwards')"
        >
          Outwards
        </button>
      </div>

      <p
        class="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 font-mono text-xs text-slate-400"
      >
        {{ resolvedLabel }}
      </p>
    </div>
  </section>
</template>
