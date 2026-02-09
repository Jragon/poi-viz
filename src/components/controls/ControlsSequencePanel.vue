<script setup lang="ts">
import {
  type VTGArmSign,
  type VTGSequence,
  type VTGSequenceDirectionBadges,
  type VTGSequenceSegment,
  type VTGSequenceSnapSetting
} from "@/vtg/sequence";
import type { VTGPhaseDeg } from "@/vtg/types";
import { computed, ref, watch } from "vue";

interface SequencePanelSegment extends VTGSequenceSegment {
  armDirectionBadges: VTGSequenceDirectionBadges;
  poiDirectionFlipBlocked: boolean;
}

interface ControlsSequencePanelProps {
  sequenceMode: boolean;
  sequence: VTGSequence;
  segmentViews: SequencePanelSegment[];
  activeDirectionBadges: VTGSequenceDirectionBadges | null;
  selectedSegmentId: string | null;
  sequenceStatus: string;
}

const props = defineProps<ControlsSequencePanelProps>();

const emit = defineEmits<{
  (event: "set-sequence-mode", enabled: boolean): void;
  (event: "set-sequence-name", name: string): void;
  (event: "set-sequence-loop", loop: boolean): void;
  (event: "set-snap-setting", snapSetting: VTGSequenceSnapSetting): void;
  (event: "set-sequence-allow-poi-direction-flip", allowPoiDirectionFlip: boolean): void;
  (event: "set-sequence-start-phase-deg", startPhaseDeg: VTGPhaseDeg): void;
  (event: "add-segment"): void;
  (event: "select-segment", segmentId: string): void;
  (event: "set-selected-duration-beats", durationBeats: number): void;
  (event: "set-selected-right-arm-sign", rightArmSign: VTGArmSign): void;
  (event: "move-selected-segment", direction: "up" | "down"): void;
  (event: "delete-selected-segment"): void;
  (event: "duplicate-selected-segment"): void;
  (event: "export-sequence"): void;
  (event: "import-sequence", file: File): void;
}>();

const importInputRef = ref<HTMLInputElement | null>(null);
const sequenceNameDraft = ref("");
const selectedSegment = computed(() => props.segmentViews.find((segment) => segment.id === props.selectedSegmentId) ?? null);

const START_PHASE_OPTIONS: VTGPhaseDeg[] = [0, 90, 180, 270];
const RIGHT_ARM_SIGN_OPTIONS: VTGArmSign[] = [1, -1];

function parseFiniteNumber(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatSignLabel(sign: VTGArmSign): string {
  return sign > 0 ? "+" : "-";
}

function onModeToggle(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  emit("set-sequence-mode", target.checked);
}

function onSequenceNameInput(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  sequenceNameDraft.value = target.value;
}

function onSequenceNameBlur(): void {
  const nextName = sequenceNameDraft.value.trim().length > 0 ? sequenceNameDraft.value : props.sequence.name;
  emit("set-sequence-name", nextName);
}

function onLoopToggle(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  emit("set-sequence-loop", target.checked);
}

function onAllowPoiDirectionFlipToggle(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }
  emit("set-sequence-allow-poi-direction-flip", target.checked);
}

function onSnapSettingChange(nextSetting: VTGSequenceSnapSetting): void {
  emit("set-snap-setting", nextSetting);
}

function onStartPhaseChange(nextPhaseDeg: VTGPhaseDeg): void {
  emit("set-sequence-start-phase-deg", nextPhaseDeg);
}

function onDurationInput(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) {
    return;
  }

  const parsed = parseFiniteNumber(target.value);
  if (parsed === null) {
    return;
  }
  emit("set-selected-duration-beats", parsed);
}

function onRightArmSignSelect(rightArmSign: VTGArmSign): void {
  emit("set-selected-right-arm-sign", rightArmSign);
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

  emit("import-sequence", file);
  target.value = "";
}

watch(
  () => props.sequence.name,
  (nextName) => {
    sequenceNameDraft.value = nextName;
  },
  { immediate: true }
);
</script>

<template>
  <details class="mt-4 rounded border border-zinc-800 p-3" open>
    <summary class="cursor-pointer text-xs uppercase tracking-wide text-zinc-400">VTG Sequence</summary>
    <div class="mt-3 space-y-3">
      <div class="flex flex-wrap items-center gap-3">
        <label class="flex items-center gap-2 text-sm text-zinc-200">
          <input class="accent-cyan-400" type="checkbox" :checked="props.sequenceMode" @change="onModeToggle" />
          Sequence Mode
        </label>
        <button
          class="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:border-zinc-500"
          type="button"
          @click="emit('add-segment')"
        >
          Add From Current VTG
        </button>
        <button
          class="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:border-zinc-500"
          type="button"
          @click="emit('export-sequence')"
        >
          Export JSON
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

      <div class="grid gap-3 sm:grid-cols-2">
        <label class="block text-xs tracking-wide text-zinc-500">
          <span class="uppercase">Sequence Name</span>
          <input
            class="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
            type="text"
            :value="sequenceNameDraft"
            maxlength="80"
            @input="onSequenceNameInput"
            @blur="onSequenceNameBlur"
          />
        </label>

        <div class="grid gap-2 text-xs text-zinc-500">
          <label class="flex items-center gap-2 text-sm text-zinc-300">
            <input class="accent-cyan-400" type="checkbox" :checked="props.sequence.loop" @change="onLoopToggle" />
            Loop Sequence
          </label>
          <label class="flex items-center gap-2 text-sm text-zinc-300">
            <input
              class="accent-cyan-400"
              type="checkbox"
              :checked="props.sequence.allowPoiDirectionFlip"
              @change="onAllowPoiDirectionFlipToggle"
            />
            Allow Poi Direction Flip
          </label>

          <div class="flex flex-wrap items-center gap-2">
            <span class="uppercase">Snap</span>
            <button
              class="rounded border px-2.5 py-1 text-xs"
              :class="props.sequence.snapSetting === 'event' ? 'border-cyan-400 text-cyan-300' : 'border-zinc-700 text-zinc-300'"
              type="button"
              @click="onSnapSettingChange('event')"
            >
              Event
            </button>
            <button
              class="rounded border px-2.5 py-1 text-xs"
              :class="props.sequence.snapSetting === 'none' ? 'border-cyan-400 text-cyan-300' : 'border-zinc-700 text-zinc-300'"
              type="button"
              @click="onSnapSettingChange('none')"
            >
              None
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <span class="uppercase">Start Phase</span>
            <button
              v-for="phase in START_PHASE_OPTIONS"
              :key="phase"
              class="rounded border px-2.5 py-1 text-xs"
              :class="props.sequence.startPhaseDeg === phase ? 'border-cyan-400 text-cyan-300' : 'border-zinc-700 text-zinc-300'"
              type="button"
              @click="onStartPhaseChange(phase)"
            >
              {{ phase }}°
            </button>
          </div>
        </div>
      </div>

      <p v-if="props.sequenceStatus" class="text-xs text-cyan-300">{{ props.sequenceStatus }}</p>

      <div v-if="props.activeDirectionBadges" class="rounded border border-zinc-800 bg-zinc-900/40 p-2 text-xs text-zinc-300">
        <span class="uppercase text-zinc-500">Active Direction</span>
        <span class="ml-2 rounded border border-zinc-700 px-2 py-0.5">L:{{ formatSignLabel(props.activeDirectionBadges.L) }}</span>
        <span class="ml-2 rounded border border-zinc-700 px-2 py-0.5">R:{{ formatSignLabel(props.activeDirectionBadges.R) }}</span>
      </div>

      <div v-if="props.segmentViews.length === 0" class="rounded border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-500">
        No segments yet. Add one from the current VTG selection.
      </div>

      <div v-else class="grid gap-2">
        <div
          v-for="(segment, index) in props.segmentViews"
          :key="segment.id"
          class="rounded border p-3"
          :class="props.selectedSegmentId === segment.id ? 'border-cyan-500/40 bg-cyan-950/10' : 'border-zinc-800 bg-zinc-900/40'"
        >
          <div class="flex flex-wrap items-center gap-2">
            <button
              class="rounded border px-2.5 py-1 text-left text-xs"
              :class="props.selectedSegmentId === segment.id ? 'border-cyan-400 text-cyan-300' : 'border-zinc-700 text-zinc-300'"
              type="button"
              @click="emit('select-segment', segment.id)"
            >
              {{ index + 1 }}. {{ segment.descriptor.armElement }} × {{ segment.descriptor.poiElement }}
            </button>
            <span class="text-xs text-zinc-500">{{ segment.durationBeats.toFixed(3) }} beats</span>
            <span class="rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300">
              L:{{ formatSignLabel(segment.armDirectionBadges.L) }}
            </span>
            <span class="rounded border border-zinc-700 px-2 py-0.5 text-xs text-zinc-300">
              R:{{ formatSignLabel(segment.armDirectionBadges.R) }}
            </span>
            <span v-if="segment.poiDirectionFlipBlocked" class="rounded border border-amber-700 px-2 py-0.5 text-xs text-amber-300">
              poi flip blocked
            </span>
          </div>
        </div>
      </div>

      <div v-if="selectedSegment" class="rounded border border-zinc-800 bg-zinc-900/40 p-3">
        <p class="text-xs uppercase tracking-wide text-zinc-500">Selected Segment</p>
        <div class="mt-2 flex flex-wrap items-end gap-2">
          <label class="block text-xs tracking-wide text-zinc-500">
            <span class="uppercase">Duration (beats)</span>
            <input
              class="mt-1 w-28 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
              type="number"
              min="0.000001"
              step="0.125"
              :value="selectedSegment.durationBeats"
              @input="onDurationInput"
            />
          </label>
          <div class="flex flex-col gap-1 text-xs text-zinc-500">
            <span class="uppercase">Right Arm Direction</span>
            <div class="flex gap-1">
              <button
                v-for="sign in RIGHT_ARM_SIGN_OPTIONS"
                :key="sign"
                class="rounded border px-2.5 py-1"
                :class="selectedSegment.descriptor.rightArmSign === sign ? 'border-cyan-400 text-cyan-300' : 'border-zinc-700 text-zinc-300'"
                type="button"
                @click="onRightArmSignSelect(sign)"
              >
                R:{{ formatSignLabel(sign) }}
              </button>
            </div>
          </div>
          <button
            class="rounded border border-zinc-700 px-2.5 py-1.5 text-xs hover:border-zinc-500"
            type="button"
            @click="emit('move-selected-segment', 'up')"
          >
            Move Up
          </button>
          <button
            class="rounded border border-zinc-700 px-2.5 py-1.5 text-xs hover:border-zinc-500"
            type="button"
            @click="emit('move-selected-segment', 'down')"
          >
            Move Down
          </button>
          <button
            class="rounded border border-zinc-700 px-2.5 py-1.5 text-xs hover:border-zinc-500"
            type="button"
            @click="emit('duplicate-selected-segment')"
          >
            Duplicate
          </button>
          <button
            class="rounded border border-zinc-700 px-2.5 py-1.5 text-xs hover:border-zinc-500"
            type="button"
            @click="emit('delete-selected-segment')"
          >
            Delete
          </button>
        </div>
        <p class="mt-2 text-xs text-zinc-500">
          Edit arm/poi relation and signed poi cycles in VTG panel. Use R:+/- to set segment arm direction branch explicitly.
        </p>
      </div>
    </div>
  </details>
</template>
