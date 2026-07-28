<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import GravityCanvas from "./GravityCanvas.vue";
import GravityComparisonPlot from "./GravityComparisonPlot.vue";
import GravityPhaseScanPlot from "./GravityPhaseScanPlot.vue";
import MathEquation from "./MathEquation.vue";
import { analyzeFirstLoop, type LoopDiagnostics } from "./physics/diagnostics";
import {
  createCircularHandPath,
  createConstantSpeedEllipseController,
  createEllipseHandPath,
  createLineHandPath,
  createPhaseLockedEllipseController,
  type LineHandPathAxis
} from "./physics/handPaths";
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
type HandPathShape = "circle" | "ellipse" | "line";
type HandControlMode = "open-loop" | "phase-locked" | "constant-speed" | "reference";
const pathShape = ref<HandPathShape>("ellipse");
const handControlMode = ref<HandControlMode>("phase-locked");
const handAmplitudeX = ref(0.08);
const handAmplitudeY = ref(0.05);
const lineAxis = ref<LineHandPathAxis>("horizontal");
const handRate = ref(2.2);
const handPhaseDeg = ref(0);
const handDirection = ref<1 | -1>(1);
const phaseLockOffsetDeg = ref(0);
const phaseLockGain = ref(1.5);
const phaseLockMaxCorrection = ref(1);
const targetAngularSpeed = ref(2);
const constantSpeedGain = ref(0.2);
const constantSpeedIntegralGain = ref(0.02);
const constantSpeedRateLimit = ref(0.5);
const constantSpeedMaxPhaseAcceleration = ref(2);
// A single loop is useful for geometry, but phase lock needs several loops to
// reveal drift, convergence, and eventual loss of tension. Keep a long default
// trace so the plots show that behaviour without requiring manual setup.
const duration = ref(32);
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

function createConfiguredHandPath(phaseDeg: number) {
  const phase = phaseDeg * Math.PI / 180;
  const angularVelocity = handAngularVelocity.value;
  const amplitudeX = handAmplitudeX.value * tetherLength.value;
  const amplitudeY = handAmplitudeY.value * tetherLength.value;
  if (pathShape.value === "line") {
    return createLineHandPath({
      amplitude: handAmplitudeX.value * tetherLength.value,
      angularVelocity,
      phase,
      axis: lineAxis.value
    });
  }
  if (pathShape.value === "circle") {
    return createCircularHandPath({
      amplitude: amplitudeX,
      angularVelocity,
      phase
    });
  }
  return createEllipseHandPath({
    radiusX: amplitudeX,
    radiusY: amplitudeY,
    angularVelocity,
    phase
  });
}

const handPath = computed(() => createConfiguredHandPath(handPhaseDeg.value));
const phaseLockedController = computed(() => createPhaseLockedEllipseController({
  radiusX: handAmplitudeX.value * tetherLength.value,
  radiusY: handAmplitudeY.value * tetherLength.value,
  baseAngularVelocity: handAngularVelocity.value,
  initialPhase: handPhaseDeg.value * Math.PI / 180,
  phaseOffset: phaseLockOffsetDeg.value * Math.PI / 180,
  phaseGain: phaseLockGain.value * Math.sqrt(gravity.value / tetherLength.value),
  maxRateCorrection: phaseLockMaxCorrection.value * Math.sqrt(gravity.value / tetherLength.value),
  maxRateAcceleration: 8 * gravity.value / tetherLength.value
}));
const constantSpeedController = computed(() => createConstantSpeedEllipseController({
  radiusX: handAmplitudeX.value * tetherLength.value,
  radiusY: handAmplitudeY.value * tetherLength.value,
  gravity: gravity.value,
  tetherLength: tetherLength.value,
  targetAngularVelocity: targetAngularSpeed.value * Math.sqrt(gravity.value / tetherLength.value),
  baseAngularVelocity: targetAngularSpeed.value * Math.sqrt(gravity.value / tetherLength.value),
  initialPhase: handPhaseDeg.value * Math.PI / 180,
  speedGain: constantSpeedGain.value * Math.sqrt(gravity.value / tetherLength.value),
  integralGain: constantSpeedIntegralGain.value * gravity.value / tetherLength.value,
  integralLimit: 2,
  maxRateCorrection: constantSpeedRateLimit.value * Math.sqrt(gravity.value / tetherLength.value),
  maxPhaseAcceleration: constantSpeedMaxPhaseAcceleration.value * gravity.value / tetherLength.value
}));
const baseConfig = computed<IdealTetherConfig>(() => ({
  ...defaults,
  gravity: gravity.value,
  length: tetherLength.value,
  duration: duration.value,
  initialAngularVelocity: initialAngularVelocity.value
}));
const constantSpeedReferenceConfig = computed<IdealTetherConfig>(() => ({
  ...baseConfig.value,
  initialAngularVelocity: targetAngularSpeed.value * Math.sqrt(gravity.value / tetherLength.value),
  driveTorque: (_time, theta) =>
    defaults.mass * tetherLength.value * gravity.value * Math.sin(theta)
}));
const fixedResult = computed<SimulationResult>(() => simulateIdealTether(baseConfig.value));
const movingResult = computed<SimulationResult>(() => {
  if (handControlMode.value === "reference") {
    return simulateIdealTether(constantSpeedReferenceConfig.value);
  }
  return simulateIdealTether({
    ...baseConfig.value,
    ...(handControlMode.value === "phase-locked"
      ? { handController: phaseLockedController.value }
      : handControlMode.value === "constant-speed"
        ? { handController: constantSpeedController.value }
        : { handPath: handPath.value })
  });
});
const fixedTrace = computed<IdealTetherTrace | null>(() => fixedResult.value.ok ? fixedResult.value.trace : null);
const movingTrace = computed<IdealTetherTrace | null>(() => movingResult.value.ok ? movingResult.value.trace : null);
const fixedSamples = computed(() => fixedTrace.value?.samples ?? []);
const movingSamples = computed(() => movingTrace.value?.samples ?? []);
const fixedSample = computed(() => fixedTrace.value ? interpolateSample(fixedTrace.value.samples, currentTime.value) : null);
const movingSample = computed(() => movingTrace.value ? interpolateSample(movingTrace.value.samples, currentTime.value) : null);
const fixedLoop = computed<LoopDiagnostics | null>(() => fixedTrace.value ? analyzeFirstLoop(fixedTrace.value) : null);
const movingLoop = computed<LoopDiagnostics | null>(() => movingTrace.value ? analyzeFirstLoop(movingTrace.value) : null);
const phaseScan = computed(() => Array.from({ length: 25 }, (_, index) => {
  const phaseDeg = index * 15;
  const result = simulateIdealTether({
    ...baseConfig.value,
    handPath: createConfiguredHandPath(phaseDeg)
  });
  if (!result.ok) return { phaseDeg, speedRipple: null, minimumTension: null };
  const loop = analyzeFirstLoop(result.trace);
  return {
    phaseDeg,
    speedRipple: loop.complete ? loop.speedRipple : null,
    minimumTension: loop.complete ? loop.minimumTension : null
  };
}));
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

watch([
  launchEnergy,
  gravity,
  tetherLength,
  pathShape,
  handControlMode,
  handAmplitudeX,
  handAmplitudeY,
  lineAxis,
  handRate,
  handPhaseDeg,
  handDirection,
  phaseLockOffsetDeg,
  phaseLockGain,
  phaseLockMaxCorrection,
  targetAngularSpeed,
  constantSpeedGain,
  constantSpeedIntegralGain,
  constantSpeedRateLimit,
  constantSpeedMaxPhaseAcceleration,
  duration
], resetPlayback);

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
        <h2 class="text-2xl font-semibold text-slate-100">Can a small hand path flatten the speed curve?</h2>
        <p class="font-mono text-xs text-slate-400">fixed hand versus moving pivot</p>
      </div>
      <p class="max-w-4xl text-sm leading-6 text-slate-400">
        The left trace lets gravity do everything. The right trace gives the hand a small ellipse.
        In phase-locked mode the ellipse keeps a continuous phase state and gently changes its
        rate to follow the poi, so we can separate phase drift from the underlying gravity motion.
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
          <p class="font-mono text-sm text-slate-300">
            {{ handControlMode === "phase-locked"
              ? "continuous PLL-style phase correction"
              : handControlMode === "constant-speed"
                ? "gravity feed-forward + bounded PI speed correction"
                : handControlMode === "reference"
                  ? "ideal angular drive cancels gravity"
                : "prescribed moving pivot" }}
          </p>
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
          <legend class="text-sm font-semibold text-slate-100">Hand path</legend>
          <label class="grid gap-1 text-sm text-slate-300">
            <span class="flex justify-between gap-3"><span>Shape</span><strong>{{ pathShape }}</strong></span>
            <select v-model="pathShape" :disabled="handControlMode !== 'open-loop'" class="rounded-md border border-ui-border-strong bg-ui-input px-3 py-2 text-ui-text disabled:cursor-not-allowed disabled:opacity-60">
              <option value="ellipse">ellipse</option>
              <option value="circle">circle</option>
              <option value="line">line</option>
            </select>
          </label>
          <label class="grid gap-1 text-sm text-slate-300">
            <span class="flex justify-between gap-3"><span>Control</span><strong>{{ handControlMode }}</strong></span>
            <select v-model="handControlMode" class="rounded-md border border-ui-border-strong bg-ui-input px-3 py-2 text-ui-text">
              <option value="phase-locked">phase-locked ellipse</option>
              <option value="constant-speed">constant angular speed</option>
              <option value="reference">ideal constant-speed reference</option>
              <option value="open-loop">open-loop path</option>
            </select>
          </label>
          <label class="grid gap-1 text-sm text-slate-300">
            <span class="flex justify-between gap-3"><span>{{ pathShape === "line" ? "Amplitude / L" : "Horizontal radius / L" }}</span><strong>{{ handAmplitudeX.toFixed(2) }}</strong></span>
            <input v-model.number="handAmplitudeX" type="range" min="0" max="0.3" step="0.005" class="accent-emerald-400" />
          </label>
          <label v-if="pathShape === 'ellipse'" class="grid gap-1 text-sm text-slate-300">
            <span class="flex justify-between gap-3"><span>Vertical radius / L</span><strong>{{ handAmplitudeY.toFixed(2) }}</strong></span>
            <input v-model.number="handAmplitudeY" type="range" min="0" max="0.3" step="0.005" class="accent-emerald-400" />
          </label>
          <label v-if="pathShape === 'line'" class="grid gap-1 text-sm text-slate-300">
            <span class="flex justify-between gap-3"><span>Line axis</span><strong>{{ lineAxis }}</strong></span>
            <select v-model="lineAxis" class="rounded-md border border-ui-border-strong bg-ui-input px-3 py-2 text-ui-text">
              <option value="horizontal">horizontal</option>
              <option value="vertical">vertical</option>
            </select>
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
          <template v-if="handControlMode === 'phase-locked'">
            <label class="grid gap-1 text-sm text-slate-300">
              <span class="flex justify-between gap-3"><span>Desired phase offset</span><strong>{{ phaseLockOffsetDeg.toFixed(0) }}°</strong></span>
              <input v-model.number="phaseLockOffsetDeg" type="range" min="-180" max="180" step="1" class="accent-violet-400" />
            </label>
            <label class="grid gap-1 text-sm text-slate-300">
              <span class="flex justify-between gap-3"><span>Phase gain / √(g/L)</span><strong>{{ phaseLockGain.toFixed(2) }}</strong></span>
              <input v-model.number="phaseLockGain" type="range" min="0" max="5" step="0.05" class="accent-violet-400" />
            </label>
            <label class="grid gap-1 text-sm text-slate-300">
              <span class="flex justify-between gap-3"><span>Rate correction limit / √(g/L)</span><strong>{{ phaseLockMaxCorrection.toFixed(2) }}</strong></span>
              <input v-model.number="phaseLockMaxCorrection" type="range" min="0" max="3" step="0.05" class="accent-violet-400" />
            </label>
          </template>
          <template v-if="handControlMode === 'constant-speed'">
            <label class="grid gap-1 text-sm text-slate-300">
              <span class="flex justify-between gap-3"><span>Target relative speed / √(g/L)</span><strong>{{ targetAngularSpeed.toFixed(2) }}</strong></span>
              <input v-model.number="targetAngularSpeed" type="range" min="0.5" max="3.5" step="0.01" class="accent-violet-400" />
            </label>
            <label class="grid gap-1 text-sm text-slate-300">
              <span class="flex justify-between gap-3"><span>Speed gain / √(g/L)</span><strong>{{ constantSpeedGain.toFixed(2) }}</strong></span>
              <input v-model.number="constantSpeedGain" type="range" min="0" max="5" step="0.05" class="accent-violet-400" />
            </label>
            <label class="grid gap-1 text-sm text-slate-300">
              <span class="flex justify-between gap-3"><span>Integral gain / (g/L)</span><strong>{{ constantSpeedIntegralGain.toFixed(2) }}</strong></span>
              <input v-model.number="constantSpeedIntegralGain" type="range" min="0" max="2" step="0.05" class="accent-violet-400" />
            </label>
            <label class="grid gap-1 text-sm text-slate-300">
              <span class="flex justify-between gap-3"><span>Carrier rate limit / √(g/L)</span><strong>{{ constantSpeedRateLimit.toFixed(2) }}</strong></span>
              <input v-model.number="constantSpeedRateLimit" type="range" min="0" max="2" step="0.05" class="accent-violet-400" />
            </label>
            <label class="grid gap-1 text-sm text-slate-300">
              <span class="flex justify-between gap-3"><span>Phase acceleration limit / (g/L)</span><strong>{{ constantSpeedMaxPhaseAcceleration.toFixed(2) }}</strong></span>
              <input v-model.number="constantSpeedMaxPhaseAcceleration" type="range" min="0" max="12" step="0.1" class="accent-violet-400" />
            </label>
            <p class="text-xs leading-5 text-slate-500">Gravity compensation is fed forward. If the ellipse saturates, the target speed may be unreachable with the selected hand path.</p>
          </template>
          <p v-if="handControlMode === 'reference'" class="text-xs leading-5 text-slate-500">This is the ideal target: an explicit angular drive cancels gravity exactly. It is a reference for judging what the physical ellipse can approach.</p>
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
        <GravityComparisonPlot :fixed-samples="fixedSamples" :moving-samples="movingSamples" :current-time="currentTime" :markers="movingLoop?.markers ?? []" value="normalizedWorldSpeed" title="World speed / √gL" :min="0" />
        <GravityComparisonPlot :fixed-samples="fixedSamples" :moving-samples="movingSamples" :current-time="currentTime" :markers="movingLoop?.markers ?? []" value="normalizedRelativeSpeed" :title="handControlMode === 'constant-speed' || handControlMode === 'reference' ? `Relative speed / √gL · target ${targetAngularSpeed.toFixed(2)}` : 'Hand-relative poi speed / √gL'" :target="handControlMode === 'constant-speed' || handControlMode === 'reference' ? targetAngularSpeed : undefined" :min="0" />
        <GravityComparisonPlot :fixed-samples="fixedSamples" :moving-samples="movingSamples" :current-time="currentTime" :markers="movingLoop?.markers ?? []" value="normalizedTension" title="Tension / mg" />
        <GravityComparisonPlot :fixed-samples="fixedSamples" :moving-samples="movingSamples" :current-time="currentTime" value="normalizedHandPower" title="Hand power / (mgL√(g/L))" :min="-1" :max="1" />
        <GravityComparisonPlot :fixed-samples="fixedSamples" :moving-samples="movingSamples" :current-time="currentTime" value="normalizedRadialHandVelocity" title="Radial hand velocity / √gL" :min="-0.5" :max="0.5" />
        <GravityComparisonPlot :fixed-samples="fixedSamples" :moving-samples="movingSamples" :current-time="currentTime" :markers="movingLoop?.markers ?? []" value="normalizedEnergy" title="Mechanical energy / mgL" />
      </div>

      <GravityPhaseScanPlot :points="phaseScan" :selected-phase="handPhaseDeg" />

      <div class="grid gap-3 md:grid-cols-2">
        <div class="grid gap-2 rounded-lg border border-ui-border-subtle bg-slate-950/60 p-4 text-sm">
          <p class="font-semibold text-slate-100">Fixed hand</p>
          <p class="text-slate-400">{{ fixedTrace.metrics.classification }} · first-loop minimum tension {{ format(fixedLoop?.minimumTension ?? fixedTrace.metrics.minimumTension) }}</p>
          <p v-if="fixedLoop?.complete" class="text-slate-400">First loop {{ format(fixedLoop.duration) }} units · ripple {{ format(fixedLoop.speedRipple * 100, 1) }}%</p>
          <p class="text-slate-400">Energy residual {{ format(fixedLoop?.energyBalanceResidual ?? fixedTrace.metrics.energyBalanceResidual, 4) }}</p>
        </div>
        <div class="grid gap-2 rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-4 text-sm">
          <p class="font-semibold text-emerald-100">
            {{ handControlMode === "phase-locked"
              ? "Phase-locked ellipse"
              : handControlMode === "constant-speed"
                ? "Constant-speed ellipse"
                : handControlMode === "reference"
                  ? "Ideal constant-speed reference"
                : "Moving hand" }}
          </p>
          <p class="text-slate-300">{{ movingTrace.metrics.classification }} · first-loop minimum tension {{ format(movingLoop?.minimumTension ?? movingTrace.metrics.minimumTension) }}</p>
          <p v-if="movingLoop?.complete" class="text-slate-300">First loop {{ format(movingLoop.duration) }} units · ripple {{ format(movingLoop.speedRipple * 100, 1) }}%</p>
          <p class="text-slate-300">Hand work +{{ format(movingLoop?.positiveHandWork ?? movingTrace.metrics.positiveHandWork, 3) }} / {{ format(movingLoop?.negativeHandWork ?? movingTrace.metrics.negativeHandWork, 3) }}</p>
          <p class="text-slate-300">Energy residual {{ format(movingLoop?.energyBalanceResidual ?? movingTrace.metrics.energyBalanceResidual, 4) }}</p>
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
          The open-loop path does not sense the poi or optimize for constant speed. Even a small
          pivot ellipse performs positive work during some phases and negative work during others,
          so hand motion can reshape the gravity-led speed curve without applying a fictional
          tangential motor at the poi.
        </p>
        <p>
          Phase-locked mode is deliberately modest: it is a proportional phase loop, not a speed
          or energy controller. Constant-speed mode adds gravity feed-forward and a bounded PI
          correction around relative angular speed. Neither mode teleports the hand or poi phase;
          slack and catch events remain owned by the unilateral tether model.
        </p>
      </div>
    </template>
  </section>
</template>
