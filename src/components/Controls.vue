<script setup lang="ts">
import { degreesToRadians, radiansToDegrees, type AngleUnit } from "@/state/angleUnits";
import { PRESET_CATALOG } from "@/state/presets";
import type { GlobalBooleanKey, GlobalNumberKey, HandNumberKey } from "@/state/actions";
import type { AppState, HandId, PresetId } from "@/types/state";
import { ref } from "vue";

interface ControlsProps {
  state: AppState;
  loopedPlayheadBeats: number;
  scrubStep: number;
}

const props = defineProps<ControlsProps>();

const emit = defineEmits<{
  (event: "toggle-playback"): void;
  (event: "set-scrub", value: number): void;
  (event: "set-global-number", key: GlobalNumberKey, value: number): void;
  (event: "set-global-boolean", key: GlobalBooleanKey, value: boolean): void;
  (event: "set-hand-number", handId: HandId, key: HandNumberKey, value: number): void;
  (event: "apply-preset", presetId: PresetId): void;
}>();

const ELEMENT_PRESET_IDS: PresetId[] = ["earth", "air", "water", "fire"];
const FLOWER_PRESET_IDS: PresetId[] = [
  "inspin-3",
  "inspin-4",
  "inspin-5",
  "antispin-3",
  "antispin-4",
  "antispin-5"
];

const RADIAN_SPEED_STEP = 0.25;
const RADIAN_PHASE_STEP = 0.1;
const DEGREE_SPEED_STEP = 15;
const DEGREE_PHASE_STEP = 5;
const RADIUS_STEP = 1;
const INPUT_DECIMALS = 4;

interface GlobalNumberFieldConfig {
  key: GlobalNumberKey;
  label: string;
  description: string;
  step: number;
  min?: number;
}

type HandFieldKind = "angle-speed" | "angle-phase" | "radius";

interface HandNumberFieldConfig {
  key: HandNumberKey;
  label: string;
  description: string;
  kind: HandFieldKind;
  min?: number;
}

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
    step: 0.25,
    min: 0.25,
    description: "Length of one loop in beats. Playhead, trails, and waves wrap after this many beats."
  },
  {
    key: "playSpeed",
    label: "Play Speed",
    step: 0.05,
    min: 0,
    description: "Playback multiplier. 1.0 is normal speed, 0 pauses time advancement."
  },
  {
    key: "trailBeats",
    label: "Trail Beats",
    step: 0.25,
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

const HAND_NUMBER_FIELDS: HandNumberFieldConfig[] = [
  {
    key: "armSpeed",
    label: "Arm Speed",
    kind: "angle-speed",
    description: "Angular velocity of the hand orbit around center."
  },
  {
    key: "armPhase",
    label: "Arm Phase",
    kind: "angle-phase",
    description: "Starting arm angle offset at t = 0 beats."
  },
  {
    key: "armRadius",
    label: "Arm Radius",
    kind: "radius",
    min: 0,
    description: "Distance from center to the hand point."
  },
  {
    key: "poiSpeed",
    label: "Poi Relative Speed",
    kind: "angle-speed",
    description: "Angular velocity of poi rotation relative to the hand."
  },
  {
    key: "poiPhase",
    label: "Poi Relative Phase",
    kind: "angle-phase",
    description: "Starting relative poi angle offset at t = 0 beats."
  },
  {
    key: "poiRadius",
    label: "Poi Radius",
    kind: "radius",
    min: 0,
    description: "Tether length: distance from hand point to poi head."
  }
];

const angleUnit = ref<AngleUnit>("degrees");

function parseFiniteNumber(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundForInput(value: number): number {
  return Number(value.toFixed(INPUT_DECIMALS));
}

function getHandFieldUnit(field: HandNumberFieldConfig): string {
  if (field.kind === "radius") {
    return "units";
  }
  if (field.kind === "angle-speed") {
    return angleUnit.value === "degrees" ? "deg/beat" : "rad/beat";
  }
  return angleUnit.value === "degrees" ? "deg" : "rad";
}

function getHandFieldStep(field: HandNumberFieldConfig): number {
  if (field.kind === "radius") {
    return RADIUS_STEP;
  }
  if (field.kind === "angle-speed") {
    return angleUnit.value === "degrees" ? DEGREE_SPEED_STEP : RADIAN_SPEED_STEP;
  }
  return angleUnit.value === "degrees" ? DEGREE_PHASE_STEP : RADIAN_PHASE_STEP;
}

function convertHandValueForDisplay(field: HandNumberFieldConfig, valueInState: number): number {
  if (field.kind === "radius" || angleUnit.value === "radians") {
    return valueInState;
  }
  return radiansToDegrees(valueInState);
}

function convertHandValueForState(field: HandNumberFieldConfig, inputValue: number): number {
  if (field.kind === "radius" || angleUnit.value === "radians") {
    return inputValue;
  }
  return degreesToRadians(inputValue);
}

function getHandDisplayValue(handId: HandId, field: HandNumberFieldConfig): number {
  const valueInState = props.state.hands[handId][field.key];
  const displayValue = convertHandValueForDisplay(field, valueInState);
  return roundForInput(displayValue);
}

function onScrubInput(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  const parsed = parseFiniteNumber(target.value);
  if (parsed === null) {
    return;
  }
  emit("set-scrub", parsed);
}

function onGlobalNumberInput(key: GlobalNumberKey, event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  const parsed = parseFiniteNumber(target.value);
  if (parsed === null) {
    return;
  }
  emit("set-global-number", key, parsed);
}

function onGlobalBooleanInput(key: GlobalBooleanKey, event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  emit("set-global-boolean", key, target.checked);
}

function onHandNumberInput(handId: HandId, field: HandNumberFieldConfig, event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  const parsed = parseFiniteNumber(target.value);
  if (parsed === null) {
    return;
  }
  emit("set-hand-number", handId, field.key, convertHandValueForState(field, parsed));
}

function setAngleUnit(nextUnit: AngleUnit): void {
  angleUnit.value = nextUnit;
}

function isAngleUnit(nextUnit: AngleUnit): boolean {
  return angleUnit.value === nextUnit;
}

function getHandFieldDescription(field: HandNumberFieldConfig): string {
  return `${field.description} (${getHandFieldUnit(field)}).`;
}

function onPresetClick(presetId: PresetId): void {
  emit("apply-preset", presetId);
}

function getPresetLabel(presetId: PresetId): string {
  return PRESET_CATALOG.find((preset) => preset.id === presetId)?.label ?? presetId;
}
</script>

<template>
  <section class="rounded border border-zinc-800 bg-zinc-950/70 p-4 lg:col-span-12">
    <h2 class="mb-4 text-xs font-medium uppercase tracking-wide text-zinc-400">Controls</h2>

    <article class="rounded border border-zinc-800 p-3">
      <h3 class="mb-3 text-xs uppercase tracking-wide text-zinc-400">Transport</h3>
      <div class="flex flex-wrap items-center gap-3">
        <button
          class="rounded border border-zinc-700 px-3 py-2 text-sm font-medium hover:border-zinc-500"
          type="button"
          @click="emit('toggle-playback')"
        >
          {{ props.state.global.isPlaying ? "Pause" : "Play" }}
        </button>
        <p class="text-sm text-zinc-400">Playhead: {{ props.loopedPlayheadBeats.toFixed(3) }} beats</p>
      </div>

      <label class="mt-3 block text-xs uppercase tracking-wide text-zinc-500">
        Scrub
        <input
          class="mt-2 w-full accent-cyan-400"
          type="range"
          min="0"
          :max="props.state.global.loopBeats"
          :step="props.scrubStep"
          :value="props.loopedPlayheadBeats"
          @input="onScrubInput"
        />
      </label>
      <p class="mt-2 text-xs text-zinc-500">Move to a specific beat inside the loop and pause playback.</p>
    </article>

    <article class="mt-4 rounded border border-zinc-800 p-3">
      <h3 class="mb-3 text-xs uppercase tracking-wide text-zinc-400">Global Settings</h3>
      <div class="mb-4 rounded border border-zinc-800 bg-zinc-900/50 p-3">
        <p class="text-xs uppercase tracking-wide text-zinc-500">Angle Units</p>
        <p class="mt-1 text-xs text-zinc-500">
          Engine math always uses radians internally. This switch changes only how speed/phase values are shown and
          edited.
        </p>
        <div class="mt-2 flex gap-2">
          <button
            class="rounded border px-3 py-1.5 text-sm"
            :class="isAngleUnit('degrees') ? 'border-cyan-400 text-cyan-300' : 'border-zinc-700 text-zinc-300'"
            type="button"
            @click="setAngleUnit('degrees')"
          >
            Degrees
          </button>
          <button
            class="rounded border px-3 py-1.5 text-sm"
            :class="isAngleUnit('radians') ? 'border-cyan-400 text-cyan-300' : 'border-zinc-700 text-zinc-300'"
            type="button"
            @click="setAngleUnit('radians')"
          >
            Radians
          </button>
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
            :value="props.state.global[field.key]"
            @input="onGlobalNumberInput(field.key, $event)"
          />
          <span class="mt-1 block text-[11px] leading-4 text-zinc-500">{{ field.description }}</span>
        </label>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-4">
        <label class="flex items-center gap-2 text-sm text-zinc-300">
          <input
            class="accent-cyan-400"
            type="checkbox"
            :checked="props.state.global.showTrails"
            @change="onGlobalBooleanInput('showTrails', $event)"
          />
          Show Trails
        </label>
        <label class="flex items-center gap-2 text-sm text-zinc-300">
          <input
            class="accent-cyan-400"
            type="checkbox"
            :checked="props.state.global.showWaves"
            @change="onGlobalBooleanInput('showWaves', $event)"
          />
          Show Waves
        </label>
      </div>
      <p class="mt-2 text-xs text-zinc-500">Trails show historical head paths. Waves show oscillator sin/cos channels.</p>
    </article>

    <div class="mt-4 grid gap-4 xl:grid-cols-2">
      <article class="rounded border border-zinc-800 p-3">
        <h3 class="mb-3 text-xs uppercase tracking-wide text-zinc-400">Hand L</h3>
        <div class="grid gap-3 sm:grid-cols-2">
          <label v-for="field in HAND_NUMBER_FIELDS" :key="`L-${field.key}`" class="block text-xs tracking-wide text-zinc-500">
            <span class="uppercase">{{ field.label }} ({{ getHandFieldUnit(field) }})</span>
            <input
              class="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
              type="number"
              :min="field.min"
              :step="getHandFieldStep(field)"
              :value="getHandDisplayValue('L', field)"
              @input="onHandNumberInput('L', field, $event)"
            />
            <span class="mt-1 block text-[11px] leading-4 text-zinc-500">{{ getHandFieldDescription(field) }}</span>
          </label>
        </div>
      </article>

      <article class="rounded border border-zinc-800 p-3">
        <h3 class="mb-3 text-xs uppercase tracking-wide text-zinc-400">Hand R</h3>
        <div class="grid gap-3 sm:grid-cols-2">
          <label v-for="field in HAND_NUMBER_FIELDS" :key="`R-${field.key}`" class="block text-xs tracking-wide text-zinc-500">
            <span class="uppercase">{{ field.label }} ({{ getHandFieldUnit(field) }})</span>
            <input
              class="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
              type="number"
              :min="field.min"
              :step="getHandFieldStep(field)"
              :value="getHandDisplayValue('R', field)"
              @input="onHandNumberInput('R', field, $event)"
            />
            <span class="mt-1 block text-[11px] leading-4 text-zinc-500">{{ getHandFieldDescription(field) }}</span>
          </label>
        </div>
      </article>
    </div>

    <div class="mt-4 grid gap-4 xl:grid-cols-2">
      <article class="rounded border border-zinc-800 p-3">
        <h3 class="mb-3 text-xs uppercase tracking-wide text-zinc-400">Element Presets</h3>
        <p class="mb-3 text-xs text-zinc-500">
          Changes right-hand timing/direction relative to left hand: earth, air, water, fire.
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="presetId in ELEMENT_PRESET_IDS"
            :key="presetId"
            class="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:border-zinc-500"
            type="button"
            @click="onPresetClick(presetId)"
          >
            {{ getPresetLabel(presetId) }}
          </button>
        </div>
      </article>

      <article class="rounded border border-zinc-800 p-3">
        <h3 class="mb-3 text-xs uppercase tracking-wide text-zinc-400">Flower Presets</h3>
        <p class="mb-3 text-xs text-zinc-500">
          Sets relative poi speeds to inspin/antispin ratios for 3-, 4-, and 5-petal examples.
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="presetId in FLOWER_PRESET_IDS"
            :key="presetId"
            class="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:border-zinc-500"
            type="button"
            @click="onPresetClick(presetId)"
          >
            {{ getPresetLabel(presetId) }}
          </button>
        </div>
      </article>
    </div>

    <article class="mt-4 rounded border border-cyan-900/60 bg-cyan-950/20 p-4">
      <h3 class="text-sm font-semibold text-cyan-200">How This Works and How To Use It</h3>
      <p class="mt-2 text-sm leading-6 text-zinc-200">
        This tool models each hand with two coupled rotations: arm rotation around center and poi rotation relative to
        the hand. The pattern viewport shows the physical result (hands, tethers, heads, and trails), while the wave
        inspector shows the sin/cos oscillator channels that generate that motion.
      </p>
      <ol class="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-zinc-300">
        <li>
          Start with a preset to get a known relationship quickly. Element presets change hand timing/direction
          relations; flower presets change relative poi speed ratios.
        </li>
        <li>
          Use Transport to play or pause motion and scrub to any beat in the loop. Scrubbing pauses playback so you can
          inspect exact positions.
        </li>
        <li>
          Set Loop Beats to choose how long one phrase is before it wraps. BPM changes real-time speed only; beat-space
          math stays deterministic.
        </li>
        <li>
          Edit Arm Speed and Arm Phase to control hand circles, then Poi Relative Speed and Poi Relative Phase to shape
          flowers and antispin behavior. Radius values control circle sizes and tether length.
        </li>
        <li>
          Use Degrees mode for intuitive editing, or Radians mode for direct math values. Internally all values remain
          radians, so changing display units does not change behavior.
        </li>
        <li>
          Toggle Trails to inspect path geometry over time and toggle Waves to focus on oscillator signals when tuning
          phase relationships.
        </li>
      </ol>
    </article>
  </section>
</template>
