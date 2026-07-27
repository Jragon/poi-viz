<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

import type { IdealTetherSample } from "./physics/types";

const props = withDefaults(
  defineProps<{
    sample: IdealTetherSample;
    trail: readonly IdealTetherSample[];
    tetherLength: number;
    ariaLabel?: string;
  }>(),
  {
    ariaLabel: "Gravity Lab tether simulation"
  }
);

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
let resizeObserver: ResizeObserver | null = null;

function draw() {
  const canvas = canvasRef.value;
  const container = containerRef.value;
  if (!canvas || !container) return;

  const width = Math.max(320, container.clientWidth);
  const height = Math.max(320, Math.min(520, width * 0.78));
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);

  const center = { x: width / 2, y: height / 2 + 8 };
  const sceneRadius = Math.max(props.tetherLength * 1.35, 1);
  const pixelsPerUnit = Math.min(width, height) * 0.38 / sceneRadius;
  const project = (point: { x: number; y: number }) => ({
    x: center.x + point.x * pixelsPerUnit,
    y: center.y - point.y * pixelsPerUnit
  });

  context.fillStyle = "#020617";
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "rgba(100, 116, 139, 0.25)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(center.x, 20);
  context.lineTo(center.x, height - 20);
  context.moveTo(20, center.y);
  context.lineTo(width - 20, center.y);
  context.stroke();

  const origin = project({ x: 0, y: 0 });
  context.strokeStyle = "rgba(56, 189, 248, 0.22)";
  context.setLineDash([5, 5]);
  context.beginPath();
  context.arc(origin.x, origin.y, props.tetherLength * pixelsPerUnit, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);

  if (props.trail.length > 1) {
    context.strokeStyle = "rgba(56, 189, 248, 0.38)";
    context.lineWidth = 2;
    context.beginPath();
    props.trail.forEach((entry, index) => {
      const point = project(entry.poiPosition);
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.stroke();
  }

  const hand = project(props.sample.handPosition);
  const poi = project(props.sample.poiPosition);
  context.strokeStyle = props.sample.mode === "taut" ? "#f8fafc" : "#fbbf24";
  context.lineWidth = 4;
  context.setLineDash(props.sample.mode === "taut" ? [] : [8, 6]);
  context.beginPath();
  context.moveTo(hand.x, hand.y);
  context.lineTo(poi.x, poi.y);
  context.stroke();
  context.setLineDash([]);

  const velocityScale = 0.13 * pixelsPerUnit / Math.max(props.tetherLength, 0.01);
  const velocityEnd = project({
    x: props.sample.poiPosition.x + props.sample.poiVelocity.x * velocityScale,
    y: props.sample.poiPosition.y + props.sample.poiVelocity.y * velocityScale
  });
  context.strokeStyle = "#a7f3d0";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(poi.x, poi.y);
  context.lineTo(velocityEnd.x, velocityEnd.y);
  context.stroke();

  context.fillStyle = "#f472b6";
  context.beginPath();
  context.arc(hand.x, hand.y, 9, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = props.sample.mode === "taut" ? "#38bdf8" : "#fbbf24";
  context.beginPath();
  context.arc(poi.x, poi.y, 13, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "rgba(226, 232, 240, 0.72)";
  context.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.fillText(props.sample.mode === "taut" ? "TAUT" : "SLACK", 16, 24);
  context.fillText(`t = ${props.sample.time.toFixed(2)}`, 16, 42);
}

watch(() => [props.sample, props.trail, props.tetherLength], draw, { deep: false });

onMounted(() => {
  resizeObserver = new ResizeObserver(draw);
  if (containerRef.value) resizeObserver.observe(containerRef.value);
  draw();
});

onBeforeUnmount(() => resizeObserver?.disconnect());
</script>

<template>
  <div ref="containerRef" class="min-w-0 overflow-hidden rounded-lg" :aria-label="props.ariaLabel">
    <canvas ref="canvasRef" class="block w-full" role="img" :aria-label="props.ariaLabel" />
  </div>
</template>
