<script setup lang="ts">
import { ref, watch } from "vue";

import AuthoringNodeFields from "@/authoring/components/AuthoringNodeFields.vue";
import type {
  AuthoredOmegaUnit,
  AuthoredRadiusProfileKey,
  AuthoredSegment,
  DerivedAuthoredSegmentBoundary
} from "@/authoring/types";
import { PI } from "@/engine/constants";
import type { PlaneId, RelativeRigPose } from "@/engine/types";

type EditableNode = "hand" | "head";
const PLANE_OPTIONS: readonly PlaneId[] = ["wall", "wheel", "floor"];

const props = defineProps<{
  segment: AuthoredSegment;
  boundary: DerivedAuthoredSegmentBoundary;
  segmentIndex: number;
  omegaUnit: AuthoredOmegaUnit;
  isActive: boolean;
  isSelected: boolean;
  canDelete: boolean;
  showBoundaryRow: boolean;
}>();

const emit = defineEmits<{
  (event: "select"): void;
  (event: "duplicate"): void;
  (event: "delete"): void;
  (event: "jump-to-boundary"): void;
  (event: "update:duration", value: number): void;
  (event: "update:plane", value: PlaneId): void;
  (
    event: "update:start-pose",
    payload: { node: EditableNode; field: "phaseDeg" | "radius"; value: number }
  ): void;
  (event: "update:omega", payload: { node: EditableNode; value: number }): void;
  (
    event: "add:radius-profile-key",
    payload: { node: EditableNode; key: AuthoredRadiusProfileKey }
  ): void;
  (
    event: "update:radius-profile-key",
    payload: { node: EditableNode; keyIndex: number; field: "t" | "radius"; value: number }
  ): void;
  (event: "delete:radius-profile-key", payload: { node: EditableNode; keyIndex: number }): void;
}>();

const durationDraft = ref<string | null>(null);
const durationError = ref(false);

watch(
  () => props.segment.durationUnits,
  () => {
    durationDraft.value = null;
    durationError.value = false;
  }
);

function onDurationInput(event: Event) {
  durationDraft.value = (event.target as HTMLInputElement).value;
}

function onDurationBlur() {
  if (durationDraft.value === null) {
    return;
  }
  const next = Number(durationDraft.value);
  if (!Number.isFinite(next)) {
    durationError.value = true;
    return;
  }
  durationDraft.value = null;
  durationError.value = false;
  if (next !== props.segment.durationUnits) {
    emit("update:duration", next);
  }
}

function normalizeDegrees(phaseRad: number): number {
  const degrees = (phaseRad * 180) / PI;
  return ((degrees % 360) + 360) % 360;
}

function formatNumber(value: number, digits = 2): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "--";
}

function formatPose(pose: RelativeRigPose): string {
  return `Hand ${formatNumber(normalizeDegrees(pose.handPose.phaseAbs), 1)}deg / ${formatNumber(
    pose.handPose.radius,
    2
  )}, Head ${formatNumber(normalizeDegrees(pose.headPose.phaseAbs), 1)}deg / ${formatNumber(
    pose.headPose.radius,
    2
  )}`;
}

function toRadiansPerUnit(value: number, unit: AuthoredOmegaUnit): number {
  const tau = 2 * PI;
  return unit === "circles-per-unit" ? value * tau : value;
}

function fromRadiansPerUnit(value: number, unit: AuthoredOmegaUnit): number {
  const tau = 2 * PI;
  return unit === "circles-per-unit" ? value / tau : value;
}

function displayOmega(node: EditableNode): number {
  const driver = props.segment[node].driver;
  const radians = toRadiansPerUnit(driver.omega, driver.omegaUnit);
  return fromRadiansPerUnit(radians, props.omegaUnit);
}

function displayStartRadius(node: EditableNode): number {
  if (props.segment.kind === "first") {
    return props.segment[node].startPose.radius;
  }

  return node === "hand"
    ? props.boundary.startPose.handPose.radius
    : props.boundary.startPose.headPose.radius;
}

function radiusProfileKeys(node: EditableNode): readonly AuthoredRadiusProfileKey[] {
  return props.segment[node].radiusProfile?.keys ?? [];
}

function onUpdateOmega(node: EditableNode, displayValue: number) {
  emit("update:omega", { node, value: toRadiansPerUnit(displayValue, props.omegaUnit) });
}

function onPlaneChange(event: Event) {
  emit("update:plane", (event.target as HTMLSelectElement).value as PlaneId);
}
</script>

<template>
  <div class="grid min-w-0 gap-3">
    <button
      v-if="showBoundaryRow"
      type="button"
      class="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-left text-xs text-slate-400 transition hover:border-sky-400 hover:text-slate-200"
      @click="emit('jump-to-boundary')"
    >
      <span class="min-w-0 wrap-break-word"
        >Boundary {{ segmentIndex }} / {{ boundary.planeId }}:
        {{ formatPose(boundary.startPose) }}</span
      >
      <span class="uppercase tracking-[0.2em] text-sky-300">Jump</span>
    </button>

    <section
      class="grid min-w-0 gap-4 rounded-3xl border p-4 transition"
      :class="[
        isActive ? 'border-emerald-400 bg-emerald-950/10' : 'border-slate-800 bg-slate-950/70',
        isSelected ? 'ring-1 ring-sky-400/70' : ''
      ]"
      :data-active-segment="isActive ? 'true' : 'false'"
      @click="emit('select')"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <p class="text-xs uppercase tracking-[0.22em] text-slate-500">
            {{ segment.kind === "first" ? "Starting segment" : "Continuation segment" }}
          </p>
          <p class="mt-1 text-xs uppercase tracking-[0.16em] text-sky-300">
            {{ boundary.planeId }} plane
          </p>
          <p class="mt-1 text-sm text-slate-300 wrap-break-word">
            {{ formatPose(boundary.startPose) }}
          </p>
          <p class="mt-1 text-xs text-slate-500 wrap-break-word">
            Ends {{ formatPose(boundary.endPose) }}
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-500"
            @click.stop="emit('duplicate')"
          >
            Duplicate
          </button>
          <button
            type="button"
            class="rounded-xl border border-rose-800 px-3 py-2 text-xs text-rose-200 transition hover:border-rose-600 disabled:opacity-50"
            :disabled="!canDelete"
            @click.stop="emit('delete')"
          >
            Delete
          </button>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <label class="grid min-w-0 gap-1 text-sm text-slate-300">
          <span class="text-xs uppercase tracking-[0.2em] text-slate-500">Plane</span>
          <select
            class="w-full min-w-0 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition focus:border-sky-400"
            :value="segment.planeId ?? 'wall'"
            @click.stop
            @change="onPlaneChange"
          >
            <option v-for="plane in PLANE_OPTIONS" :key="plane" :value="plane">
              {{ plane }}
            </option>
          </select>
        </label>

        <label class="grid min-w-0 gap-1 text-sm text-slate-300">
          <span class="text-xs uppercase tracking-[0.2em] text-slate-500">Duration</span>
          <input
            type="number"
            step="any"
            class="w-full min-w-0 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition focus:border-sky-400"
            :class="durationError ? 'border-rose-500' : ''"
            :value="durationDraft ?? String(segment.durationUnits)"
            @input="onDurationInput"
            @blur="onDurationBlur"
          />
        </label>
      </div>

      <div class="grid min-w-0 grid-cols-2 gap-4">
        <AuthoringNodeFields
          v-for="node in ['hand', 'head'] as const"
          :key="node"
          :node="node"
          :is-first-segment="segment.kind === 'first'"
          :phase-deg="segment.kind === 'first' ? segment[node].startPose.phaseDeg : 0"
          :radius="displayStartRadius(node)"
          :omega="displayOmega(node)"
          :duration-units="segment.durationUnits"
          :radius-profile-keys="radiusProfileKeys(node)"
          @update:phase-deg="
            (value) => emit('update:start-pose', { node, field: 'phaseDeg', value })
          "
          @update:radius="(value) => emit('update:start-pose', { node, field: 'radius', value })"
          @update:omega="(value) => onUpdateOmega(node, value)"
          @add:radius-profile-key="(key) => emit('add:radius-profile-key', { node, key })"
          @update:radius-profile-key="
            (payload) => emit('update:radius-profile-key', { node, ...payload })
          "
          @delete:radius-profile-key="
            (keyIndex) => emit('delete:radius-profile-key', { node, keyIndex })
          "
        />
      </div>
    </section>
  </div>
</template>
