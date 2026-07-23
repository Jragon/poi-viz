<script setup lang="ts">
import { computed, ref } from "vue";

import EmbeddedVisualizer from "@/lab/components/EmbeddedVisualizer.vue";
import {
  buildPendulumLabSequence,
  EXTENDULUM_HEAD_CYCLES_PER_UNIT,
  PENDULUM_PRESETS,
  type PendulumPresetId
} from "./pendulumPresets";

const amplitudeDeg = ref(90);
const cyclesPerUnit = ref(0.5);
const swingPhaseDeg = ref(0);
const pairOffsetDeg = ref(0);
const presetId = ref<PendulumPresetId>("ordinary");

const activePreset = computed(() => {
  const preset = PENDULUM_PRESETS.find((candidate) => candidate.id === presetId.value);
  if (!preset) throw new Error(`Unknown pendulum preset: ${presetId.value}`);
  return preset;
});

const sequence = computed(() =>
  buildPendulumLabSequence({
    presetId: presetId.value,
    amplitudeRad: (amplitudeDeg.value * Math.PI) / 180,
    cyclesPerUnit: cyclesPerUnit.value,
    swingPhaseRad: (swingPhaseDeg.value * Math.PI) / 180,
    pairOffsetRad: (pairOffsetDeg.value * Math.PI) / 180
  })
);

const frequencySummary = computed(() => {
  const beatDuration = 1 / (cyclesPerUnit.value * 2);
  return `${cyclesPerUnit.value.toFixed(2)} cycles/unit · ${beatDuration.toFixed(2)} units apex-to-apex`;
});

function selectPreset(nextPresetId: PendulumPresetId) {
  const preset = PENDULUM_PRESETS.find((candidate) => candidate.id === nextPresetId);
  if (!preset) return;

  presetId.value = nextPresetId;
  pairOffsetDeg.value = Math.round((preset.defaultPairOffsetRad * 180) / Math.PI);
}
</script>

<template>
  <section aria-labelledby="uses-heading" class="grid gap-4">
    <div class="grid gap-3">
      <div class="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p class="text-xs uppercase tracking-[0.18em] text-ui-text-muted">Driver uses</p>
          <h2 id="uses-heading" class="mt-1 text-lg font-semibold text-slate-100">
            Choose a composition
          </h2>
        </div>
        <p class="text-xs text-slate-400">{{ PENDULUM_PRESETS.length }} experimental presets</p>
      </div>

      <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <button
          v-for="preset in PENDULUM_PRESETS"
          :key="preset.id"
          type="button"
          class="grid min-h-24 gap-1 rounded-lg border p-3 text-left transition"
          :class="
            preset.id === presetId
              ? 'border-sky-400 bg-sky-950/55 text-sky-50'
              : 'border-ui-border-subtle bg-ui-surface text-slate-300 hover:border-ui-border-strong hover:bg-ui-surface-raised'
          "
          :aria-pressed="preset.id === presetId"
          @click="selectPreset(preset.id)"
        >
          <span class="font-medium">{{ preset.label }}</span>
          <span class="text-xs leading-5 text-slate-400">{{ preset.summary }}</span>
        </button>
      </div>
    </div>

    <section class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <EmbeddedVisualizer
        :sequence="sequence"
        :title="activePreset.label"
        :summary="activePreset.summary"
        projection-mode="orthographic"
        :projection-drag-enabled="false"
      />

      <aside
        class="grid content-start gap-5 rounded-lg border border-ui-border-subtle bg-ui-surface p-4"
      >
        <div class="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p class="uppercase tracking-[0.16em] text-ui-text-muted">Hand</p>
            <p class="mt-1 text-slate-200">{{ activePreset.handUse }}</p>
          </div>
          <div>
            <p class="uppercase tracking-[0.16em] text-ui-text-muted">Poi head</p>
            <p class="mt-1 text-slate-200">{{ activePreset.headUse }}</p>
          </div>
        </div>

        <label class="grid gap-2 text-sm text-slate-300">
          <span class="flex justify-between gap-3">
            <span>Amplitude</span>
            <output class="font-mono text-sky-200">{{ amplitudeDeg }}°</output>
          </span>
          <input v-model.number="amplitudeDeg" type="range" min="10" max="90" step="1" />
        </label>

        <div v-if="presetId === 'extendulum'" class="grid gap-1 text-sm text-slate-300">
          <span class="flex justify-between gap-3">
            <span>Locked ratio</span>
            <output class="font-mono text-sky-200">1 : 2</output>
          </span>
          <span class="text-xs text-ui-text-muted">
            {{ EXTENDULUM_HEAD_CYCLES_PER_UNIT.toFixed(2) }} cycles/unit · one hand circle · two
            downswings
          </span>
        </div>

        <label v-else class="grid gap-2 text-sm text-slate-300">
          <span class="flex justify-between gap-3">
            <span>Frequency</span>
            <output class="font-mono text-sky-200">{{ cyclesPerUnit.toFixed(2) }}</output>
          </span>
          <input v-model.number="cyclesPerUnit" type="range" min="0.125" max="1" step="0.125" />
          <span class="text-xs text-ui-text-muted">{{ frequencySummary }}</span>
        </label>

        <label class="grid gap-2 text-sm text-slate-300">
          <span class="flex justify-between gap-3">
            <span>Start phase</span>
            <output class="font-mono text-sky-200">{{ swingPhaseDeg }}°</output>
          </span>
          <input v-model.number="swingPhaseDeg" type="range" min="0" max="359" step="1" />
        </label>

        <label
          v-if="['same-time', 'quarter-time', 'mirrored'].includes(presetId)"
          class="grid gap-2 text-sm text-slate-300"
        >
          <span class="flex justify-between gap-3">
            <span>Second poi offset</span>
            <output class="font-mono text-sky-200">{{ pairOffsetDeg }}°</output>
          </span>
          <input v-model.number="pairOffsetDeg" type="range" min="0" max="270" step="90" />
        </label>
      </aside>
    </section>

    <section
      class="grid gap-2 border-t border-ui-border-subtle pt-5 text-sm leading-6 text-slate-400"
    >
      <h2 class="font-semibold text-slate-100">Current boundary</h2>
      <p>
        This driver explorer composes independent node drivers. It does not model stalls, dead-point
        plane changes, gravity, forcing impulses, or point isolations. The isolated preset is the
        simple fixed-midpoint construction only.
      </p>
    </section>
  </section>
</template>
