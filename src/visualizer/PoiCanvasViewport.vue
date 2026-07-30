<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { BodyRigMotionSolver } from "@/body-rig";
import type { ProjectionMode } from "@/engine/planeProjection";
import { computeBodyOverlay, getBodyOverlaySceneExtent } from "@/visualizer/bodyOverlay";
import { computeDisplayPixelsPerWorldUnit } from "@/visualizer/displayScale";
import { computeDragProjection, createProjectionDragState } from "@/visualizer/projectionDrag";
import {
  renderFrame,
  scaleBodyRigGeometry,
  type BodyAnatomicalRenderStyles
} from "@/visualizer/renderFrame";
import { createSceneLayout, type SceneLayout } from "@/visualizer/sceneLayout";
import { useVisualizerWorkspace } from "@/visualizer/visualizerWorkspace";

export interface ProjectionDragSettings {
  readonly mode: ProjectionMode;
  readonly yawDeg: number;
  readonly pitchDeg: number;
}

const props = withDefaults(
  defineProps<{
    isFullscreen?: boolean;
    webcamActive?: boolean;
    webcamStream?: MediaStream | null;
    projectionDragEnabled?: boolean;
    bodyRigScale?: number | undefined;
    rootFacingDeg?: number | undefined;
    bodyAnatomicalStyles?: BodyAnatomicalRenderStyles;
    showBodyFacingCue?: boolean;
  }>(),
  {
    isFullscreen: false,
    webcamActive: false,
    webcamStream: null,
    projectionDragEnabled: true,
    showBodyFacingCue: false
  }
);

const { core, display } = useVisualizerWorkspace();
const projectionDrag = computed<ProjectionDragSettings | null>(() =>
  props.projectionDragEnabled
    ? {
        mode: core.session.projectionSettings.value.mode,
        yawDeg: core.session.projectionYawDeg.value,
        pitchDeg: core.session.projectionPitchDeg.value
      }
    : null
);

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);
const layoutRef = ref<SceneLayout | null>(null);
const canvasContextRef = ref<CanvasRenderingContext2D | null>(null);
const activePointerId = ref<number | null>(null);
const dragState = createProjectionDragState();
const bodyRigMotionSolver = new BodyRigMotionSolver();
const isProjectionDragAvailable = computed(() => projectionDrag.value?.mode === "tilted");
const isProjectionDragging = computed(() => activePointerId.value !== null && dragState.isActive());
const effectiveBodyRigScale = computed(() => {
  if (props.bodyRigScale !== undefined) {
    return props.bodyRigScale;
  }

  return layoutRef.value && layoutRef.value.cssWidth < 640 ? 0.6 : 1;
});

watch(
  () => core.sequence.value,
  () => bodyRigMotionSolver.reset()
);

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
  const overlaySettings = display.overlaySettings.value;
  const currentFrame = core.session.currentFrame.value;
  const backSideRigIds = currentFrame?.ok
    ? Object.entries(currentFrame.evaluatedPoses)
        .filter(([, pose]) => pose.planeSide === "b")
        .map(([rigId]) => rigId)
    : [];
  const bodyOverlay = overlaySettings.visibility.showBodyRig
    ? computeBodyOverlay({
        worldPoses: core.worldPoses.value,
        layout,
        projectionSettings: core.session.projectionSettings.value,
        motionSolver: bodyRigMotionSolver,
        time: core.transport.currentTime.value,
        ...(props.rootFacingDeg === undefined ? {} : { rootFacingDeg: props.rootFacingDeg })
      })
    : null;

  renderFrame(ctx, layout, core.cartesianPoses.value, {
    geometry: scaleBodyRigGeometry(overlaySettings.geometry, effectiveBodyRigScale.value),
    rigStyles: overlaySettings.rigStyles,
    rigOrder: core.rigOrder.value,
    trails: core.trails.value,
    bodyOverlay,
    ...(props.bodyAnatomicalStyles === undefined
      ? {}
      : { bodyAnatomicalStyles: props.bodyAnatomicalStyles }),
    transparentBackground: props.webcamActive,
    showHandTrails: overlaySettings.visibility.showHandTrails,
    showHeadTrails: overlaySettings.visibility.showHeadTrails,
    showChainLines: overlaySettings.visibility.showChainLines,
    showNodeMarkers: overlaySettings.visibility.showNodeMarkers,
    showBodyRig: overlaySettings.visibility.showBodyRig,
    showBodyFacingCue: props.showBodyFacingCue,
    showLabels: false,
    backSideRigIds
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

  const overlaySettings = display.overlaySettings.value;
  const sceneExtent = overlaySettings.visibility.showBodyRig
    ? getBodyOverlaySceneExtent({ sequenceRadiusWorld: core.sceneWorldRadius.value })
    : null;
  const effectiveSceneWorldRadius = sceneExtent?.sceneRadiusWorld ?? core.sceneWorldRadius.value;

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
      displayScale: display.displayScale.value
    })
  });
  draw();
};

watch(
  () => [
    core.cartesianPoses.value,
    core.worldPoses.value,
    core.rigOrder.value,
    core.trails.value,
    display.overlaySettings.value,
    props.webcamActive,
    props.rootFacingDeg,
    props.bodyAnatomicalStyles,
    props.showBodyFacingCue,
    core.session.projectionSettings.value
  ],
  () => {
    draw();
  },
  { deep: true }
);

watch(
  () => [
    core.sceneWorldRadius.value,
    display.displayScale.value,
    display.overlaySettings.value.visibility.showBodyRig
  ],
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
  const activeProjectionDrag = projectionDrag.value;
  if (
    event.pointerType !== "mouse" ||
    event.button !== 0 ||
    activePointerId.value !== null ||
    !isProjectionDragAvailable.value ||
    !activeProjectionDrag
  ) {
    return;
  }

  event.preventDefault();
  activePointerId.value = event.pointerId;
  dragState.start(
    event.clientX,
    event.clientY,
    activeProjectionDrag.yawDeg,
    activeProjectionDrag.pitchDeg
  );
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
  core.session.setProjectionYawDeg(next.yawDeg);
  core.session.setProjectionPitchDeg(next.pitchDeg);
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
      'relative overflow-hidden bg-ui-stage shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
      props.isFullscreen
        ? 'min-h-[calc(100vh-12rem)] rounded-none border-0'
        : 'min-h-112 rounded-2xl border border-ui-border-subtle',
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
