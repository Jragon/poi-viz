<script setup lang="ts">
import { sampleLoop } from "@/engine/sampling";
import { DEFAULT_TRAIL_SAMPLE_HZ } from "@/state/constants";
import { createWaveLanesFromSamples, renderWaves } from "@/render/waveRenderer";
import type { AppState } from "@/types/state";
import { onBeforeUnmount, onMounted, ref } from "vue";

interface WaveCanvasProps {
  state: AppState;
  tBeats: number;
}

const props = defineProps<WaveCanvasProps>();

const canvasRef = ref<HTMLCanvasElement | null>(null);

const WAVE_SAMPLE_HZ = DEFAULT_TRAIL_SAMPLE_HZ;

let animationFrameId = 0;
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
  context.fillStyle = "#030712";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#6b7280";
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
    animationFrameId = requestAnimationFrame(drawFrame);
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
  const lanes = createWaveLanesFromSamples(samples);

  renderWaves(context, canvas.width, canvas.height, {
    loopBeats,
    tBeats: props.tBeats,
    lanes
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
