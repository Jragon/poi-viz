<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, type PropType } from "vue";

import type { CartesianMultiRigPose, RigId, Vec2 } from "@/engine/types";
import { renderFrame } from "@/visualizer/renderFrame";
import { createSceneLayout, type SceneLayout } from "@/visualizer/sceneLayout";

const props = defineProps({
  poses: {
    type: Object as PropType<CartesianMultiRigPose>,
    required: true
  },
  sceneWorldRadius: {
    type: Number,
    required: true
  },
  rigOrder: {
    type: Array as PropType<readonly RigId[]>,
    required: true
  },
  trails: {
    type: Object as PropType<Partial<Record<RigId, readonly Vec2[]>>>,
    default: () => ({})
  }
});

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const layoutRef = ref<SceneLayout | null>(null);
const canvasContextRef = ref<CanvasRenderingContext2D | null>(null);

let resizeObserver: ResizeObserver | null = null;

const draw = () => {
  const ctx = canvasContextRef.value;
  const layout = layoutRef.value;
  const canvas = canvasRef.value;
  if (!ctx || !layout || !canvas) {
    return;
  }

  if (canvas.width !== layout.canvasWidth || canvas.height !== layout.canvasHeight) {
    canvas.width = layout.canvasWidth;
    canvas.height = layout.canvasHeight;
    canvas.style.width = `${layout.cssWidth}px`;
    canvas.style.height = `${layout.cssHeight}px`;
  }

  ctx.setTransform(layout.dpr, 0, 0, layout.dpr, 0, 0);
  renderFrame(ctx, layout, props.poses, {
    rigOrder: props.rigOrder,
    trails: props.trails,
    showLabels: false
  });
};

const updateLayout = () => {
  const container = containerRef.value;
  if (!container) {
    return;
  }

  const rect = container.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  layoutRef.value = createSceneLayout({
    cssWidth: rect.width,
    cssHeight: rect.height,
    dpr: window.devicePixelRatio || 1,
    sceneRadiusWorld: props.sceneWorldRadius
  });
  draw();
};

watch(
  () => [props.poses, props.rigOrder, props.trails],
  () => {
    draw();
  },
  { deep: false }
);

watch(
  () => props.sceneWorldRadius,
  () => {
    updateLayout();
  }
);

watch(layoutRef, () => {
  draw();
});

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) {
    return;
  }

  canvasContextRef.value = canvas.getContext("2d");
  updateLayout();

  if (typeof ResizeObserver === "function" && containerRef.value) {
    resizeObserver = new ResizeObserver(() => updateLayout());
    resizeObserver.observe(containerRef.value);
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  canvasContextRef.value = null;
});
</script>

<template>
  <div
    ref="containerRef"
    class="relative min-h-[28rem] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
  >
    <div
      class="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_35%),linear-gradient(180deg,_rgba(15,23,42,0.4),_rgba(2,6,23,0.85))]"
    />
    <canvas ref="canvasRef" class="absolute inset-0 z-10 block h-full w-full" />
  </div>
</template>
