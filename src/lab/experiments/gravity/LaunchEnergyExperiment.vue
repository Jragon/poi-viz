<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import GravityCanvas from "./GravityCanvas.vue";
import GravityTracePlot from "./GravityTracePlot.vue";
import MathEquation from "./MathEquation.vue";
import {
  classifyLaunchEnergy,
  normalizedBottomSpeed,
  normalizedLaunchEnergy
} from "./physics/analyticReferences";
import {
  createDefaultLaunchConfig,
  interpolateSample,
  simulateIdealTether
} from "./physics/idealTether";
import type { IdealTetherConfig, IdealTetherTrace } from "./physics/types";

const defaults = createDefaultLaunchConfig();
const launchEnergy = ref(2.65);
const gravity = ref(defaults.gravity);
const tetherLength = ref(defaults.length);
const duration = ref(defaults.duration);
const currentTime = ref(0);
const isPlaying = ref(true);
const playbackSpeed = ref(0.9);
const error = ref<string | null>(null);
let frameHandle: number | null = null;
let previousFrameTime: number | null = null;

const config = computed<IdealTetherConfig>(() => ({
  ...defaults,
  gravity: gravity.value,
  length: tetherLength.value,
  duration: duration.value,
  initialAngularVelocity: normalizedBottomSpeed(launchEnergy.value, gravity.value, tetherLength.value)
}));

const result = computed(() => simulateIdealTether(config.value));
const trace = computed<IdealTetherTrace | null>(() => (result.value.ok ? result.value.trace : null));
const samples = computed(() => trace.value?.samples ?? []);
const currentSample = computed(() =>
  samples.value.length > 0
    ? interpolateSample(samples.value, currentTime.value)
    : null
);
const normalizedSpeed = computed(() =>
  currentSample.value
    ? currentSample.value.normalizedWorldSpeed
    : 0
);
const analyticalEnergy = computed(() => normalizedLaunchEnergy(
  config.value.initialAngularVelocity * tetherLength.value,
  gravity.value,
  tetherLength.value
));
const analyticClass = computed(() => classifyLaunchEnergy(launchEnergy.value));

function resetPlayback() {
  currentTime.value = 0;
  previousFrameTime = null;
  if (!result.value.ok) error.value = result.value.error;
  else error.value = null;
}

function tick(now: number) {
  if (previousFrameTime === null) previousFrameTime = now;
  if (isPlaying.value && trace.value) {
    const elapsedSeconds = Math.min(0.1, (now - previousFrameTime) / 1000);
    currentTime.value += elapsedSeconds * playbackSpeed.value;
    if (currentTime.value >= duration.value) currentTime.value %= duration.value;
  }
  previousFrameTime = now;
  frameHandle = requestAnimationFrame(tick);
}

function togglePlayback() {
  isPlaying.value = !isPlaying.value;
  previousFrameTime = null;
}

function onScrub(event: Event) {
  currentTime.value = Number((event.target as HTMLInputElement).value);
  isPlaying.value = false;
}

function format(value: number, digits = 2): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "—";
}

watch([launchEnergy, gravity, tetherLength, duration], resetPlayback);

onMounted(() => {
  frameHandle = requestAnimationFrame(tick);
});

onBeforeUnmount(() => {
  if (frameHandle !== null) cancelAnimationFrame(frameHandle);
});
</script>

<template>
  <section class="grid gap-5 rounded-xl border border-ui-border-subtle bg-ui-surface p-4 md:p-5">
    <header class="grid gap-2">
      <p class="text-xs font-medium uppercase tracking-[0.2em] text-amber-300">Experiment 1</p>
      <div class="flex flex-wrap items-baseline justify-between gap-3">
        <h2 class="text-2xl font-semibold text-slate-100">How much launch energy keeps the string taut?</h2>
        <p class="font-mono text-xs text-slate-400">fixed hand · massless string · gravity only</p>
      </div>
      <p class="max-w-4xl text-sm leading-6 text-slate-400">
        Launch the poi from the bottom and reduce its energy. The string can pull, but it cannot
        push. Below the taut-loop threshold the poi releases into free flight, then may catch the
        string again.
      </p>
    </header>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div class="grid min-w-0 gap-3 overflow-hidden rounded-lg border border-ui-border-subtle bg-slate-950">
        <div v-if="error" class="bg-rose-950/50 px-4 py-3 text-sm text-rose-100">{{ error }}</div>
        <GravityCanvas
          v-else-if="currentSample"
          :sample="currentSample"
          :trail="samples.filter((sample) => sample.time <= currentTime)"
          :tether-length="tetherLength"
        />
        <div class="grid gap-3 border-t border-ui-border-subtle px-4 py-3">
          <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
            <button
              type="button"
              class="rounded-md border border-ui-border-strong bg-ui-surface px-3 py-2 font-medium text-ui-text transition hover:border-ui-focus hover:bg-ui-surface-raised"
              @click="togglePlayback"
            >
              {{ isPlaying ? "Pause" : "Play" }}
            </button>
            <span class="font-mono text-xs text-slate-400">
              {{ format(currentTime) }} / {{ format(duration) }} time units
            </span>
          </div>
          <input
            type="range"
            min="0"
            :max="duration"
            step="any"
            :value="currentTime"
            class="w-full accent-sky-400"
            aria-label="Simulation time"
            @input="onScrub"
          />
        </div>
      </div>

      <aside class="grid content-start gap-4 rounded-lg border border-ui-border-subtle bg-ui-surface-raised p-4">
        <fieldset class="grid gap-3">
          <legend class="text-sm font-semibold text-slate-100">Launch state</legend>
          <label class="grid gap-1 text-sm text-slate-300">
            <span class="flex justify-between gap-3"><span>Energy / mgL</span><strong>{{ launchEnergy.toFixed(2) }}</strong></span>
            <input v-model.number="launchEnergy" type="range" min="0" max="3.5" step="0.01" class="accent-amber-400" />
          </label>
          <div class="grid grid-cols-2 gap-2 text-xs text-slate-400">
            <span>horizontal &lt; 1</span>
            <span>taut loop ≥ 2.5</span>
          </div>
        </fieldset>

        <fieldset class="grid gap-3 border-t border-ui-border-subtle pt-4">
          <legend class="text-sm font-semibold text-slate-100">World</legend>
          <label class="grid gap-1 text-sm text-slate-300">
            <span class="flex justify-between gap-3"><span>Gravity</span><strong>{{ gravity.toFixed(2) }}</strong></span>
            <input v-model.number="gravity" type="range" min="0.1" max="3" step="0.01" class="accent-sky-400" />
          </label>
          <label class="grid gap-1 text-sm text-slate-300">
            <span class="flex justify-between gap-3"><span>Tether length</span><strong>{{ tetherLength.toFixed(2) }}</strong></span>
            <input v-model.number="tetherLength" type="range" min="0.5" max="1.5" step="0.01" class="accent-sky-400" />
          </label>
          <label class="grid gap-1 text-sm text-slate-300">
            <span class="flex justify-between gap-3"><span>Playback</span><strong>{{ playbackSpeed.toFixed(2) }}×</strong></span>
            <input v-model.number="playbackSpeed" type="range" min="0.1" max="2" step="0.05" class="accent-sky-400" />
          </label>
        </fieldset>

        <div class="grid gap-2 border-t border-ui-border-subtle pt-4 text-sm">
          <p class="text-slate-400">Analytic launch class</p>
          <p class="font-mono text-lg text-amber-200">{{ analyticClass }}</p>
          <p class="text-xs leading-5 text-slate-500">
            The exact thresholds are (E=mgL) for reaching horizontal and (E=2.5mgL) for a
            limiting taut loop.
          </p>
        </div>
      </aside>
    </div>

    <div v-if="trace && currentSample" class="grid gap-4">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-lg border border-ui-border-subtle bg-ui-surface-raised p-3">
          <p class="text-xs uppercase tracking-[0.14em] text-slate-500">State</p>
          <p class="mt-1 font-mono text-lg text-slate-100">{{ currentSample.mode }}</p>
        </div>
        <div class="rounded-lg border border-ui-border-subtle bg-ui-surface-raised p-3">
          <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Speed / √gL</p>
          <p class="mt-1 font-mono text-lg text-sky-200">{{ format(normalizedSpeed) }}</p>
        </div>
        <div class="rounded-lg border border-ui-border-subtle bg-ui-surface-raised p-3">
          <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Tension / mg</p>
          <p class="mt-1 font-mono text-lg text-emerald-200">{{ format(currentSample.normalizedTension) }}</p>
        </div>
        <div class="rounded-lg border border-ui-border-subtle bg-ui-surface-raised p-3">
          <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Radius / L</p>
          <p class="mt-1 font-mono text-lg text-amber-200">{{ format(currentSample.radiusRatio) }}</p>
        </div>
      </div>

      <div class="grid gap-3 lg:grid-cols-2">
        <GravityTracePlot :samples="samples" :current-time="currentTime" value="normalizedWorldSpeed" title="World speed / √gL" color="#38bdf8" />
        <GravityTracePlot :samples="samples" :current-time="currentTime" value="normalizedTension" title="Tension / mg" color="#34d399" />
        <GravityTracePlot :samples="samples" :current-time="currentTime" value="normalizedEnergy" title="Mechanical energy / mgL" color="#fbbf24" />
        <GravityTracePlot :samples="samples" :current-time="currentTime" value="radiusRatio" title="String radius / L" color="#f472b6" :min="0" :max="1.1" />
      </div>

      <div class="grid gap-3 rounded-lg border border-ui-border-subtle bg-slate-950/60 p-4 md:grid-cols-2">
        <div>
          <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Observed result</p>
          <p class="mt-1 text-xl font-semibold text-slate-100">{{ trace.metrics.classification }}</p>
          <p class="mt-2 text-sm leading-6 text-slate-400">
            {{ trace.metrics.catchCount }} catch{{ trace.metrics.catchCount === 1 ? "" : "es" }} ·
            {{ trace.metrics.firstReleaseTime === null ? "never released" : `released at ${trace.metrics.firstReleaseTime.toFixed(2)}` }}
          </p>
        </div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-slate-400">
          <span>Max tension</span><strong class="text-right font-mono text-slate-200">{{ format(trace.metrics.maximumTension) }}</strong>
          <span>Max world speed</span><strong class="text-right font-mono text-slate-200">{{ format(trace.metrics.maximumWorldSpeed) }}</strong>
          <span>Energy residual</span><strong class="text-right font-mono text-slate-200">{{ format(trace.metrics.energyBalanceResidual, 4) }}</strong>
          <span>Positive hand work</span><strong class="text-right font-mono text-slate-200">{{ format(trace.metrics.positiveHandWork, 3) }}</strong>
        </div>
      </div>
    </div>

    <div class="grid gap-3 rounded-lg border border-sky-900/60 bg-sky-950/20 p-4 text-sm leading-6 text-slate-300">
      <p class="font-semibold text-sky-200">The reference thresholds</p>
      <MathEquation tex="E_\mathrm{horizontal}=mgL" />
      <MathEquation tex="E_\mathrm{taut\ loop}=\frac{5}{2}mgL" />
      <p>
        These are not arbitrary animation breakpoints. The first is the energy needed to reach the
        horizontal line. The second is the extra condition that the string still has non-negative
        tension at the top.
      </p>
    </div>
  </section>
</template>
