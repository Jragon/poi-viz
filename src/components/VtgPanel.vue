<script setup lang="ts">
import { speedFromRadiansPerBeat, type SpeedUnit } from "@/state/speedUnits";
import type { AppState } from "@/types/state";
import { classifyVTG } from "@/vtg/classify";
import {
  headSpeedRadiansPerBeatToPoiCyclesPerArmCycle,
  poiCyclesPerArmCycleToHeadSpeedRadiansPerBeat,
  VTG_CANONICAL_ARM_SPEED_RADIANS_PER_BEAT,
  VTG_ELEMENTS,
  VTG_PHASE_BUCKETS,
  type VTGDescriptor,
  type VTGElement,
  type VTGPhaseDeg
} from "@/vtg/types";
import { computed, onMounted, ref, watch } from "vue";

interface VtgPanelProps {
  state: AppState;
  speedUnit: SpeedUnit;
}

const props = defineProps<VtgPanelProps>();

const emit = defineEmits<{
  (event: "apply-vtg", descriptor: VTGDescriptor): void;
}>();

const VTG_CYCLES_MIN = -12;
const VTG_CYCLES_MAX = 12;
const VTG_CYCLES_STEP = 1;
const VTG_NON_ZERO_MIN_MAGNITUDE = 1;
const VTG_READOUT_DECIMALS = 3;
const VTG_PANEL_STORAGE_KEY = "poi-vtg-panel-expanded";
const VTG_PANEL_STORAGE_TRUE = "true";
const VTG_PANEL_STORAGE_FALSE = "false";

const isExpanded = ref(false);
const vtgPhaseDeg = ref<VTGPhaseDeg>(0);
const poiCyclesPerArmCycle = ref(-3);
const selectedArmElement = ref<VTGElement>("Earth");
const selectedPoiElement = ref<VTGElement>("Earth");

/**
 * Reads persisted VTG panel expansion state. Missing/invalid values fall back to collapsed.
 */
function readVtgPanelExpanded(): boolean {
  try {
    const stored = window.localStorage.getItem(VTG_PANEL_STORAGE_KEY);
    if (stored === VTG_PANEL_STORAGE_TRUE) {
      return true;
    }
    if (stored === VTG_PANEL_STORAGE_FALSE) {
      return false;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Persists VTG panel expansion state. Storage failures are ignored.
 */
function writeVtgPanelExpanded(nextValue: boolean): void {
  try {
    window.localStorage.setItem(VTG_PANEL_STORAGE_KEY, nextValue ? VTG_PANEL_STORAGE_TRUE : VTG_PANEL_STORAGE_FALSE);
  } catch {
    // Ignore localStorage write failures.
  }
}

/**
 * Attempts to classify current state into VTG discrete buckets for read-only display.
 */
const currentVtgClassification = computed(() => {
  try {
    return classifyVTG(props.state);
  } catch {
    return null;
  }
});

/**
 * Parses numeric input and returns finite values only.
 */
function parseFiniteNumber(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Formats a radian-per-beat speed value in cycles/beat for the VTG derived readout.
 */
function formatSpeed(radiansPerBeat: number): string {
  return speedFromRadiansPerBeat(radiansPerBeat, "cycles").toFixed(VTG_READOUT_DECIMALS);
}

/**
 * Right-head speed from signed poi cycles-per-arm-cycle.
 */
function getRightHeadSpeed(): number {
  return poiCyclesPerArmCycleToHeadSpeedRadiansPerBeat(poiCyclesPerArmCycle.value);
}

/**
 * Right-relative speed solved from ω_rel = ω_head - ω_arm.
 */
function getRightRelativeSpeed(): number {
  return getRightHeadSpeed() - VTG_CANONICAL_ARM_SPEED_RADIANS_PER_BEAT;
}

/**
 * Emits the currently selected VTG descriptor.
 */
function applyCurrentDescriptor(): void {
  emit("apply-vtg", {
    armElement: selectedArmElement.value,
    poiElement: selectedPoiElement.value,
    phaseDeg: vtgPhaseDeg.value,
    poiCyclesPerArmCycle: poiCyclesPerArmCycle.value
  });
}

/**
 * Clamps VTG cycles input into the supported signed integer range.
 */
function setPoiCyclesPerArmCycle(nextCycles: number): void {
  const clamped = Math.min(Math.max(Math.round(nextCycles), VTG_CYCLES_MIN), VTG_CYCLES_MAX);
  if (clamped === 0) {
    poiCyclesPerArmCycle.value = poiCyclesPerArmCycle.value < 0 ? -VTG_NON_ZERO_MIN_MAGNITUDE : VTG_NON_ZERO_MIN_MAGNITUDE;
    return;
  }
  poiCyclesPerArmCycle.value = clamped;
}

/**
 * Handles numeric cycles input and applies immediately.
 */
function onPoiCyclesInput(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  const parsed = parseFiniteNumber(target.value);
  if (parsed === null) {
    return;
  }
  setPoiCyclesPerArmCycle(parsed);
  applyCurrentDescriptor();
}

/**
 * Applies descriptor after stepping the signed cycles input.
 */
function stepPoiCycles(delta: number): void {
  const nextCycles = poiCyclesPerArmCycle.value + delta;
  if (nextCycles === 0) {
    setPoiCyclesPerArmCycle(delta > 0 ? VTG_NON_ZERO_MIN_MAGNITUDE : -VTG_NON_ZERO_MIN_MAGNITUDE);
  } else {
    setPoiCyclesPerArmCycle(nextCycles);
  }
  applyCurrentDescriptor();
}

/**
 * Applies one VTG descriptor from row/column element selection + selector controls.
 */
function applyVtgCell(armElement: VTGElement, poiElement: VTGElement): void {
  selectedArmElement.value = armElement;
  selectedPoiElement.value = poiElement;
  applyCurrentDescriptor();
}

/**
 * Applies descriptor immediately when phase bucket changes.
 */
function setPhaseAndApply(phaseDeg: VTGPhaseDeg): void {
  vtgPhaseDeg.value = phaseDeg;
  applyCurrentDescriptor();
}

/**
 * Cell highlight follows the current explicit selection.
 */
function isSelectedCell(armElement: VTGElement, poiElement: VTGElement): boolean {
  return selectedArmElement.value === armElement && selectedPoiElement.value === poiElement;
}

/**
 * Syncs details toggle state with local reactive + persisted panel state.
 */
function onPanelToggle(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLDetailsElement)) {
    return;
  }
  isExpanded.value = target.open;
}

/**
 * Seeds panel controls from the current runtime state on mount.
 */
function syncControlsFromState(): void {
  const classification = currentVtgClassification.value;
  if (classification) {
    selectedArmElement.value = classification.armElement;
    selectedPoiElement.value = classification.poiElement;
    vtgPhaseDeg.value = classification.phaseDeg;
  }

  const rightHand = props.state.hands.R;
  const rightHeadSpeedRadiansPerBeat = rightHand.armSpeed + rightHand.poiSpeed;
  const rightHeadCyclesPerBeat = headSpeedRadiansPerBeatToPoiCyclesPerArmCycle(rightHeadSpeedRadiansPerBeat);
  setPoiCyclesPerArmCycle(rightHeadCyclesPerBeat);
}

onMounted(() => {
  isExpanded.value = readVtgPanelExpanded();
  syncControlsFromState();
});

watch(currentVtgClassification, (classification) => {
  if (!classification) {
    return;
  }
  selectedArmElement.value = classification.armElement;
  selectedPoiElement.value = classification.poiElement;
  vtgPhaseDeg.value = classification.phaseDeg;
});

watch(
  () => props.state.hands.R.armSpeed + props.state.hands.R.poiSpeed,
  (rightHeadSpeedRadiansPerBeat) => {
    const rightHeadCyclesPerBeat = headSpeedRadiansPerBeatToPoiCyclesPerArmCycle(rightHeadSpeedRadiansPerBeat);
    setPoiCyclesPerArmCycle(rightHeadCyclesPerBeat);
  }
);

watch(isExpanded, (nextValue) => {
  writeVtgPanelExpanded(nextValue);
});
</script>

<template>
  <details class="rounded border border-zinc-800 p-3" :open="isExpanded" @toggle="onPanelToggle">
    <summary class="cursor-pointer text-xs uppercase tracking-wide text-zinc-400">VTG</summary>
    <div class="mt-3 space-y-4">
      <p class="text-xs text-zinc-500">Generate canonical patterns from discrete arm/poi relationships.</p>

      <div class="flex items-end gap-4 overflow-x-auto pb-1">
        <label class="block text-xs tracking-wide text-zinc-500">
          <span class="uppercase">Poi Cycles / Arm Cycle</span>
          <div class="mt-1 flex items-center gap-2">
            <button
              class="rounded border border-zinc-700 px-2 py-1 text-sm hover:border-zinc-500"
              type="button"
              @click="stepPoiCycles(-VTG_CYCLES_STEP)"
            >
              -
            </button>
            <input
              class="no-spinner w-24 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-center text-sm text-zinc-100"
              type="number"
              :min="VTG_CYCLES_MIN"
              :max="VTG_CYCLES_MAX"
              :step="VTG_CYCLES_STEP"
              :value="poiCyclesPerArmCycle"
              @input="onPoiCyclesInput"
            />
            <button
              class="rounded border border-zinc-700 px-2 py-1 text-sm hover:border-zinc-500"
              type="button"
              @click="stepPoiCycles(VTG_CYCLES_STEP)"
            >
              +
            </button>
          </div>
        </label>

        <div class="ml-auto shrink-0 text-right text-xs tracking-wide text-zinc-500">
          <p class="uppercase">Phase</p>
          <div class="mt-2 flex flex-wrap justify-end gap-2">
            <button
              v-for="phase in VTG_PHASE_BUCKETS"
              :key="phase"
              class="rounded border px-3 py-1.5 text-sm"
              :class="vtgPhaseDeg === phase ? 'border-cyan-400 text-cyan-300' : 'border-zinc-700 text-zinc-300'"
              type="button"
              @click="setPhaseAndApply(phase)"
            >
              {{ phase }}°
            </button>
          </div>
        </div>
      </div>

      <div>
        <p class="mb-2 text-xs uppercase tracking-wide text-zinc-500">Arms (timing + direction)</p>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th class="border border-zinc-800 bg-zinc-900/40 px-2 py-1 text-left text-zinc-500">
                  Poi heads (world-frame timing + direction)
                </th>
                <th
                  v-for="poiElement in VTG_ELEMENTS"
                  :key="`poi-col-${poiElement}`"
                  class="border border-zinc-800 bg-zinc-900/40 px-2 py-1 text-zinc-400"
                >
                  {{ poiElement }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="armElement in VTG_ELEMENTS" :key="`arm-row-${armElement}`">
                <th class="border border-zinc-800 bg-zinc-900/40 px-2 py-2 text-left text-zinc-400">
                  {{ armElement }}
                </th>
                <td
                  v-for="poiElement in VTG_ELEMENTS"
                  :key="`cell-${armElement}-${poiElement}`"
                  class="border border-zinc-800 p-1"
                >
                  <button
                    class="w-full rounded border px-2 py-1.5 text-left text-xs"
                    :class="
                      isSelectedCell(armElement, poiElement)
                        ? 'border-cyan-400 bg-cyan-950/30 text-cyan-200'
                        : 'border-zinc-700 bg-zinc-900/40 text-zinc-200 hover:border-zinc-500'
                    "
                    type="button"
                    @click="applyVtgCell(armElement, poiElement)"
                  >
                    {{ armElement }} × {{ poiElement }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="rounded border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-400">
        <p>
          Derived (cycles/beat):
          <span class="font-mono">ω_arm_R={{ formatSpeed(VTG_CANONICAL_ARM_SPEED_RADIANS_PER_BEAT) }}</span>,
          <span class="font-mono">ω_head_R={{ formatSpeed(getRightHeadSpeed()) }}</span>,
          <span class="font-mono">ω_rel_R={{ formatSpeed(getRightRelativeSpeed()) }}</span>
        </p>
        <p class="mt-1">
          Current VTG state:
          <span v-if="currentVtgClassification" class="font-mono">
            arms={{ currentVtgClassification.armElement }}, poi={{ currentVtgClassification.poiElement }},
            phase={{ currentVtgClassification.phaseDeg }}°
          </span>
          <span v-else class="font-mono text-amber-300">UNCONFIRMED</span>
        </p>
      </div>

      <details class="rounded border border-zinc-800 bg-zinc-900/30 p-3">
        <summary class="cursor-pointer text-xs uppercase tracking-wide text-zinc-400">Help</summary>
        <ul class="mt-2 list-disc space-y-1 pl-4 text-xs text-zinc-400">
          <li>Arms = timing + direction between hands.</li>
          <li>Poi = timing + direction between head motions (world frame).</li>
          <li>Phase rotates poi-head offset in 90° buckets while keeping hand timing the same.</li>
          <li>
            Signed poi cycles/arm cycle sets head cycles directly.
            <span class="font-mono">+3</span> means 2-petal inspin and <span class="font-mono">-3</span> means 4-petal antispin.
          </li>
        </ul>
      </details>
    </div>
  </details>
</template>

<style scoped>
.no-spinner::-webkit-outer-spin-button,
.no-spinner::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.no-spinner {
  -moz-appearance: textfield;
  appearance: textfield;
}
</style>
