<script setup lang="ts">
import PatternCanvas from "@/components/PatternCanvas.vue";
import WaveCanvas from "@/components/WaveCanvas.vue";
import { secondsToBeats } from "@/engine/math";
import { normalizeLoopBeat } from "@/render/math";
import { createDefaultState } from "@/state/defaults";
import { computed, onBeforeUnmount, onMounted, reactive } from "vue";

const state = reactive(createDefaultState());

const SCRUB_DIVISIONS = 400;
const MIN_SCRUB_STEP = 0.001;

let animationFrameId = 0;
let lastFrameTimeMs = 0;

const loopedPlayheadBeats = computed(() => normalizeLoopBeat(state.global.t, state.global.loopBeats));
const scrubStep = computed(() => Math.max(state.global.loopBeats / SCRUB_DIVISIONS, MIN_SCRUB_STEP));
const bpmLabel = computed(() => `${state.global.bpm.toFixed(0)} BPM`);
const loopLabel = computed(() => `${state.global.loopBeats.toFixed(2)} beats`);

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

function togglePlayback(): void {
  state.global.isPlaying = !state.global.isPlaying;
}

function handleScrub(nextValue: string): void {
  const parsed = Number.parseFloat(nextValue);
  if (!Number.isFinite(parsed)) {
    return;
  }
  state.global.t = normalizeLoopBeat(parsed, state.global.loopBeats);
  state.global.isPlaying = false;
}

function onScrubInput(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  handleScrub(target.value);
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
      <p class="text-sm text-zinc-400">Phase 6: Canvas viewport and waveform inspector with synced playhead.</p>
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

      <article class="rounded border border-zinc-800 bg-zinc-950/70 p-4 lg:col-span-12">
        <h2 class="mb-4 text-xs font-medium uppercase tracking-wide text-zinc-400">Controls (Phase 7 Pending)</h2>
        <div class="flex flex-wrap items-center gap-3">
          <button
            class="rounded border border-zinc-700 px-3 py-2 text-sm font-medium hover:border-zinc-500"
            type="button"
            @click="togglePlayback"
          >
            {{ state.global.isPlaying ? "Pause" : "Play" }}
          </button>
          <p class="text-sm text-zinc-400">Playhead: {{ loopedPlayheadBeats.toFixed(3) }} beats</p>
          <p class="text-sm text-zinc-500">{{ bpmLabel }}</p>
          <p class="text-sm text-zinc-500">{{ loopLabel }}</p>
        </div>

        <label class="mt-4 block text-xs uppercase tracking-wide text-zinc-400">
          Scrub Loop
          <input
            class="mt-2 w-full accent-cyan-400"
            type="range"
            min="0"
            :max="state.global.loopBeats"
            :step="scrubStep"
            :value="loopedPlayheadBeats"
            @input="onScrubInput"
          />
        </label>

        <p class="mt-3 text-sm text-zinc-500">
          Phase 7 will replace this panel with full transport, parameter editing, presets, and toggles.
        </p>
      </article>
    </section>
  </main>
</template>
