<script setup lang="ts">
import { sampleLoop } from "@/engine/sampling";
import { DEFAULT_TRAIL_SAMPLE_HZ } from "@/state/constants";
import { createWaveLanesFromSamples, renderWaves } from "@/render/waveRenderer";
import { getWaveRenderPalette } from "@/render/theme";
import type { Theme } from "@/state/theme";
import type { AppState } from "@/types/state";
import { onBeforeUnmount, onMounted, ref, watchEffect } from "vue";

interface WaveCanvasProps {
  state: AppState;
  tBeats: number;
  theme: Theme;
}

const props = defineProps<WaveCanvasProps>();

const canvasRef = ref<HTMLCanvasElement | null>(null);

const WAVE_SAMPLE_HZ = DEFAULT_TRAIL_SAMPLE_HZ;

let resizeObserver: ResizeObserver | null = null;

function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): void {
  const devicePixelRatio = window.devicePixelRatio || 1;
  const displayWidth = Math.max(1, Math.floor(canvas.clientWidth * devicePixelRatio));
  const displayHeight = Math.max(1, Math.floor(canvas.clientHeight * devicePixelRatio));

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }
}

function drawHiddenState(context: CanvasRenderingContext2D, width: number, height: number): void {
  const palette = getWaveRenderPalette(props.theme);
  context.fillStyle = palette.background;
  context.fillRect(0, 0, width, height);
  context.fillStyle = palette.label;
  context.font = "13px ui-monospace, SFMono-Regular, Menlo, monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("Wave inspector hidden", width * 0.5, height * 0.5);
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

  if (!props.state.global.showWaves) {
    drawHiddenState(context, canvas.width, canvas.height);
    return;
  }

  const loopBeats = Math.max(props.state.global.loopBeats, 0.25);

  const samples = sampleLoop(
    {
      bpm: props.state.global.bpm,
      hands: props.state.hands
    },
    WAVE_SAMPLE_HZ,
    loopBeats,
    0
  );
  const lanes = createWaveLanesFromSamples(samples, props.theme);

  renderWaves(context, canvas.width, canvas.height, {
    loopBeats,
    tBeats: props.tBeats,
    lanes
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
