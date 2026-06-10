<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { LocationQueryRaw, RouteLocationRaw } from "vue-router";

import { encodeBeatGraphToUrlParams } from "@/lab/experiments/mel-body-tracing/beat-graph/beatGraphUrlCodec";
import { DEFAULT_POI_BEAT_COMPILER_OPTIONS } from "@/lab/experiments/mel-body-tracing/beat-graph/compileBeatGraph";
import { findActivePoiBeatStep } from "@/lab/experiments/mel-body-tracing/beat-graph/graphHelpers";
import CosmoControls from "@/lab/experiments/mel-body-tracing/components/CosmoControls.vue";
import PoiBeatGraph from "@/lab/experiments/mel-body-tracing/components/PoiBeatGraph.vue";
import PoiBeatGraphDebugPanel from "@/lab/experiments/mel-body-tracing/components/PoiBeatGraphDebugPanel.vue";
import ReelControls from "@/lab/experiments/mel-body-tracing/components/ReelControls.vue";
import WrapControls from "@/lab/experiments/mel-body-tracing/components/WrapControls.vue";
import type { BodyTracingExplorerTab } from "@/lab/experiments/mel-body-tracing/explorers/explorerUrlCodec";
import { useExplorerBeatGraph } from "@/lab/experiments/mel-body-tracing/explorers/useExplorerBeatGraph";
import { useExplorerUrlState } from "@/lab/experiments/mel-body-tracing/explorers/useExplorerUrlState";
import PoiCanvasViewport from "@/visualizer/PoiCanvasViewport.vue";
import {
  createVisualizerWorkspace,
  provideVisualizerWorkspace
} from "@/visualizer/visualizerWorkspace";

const { activeTab, reelConfig, wrapConfig, cosmoConfig } = useExplorerUrlState();
const {
  compilerOptions,
  compiled,
  graph,
  resolvedDirectionsLabel,
  summaryLabel,
  visibleTrackIds,
  toggleTrackVisibility,
  resetVisibleTracks
} = useExplorerBeatGraph({ activeTab, reelConfig, wrapConfig, cosmoConfig });
const showStickFigure = ref(true);

const workspace = provideVisualizerWorkspace(
  createVisualizerWorkspace(() => compiled.value.sequence, {
    autoplay: true,
    resumeOnSequenceChange: true
  })
);
const { core, transport, display } = workspace;

const activeStep = computed(() =>
  findActivePoiBeatStep(
    transport.currentTime.value,
    graph.value.cycleSteps,
    compilerOptions.halfBeatDuration
  )
);
const currentTimeLabel = computed(() => transport.currentTime.value.toFixed(2));
const durationLabel = computed(() => transport.duration.value.toFixed(2));
const activePlanesLabel = computed(() => {
  const planes = new Set(
    compiled.value.sequence.rigs.flatMap((rig) =>
      rig.sequence.segments.map((segment) => segment.planeId ?? "wall")
    )
  );
  return Array.from(planes).join(" / ");
});
const beatGraphEditorLocation = computed<RouteLocationRaw>(() => {
  const params = encodeBeatGraphToUrlParams(graph.value);
  if (!params) return { path: "/lab/beat-graph" };
  const query: LocationQueryRaw = { ...params };

  return {
    path: "/lab/beat-graph",
    query
  };
});

core.session.setProjectionMode("tilted");
core.session.setPlaneSideSeparationWorld(0.2);
transport.setSpeed(1);
display.setOverlayVisibility("showHandTrails", false);
display.setOverlayVisibility("showHeadTrails", true);

watch(
  showStickFigure,
  (showBodyRig) => {
    display.setOverlayVisibility("showBodyRig", showBodyRig);
  },
  { immediate: true }
);

watch(activeTab, resetVisibleTracks);

function setActiveTab(tab: BodyTracingExplorerTab): void {
  activeTab.value = tab;
}

function togglePlayback(): void {
  transport.toggle();
}

function onScrub(event: Event): void {
  transport.setCurrentTime(Number((event.target as HTMLInputElement).value));
}

function setSpeed(value: number): void {
  transport.setSpeed(value);
}

function tabButtonClass(tab: BodyTracingExplorerTab): string {
  if (activeTab.value === tab) return "border-sky-300 bg-sky-300 text-slate-950";
  return "border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800";
}
</script>

<template>
  <main class="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 md:px-8 md:py-10">
    <section class="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
      <div class="grid content-start gap-4">
        <header class="order-1">
          <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Mel body tracing</p>
          <h1 class="mt-2 text-2xl font-semibold text-slate-50">Body Tracing Explorer</h1>
          <p class="mt-2 text-sm leading-6 text-slate-400">
            Play with reels, wraps, and cosmos from Mel's
            <a
              href="https://antispinner.gitbook.io/btf"
              target="_blank"
              rel="noreferrer"
              class="font-medium text-sky-300 underline decoration-sky-500/50 underline-offset-4 transition hover:text-sky-200"
            >
              Body Tracing Framework </a
            >.
          </p>
        </header>

        <div class="order-2 grid grid-cols-3 gap-2">
          <button
            v-for="tab in ['reel', 'wrap', 'cosmo'] as const"
            :key="tab"
            type="button"
            class="rounded-md border px-3 py-2 text-xs font-semibold capitalize transition"
            :class="tabButtonClass(tab)"
            :aria-pressed="activeTab === tab"
            @click="setActiveTab(tab)"
          >
            {{ tab === "reel" ? "Reels" : tab === "wrap" ? "Wraps" : "Cosmo" }}
          </button>
        </div>

        <div class="order-5 grid gap-3 lg:order-3">
          <div class="order-2 lg:order-1">
            <PoiBeatGraph
              :graph="graph"
              :visible-track-ids="visibleTrackIds"
              :half-beat-duration="DEFAULT_POI_BEAT_COMPILER_OPTIONS.halfBeatDuration"
              :active-step="activeStep"
              readonly
            />
          </div>

          <RouterLink
            :to="beatGraphEditorLocation"
            class="order-1 rounded-md border border-amber-400/60 bg-amber-400/10 px-4 py-2 text-center text-sm font-semibold text-amber-100 transition hover:border-amber-300 hover:bg-amber-300/20 lg:order-2"
          >
            Open in Beat Graph Editor
          </RouterLink>
        </div>

        <div class="order-3 grid gap-4 lg:order-4">
          <ReelControls
            v-if="activeTab === 'reel'"
            v-model="reelConfig"
            :resolved-directions-label="resolvedDirectionsLabel"
            :summary-label="summaryLabel"
            :visible-track-ids="visibleTrackIds"
            @toggle-track="toggleTrackVisibility"
          />
          <WrapControls
            v-else-if="activeTab === 'wrap'"
            v-model="wrapConfig"
            :resolved-directions-label="resolvedDirectionsLabel"
            :summary-label="summaryLabel"
            :visible-track-ids="visibleTrackIds"
            @toggle-track="toggleTrackVisibility"
          />
          <CosmoControls
            v-else
            v-model="cosmoConfig"
            :resolved-directions-label="resolvedDirectionsLabel"
            :summary-label="summaryLabel"
            :visible-track-ids="visibleTrackIds"
            @toggle-track="toggleTrackVisibility"
          />
        </div>
      </div>

      <div class="grid content-start gap-6">
        <section class="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/80">
          <header class="flex justify-end border-b border-slate-800 px-4 py-3">
            <dl class="grid grid-cols-2 gap-x-5 gap-y-1 text-xs text-slate-400 md:text-right">
              <div>
                <dt class="uppercase tracking-[0.18em] text-slate-600">Time</dt>
                <dd class="font-mono text-slate-300">
                  {{ currentTimeLabel }} / {{ durationLabel }}
                </dd>
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
            class="min-h-112! rounded-none border-0 md:min-h-136!"
            :projection-drag-enabled="true"
          />

          <div
            class="grid gap-4 border-t border-slate-800 px-4 py-3 text-sm text-slate-300 md:grid-cols-[auto_minmax(10rem,1fr)_auto] md:items-center"
          >
            <button
              type="button"
              class="rounded-md border border-slate-700 px-3 py-2 font-medium text-slate-100 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:text-slate-500"
              :disabled="transport.duration.value <= 0"
              @click="togglePlayback"
            >
              {{ transport.isPlaying.value ? "Pause" : "Play" }}
            </button>

            <label class="grid gap-1 text-xs uppercase tracking-[0.18em] text-slate-500">
              Timeline
              <input
                type="range"
                min="0"
                :max="transport.duration.value"
                step="any"
                :value="transport.currentTime.value"
                class="w-full accent-sky-400"
                :disabled="transport.duration.value <= 0"
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

        <PoiBeatGraphDebugPanel
          :graph="graph"
          :visible-track-ids="visibleTrackIds"
          :active-step="activeStep"
          :half-beat-duration="compilerOptions.halfBeatDuration"
          :current-time="transport.currentTime.value"
          :duration="transport.duration.value"
          :is-playing="transport.isPlaying.value"
        />
      </div>
    </section>
  </main>
</template>
