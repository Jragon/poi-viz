<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
  node: "hand" | "head";
  isFirstSegment: boolean;
  phaseDeg: number;
  radius: number;
  omega: number;
}>();

const emit = defineEmits<{
  (event: "update:phase-deg", value: number): void;
  (event: "update:radius", value: number): void;
  (event: "update:omega", value: number): void;
}>();

const phaseDraft = ref<string | null>(null);
const phaseError = ref(false);
const radiusDraft = ref<string | null>(null);
const radiusError = ref(false);
const omegaDraft = ref<string | null>(null);
const omegaError = ref(false);

watch(
  () => props.phaseDeg,
  () => {
    phaseDraft.value = null;
    phaseError.value = false;
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
</script>

<template>
  <div class="grid min-w-0 gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
    <p class="text-xs uppercase tracking-[0.2em] text-slate-500">{{ node }}</p>

    <template v-if="isFirstSegment">
      <label class="grid min-w-0 gap-1 text-sm text-slate-300">
        <span class="text-xs uppercase tracking-[0.2em] text-slate-500">Start phase (deg)</span>
        <input
          type="number"
          step="any"
          class="w-full min-w-0 rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition focus:border-sky-400"
          :class="phaseError ? 'border-rose-500' : ''"
          :value="phaseDraft ?? String(phaseDeg)"
          @input="onPhaseInput"
          @blur="onPhaseBlur"
        />
      </label>

      <label class="grid min-w-0 gap-1 text-sm text-slate-300">
        <span class="text-xs uppercase tracking-[0.2em] text-slate-500">Radius</span>
        <input
          type="number"
          step="any"
          class="w-full min-w-0 rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition focus:border-sky-400"
          :class="radiusError ? 'border-rose-500' : ''"
          :value="radiusDraft ?? String(radius)"
          @input="onRadiusInput"
          @blur="onRadiusBlur"
        />
      </label>
    </template>

    <label class="grid min-w-0 gap-1 text-sm text-slate-300">
      <span class="text-xs uppercase tracking-[0.2em] text-slate-500">Omega</span>
      <input
        type="number"
        step="any"
        class="w-full min-w-0 rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition focus:border-sky-400"
        :class="omegaError ? 'border-rose-500' : ''"
        :value="omegaDraft ?? String(omega)"
        @input="onOmegaInput"
        @blur="onOmegaBlur"
      />
    </label>
  </div>
</template>
