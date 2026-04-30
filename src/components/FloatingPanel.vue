<script setup lang="ts">
import { useDraggable, useEventListener, useStorage } from "@vueuse/core";
import { computed, nextTick, ref, watch } from "vue";

import { clampPanelPosition, type PanelPosition } from "@/components/floatingPanelPosition";

const props = withDefaults(
  defineProps<{
    storageKey: string;
    initialPosition?: PanelPosition;
    margin?: number;
    disabled?: boolean;
  }>(),
  {
    initialPosition: () => ({ x: 32, y: 32 }),
    margin: 16,
    disabled: false
  }
);

const emit = defineEmits<{
  close: [];
  resetPosition: [];
}>();

const panelRef = ref<HTMLElement | null>(null);
const handleRef = ref<HTMLElement | null>(null);
const storedPosition = useStorage(props.storageKey, props.initialPosition);

const { x, y, style } = useDraggable(panelRef, {
  handle: handleRef,
  initialValue: storedPosition.value,
  disabled: computed(() => props.disabled)
});

function viewportSize() {
  return {
    width: typeof window === "undefined" ? 0 : window.innerWidth,
    height: typeof window === "undefined" ? 0 : window.innerHeight
  };
}

function panelSize() {
  const rect = panelRef.value?.getBoundingClientRect();
  return {
    width: rect?.width ?? 384,
    height: rect?.height ?? 480
  };
}

function persistPosition() {
  storedPosition.value = { x: x.value, y: y.value };
}

function applyClampedPosition(position: PanelPosition) {
  const next = clampPanelPosition(position, viewportSize(), panelSize(), props.margin);
  x.value = next.x;
  y.value = next.y;
  storedPosition.value = next;
}

function clampCurrentPosition() {
  applyClampedPosition({ x: x.value, y: y.value });
}

function resetPosition() {
  applyClampedPosition(props.initialPosition);
  emit("resetPosition");
}

function close() {
  emit("close");
}

watch([x, y], persistPosition);

nextTick(() => {
  clampCurrentPosition();
});

useEventListener("resize", () => {
  clampCurrentPosition();
});
</script>

<template>
  <div
    ref="panelRef"
    :style="style"
    class="fixed z-40 flex max-h-[calc(100vh-2rem)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/95 shadow-2xl shadow-slate-950/70 backdrop-blur"
  >
    <div ref="handleRef" class="cursor-move touch-none select-none border-b border-slate-800 p-4">
      <slot name="handle" :close="close" :reset-position="resetPosition">
        <div class="flex items-center justify-between gap-3">
          <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Panel</p>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
              @click.stop="resetPosition"
            >
              Reset
            </button>
            <button
              type="button"
              class="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
              @click.stop="close"
            >
              Close
            </button>
          </div>
        </div>
      </slot>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <slot />
    </div>
  </div>
</template>
