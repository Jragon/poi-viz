<script setup lang="ts">
import { computed } from "vue";

import type { MultiRigSequence, Segment } from "@/engine/types";
import { createDefaultOverlaySettings } from "@/visualizer/overlaySettings";
import PoiCanvasViewport from "@/visualizer/PoiCanvasViewport.vue";
import { useVisualizerCore } from "@/visualizer/useVisualizerCore";

const SEGMENT_DURATION_UNITS = 1;
const SIDE_SEQUENCE_PHASE_STEP = Math.PI;

function makeAlignedSegment(startPhase: number): Segment {
  return {
    durationUnits: SEGMENT_DURATION_UNITS,
    hand: {
      startPose: { phaseAbs: startPhase, radius: 1 },
      driver: { kind: "circle", omega: SIDE_SEQUENCE_PHASE_STEP }
    },
    head: {
      startPose: { phaseAbs: startPhase, radius: 0.6 },
      driver: { kind: "circle", omega: SIDE_SEQUENCE_PHASE_STEP }
    }
  };
}

const sideSequence: MultiRigSequence = {
  rigs: [
    {
      rigId: "right",
      sequence: {
        segments: [
          {
            ...makeAlignedSegment(0),
            planeId: "wall",
            planeSide: "a"
          },
          {
            ...makeAlignedSegment(Math.PI),
            planeId: "wall",
            planeSide: "b"
          },
          {
            ...makeAlignedSegment(0),
            planeId: "wall",
            planeSide: "a"
          },
          {
            ...makeAlignedSegment(Math.PI),
            planeId: "wall",
            planeSide: "b"
          }
        ]
      }
    }
  ]
};

const core = useVisualizerCore(sideSequence, {
  autoplay: true,
  resumeOnSequenceChange: true,
  transportOptions: {
    initialSpeed: 0.45
  }
});
core.session.setProjectionMode("orthographic");

const overlaySettings = computed(() => {
  const settings = createDefaultOverlaySettings(core.rigOrder.value);
  settings.visibility.showHandTrails = false;
  settings.visibility.showHeadTrails = true;
  return settings;
});

const currentTimeLabel = computed(() => core.transport.currentTime.value.toFixed(2));
const durationLabel = computed(() => core.transport.duration.value.toFixed(2));
const activeMetadata = computed(() => {
  const frame = core.session.currentFrame.value;
  if (!frame?.ok) return "unprepared";

  return Object.entries(frame.evaluatedPoses)
    .map(([rigId, value]) => `${rigId}: ${value.planeId} ${value.planeSide ?? "unspecified"}`)
    .join(" / ");
});

function togglePlayback() {
  core.transport.toggle();
}

function onScrub(event: Event) {
  core.transport.setCurrentTime(Number((event.target as HTMLInputElement).value));
}
</script>

<template>
  <section class="lab-live-cell overflow-hidden rounded-lg border border-slate-800 bg-slate-950/80">
    <header
      class="grid gap-3 border-b border-slate-800 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
    >
      <div class="min-w-0">
        <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Engine Playback</p>
        <h2 class="mt-1 text-lg font-semibold text-slate-100">Wall side boundary sequence</h2>
        <p class="mt-1 text-sm leading-6 text-slate-400">
          Side changes occur only at right/left aligned boundary poses.
        </p>
      </div>

      <dl class="grid grid-cols-2 gap-x-5 gap-y-1 text-xs text-slate-400 md:text-right">
        <div>
          <dt class="uppercase tracking-[0.18em] text-slate-600">Time</dt>
          <dd class="font-mono text-slate-300">{{ currentTimeLabel }} / {{ durationLabel }}</dd>
        </div>
        <div>
          <dt class="uppercase tracking-[0.18em] text-slate-600">Active</dt>
          <dd class="font-mono text-slate-300">{{ activeMetadata }}</dd>
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
      class="min-h-80! rounded-none border-0 md:min-h-112!"
      :display-scale="1"
      :is-fullscreen="false"
      :overlay-settings="overlaySettings"
      :poses="core.cartesianPoses.value"
      :projection-drag="null"
      :rig-order="core.rigOrder.value"
      :scene-world-radius="core.sceneWorldRadius.value"
      :trails="core.trails.value"
      :webcam-active="false"
      :webcam-stream="null"
    />

    <div
      class="grid gap-4 border-t border-slate-800 px-4 py-3 text-sm text-slate-300 md:grid-cols-[auto_minmax(10rem,1fr)] md:items-center"
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
    </div>
  </section>
</template>
