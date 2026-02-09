<script setup lang="ts">
import ControlsGlobalPanel from "@/components/controls/ControlsGlobalPanel.vue";
import ControlsHandPanel from "@/components/controls/ControlsHandPanel.vue";
import ControlsHelpPanel from "@/components/controls/ControlsHelpPanel.vue";
import ControlsPresetLibraryPanel from "@/components/controls/ControlsPresetLibraryPanel.vue";
import ControlsSequencePanel from "@/components/controls/ControlsSequencePanel.vue";
import ControlsTransportPanel from "@/components/controls/ControlsTransportPanel.vue";
import type { ExportPresetRequest } from "@/components/controls/types";
import VtgPanel from "@/components/VtgPanel.vue";
import type { AngleUnit } from "@/state/angleUnits";
import type { GlobalBooleanKey, GlobalNumberKey, HandNumberKey } from "@/state/actions";
import type { UserPresetSummary } from "@/state/presetLibrary";
import type { SpeedUnit } from "@/state/speedUnits";
import type { AppState, HandId, PhaseReference } from "@/types/state";
import { createDefaultVTGSequence, type VTGSequence, type VTGSequenceSnapSetting } from "@/vtg/sequence";
import type { VTGDescriptor, VTGPhaseDeg } from "@/vtg/types";
import { computed, ref } from "vue";

interface ControlsProps {
  state: AppState;
  loopedPlayheadBeats: number;
  transportLoopBeats?: number;
  scrubStep: number;
  isStaticView: boolean;
  userPresets: UserPresetSummary[];
  presetLibraryStatus: string;
  sequenceMode?: boolean;
  sequence?: VTGSequence;
  sequenceSegments?: Array<{
    id: string;
    durationBeats: number;
    descriptor: VTGSequence["segments"][number]["descriptor"];
  }>;
  selectedSequenceSegmentId?: string | null;
  sequenceStatus?: string;
  selectedSequenceDescriptor?: VTGDescriptor | null;
}

const props = defineProps<ControlsProps>();

const emit = defineEmits<{
  (event: "toggle-playback"): void;
  (event: "set-static-view", value: boolean): void;
  (event: "save-user-preset", name: string): void;
  (event: "load-user-preset", presetId: string): void;
  (event: "delete-user-preset", presetId: string): void;
  (event: "export-user-preset", request: ExportPresetRequest): void;
  (event: "import-user-preset", file: File): void;
  (event: "set-sequence-mode", enabled: boolean): void;
  (event: "set-sequence-name", name: string): void;
  (event: "set-sequence-loop", loop: boolean): void;
  (event: "set-snap-setting", snapSetting: VTGSequenceSnapSetting): void;
  (event: "set-sequence-start-phase-deg", startPhaseDeg: VTGPhaseDeg): void;
  (event: "add-segment"): void;
  (event: "select-segment", segmentId: string): void;
  (event: "set-selected-duration-beats", durationBeats: number): void;
  (event: "move-selected-segment", direction: "up" | "down"): void;
  (event: "delete-selected-segment"): void;
  (event: "duplicate-selected-segment"): void;
  (event: "export-sequence"): void;
  (event: "import-sequence", file: File): void;
  (event: "set-scrub", value: number): void;
  (event: "set-global-number", key: GlobalNumberKey, value: number): void;
  (event: "set-global-boolean", key: GlobalBooleanKey, value: boolean): void;
  (event: "set-phase-reference", value: PhaseReference): void;
  (event: "set-hand-number", handId: HandId, key: HandNumberKey, value: number): void;
  (event: "apply-vtg", descriptor: VTGDescriptor): void;
}>();

const HAND_IDS: HandId[] = ["L", "R"];

const phaseUnit = ref<AngleUnit>("degrees");
const speedUnit = ref<SpeedUnit>("cycles");
const showAdvanced = ref(false);
const draftResetVersion = ref(0);
const defaultSequence = createDefaultVTGSequence();
const sequenceModeValue = computed(() => props.sequenceMode ?? false);
const sequenceValue = computed(() => props.sequence ?? defaultSequence);
const sequenceSegmentsValue = computed(() => props.sequenceSegments ?? []);
const selectedSequenceSegmentIdValue = computed(() => props.selectedSequenceSegmentId ?? null);
const sequenceStatusValue = computed(() => props.sequenceStatus ?? "");
const selectedSequenceDescriptorValue = computed(() => props.selectedSequenceDescriptor ?? null);
const transportLoopBeatsValue = computed(() => props.transportLoopBeats ?? props.state.global.loopBeats);

function bumpDraftResetVersion(): void {
  draftResetVersion.value += 1;
}

function setPhaseUnit(nextUnit: AngleUnit): void {
  phaseUnit.value = nextUnit;
  bumpDraftResetVersion();
}

function setSpeedUnit(nextUnit: SpeedUnit): void {
  speedUnit.value = nextUnit;
  bumpDraftResetVersion();
}

function setPhaseReference(nextReference: PhaseReference): void {
  emit("set-phase-reference", nextReference);
  bumpDraftResetVersion();
}

function setShowAdvanced(nextValue: boolean): void {
  showAdvanced.value = nextValue;
}

function onApplyVtg(descriptor: VTGDescriptor): void {
  emit("apply-vtg", descriptor);
}

function onSetHandNumber(handId: HandId, key: HandNumberKey, value: number): void {
  emit("set-hand-number", handId, key, value);
}
</script>

<template>
  <section class="rounded border border-zinc-800 bg-zinc-950/70 p-4 lg:col-span-12">
    <h2 class="mb-4 text-xs font-medium uppercase tracking-wide text-zinc-400">Controls</h2>

    <ControlsTransportPanel
      :is-playing="props.state.global.isPlaying"
      :is-static-view="props.isStaticView"
      :looped-playhead-beats="props.loopedPlayheadBeats"
      :loop-beats="transportLoopBeatsValue"
      :scrub-step="props.scrubStep"
      @toggle-playback="emit('toggle-playback')"
      @set-static-view="(value) => emit('set-static-view', value)"
      @set-scrub="(value) => emit('set-scrub', value)"
    />

    <ControlsGlobalPanel
      :global="props.state.global"
      :phase-unit="phaseUnit"
      :speed-unit="speedUnit"
      :show-advanced="showAdvanced"
      :draft-reset-version="draftResetVersion"
      @set-global-number="(key, value) => emit('set-global-number', key, value)"
      @set-global-boolean="(key, value) => emit('set-global-boolean', key, value)"
      @set-phase-reference="setPhaseReference"
      @set-phase-unit="setPhaseUnit"
      @set-speed-unit="setSpeedUnit"
      @set-show-advanced="setShowAdvanced"
    />

    <VtgPanel
      class="mt-4"
      :state="props.state"
      :speed-unit="speedUnit"
      :descriptor-override="selectedSequenceDescriptorValue"
      @apply-vtg="onApplyVtg"
    />

    <ControlsSequencePanel
      :sequence-mode="sequenceModeValue"
      :sequence="sequenceValue"
      :segment-views="sequenceSegmentsValue"
      :selected-segment-id="selectedSequenceSegmentIdValue"
      :sequence-status="sequenceStatusValue"
      @set-sequence-mode="(enabled) => emit('set-sequence-mode', enabled)"
      @set-sequence-name="(name) => emit('set-sequence-name', name)"
      @set-sequence-loop="(loop) => emit('set-sequence-loop', loop)"
      @set-snap-setting="(snapSetting) => emit('set-snap-setting', snapSetting)"
      @set-sequence-start-phase-deg="(startPhaseDeg) => emit('set-sequence-start-phase-deg', startPhaseDeg)"
      @add-segment="emit('add-segment')"
      @select-segment="(segmentId) => emit('select-segment', segmentId)"
      @set-selected-duration-beats="(durationBeats) => emit('set-selected-duration-beats', durationBeats)"
      @move-selected-segment="(direction) => emit('move-selected-segment', direction)"
      @delete-selected-segment="emit('delete-selected-segment')"
      @duplicate-selected-segment="emit('duplicate-selected-segment')"
      @export-sequence="emit('export-sequence')"
      @import-sequence="(file) => emit('import-sequence', file)"
    />

    <div class="mt-4 grid gap-4 xl:grid-cols-2">
      <ControlsHandPanel
        v-for="handId in HAND_IDS"
        :key="handId"
        :hand-id="handId"
        :hand="props.state.hands[handId]"
        :phase-unit="phaseUnit"
        :speed-unit="speedUnit"
        :show-advanced="showAdvanced"
        :draft-reset-version="draftResetVersion"
        @set-hand-number="(key, value) => onSetHandNumber(handId, key, value)"
      />
    </div>

    <ControlsPresetLibraryPanel
      :user-presets="props.userPresets"
      :preset-library-status="props.presetLibraryStatus"
      :speed-unit="speedUnit"
      :phase-unit="phaseUnit"
      @save-user-preset="(name) => emit('save-user-preset', name)"
      @load-user-preset="(presetId) => emit('load-user-preset', presetId)"
      @delete-user-preset="(presetId) => emit('delete-user-preset', presetId)"
      @export-user-preset="(request) => emit('export-user-preset', request)"
      @import-user-preset="(file) => emit('import-user-preset', file)"
    />

    <ControlsHelpPanel />
  </section>
</template>
