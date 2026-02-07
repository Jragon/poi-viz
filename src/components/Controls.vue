<script setup lang="ts">
import VtgPanel from "@/components/VtgPanel.vue";
import { degreesToRadians, radiansToDegrees, type AngleUnit } from "@/state/angleUnits";
import type { UserPresetSummary } from "@/state/presetLibrary";
import {
  classifyPoiSpinMode,
  getAbsoluteHeadSpeedRadiansPerBeat,
  getRelativePoiSpeedFromAbsoluteHeadRadiansPerBeat,
  speedFromRadiansPerBeat,
  speedToRadiansPerBeat,
  type PoiSpinMode,
  type SpeedUnit
} from "@/state/speedUnits";
import type { GlobalBooleanKey, GlobalNumberKey, HandNumberKey } from "@/state/actions";
import type { AppState, HandId } from "@/types/state";
import type { VTGDescriptor } from "@/vtg/types";
import { ref } from "vue";

interface ControlsProps {
  state: AppState;
  loopedPlayheadBeats: number;
  scrubStep: number;
  userPresets: UserPresetSummary[];
  presetLibraryStatus: string;
}

interface ExportPresetRequest {
  presetId: string;
  speedUnit: SpeedUnit;
  phaseUnit: AngleUnit;
}

const props = defineProps<ControlsProps>();

const emit = defineEmits<{
  (event: "toggle-playback"): void;
  (event: "save-user-preset", name: string): void;
  (event: "load-user-preset", presetId: string): void;
  (event: "delete-user-preset", presetId: string): void;
  (event: "export-user-preset", request: ExportPresetRequest): void;
  (event: "import-user-preset", file: File): void;
  (event: "set-scrub", value: number): void;
  (event: "set-global-number", key: GlobalNumberKey, value: number): void;
  (event: "set-global-boolean", key: GlobalBooleanKey, value: boolean): void;
  (event: "set-hand-number", handId: HandId, key: HandNumberKey, value: number): void;
  (event: "apply-vtg", descriptor: VTGDescriptor): void;
}>();

const HAND_IDS: HandId[] = ["L", "R"];

const PHASE_RADIAN_STEP = 1;
const PHASE_DEGREE_STEP = 1;
const SPEED_CYCLES_STEP = 1;
const SPEED_DEGREES_STEP = 1;
const RADIUS_STEP = 1;
const INPUT_DECIMALS = 4;
const DERIVED_DECIMALS = 3;
const SPEED_RATIO_EPSILON = 1e-9;

const SPIN_MODE_LABELS: Record<PoiSpinMode, string> = {
  extension: "extension",
  inspin: "inspin",
  antispin: "antispin",
  "static-spin": "static-spin"
};

interface GlobalNumberFieldConfig {
  key: GlobalNumberKey;
  label: string;
  description: string;
  step: number;
  min?: number;
}

type HandFieldKind = "speed" | "phase" | "radius";
type HandBaseNumberKey = Exclude<HandNumberKey, "poiSpeed">;

interface HandNumberFieldConfig {
  key: HandBaseNumberKey;
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

const HAND_BASE_FIELDS: HandNumberFieldConfig[] = [
  {
    key: "armSpeed",
    label: "Arm Speed (a)",
    kind: "speed",
    description: "Hand orbit speed around center."
  },
  {
    key: "armPhase",
    label: "Arm Phase",
    kind: "phase",
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
    key: "poiPhase",
    label: "Poi Relative Phase",
    kind: "phase",
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

const phaseUnit = ref<AngleUnit>("degrees");
const speedUnit = ref<SpeedUnit>("cycles");
const showAdvanced = ref(false);
const numericDrafts = ref<Record<string, string>>({});
const presetNameDraft = ref("");
const importInputRef = ref<HTMLInputElement | null>(null);

function parseFiniteNumber(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundForInput(value: number): number {
  return Number(value.toFixed(INPUT_DECIMALS));
}

function getSpeedUnitLabel(): string {
  return speedUnit.value === "cycles" ? "cycles/beat" : "deg/beat";
}

function getSpeedStep(): number {
  return speedUnit.value === "cycles" ? SPEED_CYCLES_STEP : SPEED_DEGREES_STEP;
}

function getPhaseUnitLabel(): string {
  return phaseUnit.value === "degrees" ? "deg" : "rad";
}

function getPhaseStep(): number {
  return phaseUnit.value === "degrees" ? PHASE_DEGREE_STEP : PHASE_RADIAN_STEP;
}

function getHandFieldUnit(field: HandNumberFieldConfig): string {
  if (field.kind === "radius") {
    return "units";
  }
  if (field.kind === "speed") {
    return getSpeedUnitLabel();
  }
  return getPhaseUnitLabel();
}

function getHandFieldStep(field: HandNumberFieldConfig): number {
  if (field.kind === "radius") {
    return RADIUS_STEP;
  }
  if (field.kind === "speed") {
    return getSpeedStep();
  }
  return getPhaseStep();
}

function clearNumericDrafts(): void {
  numericDrafts.value = {};
}

function getNumericDraftValue(draftKey: string, fallbackValue: number): string {
  const draftValue = numericDrafts.value[draftKey];
  if (draftValue !== undefined) {
    return draftValue;
  }
  return String(roundForInput(fallbackValue));
}

function updateNumericDraft(draftKey: string, event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  numericDrafts.value[draftKey] = target.value;
}

function commitNumericDraft(draftKey: string, fallbackValue: number, onCommit: (value: number) => void): void {
  const draftValue = numericDrafts.value[draftKey];
  if (draftValue === undefined) {
    return;
  }

  const parsed = parseFiniteNumber(draftValue);
  if (parsed !== null) {
    onCommit(parsed);
  } else {
    numericDrafts.value[draftKey] = String(roundForInput(fallbackValue));
  }

  delete numericDrafts.value[draftKey];
}

function commitDraftOnEnter(event: KeyboardEvent): void {
  const target = event.target;
  if (target instanceof HTMLInputElement) {
    target.blur();
  }
}

function getGlobalDraftKey(key: GlobalNumberKey): string {
  return `global-${key}`;
}

function getHandFieldDraftKey(handId: HandId, key: HandBaseNumberKey): string {
  return `hand-${handId}-${key}`;
}

function getAbsoluteHeadSpeedDraftKey(handId: HandId): string {
  return `hand-${handId}-absolute-head-speed`;
}

function getRelativePoiSpeedDraftKey(handId: HandId): string {
  return `hand-${handId}-relative-poi-speed`;
}

function convertHandValueForDisplay(field: HandNumberFieldConfig, valueInState: number): number {
  if (field.kind === "radius") {
    return valueInState;
  }
  if (field.kind === "speed") {
    return speedFromRadiansPerBeat(valueInState, speedUnit.value);
  }
  if (phaseUnit.value === "radians") {
    return valueInState;
  }
  return radiansToDegrees(valueInState);
}

function convertHandValueForState(field: HandNumberFieldConfig, inputValue: number): number {
  if (field.kind === "radius") {
    return inputValue;
  }
  if (field.kind === "speed") {
    return speedToRadiansPerBeat(inputValue, speedUnit.value);
  }
  if (phaseUnit.value === "radians") {
    return inputValue;
  }
  return degreesToRadians(inputValue);
}

function getHandDisplayValue(handId: HandId, field: HandNumberFieldConfig): number {
  const valueInState = props.state.hands[handId][field.key];
  return convertHandValueForDisplay(field, valueInState);
}

function getRelativePoiSpeedDisplay(handId: HandId): number {
  return speedFromRadiansPerBeat(props.state.hands[handId].poiSpeed, speedUnit.value);
}

function getAbsoluteHeadSpeedDisplay(handId: HandId): number {
  const hand = props.state.hands[handId];
  const absoluteHeadRadiansPerBeat = getAbsoluteHeadSpeedRadiansPerBeat(hand.armSpeed, hand.poiSpeed);
  return speedFromRadiansPerBeat(absoluteHeadRadiansPerBeat, speedUnit.value);
}

function getArmSpeedCyclesPerBeat(handId: HandId): number {
  return speedFromRadiansPerBeat(props.state.hands[handId].armSpeed, "cycles");
}

function getRelativePoiSpeedCyclesPerBeat(handId: HandId): number {
  return speedFromRadiansPerBeat(props.state.hands[handId].poiSpeed, "cycles");
}

function getAbsoluteHeadSpeedCyclesPerBeat(handId: HandId): number {
  const hand = props.state.hands[handId];
  return speedFromRadiansPerBeat(getAbsoluteHeadSpeedRadiansPerBeat(hand.armSpeed, hand.poiSpeed), "cycles");
}

function formatDerivedCycles(value: number): string {
  return value.toFixed(DERIVED_DECIMALS);
}

function getRelativeRatio(handId: HandId): string {
  const armCycles = getArmSpeedCyclesPerBeat(handId);
  if (Math.abs(armCycles) <= SPEED_RATIO_EPSILON) {
    return "undefined";
  }
  const relativeCycles = getRelativePoiSpeedCyclesPerBeat(handId);
  return (relativeCycles / armCycles).toFixed(DERIVED_DECIMALS);
}

function getPoiModeLabel(handId: HandId): string {
  const hand = props.state.hands[handId];
  const mode = classifyPoiSpinMode(hand.armSpeed, hand.poiSpeed);
  return SPIN_MODE_LABELS[mode];
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

function commitGlobalNumberInput(key: GlobalNumberKey): void {
  const draftKey = getGlobalDraftKey(key);
  const fallbackValue = props.state.global[key];
  commitNumericDraft(draftKey, fallbackValue, (nextValue) => {
    emit("set-global-number", key, nextValue);
  });
}

function onGlobalBooleanInput(key: GlobalBooleanKey, event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  emit("set-global-boolean", key, target.checked);
}

function commitHandFieldInput(handId: HandId, field: HandNumberFieldConfig): void {
  const draftKey = getHandFieldDraftKey(handId, field.key);
  const fallbackValue = getHandDisplayValue(handId, field);

  commitNumericDraft(draftKey, fallbackValue, (parsedValue) => {
    emit("set-hand-number", handId, field.key, convertHandValueForState(field, parsedValue));
  });
}

function commitAbsoluteHeadSpeedInput(handId: HandId): void {
  const draftKey = getAbsoluteHeadSpeedDraftKey(handId);
  const fallbackValue = getAbsoluteHeadSpeedDisplay(handId);

  commitNumericDraft(draftKey, fallbackValue, (parsedValue) => {
    const absoluteHeadSpeedRadiansPerBeat = speedToRadiansPerBeat(parsedValue, speedUnit.value);
    const armSpeedRadiansPerBeat = props.state.hands[handId].armSpeed;
    const relativePoiSpeedRadiansPerBeat = getRelativePoiSpeedFromAbsoluteHeadRadiansPerBeat(
      armSpeedRadiansPerBeat,
      absoluteHeadSpeedRadiansPerBeat
    );

    emit("set-hand-number", handId, "poiSpeed", relativePoiSpeedRadiansPerBeat);
  });
}

function commitRelativePoiSpeedInput(handId: HandId): void {
  const draftKey = getRelativePoiSpeedDraftKey(handId);
  const fallbackValue = getRelativePoiSpeedDisplay(handId);

  commitNumericDraft(draftKey, fallbackValue, (parsedValue) => {
    emit("set-hand-number", handId, "poiSpeed", speedToRadiansPerBeat(parsedValue, speedUnit.value));
  });
}

function setPhaseUnit(nextUnit: AngleUnit): void {
  phaseUnit.value = nextUnit;
  clearNumericDrafts();
}

function isPhaseUnit(nextUnit: AngleUnit): boolean {
  return phaseUnit.value === nextUnit;
}

function setSpeedUnit(nextUnit: SpeedUnit): void {
  speedUnit.value = nextUnit;
  clearNumericDrafts();
}

function isSpeedUnit(nextUnit: SpeedUnit): boolean {
  return speedUnit.value === nextUnit;
}

function onAdvancedToggle(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  showAdvanced.value = target.checked;
}

function getHandFieldDescription(field: HandNumberFieldConfig): string {
  return `${field.description} (${getHandFieldUnit(field)}).`;
}

function onApplyVtg(descriptor: VTGDescriptor): void {
  emit("apply-vtg", descriptor);
}

function saveCurrentAsUserPreset(): void {
  emit("save-user-preset", presetNameDraft.value);
  presetNameDraft.value = "";
}

function loadUserPreset(presetId: string): void {
  emit("load-user-preset", presetId);
}

function deleteUserPreset(presetId: string): void {
  emit("delete-user-preset", presetId);
}

function exportUserPreset(presetId: string): void {
  emit("export-user-preset", {
    presetId,
    speedUnit: speedUnit.value,
    phaseUnit: phaseUnit.value
  });
}

function openImportPicker(): void {
  importInputRef.value?.click();
}

function onImportFileChange(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  const file = target.files?.[0];
  if (!file) {
    return;
  }

  emit("import-user-preset", file);
  target.value = "";
}

function formatSavedAt(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return date.toLocaleString();
}
</script>

<template>
  <section class="rounded border border-zinc-800 bg-zinc-950/70 p-4 lg:col-span-12">
    <h2 class="mb-4 text-xs font-medium uppercase tracking-wide text-zinc-400">Controls</h2>

    <details class="rounded border border-zinc-800 p-3" open>
      <summary class="cursor-pointer text-xs uppercase tracking-wide text-zinc-400">Transport</summary>
      <div class="mt-3">
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
      </div>
    </details>

    <details class="mt-4 rounded border border-zinc-800 p-3">
      <summary class="cursor-pointer text-xs uppercase tracking-wide text-zinc-400">Global Settings</summary>
      <div class="mt-3">
        <div class="mb-4 rounded border border-zinc-800 bg-zinc-900/50 p-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="text-xs uppercase tracking-wide text-zinc-500">Input Units</p>
            <label class="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-400">
              <input class="accent-cyan-400" type="checkbox" :checked="showAdvanced" @change="onAdvancedToggle" />
              Show Advanced
            </label>
          </div>
          <p class="mt-1 text-xs text-zinc-500">Engine math always uses radians internally. Unit selectors change UI input/display only.</p>
          <div class="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p class="text-xs uppercase tracking-wide text-zinc-500">Phase Units</p>
              <div class="mt-2 flex gap-2">
                <button
                  class="rounded border px-3 py-1.5 text-sm"
                  :class="isPhaseUnit('degrees') ? 'border-cyan-400 text-cyan-300' : 'border-zinc-700 text-zinc-300'"
                  type="button"
                  @click="setPhaseUnit('degrees')"
                >
                  Degrees
                </button>
                <button
                  class="rounded border px-3 py-1.5 text-sm"
                  :class="isPhaseUnit('radians') ? 'border-cyan-400 text-cyan-300' : 'border-zinc-700 text-zinc-300'"
                  type="button"
                  @click="setPhaseUnit('radians')"
                >
                  Radians
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
                  @click="setSpeedUnit('cycles')"
                >
                  Cycles / Beat
                </button>
                <button
                  class="rounded border px-3 py-1.5 text-sm"
                  :class="isSpeedUnit('degrees') ? 'border-cyan-400 text-cyan-300' : 'border-zinc-700 text-zinc-300'"
                  type="button"
                  @click="setSpeedUnit('degrees')"
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
              :value="getNumericDraftValue(getGlobalDraftKey(field.key), props.state.global[field.key])"
              @input="updateNumericDraft(getGlobalDraftKey(field.key), $event)"
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
      </div>
    </details>

    <VtgPanel class="mt-4" :state="props.state" :speed-unit="speedUnit" @apply-vtg="onApplyVtg" />

    <div class="mt-4 grid gap-4 xl:grid-cols-2">
      <details v-for="handId in HAND_IDS" :key="handId" class="rounded border border-zinc-800 p-3" open>
        <summary class="cursor-pointer text-xs uppercase tracking-wide text-zinc-400">Hand {{ handId }}</summary>
        <div class="mt-3">
          <div class="grid gap-3 sm:grid-cols-2">
            <label
              v-for="field in HAND_BASE_FIELDS"
              :key="`${handId}-${field.key}`"
              class="block text-xs tracking-wide text-zinc-500"
            >
              <span class="uppercase">{{ field.label }} ({{ getHandFieldUnit(field) }})</span>
              <input
                class="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
                type="number"
                :min="field.min"
                :step="getHandFieldStep(field)"
                :value="getNumericDraftValue(getHandFieldDraftKey(handId, field.key), getHandDisplayValue(handId, field))"
                @input="updateNumericDraft(getHandFieldDraftKey(handId, field.key), $event)"
                @blur="commitHandFieldInput(handId, field)"
                @keydown.enter="commitDraftOnEnter"
              />
              <span class="mt-1 block text-[11px] leading-4 text-zinc-500">{{ getHandFieldDescription(field) }}</span>
            </label>
          </div>

          <div class="mt-4 rounded border border-zinc-800 bg-zinc-900/40 p-3">
            <h4 class="text-xs uppercase tracking-wide text-zinc-400">Poi Head Speed</h4>
            <p class="mt-1 text-xs text-zinc-500">
              This is world-space head speed <span class="font-mono">h</span>. The app solves
              <span class="font-mono">r = h - a</span> internally.
            </p>

            <label class="mt-3 block text-xs tracking-wide text-zinc-500">
              <span class="uppercase">Absolute Head Speed (h) ({{ getSpeedUnitLabel() }})</span>
              <input
                class="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
                type="number"
                :step="getSpeedStep()"
                :value="getNumericDraftValue(getAbsoluteHeadSpeedDraftKey(handId), getAbsoluteHeadSpeedDisplay(handId))"
                @input="updateNumericDraft(getAbsoluteHeadSpeedDraftKey(handId), $event)"
                @blur="commitAbsoluteHeadSpeedInput(handId)"
                @keydown.enter="commitDraftOnEnter"
              />
            </label>

            <div v-if="showAdvanced" class="mt-3 border-t border-zinc-800 pt-3">
              <label class="block text-xs tracking-wide text-zinc-500">
                <span class="uppercase">Relative Poi Speed (r) ({{ getSpeedUnitLabel() }})</span>
                <input
                  class="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
                  type="number"
                  :step="getSpeedStep()"
                  :value="getNumericDraftValue(getRelativePoiSpeedDraftKey(handId), getRelativePoiSpeedDisplay(handId))"
                  @input="updateNumericDraft(getRelativePoiSpeedDraftKey(handId), $event)"
                  @blur="commitRelativePoiSpeedInput(handId)"
                  @keydown.enter="commitDraftOnEnter"
                />
              </label>

              <p class="mt-3 text-xs text-zinc-500">
                Derived (cycles/beat):
                <span class="font-mono">a={{ formatDerivedCycles(getArmSpeedCyclesPerBeat(handId)) }}</span>,
                <span class="font-mono">r={{ formatDerivedCycles(getRelativePoiSpeedCyclesPerBeat(handId)) }}</span>,
                <span class="font-mono">h={{ formatDerivedCycles(getAbsoluteHeadSpeedCyclesPerBeat(handId)) }}</span>,
                mode=<span class="font-mono">{{ getPoiModeLabel(handId) }}</span>,
                r/a=<span class="font-mono">{{ getRelativeRatio(handId) }}</span>
              </p>
            </div>
          </div>
        </div>
      </details>
    </div>

    <details class="mt-4 rounded border border-zinc-800 p-3">
      <summary class="cursor-pointer text-xs uppercase tracking-wide text-zinc-400">Preset Library</summary>
      <div class="mt-3">
        <p class="text-xs text-zinc-500">
          Save patterns to app storage, reload them later, and export JSON files to build shared system presets.
        </p>

        <div class="mt-3 flex flex-wrap gap-2">
          <input
            v-model="presetNameDraft"
            class="min-w-[220px] flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
            type="text"
            maxlength="80"
            placeholder="Preset name"
            @keydown.enter.prevent="saveCurrentAsUserPreset"
          />
          <button
            class="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:border-zinc-500"
            type="button"
            @click="saveCurrentAsUserPreset"
          >
            Save Current
          </button>
          <button
            class="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:border-zinc-500"
            type="button"
            @click="openImportPicker"
          >
            Import JSON
          </button>
          <input ref="importInputRef" class="hidden" type="file" accept="application/json,.json" @change="onImportFileChange" />
        </div>

        <p v-if="props.presetLibraryStatus" class="mt-2 text-xs text-cyan-300">{{ props.presetLibraryStatus }}</p>

        <div v-if="props.userPresets.length === 0" class="mt-3 rounded border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-500">
          No saved presets yet.
        </div>

        <div v-else class="mt-3 grid gap-2">
          <div
            v-for="preset in props.userPresets"
            :key="preset.id"
            class="rounded border border-zinc-800 bg-zinc-900/40 p-3"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="text-sm font-medium text-zinc-100">{{ preset.name }}</p>
                <p class="text-xs text-zinc-500">{{ formatSavedAt(preset.savedAt) }}</p>
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  class="rounded border border-zinc-700 px-2.5 py-1 text-xs hover:border-zinc-500"
                  type="button"
                  @click="loadUserPreset(preset.id)"
                >
                  Load
                </button>
                <button
                  class="rounded border border-zinc-700 px-2.5 py-1 text-xs hover:border-zinc-500"
                  type="button"
                  @click="exportUserPreset(preset.id)"
                >
                  Export
                </button>
                <button
                  class="rounded border border-zinc-700 px-2.5 py-1 text-xs hover:border-zinc-500"
                  type="button"
                  @click="deleteUserPreset(preset.id)"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </details>

    <details class="mt-4 rounded border border-cyan-900/60 bg-cyan-950/20 p-4" open>
      <summary class="cursor-pointer text-sm font-semibold text-cyan-200">How This Works and How To Use It</summary>
      <div class="mt-3">
        <p class="text-sm leading-6 text-zinc-200">
          This tool models each hand with two coupled rotations: arm rotation around center and poi rotation relative to
          the hand. The pattern viewport shows the physical result (hands, tethers, heads, and trails), while the wave
          inspector shows the sin/cos oscillator channels that generate that motion.
        </p>
        <ol class="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-zinc-300">
          <li>
            Use the VTG panel to choose arm/poi relationships and phase in discrete steps, then refine timing and
            geometry with the hand controls.
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
            Edit absolute poi head speed <span class="font-mono">h</span> directly for poi-centric tuning. In advanced mode,
            you can also inspect and edit relative speed <span class="font-mono">r</span>.
          </li>
          <li>
            Inputs validate on blur so typing negative or partial numbers is not interrupted mid-edit. Keyboard arrows use
            whole-number steps.
          </li>
          <li>
            Toggle Trails to inspect path geometry over time and toggle Waves to focus on oscillator signals when tuning
            phase relationships.
          </li>
        </ol>
      </div>
    </details>
  </section>
</template>
