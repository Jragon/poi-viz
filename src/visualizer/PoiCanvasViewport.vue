<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, type PropType } from "vue";

import type { CartesianMultiRigPose, RigId } from "@/engine/types";
import { computeDisplayPixelsPerWorldUnit } from "@/visualizer/displayScale";
import type { VisualizerOverlaySettings } from "@/visualizer/overlaySettings";
import { renderFrame, type RigTrail } from "@/visualizer/renderFrame";
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
  displayScale: {
    type: Number,
    default: 1
  },
  isFullscreen: {
    type: Boolean,
    default: false
  },
  webcamActive: {
    type: Boolean,
    default: false
  },
  webcamStream: {
    type: Object as PropType<MediaStream | null>,
    default: null
  },
  rigOrder: {
    type: Array as PropType<readonly RigId[]>,
    required: true
  },
  trails: {
    type: Object as PropType<Partial<Record<RigId, RigTrail>>>,
    default: () => ({})
  },
  overlaySettings: {
    type: Object as PropType<VisualizerOverlaySettings>,
    required: true
  }
});

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);
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
    geometry: props.overlaySettings.geometry,
    rigStyles: props.overlaySettings.rigStyles,
    rigOrder: props.rigOrder,
    trails: props.trails,
    transparentBackground: props.webcamActive,
    showHandTrails: props.overlaySettings.visibility.showHandTrails,
    showHeadTrails: props.overlaySettings.visibility.showHeadTrails,
    showChainLines: props.overlaySettings.visibility.showChainLines,
    showNodeMarkers: props.overlaySettings.visibility.showNodeMarkers,
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
    sceneRadiusWorld: props.sceneWorldRadius,
    pixelsPerWorldUnit: computeDisplayPixelsPerWorldUnit({
      cssWidth: rect.width,
      cssHeight: rect.height,
      sceneRadiusWorld: props.sceneWorldRadius,
      displayScale: props.displayScale
    })
  });
  draw();
};

watch(
  () => [props.poses, props.rigOrder, props.trails, props.overlaySettings, props.webcamActive],
  () => {
    draw();
  },
  { deep: true }
);

watch(
  () => [props.sceneWorldRadius, props.displayScale],
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

defineExpose({
  recomputeLayout: updateLayout
});

watch(
  [videoRef, () => props.webcamStream],
  ([videoElement, stream], [previousVideoElement]) => {
    if (previousVideoElement && previousVideoElement !== videoElement) {
      previousVideoElement.srcObject = null;
    }

    if (videoElement) {
      videoElement.srcObject = stream ?? null;
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (videoRef.value) {
    videoRef.value.srcObject = null;
  }
});
</script>

<template>
  <div
    ref="containerRef"
    :class="[
      'relative overflow-hidden bg-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
      props.isFullscreen
        ? 'min-h-[calc(100vh-12rem)] rounded-none border-0'
        : 'min-h-112 rounded-2xl border border-slate-800'
    ]"
  >
    <div
      v-if="!props.webcamActive"
      class="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.4),rgba(2,6,23,0.85))]"
    />
    <video
      v-if="props.webcamActive"
      ref="videoRef"
      autoplay
      muted
      playsinline
      class="absolute inset-0 z-0 h-full w-full transform-[scaleX(-1)] object-cover"
    />
    <div v-if="props.webcamActive" class="absolute inset-0 z-5 bg-black/45" />
    <canvas ref="canvasRef" class="absolute inset-0 z-10 block h-full w-full" />
  </div>
</template>
