<script setup lang="ts">
import type { RigId } from "@/engine/types";
import type { PngSequenceExportState } from "@/visualizer/exportPngSequence";
import {
  defaultRigOverlayStyle,
  type OverlayGeometryKey,
  type OverlayLayerVisibility,
  type RigOverlayStyleKey,
  type VisualizerOverlaySettings
} from "@/visualizer/overlaySettings";
import type { TrailLoopMode } from "@/visualizer/useMultiRigPlayback";

const props = defineProps<{
  displayScale: number;
  minDisplayScale?: number;
  maxDisplayScale?: number;
  isFullscreen: boolean;
  isWebcamActive: boolean;
  rigOrder: readonly RigId[];
  overlaySettings: VisualizerOverlaySettings;
  trailLoopMode: TrailLoopMode;
  exportState: PngSequenceExportState;
  isExportReady: boolean;
  webcamErrorMessage?: string | null;
}>();

const emit = defineEmits<{
  "update:displayScale": [value: number];
  updateOverlayVisibility: [key: keyof OverlayLayerVisibility, value: boolean];
  updateOverlayGeometry: [key: OverlayGeometryKey, value: number];
  updateRigOverlayStyle: [rigId: RigId, key: RigOverlayStyleKey, value: string];
  updateTrailLoopMode: [value: TrailLoopMode];
  resetScale: [];
  resetOverlayStyle: [];
  toggleFullscreen: [];
  toggleWebcam: [];
  startExport: [];
  cancelExport: [];
}>();

const visibilityControls: readonly {
  key: keyof OverlayLayerVisibility;
  label: string;
}[] = [
  { key: "showHandTrails", label: "Hand Trails" },
  { key: "showHeadTrails", label: "Head Trails" },
  { key: "showChainLines", label: "Chain Lines" },
  { key: "showNodeMarkers", label: "Node Markers" }
];

const geometryControls: readonly {
  key: OverlayGeometryKey;
  label: string;
  min: number;
  max: number;
  step: number;
  digits: number;
}[] = [
  { key: "trailLineWidth", label: "Trail Thickness", min: 1, max: 16, step: 0.5, digits: 1 },
  { key: "chainLineWidth", label: "Chain Thickness", min: 1, max: 16, step: 0.5, digits: 1 },
  { key: "handRadius", label: "Hand Size", min: 2, max: 24, step: 1, digits: 0 },
  { key: "headRadius", label: "Head Size", min: 2, max: 30, step: 1, digits: 0 },
  { key: "nodeStrokeWidth", label: "Node Stroke", min: 0, max: 8, step: 0.5, digits: 1 },
  { key: "trailMinOpacity", label: "Trail Opacity Floor", min: 0, max: 1, step: 0.05, digits: 2 }
];

const rigStyleControls: readonly {
  key: RigOverlayStyleKey;
  label: string;
}[] = [
  { key: "handColor", label: "Hand" },
  { key: "headColor", label: "Head" },
  { key: "lineColor", label: "Chain" },
  { key: "handTrailColor", label: "Hand Trail" },
  { key: "headTrailColor", label: "Head Trail" }
];

function onScaleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit("update:displayScale", Number(target.value));
}

function checkboxValue(event: Event): boolean {
  return (event.target as HTMLInputElement).checked;
}

function trailLoopModeValue(event: Event): TrailLoopMode {
  return checkboxValue(event) ? "auto" : "off";
}

function numberValue(event: Event): number {
  return Number((event.target as HTMLInputElement).value);
}

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement).value;
}

function rigStyle(rigId: RigId, index: number) {
  return props.overlaySettings.rigStyles[rigId] ?? defaultRigOverlayStyle(index);
}
</script>

<template>
  <section class="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
    <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
      <label class="grid gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
        Display Scale
        <input
          type="range"
          :min="minDisplayScale ?? 0.25"
          :max="maxDisplayScale ?? 4"
          step="0.05"
          :value="props.displayScale"
          class="w-full accent-amber-400"
          @input="onScaleInput"
        />
        <span class="font-mono text-sm normal-case tracking-normal text-slate-300">
          {{ props.displayScale.toFixed(2) }}x
        </span>
      </label>

      <button
        type="button"
        class="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
        @click="emit('resetScale')"
      >
        Reset Scale
      </button>

      <div class="flex flex-wrap gap-2 lg:justify-end">
        <button
          type="button"
          class="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
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
          @click="emit('toggleWebcam')"
        >
          {{ props.isWebcamActive ? "Disable Webcam" : "Enable Webcam" }}
        </button>
      </div>
    </div>

    <p v-if="props.webcamErrorMessage" class="text-sm text-rose-300">
      {{ props.webcamErrorMessage }}
    </p>

    <div class="grid gap-3 border-t border-slate-800 pt-4 md:grid-cols-[minmax(0,1fr)_auto]">
      <fieldset class="grid gap-3">
        <legend class="text-xs uppercase tracking-[0.2em] text-slate-500">Overlay Layers</legend>
        <div class="grid gap-2 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
          <label
            v-for="control in visibilityControls"
            :key="control.key"
            class="flex items-center gap-2"
          >
            <input
              type="checkbox"
              :checked="props.overlaySettings.visibility[control.key]"
              class="accent-amber-400"
              @change="emit('updateOverlayVisibility', control.key, checkboxValue($event))"
            />
            {{ control.label }}
          </label>
          <label class="flex items-center gap-2">
            <input
              type="checkbox"
              :checked="props.trailLoopMode === 'auto'"
              class="accent-amber-400"
              @change="emit('updateTrailLoopMode', trailLoopModeValue($event))"
            />
            Loop Continuous Trails
          </label>
        </div>
      </fieldset>

      <div class="grid gap-2 md:min-w-64 md:justify-items-end">
        <div class="flex flex-wrap gap-2 md:justify-end">
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
      </div>
    </div>

    <details class="border-t border-slate-800 pt-4">
      <summary
        class="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-slate-200 marker:hidden"
      >
        <span class="text-xs uppercase tracking-[0.2em] text-slate-500">Overlay Style</span>
        <span class="text-xs text-slate-400">Thickness, size, color</span>
      </summary>

      <div class="mt-4 grid gap-5">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label
            v-for="control in geometryControls"
            :key="control.key"
            class="grid gap-2 text-xs uppercase tracking-[0.16em] text-slate-500"
          >
            <span class="flex items-center justify-between gap-3">
              <span>{{ control.label }}</span>
              <span class="font-mono text-sm normal-case tracking-normal text-slate-300">
                {{ props.overlaySettings.geometry[control.key].toFixed(control.digits) }}
              </span>
            </span>
            <input
              type="range"
              :min="control.min"
              :max="control.max"
              :step="control.step"
              :value="props.overlaySettings.geometry[control.key]"
              class="w-full accent-amber-400"
              @input="emit('updateOverlayGeometry', control.key, numberValue($event))"
            />
          </label>
        </div>

        <div class="grid gap-4">
          <div class="flex items-center justify-between gap-3">
            <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Rig Colors</p>
            <button
              type="button"
              class="text-sm font-medium text-slate-300 transition hover:text-white"
              @click="emit('resetOverlayStyle')"
            >
              Reset Style
            </button>
          </div>

          <div class="grid gap-4 lg:grid-cols-2">
            <section v-for="(rigId, index) in props.rigOrder" :key="rigId" class="grid gap-3">
              <p class="font-mono text-sm text-slate-300">{{ rigId }}</p>
              <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                <label
                  v-for="control in rigStyleControls"
                  :key="`${rigId}-${control.key}`"
                  class="flex items-center justify-between gap-3 text-sm text-slate-300"
                >
                  <span>{{ control.label }}</span>
                  <input
                    type="color"
                    :value="rigStyle(rigId, index)[control.key]"
                    class="h-8 w-12 cursor-pointer rounded border border-slate-700 bg-transparent p-0"
                    @input="emit('updateRigOverlayStyle', rigId, control.key, inputValue($event))"
                  />
                </label>
              </div>
            </section>
          </div>
        </div>
      </div>
    </details>
  </section>
</template>
