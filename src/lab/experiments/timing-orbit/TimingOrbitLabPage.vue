<script setup lang="ts">
import { computed, ref, watch } from "vue";

import { compileAuthoredDocument } from "@/authoring/compile";
import type { MultiRigSequence } from "@/engine/types";
import { usePatternRegistry } from "@/patterns/usePatternRegistry";
import { demoSequence } from "@/visualizer/demoSequence";
import PoiCanvasViewport from "@/visualizer/PoiCanvasViewport.vue";
import {
  createVisualizerWorkspace,
  provideVisualizerWorkspace
} from "@/visualizer/visualizerWorkspace";

import TimingOrbitTimeline from "./TimingOrbitTimeline.vue";
import {
  TIMING_ORBIT_DEFAULT_LEFT_QUANTIZATION,
  TIMING_ORBIT_DEFAULT_RIGHT_QUANTIZATION,
  TIMING_ORBIT_MAX_AUTO_HORIZON,
  TIMING_ORBIT_MAX_QUANTIZATION,
  TIMING_ORBIT_MIN_QUANTIZATION,
  buildTimingOrbitEvents,
  buildTimingOrbitSequence,
  findTimingOrbitCoincidences,
  getTimingOrbitPeriods,
  normalizeTimingOrbitOffset,
  resolveTimingOrbitHorizon,
  resolveTimingOrbitSharedStep,
  snapTimingOrbitOffset,
  timingOrbitPositionAt,
  type TimingOrbitHorizon
} from "./timingOrbitModel";

type HorizonMode = "auto" | "custom";
type OffsetSnapMode = "free" | "shared" | "left" | "right";

const registry = usePatternRegistry();
const leftQuantization = ref(TIMING_ORBIT_DEFAULT_LEFT_QUANTIZATION);
const rightQuantization = ref(TIMING_ORBIT_DEFAULT_RIGHT_QUANTIZATION);
const rightOffset = ref(0);
const horizonMode = ref<HorizonMode>("auto");
const customHorizon = ref(1);
const offsetSnapMode = ref<OffsetSnapMode>("shared");

const authoredEntries = computed(() =>
  registry.entries.value
    .filter((entry) => entry.source.kind === "authoring")
    .sort((left, right) => left.name.localeCompare(right.name))
);

const activeEntry = computed(() => {
  const selected = registry.selectedPattern.value;
  if (selected?.source.kind === "authoring") return selected;
  return registry.entries.value.find((entry) => entry.source.kind === "authoring") ?? null;
});

const compiled = computed(() => {
  const entry = activeEntry.value;
  if (!entry || entry.source.kind !== "authoring") {
    return { sequence: null, errorMessage: "No authored pattern is available." };
  }

  const result = compileAuthoredDocument(entry.source.document);
  return result.ok
    ? { sequence: result.sequence, errorMessage: null }
    : {
        sequence: null,
        errorMessage: `Authoring compile failed: ${result.errors.map((error) => error.code).join(", ")}`
      };
});

const periodResult = computed(() =>
  compiled.value.sequence ? getTimingOrbitPeriods(compiled.value.sequence) : null
);
const periods = computed(() =>
  periodResult.value?.ok === true ? periodResult.value.periods : null
);
const automaticHorizon = computed<TimingOrbitHorizon | null>(() =>
  periods.value ? resolveTimingOrbitHorizon(periods.value) : null
);
const analysisHorizon = computed(() =>
  horizonMode.value === "auto"
    ? (automaticHorizon.value?.duration ?? 0)
    : Number.isFinite(customHorizon.value) &&
        customHorizon.value > 0 &&
        customHorizon.value <= TIMING_ORBIT_MAX_AUTO_HORIZON
      ? customHorizon.value
      : 0
);

const orbitSequenceResult = computed(() => {
  if (!compiled.value.sequence || analysisHorizon.value <= 0) return null;
  return buildTimingOrbitSequence(
    compiled.value.sequence,
    analysisHorizon.value,
    rightOffset.value
  );
});
const orbitSequence = computed<MultiRigSequence>(() =>
  orbitSequenceResult.value?.ok ? orbitSequenceResult.value.sequence : demoSequence
);

const workspace = provideVisualizerWorkspace(
  createVisualizerWorkspace(orbitSequence, {
    autoplay: true,
    resumeOnSequenceChange: true
  })
);
const { transport, display, core } = workspace;
display.setOverlayVisibility("showHandTrails", false);
display.setOverlayVisibility("showHeadTrails", true);

const leftEvents = computed(() =>
  periods.value
    ? buildTimingOrbitEvents(
        periods.value.left,
        leftQuantization.value,
        analysisHorizon.value
      )
    : []
);
const rightEvents = computed(() =>
  periods.value
    ? buildTimingOrbitEvents(
        periods.value.right,
        rightQuantization.value,
        analysisHorizon.value,
        rightOffset.value
      )
    : []
);
const coincidences = computed(() =>
  findTimingOrbitCoincidences(leftEvents.value, rightEvents.value)
);

const sharedSnapStep = computed(() =>
  automaticHorizon.value
    ? resolveTimingOrbitSharedStep(
        automaticHorizon.value,
        leftQuantization.value,
        rightQuantization.value
      )
    : null
);
const activeSnapStep = computed(() => {
  if (!periods.value) return null;
  switch (offsetSnapMode.value) {
    case "free":
      return null;
    case "shared":
      return sharedSnapStep.value;
    case "left":
      return periods.value.left / leftQuantization.value;
    case "right":
      return periods.value.right / rightQuantization.value;
  }
});
const offsetPresets = computed(() => {
  const rightPeriod = periods.value?.right;
  const step = activeSnapStep.value;
  if (!rightPeriod || !step) return [];
  const count = Math.round(rightPeriod / step);
  if (count < 1 || count > 16 || Math.abs(count * step - rightPeriod) > 1e-7) return [];
  return Array.from({ length: count }, (_, index) => ({
    index,
    value: index * step
  }));
});

const leftPosition = computed(() =>
  periods.value
    ? timingOrbitPositionAt(
        transport.currentTime.value,
        periods.value.left,
        leftQuantization.value
      )
    : null
);
const rightPosition = computed(() =>
  periods.value
    ? timingOrbitPositionAt(
        transport.currentTime.value,
        periods.value.right,
        rightQuantization.value,
        rightOffset.value
      )
    : null
);

const pageError = computed(() => {
  if (compiled.value.errorMessage) return compiled.value.errorMessage;
  if (periodResult.value && !periodResult.value.ok) {
    switch (periodResult.value.reason) {
      case "MISSING_LEFT_TRACK":
        return "Timing Orbit requires an authored left track.";
      case "MISSING_RIGHT_TRACK":
        return "Timing Orbit requires an authored right track.";
      case "INVALID_TRACK":
        return "Both authored tracks must have a positive finite duration.";
    }
  }
  if (horizonMode.value === "custom" && analysisHorizon.value <= 0) {
    return `Observation horizon must be greater than 0 and no more than ${TIMING_ORBIT_MAX_AUTO_HORIZON}.`;
  }
  if (orbitSequenceResult.value && !orbitSequenceResult.value.ok) {
    return `Timing orbit preparation failed: ${orbitSequenceResult.value.reason}.`;
  }
  return core.errorMessage.value;
});

const horizonSummary = computed(() => {
  const horizon = automaticHorizon.value;
  if (!horizon) return "Unavailable";
  if (horizon.kind === "joint-period") {
    return `${formatUnits(horizon.duration)} · left ×${horizon.leftRepeats} · right ×${horizon.rightRepeats}`;
  }
  return `${formatUnits(horizon.duration)} bounded window`;
});

watch(
  () => activeEntry.value?.id,
  () => {
    rightOffset.value = 0;
  }
);

watch(
  automaticHorizon,
  (next) => {
    if (next && horizonMode.value === "auto") customHorizon.value = next.duration;
  },
  { immediate: true }
);

watch(
  () => periods.value?.right,
  (rightPeriod) => {
    if (rightPeriod) {
      rightOffset.value = normalizeTimingOrbitOffset(rightOffset.value, rightPeriod);
    }
  }
);

watch([offsetSnapMode, activeSnapStep], () => {
  const rightPeriod = periods.value?.right;
  const step = activeSnapStep.value;
  if (rightPeriod && step) {
    rightOffset.value = snapTimingOrbitOffset(rightOffset.value, step, rightPeriod);
  }
});

watch(
  sharedSnapStep,
  (step) => {
    if (step === null && offsetSnapMode.value === "shared") {
      offsetSnapMode.value = "right";
    }
  },
  { immediate: true }
);

function selectPattern(event: Event) {
  registry.select((event.target as HTMLSelectElement).value);
}

function setQuantization(side: "left" | "right", event: Event) {
  const raw = Number((event.target as HTMLInputElement).value);
  if (!Number.isFinite(raw)) return;
  const value = Math.min(
    Math.max(Math.round(raw), TIMING_ORBIT_MIN_QUANTIZATION),
    TIMING_ORBIT_MAX_QUANTIZATION
  );
  if (side === "left") leftQuantization.value = value;
  else rightQuantization.value = value;
}

function setHorizonMode(event: Event) {
  const mode = (event.target as HTMLSelectElement).value as HorizonMode;
  horizonMode.value = mode === "custom" ? "custom" : "auto";
  if (horizonMode.value === "custom" && automaticHorizon.value) {
    customHorizon.value = automaticHorizon.value.duration;
  }
}

function setOffsetSnapMode(event: Event) {
  offsetSnapMode.value = (event.target as HTMLSelectElement).value as OffsetSnapMode;
}

function applyOffset(value: number) {
  const rightPeriod = periods.value?.right;
  if (!rightPeriod) return;
  const step = activeSnapStep.value;
  rightOffset.value = step
    ? snapTimingOrbitOffset(value, step, rightPeriod)
    : normalizeTimingOrbitOffset(value, rightPeriod);
}

function onOffsetInput(event: Event) {
  applyOffset(Number((event.target as HTMLInputElement).value));
}

function stepOffset(direction: -1 | 1) {
  const rightPeriod = periods.value?.right;
  if (!rightPeriod) return;
  const step = activeSnapStep.value ?? rightPeriod / 100;
  applyOffset(rightOffset.value + direction * step);
}

function onTimelineInput(event: Event) {
  transport.setCurrentTime(Number((event.target as HTMLInputElement).value));
}

function formatNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "--";
  const rounded = Math.round(value * 10 ** digits) / 10 ** digits;
  return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(digits);
}

function formatUnits(value: number): string {
  return `${formatNumber(value)} ${Math.abs(value - 1) <= 1e-9 ? "unit" : "units"}`;
}

function formatPosition(
  position: ReturnType<typeof timingOrbitPositionAt>,
  quantization: number
): string {
  if (!position) return "--";
  if (position.intervalProgress <= 1e-8) {
    return `landmark ${position.previousLandmarkIndex} of ${quantization}`;
  }
  return `${position.previousLandmarkIndex} → ${position.nextLandmarkIndex} · ${Math.round(position.intervalProgress * 100)}%`;
}
</script>

<template>
  <main
    class="mx-auto grid min-h-screen w-full min-w-0 max-w-7xl gap-6 px-5 py-8 md:px-8 md:py-12"
  >
    <header class="grid min-w-0 gap-2">
      <p class="text-xs font-medium uppercase tracking-[0.22em] text-sky-300">
        Relationship lab
      </p>
      <h1 class="text-3xl font-semibold text-slate-100">Timing Orbit</h1>
      <p class="max-w-4xl text-sm leading-6 text-slate-400">
        Overlay independent landmark clocks on two continuous authored tracks. Track motion remains
        unchanged; quantization exposes alignments while the right-track offset moves through the
        relationship.
      </p>
    </header>

    <section
      class="grid min-w-0 gap-4 rounded-lg border border-ui-border-subtle bg-ui-surface p-4"
    >
      <div
        class="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.3fr)_repeat(2,minmax(9rem,0.7fr))]"
      >
        <label class="grid min-w-0 gap-1.5 text-sm text-ui-text-secondary">
          Authored pattern
          <select
            :value="activeEntry?.id ?? ''"
            class="min-h-11 min-w-0 max-w-full rounded-md border border-ui-border-strong bg-ui-input px-3 text-ui-text"
            @change="selectPattern"
          >
            <option v-if="authoredEntries.length === 0" value="">No authored patterns</option>
            <option v-for="entry in authoredEntries" :key="entry.id" :value="entry.id">
              {{ entry.name }}
            </option>
          </select>
        </label>

        <label class="grid min-w-0 gap-1.5 text-sm text-ui-text-secondary">
          Left landmarks
          <input
            :value="leftQuantization"
            type="number"
            :min="TIMING_ORBIT_MIN_QUANTIZATION"
            :max="TIMING_ORBIT_MAX_QUANTIZATION"
            step="1"
            class="min-h-11 rounded-md border border-ui-border-strong bg-ui-input px-3 text-ui-text"
            @change="setQuantization('left', $event)"
          />
        </label>

        <label class="grid min-w-0 gap-1.5 text-sm text-ui-text-secondary">
          Right landmarks
          <input
            :value="rightQuantization"
            type="number"
            :min="TIMING_ORBIT_MIN_QUANTIZATION"
            :max="TIMING_ORBIT_MAX_QUANTIZATION"
            step="1"
            class="min-h-11 rounded-md border border-ui-border-strong bg-ui-input px-3 text-ui-text"
            @change="setQuantization('right', $event)"
          />
        </label>
      </div>

      <div
        v-if="periods"
        class="grid gap-2 border-t border-ui-border-subtle pt-4 text-sm text-ui-text-secondary sm:grid-cols-3"
      >
        <p>
          <span class="text-xs uppercase tracking-[0.14em] text-ui-text-muted">Left cycle</span>
          <span class="mt-1 block font-mono text-sky-200">
            {{ formatUnits(periods.left) }} · Δ
            {{ formatNumber(periods.left / leftQuantization) }}
          </span>
        </p>
        <p>
          <span class="text-xs uppercase tracking-[0.14em] text-ui-text-muted">Right cycle</span>
          <span class="mt-1 block font-mono text-fuchsia-200">
            {{ formatUnits(periods.right) }} · Δ
            {{ formatNumber(periods.right / rightQuantization) }}
          </span>
        </p>
        <p>
          <span class="text-xs uppercase tracking-[0.14em] text-ui-text-muted">
            Auto observation
          </span>
          <span class="mt-1 block font-mono text-slate-300">{{ horizonSummary }}</span>
        </p>
      </div>
    </section>

    <section
      v-if="pageError"
      class="rounded-lg border border-rose-900/70 bg-rose-950/40 p-4 text-sm text-rose-100"
    >
      {{ pageError }}
    </section>

    <template v-else-if="periods">
      <section
        class="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_22rem]"
      >
        <div
          class="min-w-0 overflow-hidden rounded-lg border border-ui-border-subtle bg-ui-stage"
        >
          <div class="border-b border-ui-border-subtle px-4 py-3">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <h2 class="text-lg font-semibold text-slate-100">{{ activeEntry?.name }}</h2>
              <span class="font-mono text-xs text-ui-text-muted">
                {{ formatNumber(transport.currentTime.value) }} /
                {{ formatNumber(analysisHorizon) }}
              </span>
            </div>
          </div>

          <PoiCanvasViewport
            class="!min-h-80 rounded-none border-0 md:!min-h-112"
            :projection-drag-enabled="true"
          />

          <div
            class="grid gap-3 border-t border-ui-border-subtle px-4 py-3 sm:grid-cols-[auto_minmax(10rem,1fr)_auto] sm:items-center"
          >
            <button
              type="button"
              class="rounded-md border border-ui-border-strong bg-ui-surface px-3 py-2 text-sm font-medium text-ui-text transition hover:border-ui-focus hover:bg-ui-surface-raised"
              @click="transport.toggle"
            >
              {{ transport.isPlaying.value ? "Pause" : "Play" }}
            </button>
            <label class="grid gap-1 text-xs uppercase tracking-[0.16em] text-ui-text-muted">
              Observation time
              <input
                type="range"
                min="0"
                :max="analysisHorizon"
                step="any"
                :value="transport.currentTime.value"
                class="w-full accent-emerald-400"
                @input="onTimelineInput"
              />
            </label>
            <div class="flex gap-1">
              <button
                v-for="speed in [0.25, 0.5, 1]"
                :key="speed"
                type="button"
                class="rounded-md border px-2 py-1.5 text-xs transition"
                :class="
                  transport.speed.value === speed
                    ? 'border-emerald-300 bg-emerald-950/60 text-emerald-100'
                    : 'border-ui-border-strong bg-ui-input text-ui-text-secondary hover:bg-ui-surface-raised'
                "
                @click="transport.setSpeed(speed)"
              >
                {{ speed }}×
              </button>
            </div>
          </div>
        </div>

        <aside
          class="grid min-w-0 content-start gap-5 rounded-lg border border-ui-border-subtle bg-ui-surface p-4"
        >
          <fieldset class="grid gap-3">
            <legend class="text-sm font-medium text-slate-200">Right-track offset</legend>
            <div class="flex items-end gap-2">
              <label class="grid min-w-0 flex-1 gap-1.5 text-xs text-ui-text-secondary">
                Snap
                <select
                  :value="offsetSnapMode"
                  class="min-h-10 rounded-md border border-ui-border-strong bg-ui-input px-2 text-sm text-ui-text"
                  @change="setOffsetSnapMode"
                >
                  <option value="free">Free</option>
                  <option value="shared" :disabled="sharedSnapStep === null">Shared grid</option>
                  <option value="left">Left landmarks</option>
                  <option value="right">Right landmarks</option>
                </select>
              </label>
              <output class="pb-2 font-mono text-sm text-fuchsia-200">
                {{ formatNumber(rightOffset, 3) }}
              </output>
            </div>

            <div class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
              <button
                type="button"
                class="rounded border border-ui-border-strong bg-ui-input px-2 py-1 text-ui-text"
                aria-label="Previous offset"
                @click="stepOffset(-1)"
              >
                −
              </button>
              <input
                type="range"
                min="0"
                :max="periods.right"
                step="any"
                :value="rightOffset"
                class="w-full accent-fuchsia-400"
                aria-label="Right-track offset"
                @input="onOffsetInput"
              />
              <button
                type="button"
                class="rounded border border-ui-border-strong bg-ui-input px-2 py-1 text-ui-text"
                aria-label="Next offset"
                @click="stepOffset(1)"
              >
                +
              </button>
            </div>

            <div v-if="offsetPresets.length > 0" class="grid grid-cols-4 gap-1.5">
              <button
                v-for="preset in offsetPresets"
                :key="preset.index"
                type="button"
                class="rounded-md border px-2 py-1.5 font-mono text-xs transition"
                :class="
                  Math.abs(rightOffset - preset.value) <= 1e-7
                    ? 'border-fuchsia-300 bg-fuchsia-950/60 text-fuchsia-100'
                    : 'border-ui-border-strong bg-ui-input text-ui-text-secondary hover:bg-ui-surface-raised'
                "
                :aria-pressed="Math.abs(rightOffset - preset.value) <= 1e-7"
                @click="applyOffset(preset.value)"
              >
                {{ preset.index }}
              </button>
            </div>

            <p class="text-xs leading-5 text-ui-text-muted">
              {{ formatNumber((rightOffset / periods.right) * 100, 1) }}% of the right cycle
              <template v-if="activeSnapStep">
                · step {{ formatNumber(activeSnapStep, 3) }}
              </template>
            </p>
          </fieldset>

          <fieldset class="grid gap-3 border-t border-ui-border-subtle pt-4">
            <legend class="text-sm font-medium text-slate-200">Observation horizon</legend>
            <label class="grid gap-1.5 text-xs text-ui-text-secondary">
              Mode
              <select
                :value="horizonMode"
                class="min-h-10 rounded-md border border-ui-border-strong bg-ui-input px-2 text-sm text-ui-text"
                @change="setHorizonMode"
              >
                <option value="auto">Automatic</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label v-if="horizonMode === 'custom'" class="grid gap-1.5 text-xs text-ui-text-secondary">
              Units
              <input
                v-model.number="customHorizon"
                type="number"
                min="0.01"
                :max="TIMING_ORBIT_MAX_AUTO_HORIZON"
                step="0.01"
                class="min-h-10 rounded-md border border-ui-border-strong bg-ui-input px-2 text-sm text-ui-text"
              />
            </label>
          </fieldset>
        </aside>
      </section>

      <section
        class="grid min-w-0 gap-4 rounded-lg border border-ui-border-subtle bg-ui-surface p-4"
      >
        <header class="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p class="text-xs font-medium uppercase tracking-[0.18em] text-ui-text-muted">
              Shared real-time axis
            </p>
            <h2 class="mt-1 text-lg font-semibold text-slate-100">Landmark trains</h2>
          </div>
          <p class="font-mono text-xs text-ui-text-secondary">
            {{ leftEvents.length }} left · {{ rightEvents.length }} right ·
            {{ coincidences.length }} alignments
          </p>
        </header>

        <TimingOrbitTimeline
          :horizon="analysisHorizon"
          :current-time="transport.currentTime.value"
          :left-events="leftEvents"
          :right-events="rightEvents"
          :coincidences="coincidences"
        />

        <div class="grid gap-2 border-t border-ui-border-subtle pt-3 sm:grid-cols-2">
          <p class="text-sm text-ui-text-secondary">
            <span class="font-medium text-sky-200">Left</span>
            <span class="ml-2 font-mono">
              {{ formatPosition(leftPosition, leftQuantization) }}
            </span>
          </p>
          <p class="text-sm text-ui-text-secondary">
            <span class="font-medium text-fuchsia-200">Right</span>
            <span class="ml-2 font-mono">
              {{ formatPosition(rightPosition, rightQuantization) }}
            </span>
          </p>
        </div>
      </section>
    </template>
  </main>
</template>
