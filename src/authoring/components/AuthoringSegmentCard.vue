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
import type { PlaneId, PlaneSide, RelativeRigPose } from "@/engine/types";

type EditableNode = "hand" | "head";
const PLANE_OPTIONS: readonly PlaneId[] = ["wall", "wheel", "floor"];
const PLANE_SIDE_OPTIONS: readonly PlaneSide[] = ["a", "b"];

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
  (event: "update:plane-side", value: PlaneSide): void;
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
  return props.segment[node].driver.radiusProfile?.keys ?? [];
}

function onUpdateOmega(node: EditableNode, displayValue: number) {
  emit("update:omega", { node, value: toRadiansPerUnit(displayValue, props.omegaUnit) });
}

function onPlaneChange(event: Event) {
  emit("update:plane", (event.target as HTMLSelectElement).value as PlaneId);
}

function onPlaneSideChange(event: Event) {
  emit("update:plane-side", (event.target as HTMLSelectElement).value as PlaneSide);
}
</script>

<template>
  <div class="grid min-w-0 gap-3">
    <button
      v-if="showBoundaryRow"
      type="button"
      class="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-ui-border bg-ui-surface px-4 py-3 text-left text-sm text-ui-text-secondary transition hover:border-sky-400 hover:bg-ui-selected hover:text-ui-selected-text"
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
        isActive && isSelected
          ? 'border-sky-400 bg-ui-selected ring-1 ring-emerald-400/80'
          : isActive
            ? 'border-emerald-400 bg-emerald-950/35'
            : isSelected
              ? 'border-sky-400 bg-ui-selected/85 ring-1 ring-sky-400/70'
              : 'border-ui-border-subtle bg-ui-surface'
      ]"
      :data-active-segment="isActive ? 'true' : 'false'"
      @click="emit('select')"
    >
      <div class="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
        <div class="min-w-0 flex-1">
          <p class="text-xs font-medium uppercase tracking-[0.14em] text-ui-text-muted">
            {{ segment.kind === "first" ? "Starting segment" : "Continuation segment" }}
          </p>
          <p class="mt-1 text-xs uppercase tracking-[0.16em] text-sky-300">
            {{ boundary.planeId }} plane
          </p>
          <p class="mt-1 text-sm text-ui-text-secondary wrap-break-word">
            {{ formatPose(boundary.startPose) }}
          </p>
          <p class="mt-1 text-sm text-ui-text-muted wrap-break-word">
            Ends {{ formatPose(boundary.endPose) }}
          </p>
        </div>

        <div class="flex flex-wrap gap-2 sm:shrink-0">
          <button
            type="button"
            class="rounded-xl border border-ui-border-strong bg-ui-surface px-3 py-2 text-xs text-ui-text-secondary transition hover:border-ui-focus hover:bg-ui-surface-raised hover:text-ui-text"
            @click.stop="emit('duplicate')"
          >
            Duplicate
          </button>
          <button
            type="button"
            class="rounded-xl border border-rose-800 bg-ui-surface px-3 py-2 text-xs text-rose-200 transition hover:border-rose-600 hover:bg-rose-950/30 disabled:cursor-not-allowed disabled:border-ui-border disabled:bg-ui-surface-raised disabled:text-ui-text-muted"
            :disabled="!canDelete"
            @click.stop="emit('delete')"
          >
            Delete
          </button>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-3">
        <label class="grid min-w-0 gap-1 text-sm text-ui-text-secondary">
          <span class="text-xs font-medium uppercase tracking-[0.14em] text-ui-text-muted"
            >Plane</span
          >
          <select
            class="w-full min-w-0 rounded-2xl border border-ui-border-strong bg-ui-input px-3 py-2 text-ui-text transition focus:border-sky-400"
            :value="segment.planeId ?? 'wall'"
            @click.stop
            @change="onPlaneChange"
          >
            <option v-for="plane in PLANE_OPTIONS" :key="plane" :value="plane">
              {{ plane }}
            </option>
          </select>
        </label>

        <label class="grid min-w-0 gap-1 text-sm text-ui-text-secondary">
          <span class="text-xs font-medium uppercase tracking-[0.14em] text-ui-text-muted"
            >Plane side</span
          >
          <select
            class="w-full min-w-0 rounded-2xl border border-ui-border-strong bg-ui-input px-3 py-2 text-ui-text transition focus:border-sky-400"
            :value="segment.planeSide ?? 'a'"
            @click.stop
            @change="onPlaneSideChange"
          >
            <option v-for="side in PLANE_SIDE_OPTIONS" :key="side" :value="side">
              {{ side.toUpperCase() }}
            </option>
          </select>
        </label>

        <label class="grid min-w-0 gap-1 text-sm text-ui-text-secondary">
          <span class="text-xs font-medium uppercase tracking-[0.14em] text-ui-text-muted"
            >Duration</span
          >
          <input
            type="number"
            step="any"
            class="w-full min-w-0 rounded-2xl border border-ui-border-strong bg-ui-input px-3 py-2 text-ui-text transition focus:border-sky-400"
            :class="durationError ? 'border-rose-500' : ''"
            :value="durationDraft ?? String(segment.durationUnits)"
            @input="onDurationInput"
            @blur="onDurationBlur"
          />
        </label>
      </div>

      <div class="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
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
