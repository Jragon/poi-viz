<script setup lang="ts">
import { computed, watch } from "vue";

import type { ProjectionModePreference } from "@/engine/planeProjection";
import type { MultiRigSequence } from "@/engine/types";
import PoiCanvasViewport from "@/visualizer/PoiCanvasViewport.vue";
import {
  createVisualizerWorkspace,
  provideVisualizerWorkspace
} from "@/visualizer/visualizerWorkspace";

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
    showBodyRig?: boolean;
    bodyRigScale?: number;
  }>(),
  {
    title: "Embedded visualizer",
    autoplay: true,
    size: "normal",
    projectionMode: "auto",
    projectionDragEnabled: true,
    showBodyRig: false
  }
);

const workspace = provideVisualizerWorkspace(
  createVisualizerWorkspace(() => props.sequence, {
    autoplay: props.autoplay,
    resumeOnSequenceChange: true
  })
);
const { core, transport, display } = workspace;

display.setOverlayVisibility("showHandTrails", false);
display.setOverlayVisibility("showHeadTrails", true);

watch(
  () => props.projectionMode,
  (projectionMode) => {
    core.session.setProjectionMode(projectionMode);
  },
  { immediate: true }
);

watch(
  () => props.showBodyRig,
  (showBodyRig) => {
    display.setOverlayVisibility("showBodyRig", showBodyRig);
  },
  { immediate: true }
);

const currentTimeLabel = computed(() => transport.currentTime.value.toFixed(2));
const durationLabel = computed(() => transport.duration.value.toFixed(2));
const activePlanesLabel = computed(() => {
  const planes = new Set(
    props.sequence.rigs.flatMap((rig) =>
      rig.sequence.segments.map((segment) => segment.planeId ?? "wall")
    )
  );
  return Array.from(planes).join(" / ");
});
const isCompact = computed(() => props.size === "compact");
const canvasClass = computed(() =>
  props.size === "mini"
    ? "!min-h-64 rounded-none border-0 md:!min-h-80"
    : props.size === "compact"
      ? "!min-h-64 rounded-none border-0 md:!min-h-80"
      : "!min-h-112 rounded-none border-0 md:!min-h-136"
);
function togglePlayback() {
  transport.toggle();
}

function onScrub(event: Event) {
  transport.setCurrentTime(Number((event.target as HTMLInputElement).value));
}

function setSpeed(value: number) {
  transport.setSpeed(value);
}
</script>

<template>
  <section
    class="overflow-hidden rounded-lg border border-ui-border-subtle bg-slate-950/80"
    :aria-label="isCompact ? props.title : undefined"
  >
    <header
      v-if="!isCompact"
      class="grid gap-3 border-b border-ui-border-subtle px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
    >
      <div class="min-w-0">
        <p class="text-xs uppercase tracking-[0.2em] text-ui-text-muted">Live Cell</p>
        <h2 class="mt-1 text-lg font-semibold text-slate-100">{{ props.title }}</h2>
        <p v-if="props.summary" class="mt-1 text-sm leading-6 text-slate-400">
          {{ props.summary }}
        </p>
      </div>

      <dl class="grid grid-cols-2 gap-x-5 gap-y-1 text-xs text-slate-400 md:text-right">
        <div>
          <dt class="uppercase tracking-[0.18em] text-ui-text-muted">Time</dt>
          <dd class="font-mono text-slate-300">{{ currentTimeLabel }} / {{ durationLabel }}</dd>
        </div>
        <div>
          <dt class="uppercase tracking-[0.18em] text-ui-text-muted">Planes</dt>
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
      :projection-drag-enabled="props.projectionDragEnabled"
      :body-rig-scale="props.bodyRigScale"
    />

    <div
      class="grid border-t border-ui-border-subtle text-sm text-slate-300 md:grid-cols-[auto_minmax(10rem,1fr)_auto] md:items-center"
      :class="isCompact ? 'gap-2 px-2 py-2' : 'gap-4 px-4 py-3'"
    >
      <button
        type="button"
        class="rounded-md border border-ui-border-strong bg-ui-surface font-medium text-ui-text transition hover:border-ui-focus hover:bg-ui-surface-raised disabled:cursor-not-allowed disabled:border-ui-border disabled:bg-ui-surface-raised disabled:text-ui-text-muted"
        :class="isCompact ? 'px-2 py-1 text-xs' : 'px-3 py-2'"
        :aria-label="transport.isPlaying.value ? 'Pause' : 'Play'"
        :disabled="transport.duration.value <= 0"
        @click="togglePlayback"
      >
        {{ transport.isPlaying.value ? "Pause" : "Play" }}
      </button>

      <label
        class="grid text-xs uppercase tracking-[0.18em] text-ui-text-muted"
        :class="isCompact ? 'gap-0' : 'gap-1'"
      >
        <span :class="isCompact ? 'sr-only' : ''">Timeline</span>
        <input
          type="range"
          min="0"
          :max="transport.duration.value"
          step="any"
          :value="transport.currentTime.value"
          class="w-full accent-sky-400"
          :class="isCompact ? 'h-2' : ''"
          :disabled="transport.duration.value <= 0"
          @input="onScrub"
        />
      </label>

      <div class="hidden gap-1 text-xs uppercase tracking-[0.18em] text-ui-text-muted md:grid">
        Speed
        <div
          class="grid grid-cols-3 overflow-hidden rounded-md border border-ui-border-strong normal-case tracking-normal"
        >
          <button
            v-for="speed in [0.25, 0.5, 1]"
            :key="speed"
            type="button"
            class="px-3 py-2 text-sm transition hover:bg-slate-800 hover:text-white"
            :class="
              transport.speed.value === speed
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
