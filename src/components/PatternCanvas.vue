<script setup lang="ts">
import { advanceTrailSampler, createTrailSampler, getPositions, getTrailPoints, type TrailSamplerState } from "@/engine/engine";
import { renderPattern } from "@/render/patternRenderer";
import type { TrailSeries } from "@/render/types";
import type { AppState } from "@/types/state";
import { onBeforeUnmount, onMounted, ref } from "vue";

interface PatternCanvasProps {
  state: AppState;
  tBeats: number;
}

const props = defineProps<PatternCanvasProps>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const EMPTY_TRAILS: TrailSeries = { L: [], R: [] };

let animationFrameId = 0;
let resizeObserver: ResizeObserver | null = null;
let trailSampler: TrailSamplerState | null = null;
let trailSamplerConfigKey = "";

function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): void {
  const devicePixelRatio = window.devicePixelRatio || 1;
  const displayWidth = Math.max(1, Math.floor(canvas.clientWidth * devicePixelRatio));
  const displayHeight = Math.max(1, Math.floor(canvas.clientHeight * devicePixelRatio));

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }
}

function getTrailSamplerConfigKey(): string {
  const { global, hands } = props.state;
  return [
    global.bpm,
    global.trailBeats,
    global.trailSampleHz,
    hands.L.armSpeed,
    hands.L.armPhase,
    hands.L.armRadius,
    hands.L.poiSpeed,
    hands.L.poiPhase,
    hands.L.poiRadius,
    hands.R.armSpeed,
    hands.R.armPhase,
    hands.R.armRadius,
    hands.R.poiSpeed,
    hands.R.poiPhase,
    hands.R.poiRadius
  ].join("|");
}

function drawFrame(): void {
  const canvas = canvasRef.value;
  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  resizeCanvasToDisplaySize(canvas);

  const params = {
    bpm: props.state.global.bpm,
    hands: props.state.hands
  };
  const nextConfigKey = getTrailSamplerConfigKey();

  if (!trailSampler || trailSamplerConfigKey !== nextConfigKey) {
    trailSampler = createTrailSampler(
      {
        bpm: props.state.global.bpm,
        trailBeats: props.state.global.trailBeats,
        trailSampleHz: props.state.global.trailSampleHz
      },
      params,
      props.tBeats
    );
    trailSamplerConfigKey = nextConfigKey;
  } else {
    trailSampler = advanceTrailSampler(trailSampler, params, props.tBeats);
  }

  const trails = props.state.global.showTrails && trailSampler ? getTrailPoints(trailSampler) : EMPTY_TRAILS;
  const positions = getPositions(params, props.tBeats);

  renderPattern(context, canvas.width, canvas.height, {
    hands: props.state.hands,
    positions,
    trails,
    showTrails: props.state.global.showTrails
  });

  animationFrameId = requestAnimationFrame(drawFrame);
}

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) {
    return;
  }

  resizeObserver = new ResizeObserver(() => {
    resizeCanvasToDisplaySize(canvas);
  });
  resizeObserver.observe(canvas);

  animationFrameId = requestAnimationFrame(drawFrame);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrameId);
  resizeObserver?.disconnect();
  resizeObserver = null;
});
</script>

<template>
  <div class="h-full w-full">
    <canvas ref="canvasRef" class="h-full w-full rounded border border-zinc-800 bg-black" />
  </div>
</template>

