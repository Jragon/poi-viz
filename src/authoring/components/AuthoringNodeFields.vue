<script setup lang="ts">
import { computed, ref, watch } from "vue";

import AuthoringRadiusProfileFields from "@/authoring/components/AuthoringRadiusProfileFields.vue";
import type { AuthoredDriverKind, AuthoredRadiusProfileKey } from "@/authoring/types";
import FrameStableSelect from "@/components/FrameStableSelect.vue";

const props = defineProps<{
  node: "hand" | "head";
  driverKind: AuthoredDriverKind;
  canUsePendulum: boolean;
  isFirstSegment: boolean;
  phaseDeg: number;
  radius: number;
  omega: number;
  amplitudeDeg: number;
  cyclesPerUnit: number;
  swingPhaseDeg: number;
  durationUnits: number;
  radiusProfileKeys: readonly AuthoredRadiusProfileKey[];
}>();

const emit = defineEmits<{
  (event: "update:phase-deg", value: number): void;
  (event: "update:radius", value: number): void;
  (event: "update:omega", value: number): void;
  (event: "update:driver-kind", value: AuthoredDriverKind): void;
  (
    event: "update:pendulum-field",
    payload: {
      field: "amplitudeDeg" | "cyclesPerUnit" | "swingPhaseDeg";
      value: number;
    }
  ): void;
  (event: "add:radius-profile-key", key: AuthoredRadiusProfileKey): void;
  (
    event: "update:radius-profile-key",
    payload: { keyIndex: number; field: "t" | "radius"; value: number }
  ): void;
  (event: "delete:radius-profile-key", keyIndex: number): void;
}>();

const phaseDraft = ref<string | null>(null);
const phaseError = ref(false);
const radiusDraft = ref<string | null>(null);
const radiusError = ref(false);
const omegaDraft = ref<string | null>(null);
const omegaError = ref(false);
const amplitudeDraft = ref<string | null>(null);
const amplitudeError = ref(false);
const cyclesDraft = ref<string | null>(null);
const cyclesError = ref(false);
const swingPhaseDraft = ref<string | null>(null);
const swingPhaseError = ref(false);

const hasRadiusProfileKeys = computed(() => props.radiusProfileKeys.length > 0);
const canAddRadiusProfileKey = computed(
  () => Number.isFinite(props.durationUnits) && props.durationUnits > 0
);
const driverOptions = computed(() => [
  { value: "circle", label: "Circle" },
  { value: "pendulum", label: "Pendulum", disabled: !props.canUsePendulum }
]);

watch(
  () => props.driverKind,
  () => {
    omegaDraft.value = null;
    omegaError.value = false;
    amplitudeDraft.value = null;
    amplitudeError.value = false;
    cyclesDraft.value = null;
    cyclesError.value = false;
    swingPhaseDraft.value = null;
    swingPhaseError.value = false;
  }
);
watch(
  () => props.phaseDeg,
  () => {
    phaseDraft.value = null;
    phaseError.value = false;
  }
);
watch(
  () => props.amplitudeDeg,
  () => {
    amplitudeDraft.value = null;
    amplitudeError.value = false;
  }
);
watch(
  () => props.cyclesPerUnit,
  () => {
    cyclesDraft.value = null;
    cyclesError.value = false;
  }
);
watch(
  () => props.swingPhaseDeg,
  () => {
    swingPhaseDraft.value = null;
    swingPhaseError.value = false;
  }
);
watch(
  () => props.radius,
  () => {
    radiusDraft.value = null;
    radiusError.value = false;
  }
);
watch(
  () => props.omega,
  () => {
    omegaDraft.value = null;
    omegaError.value = false;
  }
);

function commitNumeric(
  draftRef: typeof phaseDraft,
  errorRef: typeof phaseError,
  committed: number,
  emitChange: (next: number) => void
) {
  if (draftRef.value === null) {
    return;
  }

  const next = Number(draftRef.value);
  if (!Number.isFinite(next)) {
    errorRef.value = true;
    return;
  }

  draftRef.value = null;
  errorRef.value = false;
  if (next !== committed) {
    emitChange(next);
  }
}

function onPhaseInput(event: Event) {
  phaseDraft.value = (event.target as HTMLInputElement).value;
}
function onPhaseBlur() {
  commitNumeric(phaseDraft, phaseError, props.phaseDeg, (value) => emit("update:phase-deg", value));
}

function onRadiusInput(event: Event) {
  radiusDraft.value = (event.target as HTMLInputElement).value;
}
function onRadiusBlur() {
  commitNumeric(radiusDraft, radiusError, props.radius, (value) => emit("update:radius", value));
}

function onOmegaInput(event: Event) {
  omegaDraft.value = (event.target as HTMLInputElement).value;
}
function onOmegaBlur() {
  commitNumeric(omegaDraft, omegaError, props.omega, (value) => emit("update:omega", value));
}

function onAmplitudeInput(event: Event) {
  amplitudeDraft.value = (event.target as HTMLInputElement).value;
}
function onAmplitudeBlur() {
  commitNumeric(amplitudeDraft, amplitudeError, props.amplitudeDeg, (value) =>
    emit("update:pendulum-field", { field: "amplitudeDeg", value })
  );
}

function onCyclesInput(event: Event) {
  cyclesDraft.value = (event.target as HTMLInputElement).value;
}
function onCyclesBlur() {
  commitNumeric(cyclesDraft, cyclesError, props.cyclesPerUnit, (value) =>
    emit("update:pendulum-field", { field: "cyclesPerUnit", value })
  );
}

function onSwingPhaseInput(event: Event) {
  swingPhaseDraft.value = (event.target as HTMLInputElement).value;
}
function onSwingPhaseBlur() {
  commitNumeric(swingPhaseDraft, swingPhaseError, props.swingPhaseDeg, (value) =>
    emit("update:pendulum-field", { field: "swingPhaseDeg", value })
  );
}

function onDriverKindChange(value: string | number) {
  emit("update:driver-kind", String(value) as AuthoredDriverKind);
}

function addInitialRadiusProfileKey() {
  if (!canAddRadiusProfileKey.value) {
    return;
  }

  emit("add:radius-profile-key", { t: props.durationUnits, radius: props.radius });
}
</script>

<template>
  <div
    class="grid min-w-0 content-start gap-2"
  >
    <p class="px-1 text-xs uppercase tracking-[0.2em] text-ui-text-muted">{{ node }}</p>
    <div
      class="grid min-w-0 content-start gap-3 rounded-2xl border border-ui-border-subtle bg-ui-surface p-3"
    >
      <div class="flex items-center justify-between gap-2">
        <label>
          <span class="sr-only">{{ node }} driver</span>
          <FrameStableSelect
            class="order-2 rounded-lg border border-ui-border-strong bg-ui-input px-2 py-1 text-xs text-ui-text transition focus:border-sky-400"
            :model-value="driverKind"
            :options="driverOptions"
            @click.stop
            @update:model-value="onDriverKindChange"
          />
        </label>
        <button
          v-if="driverKind === 'circle' && !hasRadiusProfileKeys"
          type="button"
          class="order-1 rounded-lg border border-ui-border-strong bg-ui-surface px-2 py-1 text-xs text-ui-text-secondary transition hover:border-sky-400 hover:bg-ui-surface-raised hover:text-ui-text disabled:cursor-not-allowed disabled:border-ui-border disabled:bg-ui-surface-raised disabled:text-ui-text-muted"
          :disabled="!canAddRadiusProfileKey"
          aria-label="Add radius keys"
          title="Add radius keys"
          @click.stop="addInitialRadiusProfileKey"
        >
          +
        </button>
      </div>

    <p v-if="driverKind === 'circle' && !canUsePendulum" class="text-xs text-ui-text-muted">
      Pendulum requires wall or wheel; a head must start in the lower half.
    </p>

    <template v-if="isFirstSegment">
      <label class="grid min-w-0 gap-1 text-sm text-ui-text-secondary">
        <span class="text-xs uppercase tracking-[0.2em] text-ui-text-muted">Start phase (deg)</span>
        <input
          type="number"
          step="any"
          class="w-full min-w-0 rounded-2xl border border-ui-border-strong bg-ui-input px-3 py-2 text-ui-text transition focus:border-sky-400"
          :class="phaseError ? 'border-rose-500' : ''"
          :value="phaseDraft ?? String(phaseDeg)"
          @input="onPhaseInput"
          @blur="onPhaseBlur"
        />
      </label>

      <label v-if="!hasRadiusProfileKeys" class="grid min-w-0 gap-1 text-sm text-ui-text-secondary">
        <span class="text-xs uppercase tracking-[0.2em] text-ui-text-muted">Radius</span>
        <input
          type="number"
          step="any"
          class="w-full min-w-0 rounded-2xl border border-ui-border-strong bg-ui-input px-3 py-2 text-ui-text transition focus:border-sky-400"
          :class="radiusError ? 'border-rose-500' : ''"
          :value="radiusDraft ?? String(radius)"
          @input="onRadiusInput"
          @blur="onRadiusBlur"
        />
      </label>
    </template>

    <label v-if="driverKind === 'circle'" class="grid min-w-0 gap-1 text-sm text-ui-text-secondary">
      <span class="text-xs uppercase tracking-[0.2em] text-ui-text-muted">Omega</span>
      <input
        type="number"
        step="any"
        class="w-full min-w-0 rounded-2xl border border-ui-border-strong bg-ui-input px-3 py-2 text-ui-text transition focus:border-sky-400"
        :class="omegaError ? 'border-rose-500' : ''"
        :value="omegaDraft ?? String(omega)"
        @input="onOmegaInput"
        @blur="onOmegaBlur"
      />
    </label>

    <template v-else>
      <label class="grid min-w-0 gap-1 text-sm text-ui-text-secondary">
        <span class="text-xs uppercase tracking-[0.2em] text-ui-text-muted">Amplitude (deg)</span>
        <input
          type="number"
          min="0"
          max="90"
          step="any"
          class="w-full min-w-0 rounded-2xl border border-ui-border-strong bg-ui-input px-3 py-2 text-ui-text transition focus:border-sky-400"
          :class="amplitudeError ? 'border-rose-500' : ''"
          :value="amplitudeDraft ?? String(amplitudeDeg)"
          @input="onAmplitudeInput"
          @blur="onAmplitudeBlur"
        />
      </label>

      <label class="grid min-w-0 gap-1 text-sm text-ui-text-secondary">
        <span class="text-xs uppercase tracking-[0.2em] text-ui-text-muted">Cycles per unit</span>
        <input
          type="number"
          min="0"
          step="any"
          class="w-full min-w-0 rounded-2xl border border-ui-border-strong bg-ui-input px-3 py-2 text-ui-text transition focus:border-sky-400"
          :class="cyclesError ? 'border-rose-500' : ''"
          :value="cyclesDraft ?? String(cyclesPerUnit)"
          @input="onCyclesInput"
          @blur="onCyclesBlur"
        />
      </label>

      <label class="grid min-w-0 gap-1 text-sm text-ui-text-secondary">
        <span class="text-xs uppercase tracking-[0.2em] text-ui-text-muted">Swing phase (deg)</span>
        <input
          type="number"
          step="any"
          class="w-full min-w-0 rounded-2xl border border-ui-border-strong bg-ui-input px-3 py-2 text-ui-text transition focus:border-sky-400"
          :class="swingPhaseError ? 'border-rose-500' : ''"
          :value="swingPhaseDraft ?? String(swingPhaseDeg)"
          @input="onSwingPhaseInput"
          @blur="onSwingPhaseBlur"
        />
      </label>
      <div class="group relative flex items-center gap-2 text-xs text-ui-text-muted">
        <span>Oscillator position</span>
        <button
          type="button"
          class="flex h-5 w-5 items-center justify-center rounded-full border border-ui-border-strong text-[11px] font-semibold text-ui-text-secondary transition hover:border-sky-400 hover:text-ui-text focus-visible:border-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
          aria-label="Oscillator position help"
          title="Oscillator position help"
        >
          i
        </button>
        <span
          role="tooltip"
          class="pointer-events-none absolute bottom-full left-0 z-20 mb-2 w-64 rounded-xl border border-ui-border-strong bg-slate-950 px-3 py-2 text-xs leading-5 text-ui-text-secondary opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        >
          0° crosses the centre toward increasing angle, 90° is one dead point, 180° crosses back,
          and 270° is the other dead point.
        </span>
      </div>
      <div v-if="node === 'head'" class="group relative flex items-center gap-2 text-xs text-ui-text-muted">
        <span>Head pendulum</span>
        <button
          type="button"
          class="flex h-5 w-5 items-center justify-center rounded-full border border-ui-border-strong text-[11px] font-semibold text-ui-text-secondary transition hover:border-sky-400 hover:text-ui-text focus-visible:border-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
          aria-label="Head pendulum help"
          title="Head pendulum help"
        >
          i
        </button>
        <span
          role="tooltip"
          class="pointer-events-none absolute bottom-full left-0 z-20 mb-2 w-64 rounded-xl border border-ui-border-strong bg-slate-950 px-3 py-2 text-xs leading-5 text-ui-text-secondary opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        >
          Head pendulums are centred straight down. Start phase, amplitude, and swing phase must
          describe that same oscillator position.
        </span>
      </div>
    </template>

    <AuthoringRadiusProfileFields
      v-if="driverKind === 'circle' && hasRadiusProfileKeys"
      :keys="radiusProfileKeys"
      :duration-units="durationUnits"
      :anchor-radius="radius"
      :is-anchor-editable="isFirstSegment"
      @update:anchor-radius="(value) => emit('update:radius', value)"
      @add:key="(key) => emit('add:radius-profile-key', key)"
      @update:key="(payload) => emit('update:radius-profile-key', payload)"
      @delete:key="(keyIndex) => emit('delete:radius-profile-key', keyIndex)"
    />
    </div>
  </div>
</template>
