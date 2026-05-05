<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { compileAuthoredDocument } from "@/authoring/compile";
import type { AuthoredDocumentEntry } from "@/authoring/types";
import { useAuthoringLibrary } from "@/authoring/useAuthoringLibrary";
import type { CartesianMultiRigPose, MultiRigSequence, RigId, Vec2 } from "@/engine/types";
import type { MultiRigTrailSamples } from "@/visualizer/useMultiRigPlayback";
import { useVisualizerCore } from "@/visualizer/useVisualizerCore";
import {
  computeSharedHandOverlapCircle,
  solveBodyRigFromHands,
  solveStickArm,
  type ArmSide,
  type BodyRigSolveResult
} from "./stickFigureGeometry";

interface CanvasLayout {
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly dpr: number;
  readonly pixelsPerWorldUnit: number;
  readonly cameraCenterWorld: Vec2;
}

interface BodyFrame {
  readonly headCenter: Vec2;
  readonly headRadius: number;
  readonly neck: Vec2;
  readonly shoulderCenter: Vec2;
  readonly shoulderY: number;
  readonly baseShoulderSpan: number;
  readonly pelvis: Vec2;
  readonly hipLeft: Vec2;
  readonly hipRight: Vec2;
  readonly kneeLeft: Vec2;
  readonly kneeRight: Vec2;
  readonly footLeft: Vec2;
  readonly footRight: Vec2;
  readonly upperArmLength: number;
  readonly forearmLength: number;
}

interface FigurePose {
  readonly body: BodyFrame;
  readonly shoulders: BodyRigSolveResult["shoulders"];
  readonly leftArm: ReturnType<typeof solveStickArm>;
  readonly rightArm: ReturnType<typeof solveStickArm>;
  readonly yawDeg: number;
  readonly solve: BodyRigSolveResult;
}

interface RigStyle {
  readonly hand: string;
  readonly head: string;
  readonly chain: string;
  readonly handTrail: string;
  readonly headTrail: string;
}

const LEFT_RIG_ID = "left";
const RIGHT_RIG_ID = "right";
const MAX_TORSO_YAW_DEG = 70;
const MAX_TORSO_YAW_RAD = (MAX_TORSO_YAW_DEG * Math.PI) / 180;
const MIN_PROJECTED_SHOULDER_SPAN_RATIO = 0.36;
const BODY_ARM_REACH_WORLD = 1.25;
const BODY_UPPER_ARM_WORLD = BODY_ARM_REACH_WORLD * 0.5;
const BODY_FOREARM_WORLD = BODY_ARM_REACH_WORLD * 0.5;
const BODY_SHOULDER_SPAN_WORLD = BODY_ARM_REACH_WORLD * 1.0625;
const BODY_TORSO_HEIGHT_WORLD = BODY_ARM_REACH_WORLD * 0.90625;
const BODY_HIP_SPAN_WORLD = BODY_SHOULDER_SPAN_WORLD * 0.6;
const BODY_HEAD_RADIUS_WORLD = BODY_ARM_REACH_WORLD * 0.28125;
const BODY_HEAD_GAP_WORLD = BODY_ARM_REACH_WORLD * 0.1625;
const BODY_NECK_OFFSET_WORLD = BODY_ARM_REACH_WORLD * 0.1;
const BODY_THIGH_LENGTH_WORLD = BODY_ARM_REACH_WORLD * 0.625;
const BODY_SHIN_LENGTH_WORLD = BODY_ARM_REACH_WORLD * 0.59375;
const BODY_FOOT_OFFSET_WORLD = BODY_ARM_REACH_WORLD * 0.0625;
const BODY_CAMERA_CENTER_WORLD: Vec2 = { x: 0, y: -0.7 };

const sharedHandOverlapCircle = computeSharedHandOverlapCircle({
  torsoCenter: { x: 0, y: 0 },
  shoulderY: 0,
  baseShoulderSpan: BODY_SHOULDER_SPAN_WORLD,
  maxYawRad: MAX_TORSO_YAW_RAD,
  upperArmLength: BODY_UPPER_ARM_WORLD,
  forearmLength: BODY_FOREARM_WORLD,
  minProjectedSpanRatio: MIN_PROJECTED_SHOULDER_SPAN_RATIO,
  useMaxYawCompression: true
});

function compileAuthoredSequence(entry: AuthoredDocumentEntry): MultiRigSequence | null {
  const result = compileAuthoredDocument(entry.document);

  return result.ok ? result.sequence : null;
}

const authoringLibrary = useAuthoringLibrary();
const selectedSequenceId = ref(authoringLibrary.selectedDocumentId.value);
const authoredDocuments = computed(() => authoringLibrary.documents.value);
const selectedDocument = computed(() => {
  if (!selectedSequenceId.value) {
    return null;
  }

  return authoredDocuments.value.find((entry) => entry.id === selectedSequenceId.value) ?? null;
});
const selectedDocumentName = computed(() => selectedDocument.value?.document.name ?? "No sequence");
const fallbackDocument = computed(() => authoredDocuments.value[0] ?? null);
const selectedSequence = computed<MultiRigSequence>(() => {
  const selected = selectedDocument.value;
  if (selected) {
    const sequence = compileAuthoredSequence(selected);
    if (sequence) {
      return sequence;
    }
  }

  const fallback = fallbackDocument.value;
  if (fallback) {
    const sequence = compileAuthoredSequence(fallback);
    if (sequence) {
      return sequence;
    }
  }

  return { rigs: [] };
});

const rigStyles: Record<string, RigStyle> = {
  [LEFT_RIG_ID]: {
    hand: "rgba(45, 212, 191, 0.98)",
    head: "rgba(125, 211, 252, 0.98)",
    chain: "rgba(103, 232, 249, 0.65)",
    handTrail: "rgba(45, 212, 191, 0)",
    headTrail: "rgba(125, 211, 252, 0.8)"
  },
  [RIGHT_RIG_ID]: {
    hand: "rgba(251, 191, 36, 0.98)",
    head: "rgba(251, 113, 133, 0.98)",
    chain: "rgba(253, 186, 116, 0.68)",
    handTrail: "rgba(251, 191, 36, 0)",
    headTrail: "rgba(251, 113, 133, 0.8)"
  }
};

const core = useVisualizerCore(selectedSequence, {
  autoplay: true,
  resumeOnSequenceChange: true,
  transportOptions: {
    initialSpeed: 0.35
  }
});
const transport = core.transport;
const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const canvasContextRef = ref<CanvasRenderingContext2D | null>(null);
const layoutRef = ref<CanvasLayout | null>(null);
const statusText = ref("Preparing sequence canvas");

let resizeObserver: ResizeObserver | null = null;

const durationLabel = computed(() => transport.duration.value.toFixed(2));
const timeLabel = computed(() => transport.currentTime.value.toFixed(2));
const speedLabel = computed(() => `${transport.speed.value.toFixed(2)}x`);

function getRigStyle(rigId: RigId): RigStyle {
  return rigStyles[rigId] ?? rigStyles[LEFT_RIG_ID];
}

function sequencePointToBodyWorld(point: Vec2): Vec2 {
  return {
    x: sharedHandOverlapCircle.center.x + point.x * sharedHandOverlapCircle.radius,
    y: sharedHandOverlapCircle.center.y + point.y * sharedHandOverlapCircle.radius
  };
}

function createLayout(cssWidth: number, cssHeight: number): CanvasLayout {
  const bodyVerticalRadius =
    BODY_TORSO_HEIGHT_WORLD + BODY_THIGH_LENGTH_WORLD + BODY_SHIN_LENGTH_WORLD;
  const sequenceRadius = core.sceneWorldRadius.value * sharedHandOverlapCircle.radius;
  const sceneRadius = Math.max(
    sequenceRadius + BODY_SHOULDER_SPAN_WORLD * 0.5,
    bodyVerticalRadius,
    2.45
  );
  const pixelsPerWorldUnit = Math.min(cssWidth, cssHeight) / (2 * (sceneRadius + 0.45));

  return {
    cssWidth,
    cssHeight,
    dpr: window.devicePixelRatio || 1,
    pixelsPerWorldUnit,
    cameraCenterWorld: BODY_CAMERA_CENTER_WORLD
  };
}

function worldToCanvas(layout: CanvasLayout, point: Vec2): Vec2 {
  return {
    x: layout.cssWidth / 2 + (point.x - layout.cameraCenterWorld.x) * layout.pixelsPerWorldUnit,
    y: layout.cssHeight / 2 - (point.y - layout.cameraCenterWorld.y) * layout.pixelsPerWorldUnit
  };
}

function clearCanvas(ctx: CanvasRenderingContext2D, layout: CanvasLayout) {
  ctx.clearRect(0, 0, layout.cssWidth, layout.cssHeight);
  const gradient = ctx.createLinearGradient(0, 0, 0, layout.cssHeight);
  gradient.addColorStop(0, "rgba(15, 23, 42, 0.96)");
  gradient.addColorStop(1, "rgba(2, 6, 23, 1)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, layout.cssWidth, layout.cssHeight);

  ctx.save();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
  ctx.lineWidth = 1;
  const center = worldToCanvas(layout, { x: 0, y: 0 });
  ctx.beginPath();
  ctx.moveTo(0, center.y);
  ctx.lineTo(layout.cssWidth, center.y);
  ctx.moveTo(center.x, 0);
  ctx.lineTo(center.x, layout.cssHeight);
  ctx.stroke();
  ctx.restore();
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  start: Vec2,
  end: Vec2,
  color: string,
  lineWidth: number
) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  center: Vec2,
  radius: number,
  fill: string,
  stroke = "rgba(15, 23, 42, 0.96)",
  strokeWidth = 2
) {
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = strokeWidth;
  ctx.stroke();
}

function drawFadingPolyline(
  ctx: CanvasRenderingContext2D,
  points: readonly Vec2[],
  color: string,
  width: number,
  minOpacity = 0.14
) {
  if (points.length < 2) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  const segmentCount = points.length - 1;

  for (let index = 1; index < points.length; index += 1) {
    const progress = index / segmentCount;
    ctx.globalAlpha = minOpacity + (1 - minOpacity) * progress;
    ctx.beginPath();
    ctx.moveTo(points[index - 1].x, points[index - 1].y);
    ctx.lineTo(points[index].x, points[index].y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawJoint(ctx: CanvasRenderingContext2D, point: Vec2, radius: number, fill: string) {
  drawNode(ctx, point, radius, fill, "rgba(226, 232, 240, 0.5)", 1.25);
}

function drawLimb(
  ctx: CanvasRenderingContext2D,
  points: readonly Vec2[],
  lineWidth: number,
  stroke: string
) {
  if (points.length < 2) {
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

function buildBodyFrame(layout: CanvasLayout): BodyFrame {
  const shoulderCenter = worldToCanvas(layout, { x: 0, y: 0 });
  const centerX = shoulderCenter.x;
  const shoulderY = shoulderCenter.y;
  const baseShoulderSpan = layout.pixelsPerWorldUnit * BODY_SHOULDER_SPAN_WORLD;
  const torsoHeight = layout.pixelsPerWorldUnit * BODY_TORSO_HEIGHT_WORLD;
  const hipSpan = layout.pixelsPerWorldUnit * BODY_HIP_SPAN_WORLD;
  const headRadius = layout.pixelsPerWorldUnit * BODY_HEAD_RADIUS_WORLD;
  const headCenter = {
    x: centerX,
    y: shoulderY - headRadius - layout.pixelsPerWorldUnit * BODY_HEAD_GAP_WORLD
  };
  const neck = { x: centerX, y: shoulderY - layout.pixelsPerWorldUnit * BODY_NECK_OFFSET_WORLD };
  const pelvis = { x: centerX, y: shoulderY + torsoHeight };
  const hipLeft = { x: centerX - hipSpan * 0.5, y: pelvis.y };
  const hipRight = { x: centerX + hipSpan * 0.5, y: pelvis.y };
  const thighLength = layout.pixelsPerWorldUnit * BODY_THIGH_LENGTH_WORLD;
  const shinLength = layout.pixelsPerWorldUnit * BODY_SHIN_LENGTH_WORLD;
  const stanceWidth = baseShoulderSpan * 0.2;
  const kneeLeft = { x: hipLeft.x - stanceWidth, y: hipLeft.y + thighLength };
  const kneeRight = { x: hipRight.x + stanceWidth, y: hipRight.y + thighLength };
  const footOffset = layout.pixelsPerWorldUnit * BODY_FOOT_OFFSET_WORLD;
  const footLeft = { x: kneeLeft.x - footOffset, y: kneeLeft.y + shinLength };
  const footRight = { x: kneeRight.x + footOffset, y: kneeRight.y + shinLength };
  const upperArmLength = layout.pixelsPerWorldUnit * BODY_UPPER_ARM_WORLD;
  const forearmLength = layout.pixelsPerWorldUnit * BODY_FOREARM_WORLD;

  return {
    headCenter,
    headRadius,
    neck,
    shoulderCenter,
    shoulderY,
    baseShoulderSpan,
    pelvis,
    hipLeft,
    hipRight,
    kneeLeft,
    kneeRight,
    footLeft,
    footRight,
    upperArmLength,
    forearmLength
  };
}

function getArmPoints(pose: FigurePose, side: ArmSide): readonly Vec2[] {
  const arm = side === "left" ? pose.leftArm : pose.rightArm;
  return [arm.shoulder, arm.elbow, arm.hand];
}

function getArmDrawOrder(pose: FigurePose): readonly ArmSide[] {
  if (pose.shoulders.nearSide === "left") {
    return ["right", "left"];
  }

  return ["left", "right"];
}

function getBodyPose(layout: CanvasLayout, poses: CartesianMultiRigPose): FigurePose | null {
  const leftPose = poses[LEFT_RIG_ID];
  const rightPose = poses[RIGHT_RIG_ID];
  if (!leftPose || !rightPose) {
    return null;
  }

  const body = buildBodyFrame(layout);
  const leftHandTarget = worldToCanvas(layout, sequencePointToBodyWorld(leftPose.handPosition));
  const rightHandTarget = worldToCanvas(layout, sequencePointToBodyWorld(rightPose.handPosition));
  const solve = solveBodyRigFromHands({
    torsoCenter: body.shoulderCenter,
    shoulderY: body.shoulderY,
    baseShoulderSpan: body.baseShoulderSpan,
    maxYawRad: MAX_TORSO_YAW_RAD,
    upperArmLength: body.upperArmLength,
    forearmLength: body.forearmLength,
    leftHandTarget,
    rightHandTarget,
    minProjectedSpanRatio: MIN_PROJECTED_SHOULDER_SPAN_RATIO
  });

  return {
    body,
    shoulders: solve.shoulders,
    leftArm: solve.leftArm,
    rightArm: solve.rightArm,
    yawDeg: (solve.yawRad * 180) / Math.PI,
    solve
  };
}

function drawPoiRig(
  ctx: CanvasRenderingContext2D,
  layout: CanvasLayout,
  rigId: RigId,
  poses: CartesianMultiRigPose,
  trails: MultiRigTrailSamples
) {
  const pose = poses[rigId];
  if (!pose) {
    return;
  }

  const style = getRigStyle(rigId);
  const hand = worldToCanvas(layout, sequencePointToBodyWorld(pose.handPosition));
  const head = worldToCanvas(layout, sequencePointToBodyWorld(pose.headPosition));
  const trail = trails[rigId];

  if (trail?.hand && trail.hand.length > 1) {
    drawFadingPolyline(
      ctx,
      trail.hand.map((point) => worldToCanvas(layout, sequencePointToBodyWorld(point))),
      style.handTrail,
      3,
      0.2
    );
  }

  if (trail?.head && trail.head.length > 1) {
    drawFadingPolyline(
      ctx,
      trail.head.map((point) => worldToCanvas(layout, sequencePointToBodyWorld(point))),
      style.headTrail,
      3,
      0.2
    );
  }

  drawLine(ctx, hand, head, style.chain, 3);
  drawNode(ctx, hand, 7.5, style.hand);
  drawNode(ctx, head, 9, style.head);
}

function drawBodyOverlay(ctx: CanvasRenderingContext2D, pose: FigurePose) {
  const limbStroke = "rgba(226, 232, 240, 0.5)";
  const secondaryStroke = "rgba(148, 163, 184, 0.42)";
  const leftStroke = "rgba(45, 212, 191, 0.62)";
  const rightStroke = "rgba(251, 191, 36, 0.62)";
  const nodeFill = "rgba(15, 23, 42, 0.62)";

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  drawLimb(ctx, [pose.body.headCenter, pose.body.neck], 6, secondaryStroke);
  drawLimb(ctx, [pose.shoulders.leftShoulder, pose.shoulders.rightShoulder], 12, limbStroke);
  drawLimb(ctx, [pose.body.neck, pose.body.pelvis], 14, limbStroke);
  drawLimb(ctx, [pose.body.hipLeft, pose.body.hipRight], 12, secondaryStroke);
  drawLimb(ctx, [pose.body.hipLeft, pose.body.kneeLeft, pose.body.footLeft], 12, limbStroke);
  drawLimb(ctx, [pose.body.hipRight, pose.body.kneeRight, pose.body.footRight], 12, limbStroke);

  for (const side of getArmDrawOrder(pose)) {
    drawLimb(ctx, getArmPoints(pose, side), 12, side === "left" ? leftStroke : rightStroke);
  }

  ctx.beginPath();
  ctx.arc(pose.body.headCenter.x, pose.body.headCenter.y, pose.body.headRadius, 0, Math.PI * 2);
  ctx.lineWidth = 9;
  ctx.strokeStyle = limbStroke;
  ctx.stroke();

  const staticNodes = [
    pose.body.neck,
    pose.shoulders.leftShoulder,
    pose.shoulders.rightShoulder,
    pose.leftArm.elbow,
    pose.rightArm.elbow,
    pose.body.pelvis,
    pose.body.hipLeft,
    pose.body.hipRight,
    pose.body.kneeLeft,
    pose.body.kneeRight,
    pose.body.footLeft,
    pose.body.footRight
  ];

  for (const point of staticNodes) {
    drawJoint(ctx, point, 5.5, nodeFill);
  }

  drawJoint(ctx, pose.leftArm.hand, 8.5, "rgba(45, 212, 191, 0.78)");
  drawJoint(ctx, pose.rightArm.hand, 8.5, "rgba(251, 191, 36, 0.78)");
  ctx.restore();
}

function drawFrame() {
  const layout = layoutRef.value;
  const canvas = canvasRef.value;
  const ctx = canvasContextRef.value;
  if (!layout || !canvas || !ctx) {
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
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  clearCanvas(ctx, layout);

  const poses = core.cartesianPoses.value;
  const trails = core.trails.value;
  for (const rigId of core.rigOrder.value) {
    drawPoiRig(ctx, layout, rigId, poses, trails);
  }

  const bodyPose = getBodyPose(layout, poses);
  if (!bodyPose) {
    statusText.value = `${selectedDocumentName.value} / body solve waiting for left/right tracks`;
    return;
  }

  drawBodyOverlay(ctx, bodyPose);
  statusText.value = `${selectedDocumentName.value} / r ${sharedHandOverlapCircle.radius.toFixed(2)} / yaw ${Math.round(bodyPose.yawDeg)}deg / cost ${bodyPose.solve.cost.toFixed(1)}${bodyPose.solve.diagnostics.isBestEffort ? " / clamped" : ""}`;
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

  layoutRef.value = createLayout(rect.width, rect.height);
  drawFrame();
}

function setSpeed(nextSpeed: number) {
  transport.setSpeed(nextSpeed);
}

function resetPlayback() {
  transport.reset();
  drawFrame();
}

watch(selectedSequenceId, () => {
  transport.reset();
  updateLayout();
});

watch(
  () => authoredDocuments.value,
  (documents) => {
    if (
      selectedSequenceId.value &&
      documents.some((entry) => entry.id === selectedSequenceId.value)
    ) {
      return;
    }

    selectedSequenceId.value = documents[0]?.id ?? null;
  },
  { flush: "sync" }
);

watch(
  () => [
    core.cartesianPoses.value,
    core.trails.value,
    core.rigOrder.value,
    core.sceneWorldRadius.value,
    core.errorMessage.value
  ],
  () => {
    if (core.errorMessage.value) {
      statusText.value = core.errorMessage.value;
    }
    drawFrame();
  },
  { deep: true }
);

watch(
  () => core.sceneWorldRadius.value,
  () => updateLayout()
);

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
  core.dispose();
});
</script>

<template>
  <div class="lab-live-cell mx-auto grid max-w-5xl! gap-3">
    <section
      class="grid gap-3 rounded-lg border border-slate-800 bg-slate-950/65 p-3 shadow-[0_24px_120px_rgba(2,6,23,0.45)] md:p-4"
    >
      <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div class="grid gap-1">
          <p class="text-[0.68rem] uppercase tracking-[0.24em] text-teal-300">
            Sequence-driven body overlay
          </p>
          <p class="max-w-2xl text-sm leading-6 text-slate-300">
            Authored wall-plane sequences drive the poi. Sequence radius 1 maps to the largest
            circle where both hands can occupy the same point.
          </p>
        </div>
        <div class="grid gap-2 md:min-w-80">
          <label class="grid gap-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Sequence
            <select
              v-model="selectedSequenceId"
              class="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-100 outline-none transition hover:border-slate-500 focus:border-teal-300"
            >
              <option v-if="authoredDocuments.length === 0" value="" disabled>
                No authored sequences
              </option>
              <option v-for="entry in authoredDocuments" :key="entry.id" :value="entry.id">
                {{ entry.document.name }}
              </option>
            </select>
          </label>
          <p
            class="rounded-md border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs tracking-[0.12em] text-slate-400 uppercase"
          >
            {{ statusText }}
          </p>
          <div class="flex flex-wrap items-center gap-2 text-sm">
            <button
              type="button"
              class="rounded-md border border-teal-400/45 bg-teal-500/10 px-4 py-2 font-medium text-teal-100 transition hover:border-teal-300 hover:bg-teal-500/20"
              @click="transport.toggle()"
            >
              {{ transport.isPlaying.value ? "Pause" : "Play" }}
            </button>
            <button
              type="button"
              class="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
              @click="resetPlayback"
            >
              Reset
            </button>
            <button
              v-for="speed in [0.25, 0.5, 1]"
              :key="speed"
              type="button"
              class="rounded-md border px-3 py-2 font-medium transition"
              :class="
                transport.speed.value === speed
                  ? 'border-teal-300 bg-teal-300 text-slate-950'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:text-white'
              "
              @click="setSpeed(speed)"
            >
              {{ speed }}x
            </button>
          </div>
          <p class="text-xs uppercase tracking-[0.16em] text-slate-500">
            t {{ timeLabel }} / {{ durationLabel }} / {{ speedLabel }}
          </p>
        </div>
      </div>

      <div
        ref="containerRef"
        class="relative min-h-112 overflow-hidden rounded-lg border border-slate-800 bg-slate-950 md:min-h-136"
      >
        <div
          class="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3 text-[0.68rem] uppercase tracking-[0.2em] text-slate-500"
        >
          <span>Wall plane only</span>
          <span>Body over poi</span>
        </div>
        <canvas ref="canvasRef" class="absolute inset-0 z-0 block h-full w-full" />
      </div>

      <p class="text-sm leading-6 text-slate-400">
        This duplicates only the small wall-plane renderer needed for the experiment while
        preserving the original stick-figure proportions separately from sequence normalization.
      </p>
    </section>
  </div>
</template>
