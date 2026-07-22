<script setup lang="ts">
import { computed, ref, watch } from "vue";

import type { AuthoredRadiusProfileKey } from "@/authoring/types";

const EPSILON = 1e-9;

const props = defineProps<{
  keys: readonly AuthoredRadiusProfileKey[];
  durationUnits: number;
  anchorRadius: number;
  isAnchorEditable: boolean;
}>();

const emit = defineEmits<{
  (event: "update:anchor-radius", value: number): void;
  (event: "add:key", key: AuthoredRadiusProfileKey): void;
  (event: "update:key", payload: { keyIndex: number; field: "t" | "radius"; value: number }): void;
  (event: "delete:key", keyIndex: number): void;
}>();

const drafts = ref<Record<string, string>>({});
const errors = ref<Record<string, boolean>>({});

watch(
  () => [props.keys, props.anchorRadius, props.durationUnits],
  () => {
    drafts.value = {};
    errors.value = {};
  },
  { deep: true }
);

function inputId(keyIndex: number, field: "t" | "radius"): string {
  return `${keyIndex}:${field}`;
}

function radiusAt(t: number): number {
  if (props.keys.length === 0 || t <= 0) {
    return props.anchorRadius;
  }

  let previousT = 0;
  let previousRadius = props.anchorRadius;
  for (const key of props.keys) {
    if (t <= key.t) {
      const span = key.t - previousT;
      if (span <= 0) {
        return key.radius;
      }
      const progress = (t - previousT) / span;
      return previousRadius + (key.radius - previousRadius) * progress;
    }
    previousT = key.t;
    previousRadius = key.radius;
  }

  return previousRadius;
}

const nextKey = computed<AuthoredRadiusProfileKey | null>(() => {
  if (!Number.isFinite(props.durationUnits) || props.durationUnits <= 0) {
    return null;
  }

  if (props.keys.length === 0) {
    return { t: props.durationUnits, radius: props.anchorRadius };
  }

  const points = [0, ...props.keys.map((key) => key.t), props.durationUnits];
  let bestStart = 0;
  let bestEnd = 0;
  let bestSpan = 0;

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const span = end - start;
    if (span > bestSpan) {
      bestStart = start;
      bestEnd = end;
      bestSpan = span;
    }
  }

  if (bestSpan <= EPSILON) {
    return null;
  }

  const t = (bestStart + bestEnd) / 2;
  return { t, radius: radiusAt(t) };
});

function onInput(id: string, event: Event) {
  drafts.value = { ...drafts.value, [id]: (event.target as HTMLInputElement).value };
}

function commitNumeric(id: string, committed: number, emitChange: (next: number) => void) {
  const draft = drafts.value[id];
  if (draft === undefined) {
    return;
  }

  const next = Number(draft);
  if (!Number.isFinite(next)) {
    errors.value = { ...errors.value, [id]: true };
    return;
  }

  const { [id]: _draft, ...nextDrafts } = drafts.value;
  const { [id]: _error, ...nextErrors } = errors.value;
  drafts.value = nextDrafts;
  errors.value = nextErrors;

  if (next !== committed) {
    emitChange(next);
  }
}

function onAnchorBlur() {
  commitNumeric("anchor", props.anchorRadius, (value) => emit("update:anchor-radius", value));
}

function onKeyBlur(keyIndex: number, field: "t" | "radius") {
  const key = props.keys[keyIndex];
  if (!key) {
    return;
  }

  commitNumeric(inputId(keyIndex, field), key[field], (value) => {
    emit("update:key", { keyIndex, field, value });
  });
}

function onAddKey() {
  if (nextKey.value) {
    emit("add:key", nextKey.value);
  }
}
</script>

<template>
  <div class="grid min-w-0 gap-2 border-t border-ui-border-subtle pt-3">
    <div class="flex items-center justify-between gap-2">
      <p class="text-xs uppercase tracking-[0.2em] text-ui-text-muted">Radius keys</p>
      <button
        type="button"
        class="rounded-lg border border-ui-border-strong bg-ui-surface px-2 py-1 text-xs text-ui-text-secondary transition hover:border-sky-400 hover:bg-ui-surface-raised disabled:cursor-not-allowed disabled:border-ui-border disabled:bg-ui-surface-raised disabled:text-ui-text-muted"
        :disabled="!nextKey"
        aria-label="Add radius key"
        title="Add radius key"
        @click.stop="onAddKey"
      >
        +
      </button>
    </div>

    <div class="grid grid-cols-[3.75rem_minmax(0,1fr)_1.75rem] items-end gap-1.5">
      <span class="text-xs uppercase tracking-[0.16em] text-ui-text-muted">t</span>
      <span class="text-xs uppercase tracking-[0.16em] text-ui-text-muted">Radius</span>
      <span aria-hidden="true"></span>

      <input
        type="number"
        value="0"
        disabled
        class="w-full min-w-0 rounded-xl border border-ui-border-strong bg-ui-input px-2 py-1.5 text-sm text-ui-text-muted"
      />
      <input
        type="number"
        step="any"
        class="w-full min-w-0 rounded-xl border border-ui-border-strong bg-ui-input px-2 py-1.5 text-sm text-ui-text transition focus:border-sky-400 disabled:border-ui-border disabled:bg-ui-surface disabled:text-ui-text-muted"
        :class="errors.anchor ? 'border-rose-500' : ''"
        :disabled="!isAnchorEditable"
        :value="drafts.anchor ?? String(anchorRadius)"
        @input="onInput('anchor', $event)"
        @blur="onAnchorBlur"
      />
      <span class="text-center text-xs text-ui-text-muted" title="Start radius">start</span>

      <template v-for="(key, keyIndex) in keys" :key="`${key.t}:${keyIndex}`">
        <input
          type="number"
          step="any"
          class="w-full min-w-0 rounded-xl border border-ui-border-strong bg-ui-input px-2 py-1.5 text-sm text-ui-text transition focus:border-sky-400"
          :class="errors[inputId(keyIndex, 't')] ? 'border-rose-500' : ''"
          :value="drafts[inputId(keyIndex, 't')] ?? String(key.t)"
          @input="onInput(inputId(keyIndex, 't'), $event)"
          @blur="onKeyBlur(keyIndex, 't')"
        />
        <input
          type="number"
          step="any"
          class="w-full min-w-0 rounded-xl border border-ui-border-strong bg-ui-input px-2 py-1.5 text-sm text-ui-text transition focus:border-sky-400"
          :class="errors[inputId(keyIndex, 'radius')] ? 'border-rose-500' : ''"
          :value="drafts[inputId(keyIndex, 'radius')] ?? String(key.radius)"
          @input="onInput(inputId(keyIndex, 'radius'), $event)"
          @blur="onKeyBlur(keyIndex, 'radius')"
        />
        <button
          type="button"
          class="w-7 rounded-lg border border-ui-border-strong bg-ui-surface px-2 py-1.5 text-xs text-ui-text-secondary transition hover:border-rose-500 hover:bg-rose-950/30 hover:text-rose-200"
          aria-label="Delete radius key"
          title="Delete radius key"
          @click.stop="emit('delete:key', keyIndex)"
        >
          -
        </button>
      </template>
    </div>
  </div>
</template>
