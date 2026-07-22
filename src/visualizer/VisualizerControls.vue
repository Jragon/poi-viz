<script setup lang="ts">
import type { PngSequenceExportState } from "@/visualizer/exportPngSequence";
import type { BuiltInDisplayPresetId } from "@/visualizer/useDisplaySettings";

const props = defineProps<{
  activePresetId: BuiltInDisplayPresetId;
  exportState: PngSequenceExportState;
  isDisplayPanelOpen: boolean;
  isExportReady: boolean;
  isFullscreen: boolean;
  isWebcamActive: boolean;
  webcamErrorMessage?: string | null;
}>();

const emit = defineEmits<{
  cancelExport: [];
  startExport: [];
  toggleDisplayPanel: [];
  toggleFullscreen: [];
  toggleWebcam: [];
}>();
</script>

<template>
  <section class="grid gap-3 rounded-2xl border border-ui-border bg-ui-surface p-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="rounded-lg border px-4 py-2 text-sm font-medium transition"
          :class="
            props.isDisplayPanelOpen
              ? 'border-amber-400 bg-amber-400 text-slate-950 hover:bg-amber-300'
              : 'border-slate-700 text-slate-200 hover:border-slate-500 hover:text-white'
          "
          :aria-pressed="props.isDisplayPanelOpen"
          @click="emit('toggleDisplayPanel')"
        >
          Display
        </button>
        <span class="font-mono text-xs uppercase tracking-[0.2em] text-ui-text-muted">
          {{ props.activePresetId }}
        </span>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
          :aria-pressed="props.isFullscreen"
          @click="emit('toggleFullscreen')"
        >
          {{ props.isFullscreen ? "Exit Fullscreen" : "Fullscreen" }}
        </button>
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-medium transition"
          :class="
            props.isWebcamActive
              ? 'bg-rose-500 text-white hover:bg-rose-400'
              : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
          "
          :aria-pressed="props.isWebcamActive"
          @click="emit('toggleWebcam')"
        >
          {{ props.isWebcamActive ? "Disable Webcam" : "Enable Webcam" }}
        </button>
        <button
          type="button"
          class="rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          :disabled="!props.isExportReady || props.exportState.status === 'running'"
          @click="emit('startExport')"
        >
          Export PNG Tar
        </button>
        <button
          v-if="props.exportState.status === 'running'"
          type="button"
          class="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
          @click="emit('cancelExport')"
        >
          Cancel
        </button>
      </div>
    </div>

    <p v-if="props.webcamErrorMessage" class="text-sm text-rose-300">
      {{ props.webcamErrorMessage }}
    </p>
    <p v-if="props.exportState.status === 'running'" class="text-sm text-slate-300">
      {{ props.exportState.framesWritten }} / {{ props.exportState.totalFrames }} frames
    </p>
    <p v-else-if="props.exportState.status === 'done'" class="text-sm text-emerald-300">
      Export ready
    </p>
    <p v-else-if="props.exportState.status === 'cancelled'" class="text-sm text-slate-400">
      Export cancelled
    </p>
    <p v-else-if="props.exportState.status === 'error'" class="text-sm text-rose-300">
      {{ props.exportState.errorMessage }}
    </p>
  </section>
</template>
