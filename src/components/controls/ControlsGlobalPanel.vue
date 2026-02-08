<script setup lang="ts">
import { useNumericDrafts } from "@/composables/useNumericDrafts";
import type { AngleUnit } from "@/state/angleUnits";
import type { GlobalBooleanKey, GlobalNumberKey } from "@/state/actions";
import { PHASE_REFERENCE_OPTIONS } from "@/state/phaseReference";
import type { SpeedUnit } from "@/state/speedUnits";
import type { AppState, PhaseReference } from "@/types/state";
import { watch } from "vue";

interface GlobalNumberFieldConfig {
  key: GlobalNumberKey;
  label: string;
  description: string;
  step: number;
  min?: number;
}

interface ControlsGlobalPanelProps {
  global: AppState["global"];
  phaseUnit: AngleUnit;
  speedUnit: SpeedUnit;
  showAdvanced: boolean;
  draftResetVersion: number;
}

const props = defineProps<ControlsGlobalPanelProps>();

const emit = defineEmits<{
  (event: "set-global-number", key: GlobalNumberKey, value: number): void;
  (event: "set-global-boolean", key: GlobalBooleanKey, value: boolean): void;
  (event: "set-phase-reference", value: PhaseReference): void;
  (event: "set-phase-unit", value: AngleUnit): void;
  (event: "set-speed-unit", value: SpeedUnit): void;
  (event: "set-show-advanced", value: boolean): void;
}>();

const PHASE_REFERENCE_LABELS: Record<PhaseReference, string> = {
  down: "Down",
  right: "Right",
  left: "Left",
  up: "Up"
};

const GLOBAL_NUMBER_FIELDS: GlobalNumberFieldConfig[] = [
  {
    key: "bpm",
    label: "BPM",
    step: 1,
    min: 1,
    description: "Tempo in beats per minute. Higher BPM advances playback faster in real time."
  },
  {
    key: "loopBeats",
    label: "Loop Beats",
    step: 1,
    min: 0.25,
    description: "Length of one loop in beats. Playhead, trails, and waves wrap after this many beats."
  },
  {
    key: "playSpeed",
    label: "Play Speed",
    step: 1,
    min: 0,
    description: "Playback multiplier. 1.0 is normal speed, 0 pauses time advancement."
  },
  {
    key: "trailBeats",
    label: "Trail Beats",
    step: 1,
    min: 0,
    description: "How many recent beats of poi-head history are drawn as trails."
  },
  {
    key: "trailSampleHz",
    label: "Trail Sample Hz",
    step: 1,
    min: 1,
    description: "Trail sampling frequency. Higher values create smoother trails."
  }
];

const { getDraftValue, updateDraft, commitDraft, commitDraftOnEnter, clearDrafts } = useNumericDrafts();

watch(
  () => props.draftResetVersion,
  () => {
    clearDrafts();
  }
);

function getGlobalDraftKey(key: GlobalNumberKey): string {
  return `global-${key}`;
}

function onGlobalBooleanInput(key: GlobalBooleanKey, event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  emit("set-global-boolean", key, target.checked);
}

function commitGlobalNumberInput(key: GlobalNumberKey): void {
  const draftKey = getGlobalDraftKey(key);
  const fallbackValue = props.global[key];

  commitDraft(draftKey, fallbackValue, (nextValue) => {
    emit("set-global-number", key, nextValue);
  });
}

function onAdvancedToggle(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  emit("set-show-advanced", target.checked);
}

function isPhaseUnit(nextUnit: AngleUnit): boolean {
  return props.phaseUnit === nextUnit;
}

function isSpeedUnit(nextUnit: SpeedUnit): boolean {
  return props.speedUnit === nextUnit;
}

function isPhaseReference(nextReference: PhaseReference): boolean {
  return props.global.phaseReference === nextReference;
}
</script>

<template>
  <details class="mt-4 rounded border border-zinc-800 p-3">
    <summary class="cursor-pointer text-xs uppercase tracking-wide text-zinc-400">Global Settings</summary>
    <div class="mt-3">
      <div class="mb-4 rounded border border-zinc-800 bg-zinc-900/50 p-3">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-xs uppercase tracking-wide text-zinc-500">Input Units</p>
          <label class="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-400">
            <input class="accent-cyan-400" type="checkbox" :checked="props.showAdvanced" @change="onAdvancedToggle" />
            Show Advanced
          </label>
        </div>
        <p class="mt-1 text-xs text-zinc-500">Engine math always uses radians internally. Unit selectors change UI input/display only.</p>
        <div class="mt-3 grid gap-4 sm:grid-cols-3">
          <div>
            <p class="text-xs uppercase tracking-wide text-zinc-500">Phase Units</p>
            <div class="mt-2 flex gap-2">
              <button
                class="rounded border px-3 py-1.5 text-sm"
                :class="isPhaseUnit('degrees') ? 'border-cyan-400 text-cyan-300' : 'border-zinc-700 text-zinc-300'"
                type="button"
                @click="emit('set-phase-unit', 'degrees')"
              >
                Degrees
              </button>
              <button
                class="rounded border px-3 py-1.5 text-sm"
                :class="isPhaseUnit('radians') ? 'border-cyan-400 text-cyan-300' : 'border-zinc-700 text-zinc-300'"
                type="button"
                @click="emit('set-phase-unit', 'radians')"
              >
                Radians
              </button>
            </div>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-zinc-500">Phase Zero</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="phaseReference in PHASE_REFERENCE_OPTIONS"
                :key="`phase-reference-${phaseReference}`"
                class="rounded border px-3 py-1.5 text-sm"
                :class="isPhaseReference(phaseReference) ? 'border-cyan-400 text-cyan-300' : 'border-zinc-700 text-zinc-300'"
                type="button"
                @click="emit('set-phase-reference', phaseReference)"
              >
                {{ PHASE_REFERENCE_LABELS[phaseReference] }}
              </button>
            </div>
          </div>
          <div>
            <p class="text-xs uppercase tracking-wide text-zinc-500">Speed Units</p>
            <div class="mt-2 flex gap-2">
              <button
                class="rounded border px-3 py-1.5 text-sm"
                :class="isSpeedUnit('cycles') ? 'border-cyan-400 text-cyan-300' : 'border-zinc-700 text-zinc-300'"
                type="button"
                @click="emit('set-speed-unit', 'cycles')"
              >
                Cycles / Beat
              </button>
              <button
                class="rounded border px-3 py-1.5 text-sm"
                :class="isSpeedUnit('degrees') ? 'border-cyan-400 text-cyan-300' : 'border-zinc-700 text-zinc-300'"
                type="button"
                @click="emit('set-speed-unit', 'degrees')"
              >
                Degrees / Beat
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label v-for="field in GLOBAL_NUMBER_FIELDS" :key="field.key" class="block text-xs tracking-wide text-zinc-500">
          <span class="uppercase">{{ field.label }}</span>
          <input
            class="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
            type="number"
            :min="field.min"
            :step="field.step"
            :value="getDraftValue(getGlobalDraftKey(field.key), props.global[field.key])"
            @input="updateDraft(getGlobalDraftKey(field.key), $event)"
            @blur="commitGlobalNumberInput(field.key)"
            @keydown.enter="commitDraftOnEnter"
          />
          <span class="mt-1 block text-[11px] leading-4 text-zinc-500">{{ field.description }}</span>
        </label>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-4">
        <label class="flex items-center gap-2 text-sm text-zinc-300">
          <input
            class="accent-cyan-400"
            type="checkbox"
            :checked="props.global.showTrails"
            @change="onGlobalBooleanInput('showTrails', $event)"
          />
          Show Trails
        </label>
        <label class="flex items-center gap-2 text-sm text-zinc-300">
          <input class="accent-cyan-400" type="checkbox" :checked="props.global.showWaves" @change="onGlobalBooleanInput('showWaves', $event)" />
          Show Waves
        </label>
      </div>
      <p class="mt-2 text-xs text-zinc-500">Trails show historical head paths. Waves show oscillator sin/cos channels.</p>
    </div>
  </details>
</template>
