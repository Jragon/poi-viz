<script setup lang="ts">
import { computed, ref } from "vue";

import EmbeddedVisualizer from "@/lab/components/EmbeddedVisualizer.vue";
import {
  buildRastaxelPendulumExperiment,
  createDefaultRastaxelPendulumExperiment,
  RASTAXEL_DURATION_UNITS,
  RASTAXEL_STEP_COUNT,
  RASTAXEL_STEP_DURATION,
  sampleRastaxelPendulumMotion,
  type RastaxelFlow,
  type RastaxelMotionSegment
} from "./rastaxelPendulumExperiment";

const TAU = Math.PI * 2;
const PLOT_WIDTH = 720;
const PLOT_HEIGHT = 230;
const PLOT_TOP = 26;
const PLOT_BOTTOM = 190;
const SAMPLE_COUNT = 320;
const flowOptions = ["inwards", "outwards"] as const;

const defaults = createDefaultRastaxelPendulumExperiment();
const rightOffsetSteps = ref(defaults.rightOffsetSteps);
const amplitudeDeg = ref((defaults.amplitudeRad * 180) / Math.PI);
const leftFlow = ref<RastaxelFlow>(defaults.leftFlow);
const rightFlow = ref<RastaxelFlow>(defaults.rightFlow);
const leftHandRadius = ref(defaults.leftHandDriver.radius);
const rightHandRadius = ref(defaults.rightHandDriver.radius);
const leftHandStartPhaseDeg = ref(defaults.leftHandDriver.startPhaseDeg);
const rightHandStartPhaseDeg = ref(defaults.rightHandDriver.startPhaseDeg);
const leftHandOmega = ref(defaults.leftHandDriver.omega);
const rightHandOmega = ref(defaults.rightHandDriver.omega);
const tracksCoincident = computed(() => rightOffsetSteps.value === 0);

const config = computed(() => ({
  amplitudeRad: (amplitudeDeg.value * Math.PI) / 180,
  leftFlow: leftFlow.value,
  rightFlow: rightFlow.value,
  leftHandDriver: {
    radius: leftHandRadius.value,
    startPhaseDeg: leftHandStartPhaseDeg.value,
    omega: leftHandOmega.value
  },
  rightHandDriver: {
    radius: rightHandRadius.value,
    startPhaseDeg: rightHandStartPhaseDeg.value,
    omega: rightHandOmega.value
  },
  curve: defaults.curve,
  rightOffsetSteps: rightOffsetSteps.value
}));
const sequence = computed(() => buildRastaxelPendulumExperiment(config.value));

const velocitySamples = computed(() =>
  Array.from({ length: SAMPLE_COUNT + 1 }, (_, index) => {
    const time = (index / SAMPLE_COUNT) * RASTAXEL_DURATION_UNITS;
    return {
      time,
      left: sampleRastaxelPendulumMotion(config.value, time, 0, "left"),
      right: sampleRastaxelPendulumMotion(config.value, time, rightOffsetSteps.value, "right")
    };
  })
);

const velocityMax = computed(() => {
  const max = velocitySamples.value.reduce(
    (currentMax, sample) =>
      Math.max(currentMax, sample.left.speedInExtensions, sample.right.speedInExtensions),
    1
  );
  return Math.max(1.1, max * 1.12);
});

function toPath(key: "left" | "right"): string {
  return velocitySamples.value
    .map((sample, index) => {
      const x = (sample.time / RASTAXEL_DURATION_UNITS) * PLOT_WIDTH;
      const y =
        PLOT_BOTTOM -
        (sample[key].speedInExtensions / velocityMax.value) * (PLOT_BOTTOM - PLOT_TOP);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

const leftVelocityPath = computed(() => toPath("left"));
const rightVelocityPath = computed(() => toPath("right"));

const joinSpeed = computed(
  () => sampleRastaxelPendulumMotion(config.value, 1 - 1e-8, 0, "left").speedInExtensions
);
const circleSpeed = computed(
  () => sampleRastaxelPendulumMotion(config.value, 1, 0, "left").speedInExtensions
);
const speedRatio = computed(() => joinSpeed.value / circleSpeed.value);

const stepRows = computed(() =>
  Array.from({ length: RASTAXEL_STEP_COUNT + 1 }, (_, step) => {
    const time = step * RASTAXEL_STEP_DURATION;
    const left = sampleRastaxelPendulumMotion(config.value, time, 0, "left");
    const right = sampleRastaxelPendulumMotion(config.value, time, rightOffsetSteps.value, "right");
    return {
      step,
      time,
      left,
      right,
      leftPosition: formatPosition(left.phaseAbs),
      rightPosition: formatPosition(right.phaseAbs)
    };
  })
);

const stepGuides = computed(() =>
  Array.from({ length: RASTAXEL_STEP_COUNT + 1 }, (_, step) => ({
    step,
    x: (step / RASTAXEL_STEP_COUNT) * PLOT_WIDTH
  }))
);

function wrapDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

function nearestCardinal(phaseRad: number): { label: string; errorDeg: number } {
  const phaseDeg = wrapDegrees((phaseRad * 180) / Math.PI);
  const cardinals = [
    { label: "right", phaseDeg: 0 },
    { label: "up", phaseDeg: 90 },
    { label: "left", phaseDeg: 180 },
    { label: "down", phaseDeg: 270 }
  ];
  let nearest = cardinals[0];
  let nearestError = 360;
  for (const cardinal of cardinals) {
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
    : `${cardinal.label} (${cardinal.errorDeg.toFixed(0)}°)`;
}

function segmentLabel(segment: RastaxelMotionSegment): string {
  return segment === "pendulum" ? "pendulum" : "circle";
}

function flowLabel(flow: RastaxelFlow): string {
  return flow === "inwards" ? "inward" : "outward";
}

function flowButtonClass(current: RastaxelFlow, option: RastaxelFlow): string {
  return current === option
    ? "border-sky-400 bg-sky-950/55 text-sky-50"
    : "border-ui-border-strong bg-ui-input text-ui-text hover:bg-ui-surface-raised";
}
</script>

<template>
  <section class="grid gap-4 rounded-lg border border-ui-border-subtle bg-ui-surface p-4">
    <header class="grid gap-2">
      <p class="text-xs font-medium uppercase tracking-[0.2em] text-sky-300">Motif experiment</p>
      <div class="flex flex-wrap items-baseline justify-between gap-3">
        <h2 class="text-xl font-semibold text-slate-100">Rastaxel pendulum</h2>
        <p class="font-mono text-xs text-slate-400">2 units · 8 quarter steps</p>
      </div>
      <p class="max-w-4xl text-sm leading-6 text-slate-400">
        Each poi follows one full gravity pendulum cycle (two downswings), then one full circle. The
        right track is shifted by an integer number of quarter steps so cardinal alignments are easy
        to inspect without breaking the continuous motion underneath.
      </p>
    </header>

    <div class="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <EmbeddedVisualizer
        :sequence="sequence"
        title="Rastaxel live cell"
        summary="Each track follows the same 2-unit motif with its own handed direction; the right-track offset shifts its phase."
        projection-mode="orthographic"
        :projection-drag-enabled="false"
        size="compact"
      />

      <aside
        class="grid content-start gap-4 rounded-lg border border-ui-border-subtle bg-ui-surface p-4"
      >
        <fieldset class="grid gap-2 text-sm text-slate-300">
          <legend>Right-track offset</legend>
          <p class="text-xs leading-5 text-slate-500">
            One step is 0.25 units. Four steps is a half-motif shift.
          </p>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="step in RASTAXEL_STEP_COUNT"
              :key="step - 1"
              type="button"
              class="rounded-md border px-2 py-2 text-sm transition"
              :class="
                rightOffsetSteps === step - 1
                  ? 'border-sky-400 bg-sky-950/55 text-sky-50'
                  : 'border-ui-border-strong bg-ui-input text-ui-text hover:bg-ui-surface-raised'
              "
              :aria-pressed="rightOffsetSteps === step - 1"
              @click="rightOffsetSteps = step - 1"
            >
              {{ step - 1 }}
            </button>
          </div>
          <output class="font-mono text-xs text-sky-200">
            {{ rightOffsetSteps }} steps ·
            {{ (rightOffsetSteps * RASTAXEL_STEP_DURATION).toFixed(2) }} units
          </output>
        </fieldset>

        <label class="grid gap-1 text-sm text-slate-300">
          <span class="flex justify-between gap-3">
            <span>Pendulum amplitude</span>
            <output class="font-mono text-sky-200">{{ amplitudeDeg.toFixed(0) }}°</output>
          </span>
          <input v-model.number="amplitudeDeg" type="range" min="30" max="90" step="1" />
        </label>

        <details class="rounded-lg border border-ui-border-subtle bg-ui-input">
          <summary
            class="cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-ui-text-muted transition hover:text-ui-text"
          >
            Hand driver controls
          </summary>
          <div class="grid gap-4 border-t border-ui-border-subtle p-3">
            <fieldset class="grid gap-2 text-sm text-slate-300">
              <legend>Left hand</legend>
              <label class="grid gap-1">
                <span class="text-xs text-slate-500">Radius</span>
                <input v-model.number="leftHandRadius" type="number" min="0" step="0.05" />
              </label>
              <label class="grid gap-1">
                <span class="text-xs text-slate-500">Start phase (degrees)</span>
                <input v-model.number="leftHandStartPhaseDeg" type="number" step="1" />
              </label>
              <label class="grid gap-1">
                <span class="text-xs text-slate-500">ω (circles/unit)</span>
                <input v-model.number="leftHandOmega" type="number" step="0.01" />
              </label>
            </fieldset>

            <fieldset class="grid gap-2 text-sm text-slate-300">
              <legend>Right hand</legend>
              <label class="grid gap-1">
                <span class="text-xs text-slate-500">Radius</span>
                <input v-model.number="rightHandRadius" type="number" min="0" step="0.05" />
              </label>
              <label class="grid gap-1">
                <span class="text-xs text-slate-500">Start phase (degrees)</span>
                <input v-model.number="rightHandStartPhaseDeg" type="number" step="1" />
              </label>
              <label class="grid gap-1">
                <span class="text-xs text-slate-500">ω (circles/unit)</span>
                <input v-model.number="rightHandOmega" type="number" step="0.01" />
              </label>
            </fieldset>
          </div>
        </details>

        <div class="grid gap-2 text-sm text-slate-300">
          <div class="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-2">
            <span>Left</span>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="option in flowOptions"
                :key="option"
                type="button"
                class="rounded-md border px-3 py-2 text-left transition"
                :class="flowButtonClass(leftFlow, option)"
                :aria-pressed="leftFlow === option"
                @click="leftFlow = option"
              >
                {{ flowLabel(option) }}
              </button>
            </div>
          </div>
          <div class="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-2">
            <span>Right</span>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="option in flowOptions"
                :key="option"
                type="button"
                class="rounded-md border px-3 py-2 text-left transition"
                :class="flowButtonClass(rightFlow, option)"
                :aria-pressed="rightFlow === option"
                @click="rightFlow = option"
              >
                {{ flowLabel(option) }}
              </button>
            </div>
          </div>
        </div>

        <div class="grid gap-2 text-xs leading-5 text-slate-400">
          <p v-if="tracksCoincident">
            <span class="font-medium text-slate-200">Offset 0:</span>
            the two tracks are exactly coincident, so the canvas draws one marker on top of the
            other. Use the speed graph or choose another offset to separate them visually.
          </p>
          <p>
            <span class="font-medium text-slate-200">Gravity reference:</span>
            the pendulum accelerates through the bottom and slows toward each deadpoint.
          </p>
          <p>
            <span class="font-medium text-slate-200">Join:</span>
            the current model keeps the raw speed change when the pendulum hands off to the circle.
          </p>
        </div>
      </aside>
    </div>

    <section class="grid gap-3" aria-labelledby="rastaxel-speed-title">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id="rastaxel-speed-title" class="text-base font-semibold text-slate-100">
            Speed through the motif
          </h3>
          <p class="text-xs text-slate-500">
            Angular speed normalized to one full circle per unit.
          </p>
        </div>
        <div class="flex flex-wrap gap-3 text-xs text-slate-400">
          <span
            ><i
              class="mr-1 inline-block h-2 w-2 rounded-full bg-sky-300"
              aria-hidden="true"
            />left</span
          >
          <span
            ><i
              class="mr-1 inline-block h-2 w-2 rounded-full bg-rose-300"
              aria-hidden="true"
            />right</span
          >
          <span class="text-slate-500">vertical guides = quarter steps</span>
        </div>
      </div>

      <div class="overflow-x-auto rounded-lg border border-ui-border-subtle bg-ui-stage p-3">
        <svg
          :viewBox="`0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}`"
          class="h-auto min-w-[44rem] w-full"
          role="img"
          aria-labelledby="rastaxel-speed-title rastaxel-speed-description"
        >
          <title id="rastaxel-speed-description">
            Left and right normalized angular speed over a two-unit Rastaxel motif
          </title>
          <rect
            x="0"
            :y="PLOT_TOP"
            :width="PLOT_WIDTH / 2"
            :height="PLOT_BOTTOM - PLOT_TOP"
            fill="rgb(14 116 144 / 0.08)"
          />
          <rect
            :x="PLOT_WIDTH / 2"
            :y="PLOT_TOP"
            :width="PLOT_WIDTH / 2"
            :height="PLOT_BOTTOM - PLOT_TOP"
            fill="rgb(148 163 184 / 0.06)"
          />
          <line
            x1="0"
            :y1="PLOT_BOTTOM"
            :x2="PLOT_WIDTH"
            :y2="PLOT_BOTTOM"
            stroke="rgb(100 116 139 / 0.6)"
          />
          <line
            x1="0"
            :y1="PLOT_BOTTOM - (1 / velocityMax) * (PLOT_BOTTOM - PLOT_TOP)"
            :x2="PLOT_WIDTH"
            :y2="PLOT_BOTTOM - (1 / velocityMax) * (PLOT_BOTTOM - PLOT_TOP)"
            stroke="rgb(148 163 184 / 0.35)"
            stroke-dasharray="4 5"
          />
          <line
            v-for="guide in stepGuides"
            :key="guide.step"
            :x1="guide.x"
            :x2="guide.x"
            :y1="PLOT_TOP"
            :y2="PLOT_BOTTOM"
            :stroke="guide.step === 4 ? 'rgb(251 191 36 / 0.7)' : 'rgb(100 116 139 / 0.26)'"
            :stroke-width="guide.step === 4 ? 2 : 1"
          />
          <path
            :d="leftVelocityPath"
            fill="none"
            stroke="#7dd3fc"
            stroke-width="3"
            stroke-linecap="round"
          />
          <path
            :d="rightVelocityPath"
            fill="none"
            stroke="#fda4af"
            stroke-width="3"
            stroke-linecap="round"
          />
          <text x="8" y="18" fill="rgb(148 163 184)" font-size="12">speed (× circle)</text>
          <text x="8" :y="PLOT_BOTTOM + 25" fill="rgb(148 163 184)" font-size="12">0.00</text>
          <text
            :x="PLOT_WIDTH / 2 - 12"
            :y="PLOT_BOTTOM + 25"
            fill="rgb(148 163 184)"
            font-size="12"
          >
            1.00
          </text>
          <text :x="PLOT_WIDTH - 30" :y="PLOT_BOTTOM + 25" fill="rgb(148 163 184)" font-size="12">
            2.00
          </text>
          <text x="8" y="45" fill="rgb(125 211 252)" font-size="12">pendulum</text>
          <text :x="PLOT_WIDTH / 2 + 8" y="45" fill="rgb(203 213 225)" font-size="12">circle</text>
          <text :x="PLOT_WIDTH / 2 + 8" y="62" fill="rgb(251 191 36)" font-size="12">handoff</text>
        </svg>
      </div>

      <div class="grid gap-3 sm:grid-cols-3">
        <div class="card">
          <p class="text-xs uppercase tracking-[0.16em] text-ui-text-muted">Pendulum bottom</p>
          <p class="viz-stat-value text-sky-200">{{ joinSpeed.toFixed(2) }}×</p>
          <p class="text-xs text-ui-text-muted">incoming speed at t = 1</p>
        </div>
        <div class="card">
          <p class="text-xs uppercase tracking-[0.16em] text-ui-text-muted">Circle baseline</p>
          <p class="viz-stat-value text-slate-100">{{ circleSpeed.toFixed(2) }}×</p>
          <p class="text-xs text-ui-text-muted">outgoing speed after handoff</p>
        </div>
        <div class="card">
          <p class="text-xs uppercase tracking-[0.16em] text-ui-text-muted">Raw ratio</p>
          <p class="viz-stat-value text-amber-200">{{ speedRatio.toFixed(2) }}×</p>
          <p class="text-xs text-ui-text-muted">bottom speed ÷ circle speed</p>
        </div>
      </div>
    </section>

    <section class="grid gap-3" aria-labelledby="rastaxel-steps-title">
      <div>
        <h3 id="rastaxel-steps-title" class="text-base font-semibold text-slate-100">
          Quarter-step readout
        </h3>
        <p class="text-xs text-slate-500">
          Boundary positions and speeds for the selected right-track offset.
        </p>
      </div>
      <div class="table-responsive">
        <table class="table table-sm">
          <thead>
            <tr>
              <th scope="col">Step</th>
              <th scope="col">Time</th>
              <th scope="col">Left position</th>
              <th scope="col">Left speed</th>
              <th scope="col">Right position</th>
              <th scope="col">Right speed</th>
              <th scope="col">Phase</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in stepRows" :key="row.step">
              <th scope="row" class="font-mono">{{ row.step }}</th>
              <td class="font-mono">{{ row.time.toFixed(2) }}</td>
              <td>{{ row.leftPosition }}</td>
              <td class="font-mono">{{ row.left.speedInExtensions.toFixed(2) }}×</td>
              <td>{{ row.rightPosition }}</td>
              <td class="font-mono">{{ row.right.speedInExtensions.toFixed(2) }}×</td>
              <td class="text-muted">
                {{ segmentLabel(row.left.segment) }} / {{ segmentLabel(row.right.segment) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>
