<script setup lang="ts">
import type {
  MetronomeRule,
  MetronomeRuleDraft,
  MetronomeToneId
} from "@/visualizer/usePhaseMetronome";
import { degreesToRadians, radiansToDegrees } from "@/visualizer/usePhaseMetronome";

const props = defineProps<{
  rules: readonly MetronomeRule[];
  rigIds: readonly string[];
  isAudioEnabled: boolean;
  audioErrorMessage?: string | null;
}>();

const emit = defineEmits<{
  addRule: [];
  removeRule: [ruleId: string];
  updateRule: [ruleId: string, nextRule: MetronomeRuleDraft];
  setAudioEnabled: [enabled: boolean];
}>();

const absolutePresets = [
  { label: "R", value: 0 },
  { label: "U", value: 90 },
  { label: "L", value: 180 },
  { label: "D", value: 270 }
] as const;

const relativePresets = [
  { label: "Out", value: 0 },
  { label: "In", value: 180 }
] as const;

const tonePresets: ReadonlyArray<{ label: string; value: MetronomeToneId }> = [
  { label: "Low", value: "low" },
  { label: "Mid", value: "mid" },
  { label: "High", value: "high" },
  { label: "Accent", value: "accent" }
];

function ruleRigId(rule: MetronomeRule): string {
  return rule.source.rigId;
}

function toDraft(rule: MetronomeRule): MetronomeRuleDraft {
  return {
    enabled: rule.enabled,
    source: { ...rule.source },
    targetRad: rule.targetRad,
    tone: rule.tone
  };
}

function emitDraft(rule: MetronomeRule, nextRule: MetronomeRuleDraft) {
  emit("updateRule", rule.id, nextRule);
}

function setEnabled(rule: MetronomeRule, enabled: boolean) {
  emitDraft(rule, {
    ...toDraft(rule),
    enabled
  });
}

function setRuleRig(rule: MetronomeRule, rigId: string) {
  if (rule.source.kind === "absolute") {
    emitDraft(rule, {
      ...toDraft(rule),
      source: { ...rule.source, rigId }
    });
    return;
  }

  emitDraft(rule, {
    ...toDraft(rule),
    source: { kind: "relative-head-minus-hand", rigId }
  });
}

function setSourceKind(rule: MetronomeRule, kind: string) {
  const rigId = ruleRigId(rule);

  if (kind === "absolute") {
    emitDraft(rule, {
      ...toDraft(rule),
      source: { kind: "absolute", rigId, node: "head" }
    });
    return;
  }

  emitDraft(rule, {
    ...toDraft(rule),
    source: { kind: "relative-head-minus-hand", rigId }
  });
}

function setAbsoluteNode(rule: MetronomeRule, node: string) {
  if (rule.source.kind !== "absolute") {
    return;
  }

  emitDraft(rule, {
    ...toDraft(rule),
    source: {
      ...rule.source,
      node: node === "hand" ? "hand" : "head"
    }
  });
}

function onPhaseChange(rule: MetronomeRule, event: Event) {
  const target = event.target as HTMLInputElement;
  const nextDegrees = Number(target.value);
  if (!Number.isFinite(nextDegrees)) {
    return;
  }

  emitDraft(rule, {
    ...toDraft(rule),
    targetRad: degreesToRadians(nextDegrees)
  });
}

function applyPreset(rule: MetronomeRule, degrees: number) {
  emitDraft(rule, {
    ...toDraft(rule),
    targetRad: degreesToRadians(degrees)
  });
}

function setTone(rule: MetronomeRule, tone: MetronomeToneId) {
  emitDraft(rule, {
    ...toDraft(rule),
    tone
  });
}
</script>

<template>
  <section class="grid gap-4 rounded-2xl border border-ui-border bg-ui-surface p-4 sm:p-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-xs font-medium uppercase tracking-[0.14em] text-ui-text-muted">Metronome</p>
        <p class="mt-1 text-sm text-ui-text-secondary">
          Phase-triggered clicks for hand, head, or head-minus-hand.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-full border px-4 py-2 text-sm font-medium transition"
          :class="
            props.isAudioEnabled
              ? 'border-emerald-500/70 bg-emerald-500/15 text-emerald-100 hover:border-emerald-400 hover:bg-emerald-500/20'
              : 'border-slate-700 text-slate-200 hover:border-slate-500 hover:text-white'
          "
          :aria-pressed="props.isAudioEnabled"
          @click="emit('setAudioEnabled', !props.isAudioEnabled)"
        >
          {{ props.isAudioEnabled ? "Audio On" : "Audio Off" }}
        </button>
        <button
          type="button"
          class="rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
          :disabled="props.rigIds.length === 0"
          @click="emit('addRule')"
        >
          + Click
        </button>
      </div>
    </div>

    <p v-if="props.audioErrorMessage" class="text-sm text-rose-300">
      {{ props.audioErrorMessage }}
    </p>

    <p v-if="props.rules.length === 0" class="text-sm text-slate-400">
      No click rules yet. Add one to trigger a beep on a phase crossing.
    </p>

    <div v-else class="grid gap-3">
      <div
        v-for="rule in props.rules"
        :key="rule.id"
        class="grid gap-3 rounded-2xl border border-ui-border-subtle bg-ui-surface-raised p-3 sm:p-4"
      >
        <div
          class="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,8rem)_auto] lg:items-start"
        >
          <label
            class="inline-flex min-h-9 cursor-pointer items-center gap-2 self-end text-sm font-medium uppercase tracking-[0.14em] text-ui-text-muted"
          >
            <span class="relative inline-flex h-6 w-10 items-center">
              <input
                type="checkbox"
                class="peer sr-only"
                :checked="rule.enabled"
                @change="setEnabled(rule, ($event.target as HTMLInputElement).checked)"
              />
              <span
                class="absolute inset-0 rounded-full bg-slate-800 transition peer-checked:bg-emerald-500/70 peer-focus-visible:ring-2 peer-focus-visible:ring-ui-focus peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-ui-surface-raised"
              ></span>
              <span
                class="absolute left-0.5 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-4"
              ></span>
            </span>
          </label>

          <div class="grid gap-1 self-end">
            <p class="text-[11px] font-medium uppercase tracking-[0.14em] text-ui-text-muted">
              Rig
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="rigId in props.rigIds"
                :key="rigId"
                type="button"
                class="min-h-9 rounded-full border px-3 py-1 text-sm font-medium transition"
                :class="
                  ruleRigId(rule) === rigId
                    ? 'border-sky-400/70 bg-sky-500/15 text-sky-100'
                    : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                "
                @click="setRuleRig(rule, rigId)"
              >
                {{ rigId }}
              </button>
            </div>
          </div>

          <div class="grid gap-1 self-end">
            <p class="text-[11px] font-medium uppercase tracking-[0.14em] text-ui-text-muted">
              Source
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="min-h-9 rounded-full border px-3 py-1 text-sm font-medium transition"
                :class="
                  rule.source.kind === 'absolute'
                    ? 'border-amber-400/70 bg-amber-500/15 text-amber-100'
                    : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                "
                @click="setSourceKind(rule, 'absolute')"
              >
                Absolute
              </button>
              <button
                type="button"
                class="min-h-9 rounded-full border px-3 py-1 text-sm font-medium transition"
                :class="
                  rule.source.kind === 'relative-head-minus-hand'
                    ? 'border-amber-400/70 bg-amber-500/15 text-amber-100'
                    : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                "
                @click="setSourceKind(rule, 'relative-head-minus-hand')"
              >
                Head - Hand
              </button>
            </div>
          </div>

          <div class="grid gap-1 self-end">
            <p class="text-[11px] font-medium uppercase tracking-[0.14em] text-ui-text-muted">
              {{ rule.source.kind === "absolute" ? "Node" : "Relation" }}
            </p>
            <div v-if="rule.source.kind === 'absolute'" class="flex flex-wrap gap-2">
              <button
                type="button"
                class="min-h-9 rounded-full border px-3 py-1 text-sm font-medium transition"
                :class="
                  rule.source.node === 'hand'
                    ? 'border-violet-400/70 bg-violet-500/15 text-violet-100'
                    : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                "
                @click="setAbsoluteNode(rule, 'hand')"
              >
                Hand
              </button>
              <button
                type="button"
                class="min-h-9 rounded-full border px-3 py-1 text-sm font-medium transition"
                :class="
                  rule.source.node === 'head'
                    ? 'border-violet-400/70 bg-violet-500/15 text-violet-100'
                    : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                "
                @click="setAbsoluteNode(rule, 'head')"
              >
                Head
              </button>
            </div>
            <div
              v-else
              class="inline-flex min-h-9 items-center rounded-full border border-ui-border-strong bg-ui-input px-3 py-1.5 text-sm text-ui-text-secondary"
            >
              Head - Hand
            </div>
          </div>

          <div class="grid gap-1 self-end lg:justify-items-end">
            <p class="text-[11px] font-medium uppercase tracking-[0.14em] text-ui-text-muted">
              Phase
            </p>
            <div class="flex items-center gap-2">
              <input
                type="number"
                step="1"
                class="w-20 rounded-xl border border-ui-border-strong bg-ui-input px-2.5 py-2 text-sm normal-case tracking-normal text-ui-text"
                :value="Math.round(radiansToDegrees(rule.targetRad) * 100) / 100"
                @input="onPhaseChange(rule, $event)"
              />
              <span class="text-xs normal-case tracking-normal text-slate-400">deg</span>
            </div>
          </div>

          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center self-end justify-self-start rounded-full border border-rose-900/70 text-rose-200 transition hover:border-rose-700 hover:bg-rose-950/40 hover:text-rose-100 lg:justify-self-end"
            aria-label="Remove click rule"
            @click="emit('removeRule', rule.id)"
          >
            <svg
              viewBox="0 0 24 24"
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M3 6h18" />
              <path d="M8 6V4.75A1.75 1.75 0 0 1 9.75 3h4.5A1.75 1.75 0 0 1 16 4.75V6" />
              <path d="M6.75 6l.8 12.05A2 2 0 0 0 9.55 20h4.9a2 2 0 0 0 1.99-1.95L17.25 6" />
              <path d="M10 10.25v5.5" />
              <path d="M14 10.25v5.5" />
            </svg>
          </button>
        </div>

        <div
          class="grid gap-2 border-t border-ui-border-subtle/80 pt-2 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-3"
        >
          <div class="grid gap-1">
            <p class="text-[11px] font-medium uppercase tracking-[0.14em] text-ui-text-muted">
              Tone
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="tone in tonePresets"
                :key="tone.value"
                type="button"
                class="whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition"
                :class="
                  rule.tone === tone.value
                    ? 'border-emerald-400/70 bg-emerald-500/15 text-emerald-100'
                    : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                "
                @click="setTone(rule, tone.value)"
              >
                {{ tone.label }}
              </button>
            </div>
          </div>

          <p
            v-if="rule.source.kind === 'relative-head-minus-hand'"
            class="text-xs text-slate-400 lg:min-w-0"
          >
            Relative trigger compares the poi head against the hand phase.
          </p>
          <div v-else></div>

          <div class="flex flex-wrap gap-2 lg:flex-nowrap lg:justify-end lg:self-end">
            <button
              v-for="preset in rule.source.kind === 'absolute' ? absolutePresets : relativePresets"
              :key="preset.label"
              type="button"
              class="whitespace-nowrap rounded-full border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
              @click="applyPreset(rule, preset.value)"
            >
              {{ preset.label }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
