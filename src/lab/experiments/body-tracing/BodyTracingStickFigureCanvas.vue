<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

import {
  buildBodyRigConfigFromArmReach,
  buildBodyRigFrame,
  computeSharedHandOverlapCircle,
  getBodyRigArmDrawOrder,
  getBodyRigArmPoints,
  solveBodyRigFrame,
  type ArmSide,
  type BodyRigFrame,
  type BodyRigPose
} from "@/body-rig";
import { DEFAULT_PLANE_PROJECTION_SETTINGS } from "@/engine/planeProjection";
import type { Vec2, Vec3 } from "@/engine/types";

interface CanvasLayout {
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly dpr: number;
}

type DragTarget = "leftHand" | "rightHand";

interface ActiveDrag {
  readonly pointerId: number;
  readonly target: DragTarget;
}

type FigurePose = BodyRigPose;

const HAND_HIT_RADIUS = 18;

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const canvasContextRef = ref<CanvasRenderingContext2D | null>(null);
const layoutRef = ref<CanvasLayout | null>(null);
const leftHandTargetRef = ref<Vec3 | null>(null);
const rightHandTargetRef = ref<Vec3 | null>(null);
const activeDragRef = ref<ActiveDrag | null>(null);
const hoveredDragTarget = ref<DragTarget | null>(null);

let resizeObserver: ResizeObserver | null = null;

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function scaleWorldPoint(point: Vec3, xScale: number, yScale: number): Vec3 {
  return { x: point.x * xScale, y: point.y * yScale, z: point.z };
}

function canvasPointToBodyWorld(point: Vec2): Vec3 {
  return { x: point.x, y: -point.y, z: 0 };
}

function projectedPointToCanvas(point: Vec2): Vec2 {
  return { x: point.x, y: -point.y };
}

function buildBodyFrame(layout: CanvasLayout): BodyRigFrame {
  const width = layout.cssWidth;
  const height = layout.cssHeight;
  const centerX = width * 0.5;
  const scale = Math.min(width, height);
  const rigConfig = buildBodyRigConfigFromArmReach(Math.min(scale * 0.32, 164));
  const shoulderY = Math.max(height * 0.27, 110);
  const torsoHeight = Math.min(scale * 0.29, 160);
  const headRadius = Math.min(scale * 0.09, 38);
  const shoulderCenter = { x: centerX, y: -shoulderY, z: 0 };
  const thighLength = Math.min(scale * 0.2, 116);
  const shinLength = Math.min(scale * 0.19, 108);
  return buildBodyRigFrame({
    shoulderCenter,
    rigConfig,
    torsoHeight,
    hipSpan: rigConfig.baseShoulderSpan * 0.6,
    headRadius,
    headGap: 26,
    neckOffset: 16,
    thighLength,
    shinLength,
    footOffset: 10,
    stanceWidth: rigConfig.baseShoulderSpan * 0.22,
    defaultHandTargetXRatio: 0.78,
    defaultHandTargetYRatio: 1.05
  });
}

function getFigurePose(): FigurePose | null {
  const layout = layoutRef.value;
  if (!layout) {
    return null;
  }

  const body = buildBodyFrame(layout);
  const leftHandTarget = leftHandTargetRef.value ?? body.defaultLeftHandTarget;
  const rightHandTarget = rightHandTargetRef.value ?? body.defaultRightHandTarget;

  return solveBodyRigFrame(
    body,
    {
      leftHandTarget,
      rightHandTarget
    },
    DEFAULT_PLANE_PROJECTION_SETTINGS
  );
}

function drawJoint(
  ctx: CanvasRenderingContext2D,
  point: Vec2,
  radius: number,
  fill: string,
  stroke: string
) {
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawLimb(
  ctx: CanvasRenderingContext2D,
  points: readonly Vec2[],
  lineWidth: number,
  stroke: string
) {
  if (points.length === 0) {
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function getSharedHandGuide(body: BodyRigFrame) {
  return computeSharedHandOverlapCircle({
    root: {
      torsoCenter: { x: body.shoulderCenter.x, y: body.shoulderCenter.y },
      shoulderY: body.shoulderCenter.y
    },
    config: body.rigConfig,
    useMaxYawCompression: true
  });
}

function drawSharedHandGuide(ctx: CanvasRenderingContext2D, center: Vec2, radius: number) {
  ctx.save();
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(56, 189, 248, 0.26)";
  ctx.stroke();
  ctx.restore();
}

function getArmStroke(side: ArmSide): string {
  return side === "left" ? "rgba(125, 211, 252, 0.9)" : "rgba(252, 211, 77, 0.92)";
}

function draw() {
  const layout = layoutRef.value;
  const canvas = canvasRef.value;
  const ctx = canvasContextRef.value;
  const pose = getFigurePose();
  if (!layout || !canvas || !ctx || !pose) {
    return;
  }

  if (canvas.width !== Math.round(layout.cssWidth * layout.dpr)) {
    canvas.width = Math.round(layout.cssWidth * layout.dpr);
  }
  if (canvas.height !== Math.round(layout.cssHeight * layout.dpr)) {
    canvas.height = Math.round(layout.cssHeight * layout.dpr);
  }
  canvas.style.width = `${layout.cssWidth}px`;
  canvas.style.height = `${layout.cssHeight}px`;

  ctx.setTransform(layout.dpr, 0, 0, layout.dpr, 0, 0);
  ctx.clearRect(0, 0, layout.cssWidth, layout.cssHeight);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const limbStroke = "rgba(226, 232, 240, 0.95)";
  const secondaryStroke = "rgba(148, 163, 184, 0.85)";
  const nodeFill = "rgba(15, 23, 42, 0.95)";
  const nodeStroke = "rgba(226, 232, 240, 0.8)";
  const leftFill = "rgba(14, 165, 233, 0.95)";
  const leftStroke = "rgba(186, 230, 253, 1)";
  const rightFill = "rgba(245, 158, 11, 0.96)";
  const rightStroke = "rgba(254, 240, 138, 1)";
  const body = pose.projectedBody;
  const sharedHandGuide = getSharedHandGuide(pose.body);
  const toCanvas = projectedPointToCanvas;

  drawSharedHandGuide(ctx, toCanvas(sharedHandGuide.center), sharedHandGuide.radius);
  drawLimb(ctx, [toCanvas(body.headCenter), toCanvas(body.neck)], 6, secondaryStroke);
  drawLimb(
    ctx,
    [toCanvas(pose.shoulders.leftShoulder), toCanvas(pose.shoulders.rightShoulder)],
    12,
    limbStroke
  );
  drawLimb(ctx, [toCanvas(body.neck), toCanvas(body.pelvis)], 14, limbStroke);
  drawLimb(ctx, [toCanvas(body.hipLeft), toCanvas(body.hipRight)], 12, secondaryStroke);
  drawLimb(
    ctx,
    [toCanvas(body.hipLeft), toCanvas(body.kneeLeft), toCanvas(body.footLeft)],
    12,
    limbStroke
  );
  drawLimb(
    ctx,
    [toCanvas(body.hipRight), toCanvas(body.kneeRight), toCanvas(body.footRight)],
    12,
    limbStroke
  );

  for (const side of getBodyRigArmDrawOrder(pose)) {
    drawLimb(ctx, getBodyRigArmPoints(pose, side).map(toCanvas), 12, getArmStroke(side));
  }

  const headCenter = toCanvas(body.headCenter);
  ctx.beginPath();
  ctx.arc(headCenter.x, headCenter.y, body.headRadius, 0, Math.PI * 2);
  ctx.lineWidth = 10;
  ctx.strokeStyle = limbStroke;
  ctx.stroke();

  const staticNodes = [
    body.neck,
    pose.shoulders.leftShoulder,
    pose.shoulders.rightShoulder,
    pose.leftArm.elbow,
    pose.rightArm.elbow,
    body.pelvis,
    body.hipLeft,
    body.hipRight,
    body.kneeLeft,
    body.kneeRight,
    body.footLeft,
    body.footRight
  ];

  for (const point of staticNodes) {
    drawJoint(ctx, toCanvas(point), 5.5, nodeFill, nodeStroke);
  }

  drawJoint(ctx, toCanvas(pose.leftArm.hand), 8.5, leftFill, leftStroke);
  drawJoint(ctx, toCanvas(pose.rightArm.hand), 8.5, rightFill, rightStroke);
}

function getCanvasPoint(event: PointerEvent): Vec2 | null {
  const canvas = canvasRef.value;
  if (!canvas) {
    return null;
  }

  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function updateHandTarget(target: DragTarget, point: Vec2) {
  if (target === "leftHand") {
    leftHandTargetRef.value = canvasPointToBodyWorld(point);
    return;
  }

  rightHandTargetRef.value = canvasPointToBodyWorld(point);
}

function getHandPoint(pose: FigurePose, target: DragTarget): Vec2 {
  return projectedPointToCanvas(target === "leftHand" ? pose.leftArm.hand : pose.rightArm.hand);
}

function getDragTargetAt(point: Vec2, pose: FigurePose): DragTarget | null {
  const candidates: readonly DragTarget[] = ["leftHand", "rightHand"];
  let nearest: { target: DragTarget; distance: number } | null = null;

  for (const target of candidates) {
    const candidateDistance = distance(point, getHandPoint(pose, target));
    if (candidateDistance > HAND_HIT_RADIUS) {
      continue;
    }

    if (!nearest || candidateDistance < nearest.distance) {
      nearest = { target, distance: candidateDistance };
    }
  }

  return nearest?.target ?? null;
}

function resetPose() {
  const layout = layoutRef.value;
  if (!layout) {
    return;
  }

  const body = buildBodyFrame(layout);
  leftHandTargetRef.value = body.defaultLeftHandTarget;
  rightHandTargetRef.value = body.defaultRightHandTarget;
  draw();
}

function updateLayout() {
  const container = containerRef.value;
  if (!container) {
    return;
  }

  const rect = container.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  const nextLayout = {
    cssWidth: rect.width,
    cssHeight: rect.height,
    dpr: window.devicePixelRatio || 1
  };

  if (layoutRef.value) {
    const xScale = nextLayout.cssWidth / layoutRef.value.cssWidth;
    const yScale = nextLayout.cssHeight / layoutRef.value.cssHeight;
    if (leftHandTargetRef.value) {
      leftHandTargetRef.value = scaleWorldPoint(leftHandTargetRef.value, xScale, yScale);
    }
    if (rightHandTargetRef.value) {
      rightHandTargetRef.value = scaleWorldPoint(rightHandTargetRef.value, xScale, yScale);
    }
  }

  layoutRef.value = nextLayout;
  const body = buildBodyFrame(nextLayout);

  if (!leftHandTargetRef.value) {
    leftHandTargetRef.value = body.defaultLeftHandTarget;
  }
  if (!rightHandTargetRef.value) {
    rightHandTargetRef.value = body.defaultRightHandTarget;
  }

  draw();
}

function endPointerDrag(event?: PointerEvent, releaseCapture = true) {
  const activeDrag = activeDragRef.value;
  if (!activeDrag) {
    return;
  }

  if (event && event.pointerId !== activeDrag.pointerId) {
    return;
  }

  if (releaseCapture && containerRef.value?.hasPointerCapture(activeDrag.pointerId)) {
    containerRef.value.releasePointerCapture(activeDrag.pointerId);
  }

  activeDragRef.value = null;
}

function onPointerDown(event: PointerEvent) {
  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  const point = getCanvasPoint(event);
  const pose = getFigurePose();
  if (!point || !pose) {
    return;
  }

  const target = getDragTargetAt(point, pose);
  if (!target) {
    return;
  }

  event.preventDefault();
  activeDragRef.value = { pointerId: event.pointerId, target };
  hoveredDragTarget.value = target;
  updateHandTarget(target, point);
  containerRef.value?.setPointerCapture(event.pointerId);
  draw();
}

function onPointerMove(event: PointerEvent) {
  const point = getCanvasPoint(event);
  const pose = getFigurePose();
  if (!point || !pose) {
    return;
  }

  const activeDrag = activeDragRef.value;
  if (activeDrag?.pointerId === event.pointerId) {
    event.preventDefault();
    updateHandTarget(activeDrag.target, point);
    draw();
    return;
  }

  hoveredDragTarget.value = getDragTargetAt(point, pose);
}

function onPointerEnd(event: PointerEvent) {
  endPointerDrag(event);
}

function onLostPointerCapture(event: PointerEvent) {
  endPointerDrag(event, false);
}

function onPointerLeave() {
  if (!activeDragRef.value) {
    hoveredDragTarget.value = null;
  }
}

function getStatusText(): string {
  const pose = getFigurePose();
  if (!pose) {
    return "Preparing canvas";
  }

  const diagnostics = ` / cost ${pose.solve.cost.toFixed(1)}${pose.solve.diagnostics.isBestEffort ? " / clamped" : ""}`;
  const leftHand = projectedPointToCanvas(pose.leftArm.hand);
  const rightHand = projectedPointToCanvas(pose.rightArm.hand);
  const projectedShoulderSpan = Math.abs(
    pose.shoulders.rightShoulder.x - pose.shoulders.leftShoulder.x
  );

  return `left ${Math.round(leftHand.x)},${Math.round(leftHand.y)} / right ${Math.round(rightHand.x)},${Math.round(rightHand.y)} / yaw ${Math.round(pose.yawDeg)}deg / shoulders ${Math.round(projectedShoulderSpan)}px${diagnostics}`;
}

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
  endPointerDrag();
});
</script>

<template>
  <div class="lab-live-cell mx-auto grid max-w-5xl! gap-3">
    <section
      class="grid gap-3 rounded-lg border border-slate-800 bg-slate-950/65 p-3 shadow-[0_24px_120px_rgba(2,6,23,0.45)] md:p-4"
    >
      <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div class="grid gap-1">
          <p class="text-[0.68rem] uppercase tracking-[0.24em] text-sky-300">
            Body tracing sandbox
          </p>
          <p class="max-w-2xl text-sm leading-6 text-slate-300">
            Drag either hand. The rig infers torso yaw and shoulder projection from both hand
            targets.
          </p>
        </div>
        <div class="grid gap-2 md:min-w-72">
          <p
            class="rounded-md border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs tracking-[0.12em] text-slate-400 uppercase"
          >
            {{ getStatusText() }}
          </p>
          <button
            type="button"
            class="rounded-md border border-sky-400/45 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-100 transition hover:border-sky-300 hover:bg-sky-500/20"
            @click="resetPose"
          >
            Reset pose
          </button>
        </div>
      </div>

      <div
        ref="containerRef"
        class="relative min-h-112 overflow-hidden rounded-lg border border-slate-800 bg-slate-950 md:min-h-136"
        :class="
          activeDragRef !== null
            ? 'cursor-grabbing'
            : hoveredDragTarget !== null
              ? 'cursor-grab'
              : 'cursor-default'
        "
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerEnd"
        @pointercancel="onPointerEnd"
        @pointerleave="onPointerLeave"
        @lostpointercapture="onLostPointerCapture"
      >
        <div
          class="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.78),rgba(2,6,23,0.96))]"
        />
        <div
          class="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3 text-[0.68rem] uppercase tracking-[0.2em] text-slate-500"
        >
          <span>Planted feet and hips</span>
          <span>Auto shoulder solve</span>
        </div>
        <canvas ref="canvasRef" class="absolute inset-0 z-20 block h-full w-full" />
      </div>

      <p class="text-sm leading-6 text-slate-400">
        The solve is deterministic and best-fit, not a complete anatomical model.
      </p>
    </section>
  </div>
</template>
