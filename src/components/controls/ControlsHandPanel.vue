<script setup lang="ts">
import { useNumericDrafts } from "@/composables/useNumericDrafts";
import { degreesToRadians, radiansToDegrees, type AngleUnit } from "@/state/angleUnits";
import type { HandNumberKey } from "@/state/actions";
import {
  classifyPoiSpinMode,
  getAbsoluteHeadSpeedRadiansPerBeat,
  getRelativePoiSpeedFromAbsoluteHeadRadiansPerBeat,
  speedFromRadiansPerBeat,
  speedToRadiansPerBeat,
  type PoiSpinMode,
  type SpeedUnit
} from "@/state/speedUnits";
import type { HandId, HandState } from "@/types/state";
import { watch } from "vue";

type HandFieldKind = "speed" | "phase" | "radius";
type HandBaseNumberKey = Exclude<HandNumberKey, "poiSpeed">;

interface HandNumberFieldConfig {
  key: HandBaseNumberKey;
  label: string;
  description: string;
  kind: HandFieldKind;
  min?: number;
}

interface ControlsHandPanelProps {
  handId: HandId;
  hand: HandState;
  phaseUnit: AngleUnit;
  speedUnit: SpeedUnit;
  showAdvanced: boolean;
  draftResetVersion: number;
}

const props = defineProps<ControlsHandPanelProps>();

const emit = defineEmits<{
  (event: "set-hand-number", key: HandNumberKey, value: number): void;
}>();

const PHASE_RADIAN_STEP = 1;
const PHASE_DEGREE_STEP = 1;
const SPEED_CYCLES_STEP = 1;
const SPEED_DEGREES_STEP = 1;
const RADIUS_STEP = 1;
const DERIVED_DECIMALS = 3;
const SPEED_RATIO_EPSILON = 1e-9;

const SPIN_MODE_LABELS: Record<PoiSpinMode, string> = {
  extension: "extension",
  inspin: "inspin",
  antispin: "antispin",
  "static-spin": "static-spin"
};

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

const { getDraftValue, updateDraft, commitDraft, commitDraftOnEnter, clearDrafts } = useNumericDrafts();

watch(
  () => props.draftResetVersion,
  () => {
    clearDrafts();
  }
);

function getSpeedUnitLabel(): string {
  return props.speedUnit === "cycles" ? "cycles/beat" : "deg/beat";
}

function getSpeedStep(): number {
  return props.speedUnit === "cycles" ? SPEED_CYCLES_STEP : SPEED_DEGREES_STEP;
}

function getPhaseUnitLabel(): string {
  return props.phaseUnit === "degrees" ? "deg" : "rad";
}

function getPhaseStep(): number {
  return props.phaseUnit === "degrees" ? PHASE_DEGREE_STEP : PHASE_RADIAN_STEP;
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

function getHandFieldDescription(field: HandNumberFieldConfig): string {
  return `${field.description} (${getHandFieldUnit(field)}).`;
}

function getHandFieldDraftKey(key: HandBaseNumberKey): string {
  return `hand-${props.handId}-${key}`;
}

function getAbsoluteHeadSpeedDraftKey(): string {
  return `hand-${props.handId}-absolute-head-speed`;
}

function getRelativePoiSpeedDraftKey(): string {
  return `hand-${props.handId}-relative-poi-speed`;
}

function convertHandValueForDisplay(field: HandNumberFieldConfig, valueInState: number): number {
  if (field.kind === "radius") {
    return valueInState;
  }
  if (field.kind === "speed") {
    return speedFromRadiansPerBeat(valueInState, props.speedUnit);
  }
  if (props.phaseUnit === "radians") {
    return valueInState;
  }
  return radiansToDegrees(valueInState);
}

function convertHandValueForState(field: HandNumberFieldConfig, inputValue: number): number {
  if (field.kind === "radius") {
    return inputValue;
  }
  if (field.kind === "speed") {
    return speedToRadiansPerBeat(inputValue, props.speedUnit);
  }
  if (props.phaseUnit === "radians") {
    return inputValue;
  }
  return degreesToRadians(inputValue);
}

function getHandDisplayValue(field: HandNumberFieldConfig): number {
  const valueInState = props.hand[field.key];
  return convertHandValueForDisplay(field, valueInState);
}

function getRelativePoiSpeedDisplay(): number {
  return speedFromRadiansPerBeat(props.hand.poiSpeed, props.speedUnit);
}

function getAbsoluteHeadSpeedDisplay(): number {
  const absoluteHeadRadiansPerBeat = getAbsoluteHeadSpeedRadiansPerBeat(props.hand.armSpeed, props.hand.poiSpeed);
  return speedFromRadiansPerBeat(absoluteHeadRadiansPerBeat, props.speedUnit);
}

function getArmSpeedCyclesPerBeat(): number {
  return speedFromRadiansPerBeat(props.hand.armSpeed, "cycles");
}

function getRelativePoiSpeedCyclesPerBeat(): number {
  return speedFromRadiansPerBeat(props.hand.poiSpeed, "cycles");
}

function getAbsoluteHeadSpeedCyclesPerBeat(): number {
  return speedFromRadiansPerBeat(getAbsoluteHeadSpeedRadiansPerBeat(props.hand.armSpeed, props.hand.poiSpeed), "cycles");
}

function formatDerivedCycles(value: number): string {
  return value.toFixed(DERIVED_DECIMALS);
}

function getRelativeRatio(): string {
  const armCycles = getArmSpeedCyclesPerBeat();
  if (Math.abs(armCycles) <= SPEED_RATIO_EPSILON) {
    return "undefined";
  }

  const relativeCycles = getRelativePoiSpeedCyclesPerBeat();
  return (relativeCycles / armCycles).toFixed(DERIVED_DECIMALS);
}

function getPoiModeLabel(): string {
  const mode = classifyPoiSpinMode(props.hand.armSpeed, props.hand.poiSpeed);
  return SPIN_MODE_LABELS[mode];
}

function commitHandFieldInput(field: HandNumberFieldConfig): void {
  const draftKey = getHandFieldDraftKey(field.key);
  const fallbackValue = getHandDisplayValue(field);

  commitDraft(draftKey, fallbackValue, (parsedValue) => {
    emit("set-hand-number", field.key, convertHandValueForState(field, parsedValue));
  });
}

function commitAbsoluteHeadSpeedInput(): void {
  const draftKey = getAbsoluteHeadSpeedDraftKey();
  const fallbackValue = getAbsoluteHeadSpeedDisplay();

  commitDraft(draftKey, fallbackValue, (parsedValue) => {
    const absoluteHeadSpeedRadiansPerBeat = speedToRadiansPerBeat(parsedValue, props.speedUnit);
    const relativePoiSpeedRadiansPerBeat = getRelativePoiSpeedFromAbsoluteHeadRadiansPerBeat(
      props.hand.armSpeed,
      absoluteHeadSpeedRadiansPerBeat
    );

    emit("set-hand-number", "poiSpeed", relativePoiSpeedRadiansPerBeat);
  });
}

function commitRelativePoiSpeedInput(): void {
  const draftKey = getRelativePoiSpeedDraftKey();
  const fallbackValue = getRelativePoiSpeedDisplay();

  commitDraft(draftKey, fallbackValue, (parsedValue) => {
    emit("set-hand-number", "poiSpeed", speedToRadiansPerBeat(parsedValue, props.speedUnit));
  });
}
</script>

<template>
  <details class="rounded border border-zinc-800 p-3" open>
    <summary class="cursor-pointer text-xs uppercase tracking-wide text-zinc-400">Hand {{ props.handId }}</summary>
    <div class="mt-3">
      <div class="grid gap-3 sm:grid-cols-2">
        <label v-for="field in HAND_BASE_FIELDS" :key="`${props.handId}-${field.key}`" class="block text-xs tracking-wide text-zinc-500">
          <span class="uppercase">{{ field.label }} ({{ getHandFieldUnit(field) }})</span>
          <input
            class="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
            type="number"
            :min="field.min"
            :step="getHandFieldStep(field)"
            :value="getDraftValue(getHandFieldDraftKey(field.key), getHandDisplayValue(field))"
            @input="updateDraft(getHandFieldDraftKey(field.key), $event)"
            @blur="commitHandFieldInput(field)"
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
            :value="getDraftValue(getAbsoluteHeadSpeedDraftKey(), getAbsoluteHeadSpeedDisplay())"
            @input="updateDraft(getAbsoluteHeadSpeedDraftKey(), $event)"
            @blur="commitAbsoluteHeadSpeedInput"
            @keydown.enter="commitDraftOnEnter"
          />
        </label>

        <div v-if="props.showAdvanced" class="mt-3 border-t border-zinc-800 pt-3">
          <label class="block text-xs tracking-wide text-zinc-500">
            <span class="uppercase">Relative Poi Speed (r) ({{ getSpeedUnitLabel() }})</span>
            <input
              class="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
              type="number"
              :step="getSpeedStep()"
              :value="getDraftValue(getRelativePoiSpeedDraftKey(), getRelativePoiSpeedDisplay())"
              @input="updateDraft(getRelativePoiSpeedDraftKey(), $event)"
              @blur="commitRelativePoiSpeedInput"
              @keydown.enter="commitDraftOnEnter"
            />
          </label>

          <p class="mt-3 text-xs text-zinc-500">
            Derived (cycles/beat):
            <span class="font-mono">a={{ formatDerivedCycles(getArmSpeedCyclesPerBeat()) }}</span>,
            <span class="font-mono">r={{ formatDerivedCycles(getRelativePoiSpeedCyclesPerBeat()) }}</span>,
            <span class="font-mono">h={{ formatDerivedCycles(getAbsoluteHeadSpeedCyclesPerBeat()) }}</span>,
            mode=<span class="font-mono">{{ getPoiModeLabel() }}</span>,
            r/a=<span class="font-mono">{{ getRelativeRatio() }}</span>
          </p>
        </div>
      </div>
    </div>
  </details>
</template>
