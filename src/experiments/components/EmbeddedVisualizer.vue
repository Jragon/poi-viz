<script setup lang="ts">
import { computed, watch } from "vue";

import type { ProjectionModePreference } from "@/engine/planeProjection";
import type { MultiRigSequence } from "@/engine/types";
import { createDefaultOverlaySettings } from "@/visualizer/overlaySettings";
import PoiCanvasViewport from "@/visualizer/PoiCanvasViewport.vue";
import { useVisualizerCore } from "@/visualizer/useVisualizerCore";

type EmbeddedVisualizerSize = "normal" | "compact" | "mini";

const props = withDefaults(
  defineProps<{
    sequence: MultiRigSequence;
    title?: string;
    summary?: string;
    autoplay?: boolean;
    size?: EmbeddedVisualizerSize;
    projectionMode?: ProjectionModePreference;
    projectionDragEnabled?: boolean;
  }>(),
  {
    title: "Embedded visualizer",
    autoplay: true,
    size: "normal",
    projectionMode: "tilted",
    projectionDragEnabled: true
  }
);

const core = useVisualizerCore(() => props.sequence, {
  autoplay: props.autoplay,
  resumeOnSequenceChange: true
});

watch(
  () => props.projectionMode,
  (projectionMode) => {
    core.session.setProjectionMode(projectionMode);
  },
  { immediate: true }
);

const overlaySettings = computed(() => {
  const settings = createDefaultOverlaySettings(core.rigOrder.value);
  settings.visibility.showHandTrails = false;
  settings.visibility.showHeadTrails = true;
  return settings;
});

const currentTimeLabel = computed(() => core.transport.currentTime.value.toFixed(2));
const durationLabel = computed(() => core.transport.duration.value.toFixed(2));
const activePlanesLabel = computed(() => {
  const planes = new Set(
    props.sequence.rigs.flatMap((rig) =>
      rig.sequence.segments.map((placement) => placement.planeId ?? "wall")
    )
  );
  return Array.from(planes).join(" / ");
});
const canvasClass = computed(() =>
  props.size === "mini"
    ? "!min-h-64 rounded-none border-0 md:!min-h-80"
    : props.size === "compact"
      ? "!min-h-80 rounded-none border-0 md:!min-h-96"
      : "!min-h-112 rounded-none border-0 md:!min-h-136"
);
const projectionDrag = computed(() =>
  props.projectionDragEnabled
    ? {
        mode: core.session.projectionSettings.value.mode,
        yawDeg: core.session.projectionYawDeg.value,
        pitchDeg: core.session.projectionPitchDeg.value
      }
    : null
);

function togglePlayback() {
  core.transport.toggle();
}

function onScrub(event: Event) {
  core.transport.setCurrentTime(Number((event.target as HTMLInputElement).value));
}

function setSpeed(value: number) {
  core.transport.setSpeed(value);
}
</script>

<template>
  <section class="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/80">
    <header
      class="grid gap-3 border-b border-slate-800 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
    >
      <div class="min-w-0">
        <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Live Cell</p>
        <h2 class="mt-1 text-lg font-semibold text-slate-100">{{ props.title }}</h2>
        <p v-if="props.summary" class="mt-1 text-sm leading-6 text-slate-400">
          {{ props.summary }}
        </p>
      </div>

      <dl class="grid grid-cols-2 gap-x-5 gap-y-1 text-xs text-slate-400 md:text-right">
        <div>
          <dt class="uppercase tracking-[0.18em] text-slate-600">Time</dt>
          <dd class="font-mono text-slate-300">{{ currentTimeLabel }} / {{ durationLabel }}</dd>
        </div>
        <div>
          <dt class="uppercase tracking-[0.18em] text-slate-600">Planes</dt>
          <dd class="font-mono text-slate-300">{{ activePlanesLabel }}</dd>
        </div>
      </dl>
    </header>

    <div
      v-if="core.errorMessage.value"
      class="border-b border-rose-900/70 bg-rose-950/45 px-4 py-3 text-sm text-rose-100"
    >
      {{ core.errorMessage.value }}
    </div>

    <PoiCanvasViewport
      v-else
      :class="canvasClass"
      :display-scale="1"
      :is-fullscreen="false"
      :overlay-settings="overlaySettings"
      :poses="core.cartesianPoses.value"
      :projection-drag="projectionDrag"
      :projection-settings="core.session.projectionSettings.value"
      :rig-order="core.rigOrder.value"
      :scene-world-radius="core.sceneWorldRadius.value"
      :trails="core.trails.value"
      :webcam-active="false"
      :webcam-stream="null"
      @update:projection-yaw-deg="core.session.setProjectionYawDeg"
      @update:projection-pitch-deg="core.session.setProjectionPitchDeg"
    />

    <div
      class="grid gap-4 border-t border-slate-800 px-4 py-3 text-sm text-slate-300 md:grid-cols-[auto_minmax(10rem,1fr)_auto] md:items-center"
    >
      <button
        type="button"
        class="rounded-md border border-slate-700 px-3 py-2 font-medium text-slate-100 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:text-slate-500"
        :disabled="core.transport.duration.value <= 0"
        @click="togglePlayback"
      >
        {{ core.transport.isPlaying.value ? "Pause" : "Play" }}
      </button>

      <label class="grid gap-1 text-xs uppercase tracking-[0.18em] text-slate-500">
        Timeline
        <input
          type="range"
          min="0"
          :max="core.transport.duration.value"
          step="any"
          :value="core.transport.currentTime.value"
          class="w-full accent-sky-400"
          :disabled="core.transport.duration.value <= 0"
          @input="onScrub"
        />
      </label>

      <div class="hidden gap-1 text-xs uppercase tracking-[0.18em] text-slate-500 md:grid">
        Speed
        <div
          class="grid grid-cols-3 overflow-hidden rounded-md border border-slate-700 normal-case tracking-normal"
        >
          <button
            v-for="speed in [0.25, 0.5, 1]"
            :key="speed"
            type="button"
            class="px-3 py-2 text-sm transition hover:bg-slate-800 hover:text-white"
            :class="
              core.transport.speed.value === speed
                ? 'bg-sky-400 text-slate-950 hover:bg-sky-300 hover:text-slate-950'
                : 'bg-slate-950 text-slate-200'
            "
            @click="setSpeed(speed)"
          >
            {{ speed }}x
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
