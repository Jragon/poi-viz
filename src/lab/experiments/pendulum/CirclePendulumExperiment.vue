<script setup lang="ts">
import { computed, ref } from "vue";

import PoiCanvasViewport from "@/visualizer/PoiCanvasViewport.vue";
import {
  createVisualizerWorkspace,
  provideVisualizerWorkspace
} from "@/visualizer/visualizerWorkspace";
import {
  buildCirclePendulumExperiment,
  createDefaultCirclePendulumExperiment,
  sampleCirclePendulumMotion,
  type CirclePendulumExperimentConfig,
  type MotionDirection,
  type PendulumCurveKind
} from "./circlePendulumExperiment";

const TAU = Math.PI * 2;
const CARDINALS = [
  { label: "right", phaseDeg: 0 },
  { label: "up", phaseDeg: 90 },
  { label: "left", phaseDeg: 180 },
  { label: "down", phaseDeg: 270 }
] as const;
const CARDINAL_TIMES = [0, 0.25, 0.5, 0.75, 1] as const;
const SAMPLE_COUNT = 160;
const CURVE_OPTIONS = [
  { value: "gravity", label: "Gravity reference" },
  { value: "sine", label: "Sine reference" },
  { value: "constant", label: "Constant speed" }
] as const;

const defaults = createDefaultCirclePendulumExperiment();
const amplitudeDeg = ref((defaults.amplitudeRad * 180) / Math.PI);
const circleCyclesPerUnit = ref(defaults.circleCyclesPerUnit);
const pendulumCyclesPerUnit = ref(defaults.pendulumCyclesPerUnit);
const circleDirection = ref<MotionDirection>(defaults.circleDirection);
const pendulumDirection = ref<MotionDirection>(defaults.pendulumDirection);
const curve = ref<PendulumCurveKind>(defaults.curve);

const config = computed<CirclePendulumExperimentConfig>(() => ({
  amplitudeRad: (amplitudeDeg.value * Math.PI) / 180,
  circleCyclesPerUnit: circleCyclesPerUnit.value,
  pendulumCyclesPerUnit: pendulumCyclesPerUnit.value,
  circleDirection: circleDirection.value,
  pendulumDirection: pendulumDirection.value,
  curve: curve.value
}));
const sequence = computed(() => buildCirclePendulumExperiment(config.value));

const workspace = provideVisualizerWorkspace(
  createVisualizerWorkspace(() => sequence.value, {
    autoplay: true,
    resumeOnSequenceChange: true
  })
);
const { core, transport, display } = workspace;

display.setOverlayVisibility("showHandTrails", false);
display.setOverlayVisibility("showHeadTrails", true);
core.session.setProjectionMode("orthographic");

const currentTimeLabel = computed(() => transport.currentTime.value.toFixed(2));
const currentSample = computed(() =>
  sampleCirclePendulumMotion(config.value, transport.currentTime.value)
);

function wrapDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

function nearestCardinal(phaseRad: number): { label: string; errorDeg: number } {
  const phaseDeg = wrapDegrees((phaseRad * 180) / Math.PI);
  let nearest: (typeof CARDINALS)[number] = CARDINALS[0];
  let nearestError = 360;
  for (const cardinal of CARDINALS) {
    const rawError = Math.abs(phaseDeg - cardinal.phaseDeg);
    const error = Math.min(rawError, 360 - rawError);
    if (error < nearestError) {
      nearest = cardinal;
      nearestError = error;
    }
  }
  return { label: nearest.label, errorDeg: nearestError };
}

function formatPosition(phaseRad: number): string {
  const cardinal = nearestCardinal(phaseRad);
  return cardinal.errorDeg <= 0.5
    ? cardinal.label
    : `${cardinal.label} (${cardinal.errorDeg.toFixed(1)}°)`;
}

const cardinalRows = computed(() =>
  CARDINAL_TIMES.map((time) => {
    const sample = sampleCirclePendulumMotion(config.value, time);
    return {
      time,
      circle: formatPosition(sample.circlePhaseAbs),
      pendulum: formatPosition(sample.pendulumPhaseAbs),
      circleSpeed: Math.abs(sample.circleAngularVelocity) / TAU,
      pendulumSpeed: Math.abs(sample.pendulumAngularVelocity) / TAU
    };
  })
);

const velocitySamples = computed(() =>
  Array.from({ length: SAMPLE_COUNT + 1 }, (_, index) => {
    const time = index / SAMPLE_COUNT;
    const sample = sampleCirclePendulumMotion(config.value, time);
    return {
      time,
      circle: Math.abs(sample.circleAngularVelocity) / TAU,
      pendulum: Math.abs(sample.pendulumAngularVelocity) / TAU
    };
  })
);

const velocityMax = computed(() => {
  const max = velocitySamples.value.reduce(
    (currentMax, sample) => Math.max(currentMax, sample.circle, sample.pendulum),
    1
  );
  return Math.max(1, max * 1.08);
});

function toPath(key: "circle" | "pendulum"): string {
  return velocitySamples.value
    .map((sample, index) => {
      const x = (sample.time * 640).toFixed(2);
      const y = (170 - (sample[key] / velocityMax.value) * 140).toFixed(2);
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

const circleVelocityPath = computed(() => toPath("circle"));
const pendulumVelocityPath = computed(() => toPath("pendulum"));
const boundarySpeedDelta = computed(() => {
  const sample = sampleCirclePendulumMotion(config.value, 0);
  return Math.abs(Math.abs(sample.pendulumAngularVelocity) - Math.abs(sample.circleAngularVelocity)) / TAU;
});
const maximumPendulumSpeed = computed(() =>
  velocitySamples.value.reduce((max, sample) => Math.max(max, sample.pendulum), 0)
);

function setCurve(nextCurve: PendulumCurveKind) {
  curve.value = nextCurve;
}

function togglePlayback() {
  transport.toggle();
}

function onScrub(event: Event) {
  transport.setCurrentTime(Number((event.target as HTMLInputElement).value));
}
</script>

<template>
  <section class="grid gap-4 rounded-lg border border-ui-border-subtle bg-ui-surface p-4">
    <header class="grid gap-2">
      <p class="text-xs font-medium uppercase tracking-[0.2em] text-sky-300">
        Calibration experiment
      </p>
      <div class="flex flex-wrap items-baseline justify-between gap-3">
        <h2 class="text-xl font-semibold text-slate-100">Circle vs pendulum</h2>
        <p class="font-mono text-xs text-slate-400">1 unit = 1 circle = 1 pendulum cycle</p>
      </div>
      <p class="max-w-3xl text-sm leading-6 text-slate-400">
        A fixed-hand circle and a fixed-hand pendulum share one unit of time. Gravity is the
        working reference; sine and constant speed are deterministic comparison shapes for
        exploring how the speed profile changes.
      </p>
    </header>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
      <div class="grid min-w-0 gap-3 overflow-hidden rounded-lg border border-ui-border-subtle bg-ui-stage">
        <div
          v-if="core.errorMessage.value"
          class="border-b border-rose-900/70 bg-rose-950/45 px-4 py-3 text-sm text-rose-100"
        >
          {{ core.errorMessage.value }}
        </div>
        <PoiCanvasViewport
          v-else
          class="!min-h-80 rounded-none border-0 md:!min-h-112"
          :projection-drag-enabled="false"
        />
        <div class="grid gap-3 border-t border-ui-border-subtle px-4 py-3">
          <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
            <button
              type="button"
              class="rounded-md border border-ui-border-strong bg-ui-surface px-3 py-2 font-medium text-ui-text transition hover:border-ui-focus hover:bg-ui-surface-raised"
              @click="togglePlayback"
            >
              {{ transport.isPlaying.value ? "Pause" : "Play" }}
            </button>
            <span class="font-mono text-xs text-slate-400">
              {{ currentTimeLabel }} / {{ transport.duration.value.toFixed(2) }} units
            </span>
          </div>
          <input
            type="range"
            min="0"
            :max="transport.duration.value"
            step="any"
            :value="transport.currentTime.value"
            class="w-full accent-sky-400"
            @input="onScrub"
          />
        </div>
      </div>

      <aside class="grid content-start gap-4 rounded-lg border border-ui-border-subtle bg-ui-surface p-4">
        <fieldset class="grid gap-2 text-sm text-slate-300">
          <legend>Curve</legend>
          <div class="grid gap-2">
            <button
              v-for="option in CURVE_OPTIONS"
              :key="option.value"
              type="button"
              class="rounded-md border px-3 py-2 text-left transition"
              :class="
                curve === option.value
                  ? 'border-sky-400 bg-sky-950/55 text-sky-50'
                  : 'border-ui-border-strong bg-ui-input text-ui-text hover:bg-ui-surface-raised'
              "
              :aria-pressed="curve === option.value"
              @click="setCurve(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </fieldset>

        <label class="grid gap-1 text-sm text-slate-300">
          <span class="flex justify-between gap-3">
            <span>Amplitude</span>
            <output class="font-mono text-sky-200">{{ amplitudeDeg.toFixed(0) }}°</output>
          </span>
          <input v-model.number="amplitudeDeg" type="range" min="30" max="90" step="1" />
        </label>

        <label class="grid gap-1 text-sm text-slate-300">
          <span class="flex justify-between gap-3">
            <span>Circle rate</span>
            <output class="font-mono text-sky-200">{{ circleCyclesPerUnit.toFixed(2) }}</output>
          </span>
          <input
            v-model.number="circleCyclesPerUnit"
            type="range"
            min="0.5"
            max="1.5"
            step="0.05"
          />
        </label>

        <label class="grid gap-1 text-sm text-slate-300">
          <span class="flex justify-between gap-3">
            <span>Pendulum cycles</span>
            <output class="font-mono text-sky-200">{{ pendulumCyclesPerUnit.toFixed(2) }}</output>
          </span>
          <input
            v-model.number="pendulumCyclesPerUnit"
            type="range"
            min="0.5"
            max="1.5"
            step="0.05"
          />
        </label>

        <label class="grid gap-1 text-sm text-slate-300">
          <span>Circle direction</span>
          <select
            v-model.number="circleDirection"
            class="rounded-md border border-ui-border-strong bg-ui-input px-3 py-2 text-ui-text"
          >
            <option :value="-1">negative</option>
            <option :value="1">positive</option>
          </select>
        </label>

        <label class="grid gap-1 text-sm text-slate-300">
          <span>Pendulum direction</span>
          <select
            v-model.number="pendulumDirection"
            class="rounded-md border border-ui-border-strong bg-ui-input px-3 py-2 text-ui-text"
          >
            <option :value="-1">negative</option>
            <option :value="1">positive</option>
          </select>
        </label>

        <div class="grid gap-1 border-t border-ui-border-subtle pt-3 text-xs text-slate-400">
          <span>Current circle speed</span>
          <span class="font-mono text-slate-200">{{ Math.abs(currentSample.circleAngularVelocity / TAU).toFixed(2) }}×</span>
          <span>Current pendulum speed</span>
          <span class="font-mono text-slate-200">{{ Math.abs(currentSample.pendulumAngularVelocity / TAU).toFixed(2) }}×</span>
          <span>Bottom speed difference</span>
          <span class="font-mono text-slate-200">{{ boundarySpeedDelta.toFixed(2) }}×</span>
          <span>Maximum pendulum speed</span>
          <span class="font-mono text-slate-200">{{ maximumPendulumSpeed.toFixed(2) }}×</span>
        </div>
      </aside>
    </div>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
      <div class="grid gap-2">
        <div class="flex flex-wrap items-baseline justify-between gap-3">
          <h3 class="text-xs font-semibold uppercase tracking-[0.18em] text-ui-text-muted">
            Absolute angular speed
          </h3>
          <p class="text-xs text-ui-text-muted">base circle speed = 1.00×</p>
        </div>
        <svg
          class="h-48 w-full rounded-md border border-ui-border-subtle bg-slate-950"
          viewBox="0 0 640 180"
          role="img"
          aria-label="Circle and pendulum absolute angular speed over one unit"
        >
          <title>Circle and pendulum absolute angular speed</title>
          <line x1="0" y1="170" x2="640" y2="170" stroke="currentColor" opacity="0.3" />
          <line x1="0" y1="30" x2="640" y2="30" stroke="currentColor" opacity="0.15" />
          <line
            x1="0"
            :y1="170 - (1 / velocityMax) * 140"
            x2="640"
            :y2="170 - (1 / velocityMax) * 140"
            stroke="currentColor"
            opacity="0.25"
          />
          <path :d="circleVelocityPath" fill="none" stroke="#38bdf8" stroke-width="2" />
          <path :d="pendulumVelocityPath" fill="none" stroke="#f472b6" stroke-width="2" />
          <text x="8" y="24" fill="currentColor" opacity="0.7" font-size="11">speed</text>
          <text x="8" y="176" fill="currentColor" opacity="0.7" font-size="11">0</text>
          <text x="610" y="176" fill="currentColor" opacity="0.7" font-size="11">1 unit</text>
        </svg>
        <div class="flex flex-wrap gap-4 text-xs text-slate-400">
          <span><i class="mr-1 inline-block h-2 w-2 rounded-full bg-sky-400"></i>circle</span>
          <span><i class="mr-1 inline-block h-2 w-2 rounded-full bg-pink-400"></i>pendulum</span>
        </div>
      </div>

      <div class="grid gap-2">
        <h3 class="text-xs font-semibold uppercase tracking-[0.18em] text-ui-text-muted">
          Cardinal checkpoints
        </h3>
        <div class="overflow-x-auto rounded-md border border-ui-border-subtle">
          <table class="min-w-full divide-y divide-slate-800 text-left text-xs">
            <thead class="bg-slate-900/70 text-ui-text-muted">
              <tr>
                <th class="px-3 py-2 font-semibold">Time</th>
                <th class="px-3 py-2 font-semibold">Circle</th>
                <th class="px-3 py-2 font-semibold">Pendulum</th>
                <th class="px-3 py-2 font-semibold">Speed</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-900 bg-slate-950/60 font-mono text-slate-300">
              <tr v-for="row in cardinalRows" :key="row.time">
                <td class="px-3 py-2">{{ row.time.toFixed(2) }}</td>
                <td class="px-3 py-2">{{ row.circle }}</td>
                <td class="px-3 py-2">{{ row.pendulum }}</td>
                <td class="px-3 py-2">{{ row.circleSpeed.toFixed(2) }} / {{ row.pendulumSpeed.toFixed(2) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>
