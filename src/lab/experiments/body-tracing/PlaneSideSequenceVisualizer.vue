<script setup lang="ts">
import { computed, ref } from "vue";

import type { MultiRigSequence, Segment } from "@/engine/types";
import { createDefaultOverlaySettings } from "@/visualizer/overlaySettings";
import PoiCanvasViewport from "@/visualizer/PoiCanvasViewport.vue";
import { useVisualizerCore } from "@/visualizer/useVisualizerCore";

type PatternId =
  | "carry-wraps"
  | "reverse-carry-wraps"
  | "driven-transfer"
  | "half-turn-transfer"
  | "snap-transfer"
  | "three-circle-phrase";

type PatternDefinition = {
  id: PatternId;
  name: string;
  description: string;
  segments: Segment[];
};

const TAU = Math.PI * 2;
const RIGHT = 0;
const LEFT = Math.PI;
const UP = Math.PI / 2;
const DOWN = (3 / 2) * Math.PI;
const HAND_RADIUS = 1;
const HEAD_RADIUS = 0.6;

function sideWrap(
  handPhase: number,
  headStartPhase: number,
  turns: number,
  durationUnits: number,
  planeSide: "a" | "b"
): Segment {
  return {
    durationUnits,
    planeId: "wall",
    planeSide,
    hand: {
      startPose: { phaseAbs: handPhase, radius: HAND_RADIUS },
      driver: { kind: "circle", omega: 0 }
    },
    head: {
      startPose: { phaseAbs: headStartPhase, radius: HEAD_RADIUS },
      driver: { kind: "circle", omega: (turns * TAU) / durationUnits }
    }
  };
}

function transfer(
  fromHandPhase: number,
  toHandPhase: number,
  headPhase: number,
  durationUnits: number,
  headTurns = 0
): Segment {
  return {
    durationUnits,
    planeId: "wall",
    hand: {
      startPose: { phaseAbs: fromHandPhase, radius: HAND_RADIUS },
      driver: {
        kind: "point-to-point",
        endPose: { phaseAbs: toHandPhase, radius: HAND_RADIUS }
      }
    },
    head: {
      startPose: { phaseAbs: headPhase, radius: HEAD_RADIUS },
      driver: { kind: "circle", omega: (headTurns * TAU) / durationUnits }
    }
  };
}

const patterns: readonly PatternDefinition[] = [
  {
    id: "carry-wraps",
    name: "Side wraps with top/bottom carries",
    description: "1.5 circles parked on each side; transfers carry the poi vector across.",
    segments: [
      sideWrap(RIGHT, DOWN, 1.5, 1.5, "a"),
      transfer(RIGHT, LEFT, UP, 1),
      sideWrap(LEFT, UP, 1.5, 1.5, "b"),
      transfer(LEFT, RIGHT, DOWN, 1)
    ]
  },
  {
    id: "reverse-carry-wraps",
    name: "Reverse side wraps",
    description: "Same hand path, opposite poi direction on the parked side circles.",
    segments: [
      sideWrap(RIGHT, DOWN, -1.5, 1.5, "a"),
      transfer(RIGHT, LEFT, UP, 1),
      sideWrap(LEFT, UP, -1.5, 1.5, "b"),
      transfer(LEFT, RIGHT, DOWN, 1)
    ]
  },
  {
    id: "driven-transfer",
    name: "Driven transfer beat",
    description: "One head circle per beat, including the point-to-point crossing beats.",
    segments: [
      sideWrap(RIGHT, DOWN, 1, 1, "a"),
      transfer(RIGHT, LEFT, DOWN, 1, 1),
      sideWrap(LEFT, DOWN, 1, 1, "b"),
      transfer(LEFT, RIGHT, DOWN, 1, 1)
    ]
  },
  {
    id: "half-turn-transfer",
    name: "Half-turn transfers",
    description: "The crossing beats rotate the poi halfway between top and bottom carries.",
    segments: [
      sideWrap(RIGHT, DOWN, 1.5, 1.5, "a"),
      transfer(RIGHT, LEFT, UP, 1, 0.5),
      sideWrap(LEFT, DOWN, 1.5, 1.5, "b"),
      transfer(LEFT, RIGHT, UP, 1, 0.5)
    ]
  },
  {
    id: "snap-transfer",
    name: "Slow wraps, fast transfers",
    description: "Slower side circles with quick hand snaps between the two stations.",
    segments: [
      sideWrap(RIGHT, DOWN, 1.5, 2, "a"),
      transfer(RIGHT, LEFT, UP, 0.5),
      sideWrap(LEFT, UP, 1.5, 2, "b"),
      transfer(LEFT, RIGHT, DOWN, 0.5)
    ]
  },
  {
    id: "three-circle-phrase",
    name: "Three-circle phrase only",
    description: "Right wrap, top carry, left wrap; no return transfer reset segment.",
    segments: [
      sideWrap(RIGHT, DOWN, 1.5, 1.5, "a"),
      transfer(RIGHT, LEFT, UP, 1),
      sideWrap(LEFT, UP, 1.5, 1.5, "b")
    ]
  }
];

const selectedPatternId = ref<PatternId>("carry-wraps");
const selectedPattern = computed(
  () => patterns.find((pattern) => pattern.id === selectedPatternId.value) ?? patterns[0]
);

const sideSequence = computed<MultiRigSequence>(() => ({
  rigs: [
    {
      rigId: "right",
      sequence: {
        segments: selectedPattern.value.segments
      }
    }
  ]
}));

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

function onPatternChange(event: Event) {
  selectedPatternId.value = (event.target as HTMLSelectElement).value as PatternId;
}

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
        <h2 class="mt-1 text-lg font-semibold text-slate-100">{{ selectedPattern.name }}</h2>
        <p class="mt-1 text-sm leading-6 text-slate-400">
          {{ selectedPattern.description }}
        </p>
      </div>

      <div class="grid gap-3 md:min-w-72">
        <label class="grid gap-1 text-xs uppercase tracking-[0.18em] text-slate-500">
          Pattern
          <select
            class="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm normal-case tracking-normal text-slate-100 outline-none transition focus:border-sky-400"
            :value="selectedPatternId"
            @change="onPatternChange"
          >
            <option v-for="pattern in patterns" :key="pattern.id" :value="pattern.id">
              {{ pattern.name }}
            </option>
          </select>
        </label>
      </div>

      <dl
        class="grid grid-cols-2 gap-x-5 gap-y-1 text-xs text-slate-400 md:col-span-2 md:text-right"
      >
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
