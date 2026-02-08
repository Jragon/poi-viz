<script setup lang="ts">
import ControlsGlobalPanel from "@/components/controls/ControlsGlobalPanel.vue";
import ControlsHandPanel from "@/components/controls/ControlsHandPanel.vue";
import ControlsHelpPanel from "@/components/controls/ControlsHelpPanel.vue";
import ControlsPresetLibraryPanel from "@/components/controls/ControlsPresetLibraryPanel.vue";
import ControlsTransportPanel from "@/components/controls/ControlsTransportPanel.vue";
import type { ExportPresetRequest } from "@/components/controls/types";
import VtgPanel from "@/components/VtgPanel.vue";
import type { AngleUnit } from "@/state/angleUnits";
import type { GlobalBooleanKey, GlobalNumberKey, HandNumberKey } from "@/state/actions";
import type { UserPresetSummary } from "@/state/presetLibrary";
import type { SpeedUnit } from "@/state/speedUnits";
import type { AppState, HandId, PhaseReference } from "@/types/state";
import type { VTGDescriptor } from "@/vtg/types";
import { ref } from "vue";

interface ControlsProps {
  state: AppState;
  loopedPlayheadBeats: number;
  scrubStep: number;
  isStaticView: boolean;
  userPresets: UserPresetSummary[];
  presetLibraryStatus: string;
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
      :loop-beats="props.state.global.loopBeats"
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

    <VtgPanel class="mt-4" :state="props.state" :speed-unit="speedUnit" @apply-vtg="onApplyVtg" />

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
