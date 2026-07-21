<script setup lang="ts">
import { useStorage } from "@vueuse/core";
import { computed, ref, watch } from "vue";

import PatternRegistryControls from "@/patterns/components/PatternRegistryControls.vue";
import { useSelectedPatternSequence } from "@/patterns/useSelectedPatternSequence";
import { threeDDebugSequence } from "@/visualizer/demoSequence";
import TransportControls from "@/visualizer/TransportControls.vue";
import {
  TRAIL_DECAY_MAX,
  TRAIL_DECAY_MIN,
  TRAIL_STEP_FIXED
} from "@/visualizer/useVisualizerSession";
import {
  createVisualizerWorkspace,
  provideVisualizerWorkspace
} from "@/visualizer/visualizerWorkspace";
import { sampleMultiRigWorldTrails } from "@/visualizer/worldTrailSampling";
import type { RigId } from "@/engine/types";
import { BodyRigMotionSolver } from "@/body-rig";

import FirePoiControlPanel from "./FirePoiControlPanel.vue";
import {
  DEFAULT_FIRE_POI_SETTINGS,
  normalizeFirePoiSettings,
  type FirePoiSettings
} from "./firePoiSettings";
import {
  reconcileStoredFirePoiSettings,
  shouldSampleThreeDDebugWorldTrails
} from "./firePoiSettingsState";
import Three3DDebugCanvas from "./Three3DDebugCanvas.vue";
import { buildBodyHumanoidScene } from "./bodyHumanoidScene";
import { buildThreeDDebugSceneState } from "./worldPoseScene";

const {
  selectedEntry,
  sequence: selectedSequence,
  errorMessage: selectedPatternError
} = useSelectedPatternSequence(threeDDebugSequence);
const activeSequence = computed(() => selectedSequence.value ?? threeDDebugSequence);
const workspace = provideVisualizerWorkspace(
  createVisualizerWorkspace(activeSequence, {
    autoplay: true,
    resumeOnSequenceChange: true
  })
);
const { core } = workspace;
const playbackError = computed(() => selectedPatternError.value ?? core.errorMessage.value);

const showAxes = ref(true);
const showGrid = ref(true);
const showHandTrails = ref(true);
const showHeadTrails = ref(true);
const showPlaneSheets = ref(true);
const firePoiPanelOpen = useStorage("poi-v2:three-d-debug-fire-poi-panel-open", false);
const firePoiSettings = useStorage(
  "poi-v2:three-d-debug-fire-poi-settings",
  DEFAULT_FIRE_POI_SETTINGS
);
const cameraResetVersion = ref(0);
const trailLengthSteps = computed({
  get: () => core.session.trailDecaySteps.value,
  set: (value: number) => core.session.setTrailDecaySteps(value)
});
const reconciledFirePoiSettings = computed(() =>
  reconcileStoredFirePoiSettings(firePoiSettings.value)
);
const resolvedFirePoiSettings = computed(() => reconciledFirePoiSettings.value.settings);
const firePoiEnabled = computed({
  get: () => resolvedFirePoiSettings.value.enabled,
  set: (enabled: boolean) => {
    firePoiSettings.value = {
      ...resolvedFirePoiSettings.value,
      enabled
    };
  }
});

watch(
  reconciledFirePoiSettings,
  ({ settings, needsWrite }) => {
    if (needsWrite) {
      firePoiSettings.value = settings;
    }
  },
  { immediate: true }
);

const sceneState = computed(() =>
  buildThreeDDebugSceneState(core.worldPoses.value, core.sceneWorldRadius.value)
);
function resolveBodyRigIds(rigOrder: readonly RigId[]) {
  const hasLeft = rigOrder.includes("left");
  const hasRight = rigOrder.includes("right");
  const firstCustomRig = rigOrder.find((rigId) => rigId !== "left" && rigId !== "right");

  return {
    left: hasLeft ? "left" : hasRight ? "left" : (firstCustomRig ?? "left"),
    right: hasRight
      ? "right"
      : hasLeft
        ? "right"
        : (rigOrder.find((rigId) => rigId !== firstCustomRig) ?? "right")
  };
}

const bodyRigIds = computed(() => resolveBodyRigIds(core.rigOrder.value));
const bodyRigMotionSolver = new BodyRigMotionSolver();
const bodyScene = computed(() =>
  buildBodyHumanoidScene(core.worldPoses.value, undefined, bodyRigIds.value, undefined, {
    solver: bodyRigMotionSolver,
    time: core.transport.currentTime.value
  })
);
watch(
  () => core.sequence.value,
  () => bodyRigMotionSolver.reset()
);
const worldTrails = computed(() => {
  const trailSamplingState = {
    prepared: core.session.playback.prepared.value,
    showHandTrails: showHandTrails.value,
    showHeadTrails: showHeadTrails.value,
    firePoiEnabled: resolvedFirePoiSettings.value.enabled
  };
  const preparedPlayback = shouldSampleThreeDDebugWorldTrails(trailSamplingState);

  if (preparedPlayback === null) {
    return {};
  }

  return sampleMultiRigWorldTrails(
    preparedPlayback,
    core.transport.currentTime.value,
    TRAIL_STEP_FIXED,
    core.session.trailDecaySteps.value,
    {
      loopMode: core.session.trailLoopMode.value,
      loopDuration: preparedPlayback.maxSequenceDuration
    },
    core.session.planeSideDisplaySettings.value
  );
});
const activePlaneLabel = computed(() =>
  sceneState.value.activePlanes.length > 0 ? sceneState.value.activePlanes.join(", ") : "none"
);

function resetView() {
  cameraResetVersion.value += 1;
}

function updateFirePoiSettings(next: FirePoiSettings) {
  firePoiSettings.value = normalizeFirePoiSettings(next);
}
</script>

<template>
  <main class="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-8">
    <section class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
      <p class="text-xs uppercase tracking-[0.24em] text-slate-500">Lab Experiment</p>
      <h1 class="mt-2 text-3xl font-semibold text-slate-100">Three.js Debug World Renderer</h1>
      <p class="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
        This shell reuses the current visualizer playback stack and world-pose output. Scope stays
        narrow for now: playback, debug toggles, and a live Three.js debug canvas.
      </p>
    </section>

    <PatternRegistryControls :current-name="selectedEntry?.name ?? '3D demo pattern'" />

    <section
      class="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-5 lg:grid-cols-[minmax(0,1fr)_20rem]"
    >
      <div class="grid gap-4">
        <div
          v-if="playbackError"
          class="rounded-xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-100"
        >
          <p class="text-xs uppercase tracking-[0.2em] text-rose-300">Playback Error</p>
          <p class="mt-2">{{ playbackError }}</p>
        </div>

        <Three3DDebugCanvas
          v-else
          :poses="sceneState.worldPoses"
          :trails="worldTrails"
          :rig-order="core.rigOrder.value"
          :body-scene="bodyScene"
          :scene-radius-world="sceneState.sceneRadiusWorld"
          :scene-center-world="sceneState.sceneCenterWorld"
          :active-planes="sceneState.activePlanes"
          :show-axes="showAxes"
          :show-grid="showGrid"
          :show-hand-trails="showHandTrails"
          :show-head-trails="showHeadTrails"
          :show-plane-sheets="showPlaneSheets"
          :fire-poi-settings="resolvedFirePoiSettings"
          :camera-reset-version="cameraResetVersion"
        />
      </div>

      <aside
        class="grid gap-4 rounded-xl border border-slate-800 bg-slate-900/65 p-4 text-sm text-slate-300"
      >
        <TransportControls />

        <div class="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Motion Inspection</p>
          <button
            type="button"
            class="rounded-lg border border-slate-700 px-3 py-2 text-left text-sm text-slate-200 transition hover:border-sky-500 hover:text-sky-200"
            @click="resetView"
          >
            Reset View
          </button>

          <label class="grid gap-2 text-sm text-slate-300">
            <span class="flex items-center justify-between gap-3">
              <span>Trail Length</span>
              <span class="font-mono text-xs text-slate-500">{{ trailLengthSteps }}</span>
            </span>
            <input
              v-model.number="trailLengthSteps"
              type="range"
              :min="TRAIL_DECAY_MIN"
              :max="TRAIL_DECAY_MAX"
              :step="1"
              class="w-full accent-sky-400"
            />
          </label>
        </div>

        <div class="grid gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Scene State</p>
          <p>
            <span class="text-slate-500">Active planes:</span>
            {{ activePlaneLabel }}
          </p>
          <p>
            <span class="text-slate-500">Scene radius:</span>
            {{ sceneState.sceneRadiusWorld.toFixed(2) }}
          </p>
          <p>
            <span class="text-slate-500">Bounds center:</span>
            {{ sceneState.worldBounds.center.x.toFixed(2) }},
            {{ sceneState.worldBounds.center.y.toFixed(2) }},
            {{ sceneState.worldBounds.center.z.toFixed(2) }}
          </p>
        </div>

        <label
          class="flex items-center justify-between gap-3 rounded-lg border border-slate-800 px-3 py-2"
        >
          <span>Axes</span>
          <input v-model="showAxes" type="checkbox" class="h-4 w-4 accent-sky-400" />
        </label>

        <label
          class="flex items-center justify-between gap-3 rounded-lg border border-slate-800 px-3 py-2"
        >
          <span>Grid</span>
          <input v-model="showGrid" type="checkbox" class="h-4 w-4 accent-sky-400" />
        </label>

        <label
          class="flex items-center justify-between gap-3 rounded-lg border border-slate-800 px-3 py-2"
        >
          <span>Hand Trails</span>
          <input v-model="showHandTrails" type="checkbox" class="h-4 w-4 accent-sky-400" />
        </label>

        <label
          class="flex items-center justify-between gap-3 rounded-lg border border-slate-800 px-3 py-2"
        >
          <span>Head Trails</span>
          <input v-model="showHeadTrails" type="checkbox" class="h-4 w-4 accent-sky-400" />
        </label>

        <label
          class="flex items-center justify-between gap-3 rounded-lg border border-slate-800 px-3 py-2"
        >
          <span>Plane Sheets</span>
          <input v-model="showPlaneSheets" type="checkbox" class="h-4 w-4 accent-sky-400" />
        </label>

        <label
          class="flex items-center justify-between gap-3 rounded-lg border border-slate-800 px-3 py-2"
        >
          <span>Fire Poi</span>
          <input v-model="firePoiEnabled" type="checkbox" class="h-4 w-4 accent-orange-400" />
        </label>

        <button
          type="button"
          class="rounded-lg border border-slate-700 px-3 py-2 text-left text-sm text-slate-200 transition hover:border-orange-500 hover:text-orange-200"
          @click="firePoiPanelOpen = true"
        >
          Fire Controls
        </button>
      </aside>

      <FirePoiControlPanel
        v-if="firePoiPanelOpen"
        :settings="resolvedFirePoiSettings"
        @close="firePoiPanelOpen = false"
        @update-settings="updateFirePoiSettings($event)"
      />
    </section>
  </main>
</template>
