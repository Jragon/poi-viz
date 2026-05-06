<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, type PropType } from "vue";

import {
  DEFAULT_PLANE_PROJECTION_SETTINGS,
  type PlaneProjectionSettings,
  type ProjectionMode
} from "@/engine/planeProjection";
import type { CartesianMultiRigPose, RigId, WorldMultiRigPose } from "@/engine/types";
import { computeBodyOverlay, getBodyOverlaySceneExtent } from "@/visualizer/bodyOverlay";
import { computeDisplayPixelsPerWorldUnit } from "@/visualizer/displayScale";
import type { VisualizerOverlaySettings } from "@/visualizer/overlaySettings";
import { computeDragProjection, createProjectionDragState } from "@/visualizer/projectionDrag";
import { renderFrame, type RigTrail } from "@/visualizer/renderFrame";
import { createSceneLayout, type SceneLayout } from "@/visualizer/sceneLayout";

export interface ProjectionDragSettings {
  readonly mode: ProjectionMode;
  readonly yawDeg: number;
  readonly pitchDeg: number;
}

const props = defineProps({
  poses: {
    type: Object as PropType<CartesianMultiRigPose>,
    required: true
  },
  worldPoses: {
    type: Object as PropType<WorldMultiRigPose>,
    default: () => ({})
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
  },
  projectionDrag: {
    type: Object as PropType<ProjectionDragSettings | null>,
    default: null
  },
  projectionSettings: {
    type: Object as PropType<PlaneProjectionSettings>,
    default: () => DEFAULT_PLANE_PROJECTION_SETTINGS
  }
});

const emit = defineEmits<{
  "update:projectionYawDeg": [value: number];
  "update:projectionPitchDeg": [value: number];
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);
const layoutRef = ref<SceneLayout | null>(null);
const canvasContextRef = ref<CanvasRenderingContext2D | null>(null);
const activePointerId = ref<number | null>(null);
const dragState = createProjectionDragState();
const isProjectionDragAvailable = computed(() => props.projectionDrag?.mode === "tilted");
const isProjectionDragging = computed(() => activePointerId.value !== null && dragState.isActive());

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
  const bodyOverlay = props.overlaySettings.visibility.showBodyRig
    ? computeBodyOverlay({
        worldPoses: props.worldPoses,
        layout,
        projectionSettings: props.projectionSettings
      })
    : null;

  renderFrame(ctx, layout, props.poses, {
    geometry: props.overlaySettings.geometry,
    rigStyles: props.overlaySettings.rigStyles,
    rigOrder: props.rigOrder,
    trails: props.trails,
    bodyOverlay,
    transparentBackground: props.webcamActive,
    showHandTrails: props.overlaySettings.visibility.showHandTrails,
    showHeadTrails: props.overlaySettings.visibility.showHeadTrails,
    showChainLines: props.overlaySettings.visibility.showChainLines,
    showNodeMarkers: props.overlaySettings.visibility.showNodeMarkers,
    showBodyRig: props.overlaySettings.visibility.showBodyRig,
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

  const sceneExtent = props.overlaySettings.visibility.showBodyRig
    ? getBodyOverlaySceneExtent({ sequenceRadiusWorld: props.sceneWorldRadius })
    : null;
  const effectiveSceneWorldRadius = sceneExtent?.sceneRadiusWorld ?? props.sceneWorldRadius;

  layoutRef.value = createSceneLayout({
    cssWidth: rect.width,
    cssHeight: rect.height,
    dpr: window.devicePixelRatio || 1,
    sceneRadiusWorld: effectiveSceneWorldRadius,
    ...(sceneExtent ? { cameraCenterWorld: sceneExtent.cameraCenterWorld } : {}),
    pixelsPerWorldUnit: computeDisplayPixelsPerWorldUnit({
      cssWidth: rect.width,
      cssHeight: rect.height,
      sceneRadiusWorld: effectiveSceneWorldRadius,
      displayScale: props.displayScale
    })
  });
  draw();
};

watch(
  () => [
    props.poses,
    props.worldPoses,
    props.rigOrder,
    props.trails,
    props.overlaySettings,
    props.webcamActive,
    props.projectionSettings
  ],
  () => {
    draw();
  },
  { deep: true }
);

watch(
  () => [props.sceneWorldRadius, props.displayScale, props.overlaySettings.visibility.showBodyRig],
  () => {
    updateLayout();
  }
);

watch(layoutRef, () => {
  draw();
});

function endProjectionDrag(event?: PointerEvent, releaseCapture = true) {
  const pointerId = activePointerId.value;
  if (pointerId === null) {
    dragState.end();
    return;
  }

  if (event && event.pointerId !== pointerId) {
    return;
  }

  const container = containerRef.value;
  if (releaseCapture && container?.hasPointerCapture(pointerId)) {
    container.releasePointerCapture(pointerId);
  }

  dragState.end();
  activePointerId.value = null;
}

function onProjectionPointerDown(event: PointerEvent) {
  const projectionDrag = props.projectionDrag;
  if (
    event.pointerType !== "mouse" ||
    event.button !== 0 ||
    activePointerId.value !== null ||
    !isProjectionDragAvailable.value ||
    !projectionDrag
  ) {
    return;
  }

  event.preventDefault();
  activePointerId.value = event.pointerId;
  dragState.start(event.clientX, event.clientY, projectionDrag.yawDeg, projectionDrag.pitchDeg);
  containerRef.value?.setPointerCapture(event.pointerId);
}

function onProjectionPointerMove(event: PointerEvent) {
  if (activePointerId.value !== event.pointerId) {
    return;
  }

  const move = dragState.move(event.clientX, event.clientY);
  if (!move) {
    return;
  }

  event.preventDefault();
  const next = computeDragProjection(move.startYawDeg, move.startPitchDeg, move.dx, move.dy);
  emit("update:projectionYawDeg", next.yawDeg);
  emit("update:projectionPitchDeg", next.pitchDeg);
}

function onProjectionPointerEnd(event: PointerEvent) {
  endProjectionDrag(event);
}

function onProjectionLostPointerCapture(event: PointerEvent) {
  endProjectionDrag(event, false);
}

watch(isProjectionDragAvailable, (available) => {
  if (!available) {
    endProjectionDrag();
  }
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
  endProjectionDrag();
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
    @pointerdown="onProjectionPointerDown"
    @pointermove="onProjectionPointerMove"
    @pointerup="onProjectionPointerEnd"
    @pointercancel="onProjectionPointerEnd"
    @lostpointercapture="onProjectionLostPointerCapture"
    :class="[
      'relative overflow-hidden bg-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
      props.isFullscreen
        ? 'min-h-[calc(100vh-12rem)] rounded-none border-0'
        : 'min-h-112 rounded-2xl border border-slate-800',
      isProjectionDragging ? 'cursor-grabbing' : isProjectionDragAvailable ? 'cursor-grab' : ''
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
