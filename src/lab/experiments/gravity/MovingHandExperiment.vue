<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import GravityCanvas from "./GravityCanvas.vue";
import GravityComparisonPlot from "./GravityComparisonPlot.vue";
import MathEquation from "./MathEquation.vue";
import { createCircularHandPath } from "./physics/handPaths";
import {
  createDefaultLaunchConfig,
  interpolateSample,
  simulateIdealTether
} from "./physics/idealTether";
import type { IdealTetherConfig, IdealTetherTrace, SimulationResult } from "./physics/types";

const defaults = createDefaultLaunchConfig();
const launchEnergy = ref(2.65);
const gravity = ref(defaults.gravity);
const tetherLength = ref(defaults.length);
const handAmplitude = ref(0.08);
const handRate = ref(2.2);
const handPhaseDeg = ref(0);
const handDirection = ref<1 | -1>(1);
const duration = ref(8);
const currentTime = ref(0);
const playbackSpeed = ref(0.85);
const isPlaying = ref(true);
let frameHandle: number | null = null;
let previousFrameTime: number | null = null;

const initialAngularVelocity = computed(() =>
  Math.sqrt(2 * launchEnergy.value * gravity.value / tetherLength.value)
);
const handAngularVelocity = computed(() =>
  handDirection.value * handRate.value * Math.sqrt(gravity.value / tetherLength.value)
);
const handPath = computed(() => createCircularHandPath({
  amplitude: handAmplitude.value * tetherLength.value,
  angularVelocity: handAngularVelocity.value,
  phase: handPhaseDeg.value * Math.PI / 180
}));

const baseConfig = computed<IdealTetherConfig>(() => ({
  ...defaults,
  gravity: gravity.value,
  length: tetherLength.value,
  duration: duration.value,
  initialAngularVelocity: initialAngularVelocity.value
}));
const fixedResult = computed<SimulationResult>(() => simulateIdealTether(baseConfig.value));
const movingResult = computed<SimulationResult>(() => simulateIdealTether({
  ...baseConfig.value,
  handPath: handPath.value
}));
const fixedTrace = computed<IdealTetherTrace | null>(() => fixedResult.value.ok ? fixedResult.value.trace : null);
const movingTrace = computed<IdealTetherTrace | null>(() => movingResult.value.ok ? movingResult.value.trace : null);
const fixedSamples = computed(() => fixedTrace.value?.samples ?? []);
const movingSamples = computed(() => movingTrace.value?.samples ?? []);
const fixedSample = computed(() => fixedTrace.value ? interpolateSample(fixedTrace.value.samples, currentTime.value) : null);
const movingSample = computed(() => movingTrace.value ? interpolateSample(movingTrace.value.samples, currentTime.value) : null);
const simulationError = computed(() => {
  if (!fixedResult.value.ok) return fixedResult.value.error;
  if (!movingResult.value.ok) return movingResult.value.error;
  return null;
});

function resetPlayback() {
  currentTime.value = 0;
  previousFrameTime = null;
}

function tick(now: number) {
  if (previousFrameTime === null) previousFrameTime = now;
  if (isPlaying.value) {
    currentTime.value += Math.min(0.1, (now - previousFrameTime) / 1000) * playbackSpeed.value;
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

watch([launchEnergy, gravity, tetherLength, handAmplitude, handRate, handPhaseDeg, handDirection, duration], resetPlayback);

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
      <p class="text-xs font-medium uppercase tracking-[0.2em] text-amber-300">Experiment 2</p>
      <div class="flex flex-wrap items-baseline justify-between gap-3">
        <h2 class="text-2xl font-semibold text-slate-100">Can a small hand circle flatten the speed curve?</h2>
        <p class="font-mono text-xs text-slate-400">fixed hand versus moving pivot</p>
      </div>
      <p class="max-w-4xl text-sm leading-6 text-slate-400">
        The left trace lets gravity do everything. The right trace gives the hand a small circular
        path. Compare the poi speed, tension, and energy channels to see which part of the hand
        motion actually changes the motion.
      </p>
    </header>

    <div v-if="simulationError" class="rounded-lg bg-rose-950/50 px-4 py-3 text-sm text-rose-100">
      {{ simulationError }}
    </div>

    <template v-else-if="fixedSample && movingSample && fixedTrace && movingTrace">
      <div class="grid gap-4 xl:grid-cols-2">
        <div class="grid min-w-0 gap-3 overflow-hidden rounded-lg border border-ui-border-subtle bg-slate-950">
          <div class="px-4 pt-4">
            <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Fixed hand</p>
            <p class="font-mono text-sm text-slate-300">gravity only</p>
          </div>
          <GravityCanvas :sample="fixedSample" :trail="fixedSamples.filter((sample) => sample.time <= currentTime)" :tether-length="tetherLength" aria-label="Fixed-hand gravity reference" />
        </div>
        <div class="grid min-w-0 gap-3 overflow-hidden rounded-lg border border-ui-border-subtle bg-slate-950">
          <div class="px-4 pt-4">
            <p class="text-xs uppercase tracking-[0.14em] text-slate-500">Moving hand</p>
            <p class="font-mono text-sm text-slate-300">small circular pivot</p>
          </div>
          <GravityCanvas :sample="movingSample" :trail="movingSamples.filter((sample) => sample.time <= currentTime)" :tether-length="tetherLength" aria-label="Moving-hand gravity experiment" />
        </div>
      </div>

      <div class="grid gap-4 rounded-lg border border-ui-border-subtle bg-ui-surface-raised p-4 md:grid-cols-2">
        <fieldset class="grid gap-3">
          <legend class="text-sm font-semibold text-slate-100">Shared launch</legend>
          <label class="grid gap-1 text-sm text-slate-300">
            <span class="flex justify-between gap-3"><span>Launch energy / mgL</span><strong>{{ launchEnergy.toFixed(2) }}</strong></span>
            <input v-model.number="launchEnergy" type="range" min="0.25" max="3.5" step="0.01" class="accent-amber-400" />
          </label>
          <label class="grid gap-1 text-sm text-slate-300">
            <span class="flex justify-between gap-3"><span>Gravity</span><strong>{{ gravity.toFixed(2) }}</strong></span>
            <input v-model.number="gravity" type="range" min="0.1" max="3" step="0.01" class="accent-sky-400" />
          </label>
          <label class="grid gap-1 text-sm text-slate-300">
            <span class="flex justify-between gap-3"><span>Tether length</span><strong>{{ tetherLength.toFixed(2) }}</strong></span>
            <input v-model.number="tetherLength" type="range" min="0.5" max="1.5" step="0.01" class="accent-sky-400" />
          </label>
        </fieldset>
        <fieldset class="grid gap-3">
          <legend class="text-sm font-semibold text-slate-100">Hand circle</legend>
          <label class="grid gap-1 text-sm text-slate-300">
            <span class="flex justify-between gap-3"><span>Amplitude / L</span><strong>{{ handAmplitude.toFixed(2) }}</strong></span>
            <input v-model.number="handAmplitude" type="range" min="0" max="0.3" step="0.005" class="accent-emerald-400" />
          </label>
          <label class="grid gap-1 text-sm text-slate-300">
            <span class="flex justify-between gap-3"><span>Hand rate / √(g/L)</span><strong>{{ handRate.toFixed(2) }}</strong></span>
            <input v-model.number="handRate" type="range" min="0.25" max="4" step="0.01" class="accent-emerald-400" />
          </label>
          <label class="grid gap-1 text-sm text-slate-300">
            <span class="flex justify-between gap-3"><span>Hand phase</span><strong>{{ handPhaseDeg.toFixed(0) }}°</strong></span>
            <input v-model.number="handPhaseDeg" type="range" min="0" max="360" step="1" class="accent-emerald-400" />
          </label>
          <div class="grid grid-cols-2 gap-2">
            <button type="button" class="rounded-md border px-3 py-2 text-sm transition" :class="handDirection === 1 ? 'border-emerald-400 bg-emerald-950/60 text-emerald-100' : 'border-ui-border-strong text-slate-300'" @click="handDirection = 1">CCW</button>
            <button type="button" class="rounded-md border px-3 py-2 text-sm transition" :class="handDirection === -1 ? 'border-emerald-400 bg-emerald-950/60 text-emerald-100' : 'border-ui-border-strong text-slate-300'" @click="handDirection = -1">CW</button>
          </div>
        </fieldset>
      </div>

      <div class="grid gap-3 rounded-lg border border-ui-border-subtle bg-slate-950/70 px-4 py-3">
        <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
          <button type="button" class="rounded-md border border-ui-border-strong bg-ui-surface px-3 py-2 font-medium text-ui-text transition hover:border-ui-focus hover:bg-ui-surface-raised" @click="togglePlayback">{{ isPlaying ? "Pause" : "Play" }}</button>
          <span class="font-mono text-xs text-slate-400">{{ format(currentTime) }} / {{ format(duration) }} time units</span>
        </div>
        <input type="range" min="0" :max="duration" step="any" :value="currentTime" class="w-full accent-sky-400" aria-label="Moving-hand comparison time" @input="onScrub" />
        <label class="grid gap-1 text-sm text-slate-300 md:max-w-xs">
          <span class="flex justify-between gap-3"><span>Playback</span><strong>{{ playbackSpeed.toFixed(2) }}×</strong></span>
          <input v-model.number="playbackSpeed" type="range" min="0.1" max="2" step="0.05" class="accent-sky-400" />
        </label>
      </div>

      <div class="grid gap-3 lg:grid-cols-2">
        <GravityComparisonPlot :fixed-samples="fixedSamples" :moving-samples="movingSamples" :current-time="currentTime" value="normalizedWorldSpeed" title="World speed / √gL" :min="0" />
        <GravityComparisonPlot :fixed-samples="fixedSamples" :moving-samples="movingSamples" :current-time="currentTime" value="normalizedRelativeSpeed" title="Hand-relative poi speed / √gL" :min="0" />
        <GravityComparisonPlot :fixed-samples="fixedSamples" :moving-samples="movingSamples" :current-time="currentTime" value="normalizedTension" title="Tension / mg" />
        <GravityComparisonPlot :fixed-samples="fixedSamples" :moving-samples="movingSamples" :current-time="currentTime" value="normalizedHandPower" title="Hand power / (mgL√(g/L))" :min="-1" :max="1" />
        <GravityComparisonPlot :fixed-samples="fixedSamples" :moving-samples="movingSamples" :current-time="currentTime" value="normalizedRadialHandVelocity" title="Radial hand velocity / √gL" :min="-0.5" :max="0.5" />
        <GravityComparisonPlot :fixed-samples="fixedSamples" :moving-samples="movingSamples" :current-time="currentTime" value="normalizedEnergy" title="Mechanical energy / mgL" />
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <div class="grid gap-2 rounded-lg border border-ui-border-subtle bg-slate-950/60 p-4 text-sm">
          <p class="font-semibold text-slate-100">Fixed hand</p>
          <p class="text-slate-400">{{ fixedTrace.metrics.classification }} · minimum tension {{ format(fixedTrace.metrics.minimumTension) }}</p>
          <p class="text-slate-400">Energy residual {{ format(fixedTrace.metrics.energyBalanceResidual, 4) }}</p>
        </div>
        <div class="grid gap-2 rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-4 text-sm">
          <p class="font-semibold text-emerald-100">Moving hand</p>
          <p class="text-slate-300">{{ movingTrace.metrics.classification }} · minimum tension {{ format(movingTrace.metrics.minimumTension) }}</p>
          <p class="text-slate-300">Hand work +{{ format(movingTrace.metrics.positiveHandWork, 3) }} / {{ format(movingTrace.metrics.negativeHandWork, 3) }}</p>
          <p class="text-slate-300">Energy residual {{ format(movingTrace.metrics.energyBalanceResidual, 4) }}</p>
        </div>
      </div>

      <div class="grid gap-3 rounded-lg border border-sky-900/60 bg-sky-950/20 p-4 text-sm leading-6 text-slate-300 md:grid-cols-2">
        <div>
          <p class="font-semibold text-sky-200">What to watch</p>
          <p>Radial hand velocity is the direct tension-mediated energy channel. Tangential hand acceleration changes angular forcing, while radial acceleration changes the tension required to preserve the constraint.</p>
        </div>
        <MathEquation tex="P_{\mathrm{hand}}=-T\,\dot{\mathbf H}\cdot\mathbf e_r" />
      </div>

      <div class="grid gap-2 text-sm leading-6 text-slate-400">
        <p>
          The circular hand path is open-loop: it does not sense the poi or optimize for constant
          speed. Its useful result is narrower. Even a small pivot circle performs positive work
          during some phases and negative work during others, so hand motion can reshape the
          gravity-led speed curve without applying a fictional tangential motor at the poi.
        </p>
        <p>
          A flatter curve is therefore a coordination problem involving hand-path phase, amplitude,
          and rate. This experiment exposes those variables; it does not yet solve for the best
          path.
        </p>
      </div>
    </template>
  </section>
</template>
