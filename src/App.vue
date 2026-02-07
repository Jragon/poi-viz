<script setup lang="ts">
import Controls from "@/components/Controls.vue";
import PatternCanvas from "@/components/PatternCanvas.vue";
import WaveCanvas from "@/components/WaveCanvas.vue";
import { secondsToBeats } from "@/engine/math";
import { normalizeLoopBeat } from "@/render/math";
import {
  applyPreset,
  setGlobalBoolean,
  setGlobalNumber,
  setHandNumber,
  setScrubBeat,
  togglePlayback,
  type GlobalBooleanKey,
  type GlobalNumberKey,
  type HandNumberKey
} from "@/state/actions";
import { createDefaultState } from "@/state/defaults";
import type { AppState, HandId, PresetId } from "@/types/state";
import { computed, onBeforeUnmount, onMounted, reactive } from "vue";

const state = reactive(createDefaultState());

const SCRUB_DIVISIONS = 400;
const MIN_SCRUB_STEP = 0.001;

let animationFrameId = 0;
let lastFrameTimeMs = 0;

const loopedPlayheadBeats = computed(() => normalizeLoopBeat(state.global.t, state.global.loopBeats));
const scrubStep = computed(() => Math.max(state.global.loopBeats / SCRUB_DIVISIONS, MIN_SCRUB_STEP));

function commitState(nextState: AppState): void {
  state.global = nextState.global;
  state.hands = nextState.hands;
}

function advancePlayhead(frameDeltaSeconds: number): void {
  if (!state.global.isPlaying) {
    return;
  }

  const beatsDelta = secondsToBeats(frameDeltaSeconds, state.global.bpm) * state.global.playSpeed;
  state.global.t += beatsDelta;
}

function animationLoop(frameTimeMs: number): void {
  if (lastFrameTimeMs === 0) {
    lastFrameTimeMs = frameTimeMs;
  }

  const frameDeltaSeconds = (frameTimeMs - lastFrameTimeMs) / 1000;
  lastFrameTimeMs = frameTimeMs;

  advancePlayhead(frameDeltaSeconds);
  animationFrameId = requestAnimationFrame(animationLoop);
}

function handleTogglePlayback(): void {
  commitState(togglePlayback(state));
}

function handleSetScrub(beatValue: number): void {
  commitState(setScrubBeat(state, beatValue));
}

function handleSetGlobalNumber(key: GlobalNumberKey, value: number): void {
  commitState(setGlobalNumber(state, key, value));
}

function handleSetGlobalBoolean(key: GlobalBooleanKey, value: boolean): void {
  commitState(setGlobalBoolean(state, key, value));
}

function handleSetHandNumber(handId: HandId, key: HandNumberKey, value: number): void {
  commitState(setHandNumber(state, handId, key, value));
}

function handleApplyPreset(presetId: PresetId): void {
  commitState(applyPreset(state, presetId));
}

onMounted(() => {
  animationFrameId = requestAnimationFrame(animationLoop);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrameId);
});
</script>

<template>
  <main class="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 p-4 text-zinc-100 md:p-6">
    <header class="rounded border border-zinc-800 bg-zinc-950/70 p-4">
      <h1 class="text-2xl font-semibold tracking-tight md:text-3xl">Poi Phase Visualiser</h1>
      <p class="text-sm text-zinc-400">Phase 7: Full controls + presets wired to Canvas renderers.</p>
    </header>

    <section class="grid gap-4 lg:grid-cols-12">
      <article class="h-[360px] rounded border border-zinc-800 bg-zinc-950/70 p-2 sm:h-[480px] lg:col-span-7">
        <h2 class="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Pattern Viewport</h2>
        <PatternCanvas :state="state" :t-beats="state.global.t" />
      </article>

      <article class="h-[360px] rounded border border-zinc-800 bg-zinc-950/70 p-2 sm:h-[480px] lg:col-span-5">
        <h2 class="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Waveform Inspector</h2>
        <WaveCanvas :state="state" :t-beats="state.global.t" />
      </article>

      <Controls
        :state="state"
        :looped-playhead-beats="loopedPlayheadBeats"
        :scrub-step="scrubStep"
        @toggle-playback="handleTogglePlayback"
        @set-scrub="handleSetScrub"
        @set-global-number="handleSetGlobalNumber"
        @set-global-boolean="handleSetGlobalBoolean"
        @set-hand-number="handleSetHandNumber"
        @apply-preset="handleApplyPreset"
      />
    </section>
  </main>
</template>
