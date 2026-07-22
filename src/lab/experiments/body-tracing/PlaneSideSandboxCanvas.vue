<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { embedPlanePoint, getPlaneNormal, projectWorldPoint } from "@/engine/planeProjection";
import { getPlaneSideOffset } from "@/engine/planeSide";
import type { PlaneId, PlaneSide, Vec2, Vec3 } from "@/engine/types";
import { computeDragProjection, createProjectionDragState } from "@/visualizer/projectionDrag";

interface CanvasLayout {
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly dpr: number;
  readonly pixelsPerWorldUnit: number;
}

interface ProjectedSurface {
  readonly planeId: PlaneId;
  readonly side: PlaneSide;
  readonly points: Vec2[];
  readonly labelPoint: Vec2;
  readonly fill: string;
  readonly stroke: string;
  readonly sortDepth: number;
}

const PLANES: readonly PlaneId[] = ["floor", "wheel", "wall"];
const SIDES: readonly PlaneSide[] = ["b", "a"];
const PLANE_HALF_SIZE = 1.1;
const SIDE_OFFSET = 0.34;
const AXIS_LENGTH = 1.65;

const sideColors: Record<PlaneSide, { fill: string; stroke: string }> = {
  a: { fill: "rgba(45, 212, 191, 0.22)", stroke: "rgba(94, 234, 212, 0.8)" },
  b: { fill: "rgba(251, 191, 36, 0.2)", stroke: "rgba(253, 224, 71, 0.78)" }
};

const planeStroke: Record<PlaneId, string> = {
  wall: "rgba(125, 211, 252, 0.82)",
  wheel: "rgba(196, 181, 253, 0.82)",
  floor: "rgba(134, 239, 172, 0.82)"
};

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const canvasContextRef = ref<CanvasRenderingContext2D | null>(null);
const layoutRef = ref<CanvasLayout | null>(null);
const yawDeg = ref(-32);
const pitchDeg = ref(24);
const activePointerId = ref<number | null>(null);
const dragState = createProjectionDragState();

let resizeObserver: ResizeObserver | null = null;

const projectionSettings = computed(() => ({
  mode: "tilted" as const,
  yawDeg: yawDeg.value,
  pitchDeg: pitchDeg.value
}));

function addWorld(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scaleWorld(point: Vec3, scalar: number): Vec3 {
  return { x: point.x * scalar, y: point.y * scalar, z: point.z * scalar };
}

function worldToCanvas(layout: CanvasLayout, point: Vec2): Vec2 {
  return {
    x: layout.cssWidth / 2 + point.x * layout.pixelsPerWorldUnit,
    y: layout.cssHeight / 2 - point.y * layout.pixelsPerWorldUnit
  };
}

function projectToCanvas(layout: CanvasLayout, point: Vec3): Vec2 {
  return worldToCanvas(layout, projectWorldPoint(point, projectionSettings.value));
}

function averageDepth(points: readonly Vec3[]): number {
  return points.reduce((sum, point) => sum + point.z, 0) / points.length;
}

function getPlaneCorners(planeId: PlaneId, side: PlaneSide): Vec3[] {
  const normal = getPlaneNormal(planeId);
  const offset = scaleWorld(normal, getPlaneSideOffset(side) * SIDE_OFFSET);
  const corners = [
    { x: -PLANE_HALF_SIZE, y: -PLANE_HALF_SIZE },
    { x: PLANE_HALF_SIZE, y: -PLANE_HALF_SIZE },
    { x: PLANE_HALF_SIZE, y: PLANE_HALF_SIZE },
    { x: -PLANE_HALF_SIZE, y: PLANE_HALF_SIZE }
  ];

  return corners.map((corner) => addWorld(embedPlanePoint(planeId, corner), offset));
}

function getSurface(layout: CanvasLayout, planeId: PlaneId, side: PlaneSide): ProjectedSurface {
  const worldCorners = getPlaneCorners(planeId, side);
  const normal = getPlaneNormal(planeId);
  const labelWorld = scaleWorld(normal, getPlaneSideOffset(side) * (SIDE_OFFSET + 0.06));
  const colors = sideColors[side];

  return {
    planeId,
    side,
    points: worldCorners.map((point) => projectToCanvas(layout, point)),
    labelPoint: projectToCanvas(layout, labelWorld),
    fill: colors.fill,
    stroke: planeStroke[planeId] ?? colors.stroke,
    sortDepth: averageDepth(worldCorners)
  };
}

function drawSurface(ctx: CanvasRenderingContext2D, surface: ProjectedSurface) {
  ctx.beginPath();
  ctx.moveTo(surface.points[0].x, surface.points[0].y);
  for (const point of surface.points.slice(1)) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.closePath();
  ctx.fillStyle = surface.fill;
  ctx.fill();
  ctx.strokeStyle = surface.stroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(226, 232, 240, 0.95)";
  ctx.fillText(`${surface.planeId} ${surface.side}`, surface.labelPoint.x, surface.labelPoint.y);
}

function drawAxis(
  ctx: CanvasRenderingContext2D,
  layout: CanvasLayout,
  axis: Vec3,
  label: string,
  color: string
) {
  const origin = projectToCanvas(layout, { x: 0, y: 0, z: 0 });
  const endpoint = projectToCanvas(layout, scaleWorld(axis, AXIS_LENGTH));

  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(endpoint.x, endpoint.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(endpoint.x, endpoint.y, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(label, endpoint.x + 12, endpoint.y - 12);
}

function clearCanvas(ctx: CanvasRenderingContext2D, layout: CanvasLayout) {
  ctx.clearRect(0, 0, layout.cssWidth, layout.cssHeight);
  const gradient = ctx.createLinearGradient(0, 0, 0, layout.cssHeight);
  gradient.addColorStop(0, "rgba(15, 23, 42, 0.98)");
  gradient.addColorStop(1, "rgba(2, 6, 23, 1)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, layout.cssWidth, layout.cssHeight);
}

function draw() {
  const ctx = canvasContextRef.value;
  const canvas = canvasRef.value;
  const layout = layoutRef.value;
  if (!ctx || !canvas || !layout) return;

  if (canvas.width !== Math.round(layout.cssWidth * layout.dpr)) {
    canvas.width = Math.round(layout.cssWidth * layout.dpr);
  }
  if (canvas.height !== Math.round(layout.cssHeight * layout.dpr)) {
    canvas.height = Math.round(layout.cssHeight * layout.dpr);
  }
  canvas.style.width = `${layout.cssWidth}px`;
  canvas.style.height = `${layout.cssHeight}px`;

  ctx.setTransform(layout.dpr, 0, 0, layout.dpr, 0, 0);
  clearCanvas(ctx, layout);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  drawAxis(ctx, layout, { x: 1, y: 0, z: 0 }, "+x", "rgba(56, 189, 248, 0.9)");
  drawAxis(ctx, layout, { x: 0, y: 1, z: 0 }, "+y", "rgba(74, 222, 128, 0.9)");
  drawAxis(ctx, layout, { x: 0, y: 0, z: 1 }, "+z", "rgba(248, 113, 113, 0.9)");

  const surfaces = PLANES.flatMap((planeId) =>
    SIDES.map((side) => getSurface(layout, planeId, side))
  );
  surfaces.sort((a, b) => a.sortDepth - b.sortDepth);

  for (const surface of surfaces) {
    drawSurface(ctx, surface);
  }
}

function updateLayout() {
  const container = containerRef.value;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  layoutRef.value = {
    cssWidth: rect.width,
    cssHeight: rect.height,
    dpr: window.devicePixelRatio || 1,
    pixelsPerWorldUnit: Math.min(rect.width, rect.height) / 4.6
  };
  draw();
}

function endProjectionDrag(event?: PointerEvent, releaseCapture = true) {
  const pointerId = activePointerId.value;
  if (pointerId === null) {
    dragState.end();
    return;
  }

  if (event && event.pointerId !== pointerId) return;

  const container = containerRef.value;
  if (releaseCapture && container?.hasPointerCapture(pointerId)) {
    container.releasePointerCapture(pointerId);
  }

  dragState.end();
  activePointerId.value = null;
}

function onPointerDown(event: PointerEvent) {
  if (event.pointerType !== "mouse" || event.button !== 0 || activePointerId.value !== null) {
    return;
  }

  event.preventDefault();
  activePointerId.value = event.pointerId;
  dragState.start(event.clientX, event.clientY, yawDeg.value, pitchDeg.value);
  containerRef.value?.setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent) {
  if (activePointerId.value !== event.pointerId) return;
  const move = dragState.move(event.clientX, event.clientY);
  if (!move) return;

  event.preventDefault();
  const projection = computeDragProjection(move.startYawDeg, move.startPitchDeg, move.dx, move.dy);
  yawDeg.value = projection.yawDeg;
  pitchDeg.value = projection.pitchDeg;
}

function onPointerEnd(event: PointerEvent) {
  endProjectionDrag(event);
}

watch(projectionSettings, () => draw());

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;

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
</script>

<template>
  <section
    class="lab-live-cell overflow-hidden rounded-lg border border-ui-border-subtle bg-slate-950/80"
  >
    <header
      class="grid gap-3 border-b border-ui-border-subtle px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
    >
      <div class="min-w-0">
        <p class="text-xs uppercase tracking-[0.2em] text-ui-text-muted">Plane Side Canvas</p>
        <h2 class="mt-1 text-lg font-semibold text-slate-100">Atomic plane side surfaces</h2>
        <p class="mt-1 text-sm leading-6 text-slate-400">
          Drag horizontally or vertically to rotate the projected view.
        </p>
      </div>

      <dl class="grid grid-cols-2 gap-x-5 gap-y-1 text-xs text-slate-400 md:text-right">
        <div>
          <dt class="uppercase tracking-[0.18em] text-ui-text-muted">Yaw</dt>
          <dd class="font-mono text-slate-300">{{ yawDeg.toFixed(0) }} deg</dd>
        </div>
        <div>
          <dt class="uppercase tracking-[0.18em] text-ui-text-muted">Pitch</dt>
          <dd class="font-mono text-slate-300">{{ pitchDeg.toFixed(0) }} deg</dd>
        </div>
      </dl>
    </header>

    <div
      ref="containerRef"
      class="min-h-96 cursor-grab touch-none select-none md:min-h-128"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerEnd"
      @pointercancel="onPointerEnd"
      @lostpointercapture="onPointerEnd"
    >
      <canvas ref="canvasRef" class="block h-full w-full" />
    </div>
  </section>
</template>
