<script setup lang="ts">
import { advanceTrailSampler, createTrailSampler, getPositions, getTrailPoints, type TrailSamplerState } from "@/engine/engine";
import { renderPattern } from "@/render/patternRenderer";
import { buildStaticTrailSeries } from "@/render/staticTrails";
import type { TrailSeries } from "@/render/types";
import type { Theme } from "@/state/theme";
import type { AppState } from "@/types/state";
import { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";

interface PatternCanvasProps {
  state: AppState;
  tBeats: number;
  isStaticView: boolean;
  theme: Theme;
}

const props = defineProps<PatternCanvasProps>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const EMPTY_TRAILS: TrailSeries = { L: [], R: [] };

let resizeObserver: ResizeObserver | null = null;
let trailSampler: TrailSamplerState | null = null;
let trailSamplerConfigKey = "";
let staticTrails: TrailSeries = EMPTY_TRAILS;
let staticTrailConfigKey = "";

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

function getStaticTrailConfigKey(): string {
  return [getTrailSamplerConfigKey(), props.state.global.loopBeats, props.tBeats].join("|");
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
  let trails = EMPTY_TRAILS;

  if (props.isStaticView) {
    const nextStaticConfigKey = getStaticTrailConfigKey();
    if (staticTrailConfigKey !== nextStaticConfigKey) {
      staticTrails = buildStaticTrailSeries(params, props.state.global.loopBeats, props.state.global.trailSampleHz, props.tBeats);
      staticTrailConfigKey = nextStaticConfigKey;
    }
    trails = staticTrails;
  } else {
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

    trails = trailSampler ? getTrailPoints(trailSampler) : EMPTY_TRAILS;
  }

  const shouldRenderTrails = props.state.global.showTrails || props.isStaticView;
  const positions = getPositions(params, props.tBeats);

  renderPattern(context, canvas.width, canvas.height, {
    hands: props.state.hands,
    positions,
    trails: shouldRenderTrails ? trails : EMPTY_TRAILS,
    showTrails: shouldRenderTrails
  }, props.theme);
}

onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) {
    return;
  }

  resizeObserver = new ResizeObserver(() => {
    resizeCanvasToDisplaySize(canvas);
    drawFrame();
  });
  resizeObserver.observe(canvas);

  drawFrame();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
});

watchEffect(
  () => {
    drawFrame();
  },
  { flush: "post" }
);
</script>

<template>
  <div class="h-full w-full">
    <canvas ref="canvasRef" class="h-full w-full rounded border border-zinc-800 bg-black" />
  </div>
</template>
