<script setup lang="ts">
import { computed, ref, watch } from "vue";

import {
  compilePoiBeatGraph,
  DEFAULT_POI_BEAT_COMPILER_OPTIONS
} from "@/lab/experiments/poi-beat-graph/compileBeatGraph";
import {
  filterPoiBeatGraphTracks,
  findActivePoiBeatStep
} from "@/lab/experiments/poi-beat-graph/graphHelpers";
import PoiBeatGraph from "@/lab/experiments/poi-beat-graph/PoiBeatGraph.vue";
import PoiBeatGraphDebugPanel from "@/lab/experiments/poi-beat-graph/PoiBeatGraphDebugPanel.vue";
import type { PoiBeatDirection, PoiBeatHand } from "@/lab/experiments/poi-beat-graph/types";
import {
  REEL_POSITION_LABELS,
  REEL_POSITION_OPTIONS,
  resolveDirections
} from "@/lab/experiments/reel-explorer/reelRules";
import type { ReelDirection, ReelPosition } from "@/lab/experiments/reel-explorer/types";
import type {
  WrapConfig,
  WrapOffset,
  WrapPositionPair
} from "@/lab/experiments/wrap-explorer/types";
import {
  buildWrapBeatGraph,
  DEFAULT_WRAP_CONFIG,
  getValidPartners,
  isValidWrapPair
} from "@/lab/experiments/wrap-explorer/wrapRules";
import PoiCanvasViewport from "@/visualizer/PoiCanvasViewport.vue";
import {
  createVisualizerWorkspace,
  provideVisualizerWorkspace
} from "@/visualizer/visualizerWorkspace";

const config = ref<WrapConfig>(DEFAULT_WRAP_CONFIG);
const compilerOptions = DEFAULT_POI_BEAT_COMPILER_OPTIONS;
const visibleTrackIds = ref<string[]>(["left", "right"]);
const showStickFigure = ref(true);

const graph = computed(() => buildWrapBeatGraph(config.value));
const visibleGraph = computed(() => filterPoiBeatGraphTracks(graph.value, visibleTrackIds.value));
const compiled = computed(() => compilePoiBeatGraph(visibleGraph.value, compilerOptions));
const directions = computed(() => resolveDirections(config.value.direction));
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
const resolvedDirectionsLabel = computed(
  () =>
    `Left ${formatDirection(directions.value.left)} / Right ${formatDirection(directions.value.right)}`
);
const offsetLabel = computed(() => `${config.value.offset} half-beats`);
const wrapSummaryLabel = computed(
  () =>
    `L ${formatPair(config.value.left)} / R ${formatPair(config.value.right)} / Offset ${config.value.offset}`
);

core.session.setProjectionMode("tilted");
core.session.setPlaneSideSeparationWorld(0.2);
transport.setSpeed(0.5);
display.setOverlayVisibility("showHandTrails", false);
display.setOverlayVisibility("showHeadTrails", true);

watch(
  showStickFigure,
  (showBodyRig) => {
    display.setOverlayVisibility("showBodyRig", showBodyRig);
  },
  { immediate: true }
);

function setPairPosition(
  hand: PoiBeatHand,
  slot: keyof WrapPositionPair,
  position: ReelPosition
): void {
  const currentPair = config.value[hand];
  let nextPair: WrapPositionPair = { ...currentPair, [slot]: position };

  if (slot === "a" && !isValidWrapPair(nextPair.a, nextPair.b)) {
    nextPair = { a: position, b: getFirstValidPartner(position) };
  }

  if (slot === "b" && !isValidWrapPair(nextPair.a, nextPair.b)) return;

  config.value = { ...config.value, [hand]: nextPair };
}

function getFirstValidPartner(position: ReelPosition): ReelPosition {
  const [firstPartner] = getValidPartners(position);
  if (!firstPartner) throw new Error(`expected at least one valid wrap partner for ${position}`);
  return firstPartner;
}

function setDirectionMode(mode: ReelDirection["mode"]): void {
  if (config.value.direction.mode === mode) return;
  config.value = {
    ...config.value,
    direction: mode === "same" ? { mode, direction: "clockwise" } : { mode, flow: "inwards" }
  };
}

function setSameDirection(direction: PoiBeatDirection): void {
  config.value = { ...config.value, direction: { mode: "same", direction } };
}

function setOppositeFlow(flow: "inwards" | "outwards"): void {
  config.value = { ...config.value, direction: { mode: "opposite", flow } };
}

function setOffset(offset: WrapOffset): void {
  config.value = { ...config.value, offset };
}

function toggleTrackVisibility(trackId: string): void {
  const visibleIds = new Set(visibleTrackIds.value);

  if (visibleIds.has(trackId)) {
    if (visibleIds.size <= 1) return;
    visibleIds.delete(trackId);
  } else {
    visibleIds.add(trackId);
  }

  visibleTrackIds.value = graph.value.tracks
    .map((track) => track.id)
    .filter((candidateId) => visibleIds.has(candidateId));
}

function setShowStickFigure(event: Event): void {
  showStickFigure.value = (event.target as HTMLInputElement).checked;
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

function isTrackVisible(trackId: string): boolean {
  return visibleTrackIds.value.includes(trackId);
}

function formatDirection(direction: PoiBeatDirection): string {
  return direction === "clockwise" ? "CW" : "CCW";
}

function formatPair(pair: WrapPositionPair): string {
  return `${REEL_POSITION_LABELS[pair.a]} -> ${REEL_POSITION_LABELS[pair.b]}`;
}

function handAccentClass(hand: PoiBeatHand): string {
  return hand === "left" ? "text-cyan-300" : "text-pink-300";
}

function pairButtonClass(
  hand: PoiBeatHand,
  slot: keyof WrapPositionPair,
  position: ReelPosition
): string {
  if (config.value[hand][slot] === position) return "border-slate-200 bg-slate-100 text-slate-950";
  return "border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800";
}

function partnerButtonClass(hand: PoiBeatHand, position: ReelPosition): string {
  if (config.value[hand].b === position) return "border-slate-200 bg-slate-100 text-slate-950";
  if (!isValidWrapPair(config.value[hand].a, position)) {
    return "cursor-not-allowed border-slate-800 text-slate-600 opacity-55";
  }
  return "border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800";
}

function directionModeButtonClass(mode: ReelDirection["mode"]): string {
  if (config.value.direction.mode === mode) return "border-slate-200 bg-slate-100 text-slate-950";
  return "border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800";
}

function sameDirectionButtonClass(direction: PoiBeatDirection): string {
  if (config.value.direction.mode === "same" && config.value.direction.direction === direction) {
    return "border-slate-200 bg-slate-100 text-slate-950";
  }
  return "border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800";
}

function oppositeFlowButtonClass(flow: "inwards" | "outwards"): string {
  if (config.value.direction.mode === "opposite" && config.value.direction.flow === flow) {
    return "border-slate-200 bg-slate-100 text-slate-950";
  }
  return "border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800";
}

function offsetButtonClass(offset: WrapOffset): string {
  if (config.value.offset === offset) return "border-sky-300 bg-sky-300 text-slate-950";
  return "border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800";
}

function visibilityButtonClass(trackId: string): string {
  if (isTrackVisible(trackId)) return "border-emerald-500/70 bg-emerald-500/15 text-emerald-200";
  return "border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300";
}
</script>

<template>
  <main class="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 md:px-8 md:py-10">
    <section class="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
      <div class="grid content-start gap-4">
        <header>
          <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Wrap Explorer</p>
          <h1 class="mt-2 text-2xl font-semibold text-slate-50">Generated wrap graph</h1>
        </header>

        <section class="rounded-lg border border-slate-800 bg-slate-900/60">
          <div class="border-b border-slate-800 px-4 py-3">
            <h2 class="text-sm font-semibold text-slate-200">Hands</h2>
          </div>
          <div class="grid gap-3 px-4 py-4 text-sm">
            <div
              v-for="hand in ['left', 'right'] as const"
              :key="hand"
              class="rounded-md border border-slate-800 bg-slate-950/50 px-3 py-3"
            >
              <div class="flex items-center justify-between gap-3">
                <p class="font-medium capitalize text-slate-200">
                  <span :class="handAccentClass(hand)">●</span>
                  {{ hand }} hand
                </p>
                <button
                  type="button"
                  class="rounded-md border px-2.5 py-1 text-xs font-medium transition"
                  :class="visibilityButtonClass(hand)"
                  :aria-pressed="isTrackVisible(hand)"
                  @click="toggleTrackVisibility(hand)"
                >
                  {{ isTrackVisible(hand) ? "On" : "Off" }}
                </button>
              </div>

              <div class="mt-3 grid gap-2">
                <div class="grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-2">
                  <p class="pt-1.5 font-mono text-xs text-slate-500">A</p>
                  <div class="grid grid-cols-2 gap-1.5">
                    <button
                      v-for="position in REEL_POSITION_OPTIONS"
                      :key="`${hand}-a-${position}`"
                      type="button"
                      class="rounded-md border px-2 py-1.5 text-left text-xs font-medium transition"
                      :class="pairButtonClass(hand, 'a', position)"
                      :aria-pressed="config[hand].a === position"
                      @click="setPairPosition(hand, 'a', position)"
                    >
                      {{ REEL_POSITION_LABELS[position] }}
                    </button>
                  </div>
                </div>

                <div class="grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-2">
                  <p class="pt-1.5 font-mono text-xs text-slate-500">B</p>
                  <div class="grid grid-cols-2 gap-1.5">
                    <button
                      v-for="position in REEL_POSITION_OPTIONS"
                      :key="`${hand}-b-${position}`"
                      type="button"
                      class="rounded-md border px-2 py-1.5 text-left text-xs font-medium transition disabled:pointer-events-none"
                      :class="partnerButtonClass(hand, position)"
                      :aria-pressed="config[hand].b === position"
                      :disabled="!isValidWrapPair(config[hand].a, position)"
                      @click="setPairPosition(hand, 'b', position)"
                    >
                      {{ REEL_POSITION_LABELS[position] }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-lg border border-slate-800 bg-slate-900/60">
          <div class="border-b border-slate-800 px-4 py-3">
            <h2 class="text-sm font-semibold text-slate-200">Direction</h2>
          </div>
          <div class="grid gap-3 px-4 py-4 text-sm">
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                class="rounded-md border px-3 py-2 text-xs font-medium transition"
                :class="directionModeButtonClass('same')"
                :aria-pressed="config.direction.mode === 'same'"
                @click="setDirectionMode('same')"
              >
                Same
              </button>
              <button
                type="button"
                class="rounded-md border px-3 py-2 text-xs font-medium transition"
                :class="directionModeButtonClass('opposite')"
                :aria-pressed="config.direction.mode === 'opposite'"
                @click="setDirectionMode('opposite')"
              >
                Opposite
              </button>
            </div>

            <div v-if="config.direction.mode === 'same'" class="grid grid-cols-2 gap-2">
              <button
                type="button"
                class="rounded-md border px-3 py-2 text-xs font-medium transition"
                :class="sameDirectionButtonClass('clockwise')"
                :aria-pressed="config.direction.direction === 'clockwise'"
                @click="setSameDirection('clockwise')"
              >
                CW
              </button>
              <button
                type="button"
                class="rounded-md border px-3 py-2 text-xs font-medium transition"
                :class="sameDirectionButtonClass('counterclockwise')"
                :aria-pressed="config.direction.direction === 'counterclockwise'"
                @click="setSameDirection('counterclockwise')"
              >
                CCW
              </button>
            </div>

            <div v-else class="grid grid-cols-2 gap-2">
              <button
                type="button"
                class="rounded-md border px-3 py-2 text-xs font-medium transition"
                :class="oppositeFlowButtonClass('inwards')"
                :aria-pressed="config.direction.flow === 'inwards'"
                @click="setOppositeFlow('inwards')"
              >
                Inwards
              </button>
              <button
                type="button"
                class="rounded-md border px-3 py-2 text-xs font-medium transition"
                :class="oppositeFlowButtonClass('outwards')"
                :aria-pressed="config.direction.flow === 'outwards'"
                @click="setOppositeFlow('outwards')"
              >
                Outwards
              </button>
            </div>

            <p
              class="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 font-mono text-xs text-slate-400"
            >
              {{ resolvedDirectionsLabel }}
            </p>
          </div>
        </section>

        <section class="rounded-lg border border-slate-800 bg-slate-900/60">
          <div class="border-b border-slate-800 px-4 py-3">
            <h2 class="text-sm font-semibold text-slate-200">Right hand offset</h2>
          </div>
          <div class="grid gap-3 px-4 py-4 text-sm">
            <div class="grid grid-cols-6 gap-1.5">
              <button
                v-for="offset in [0, 1, 2, 3, 4, 5] as const"
                :key="offset"
                type="button"
                class="rounded-md border px-2 py-2 text-xs font-medium transition"
                :class="offsetButtonClass(offset)"
                :aria-pressed="config.offset === offset"
                @click="setOffset(offset)"
              >
                {{ offset }}
              </button>
            </div>
            <p class="font-mono text-xs text-slate-500">{{ offsetLabel }}</p>
          </div>
        </section>

        <section class="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
          <p class="text-xs uppercase tracking-[0.16em] text-slate-500">Resolved wrap</p>
          <p class="mt-1 font-mono text-sm font-semibold leading-6 text-amber-200">
            {{ wrapSummaryLabel }}
          </p>
        </section>

        <PoiBeatGraph
          :graph="graph"
          :visible-track-ids="visibleTrackIds"
          :half-beat-duration="compilerOptions.halfBeatDuration"
          :active-step="activeStep"
          readonly
        />
      </div>

      <div class="grid content-start gap-6">
        <label
          class="ml-auto flex items-center gap-2 text-xs font-medium text-slate-400 transition hover:text-slate-100"
        >
          <input
            type="checkbox"
            :checked="showStickFigure"
            class="h-3.5 w-3.5 accent-amber-400"
            @change="setShowStickFigure"
          />
          Stick figure
        </label>

        <section class="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/80">
          <header
            class="grid gap-3 border-b border-slate-800 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
          >
            <div class="min-w-0">
              <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Visualizer</p>
              <h2 class="mt-1 text-lg font-semibold text-slate-100">Compiled wrap</h2>
            </div>

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
