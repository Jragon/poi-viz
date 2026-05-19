<script setup lang="ts">
import { computed, ref } from "vue";

import { useAuthoringLibrary } from "@/authoring/useAuthoringLibrary";
import DocumentSelector from "@/pages/components/DocumentSelector.vue";
import { useVisualizerDocumentSource } from "@/pages/useVisualizerDocumentSource";
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

import Three3DDebugCanvas from "./Three3DDebugCanvas.vue";
import { buildBodyStickFigureScene } from "./bodyStickFigureScene";
import { buildThreeDDebugSceneState } from "./worldPoseScene";

const library = useAuthoringLibrary();
const {
  documents,
  selectedId,
  sequence: selectedSequence,
  select: selectDocument
} = useVisualizerDocumentSource(library);
const activeSequence = computed(() => selectedSequence.value ?? threeDDebugSequence);
const workspace = provideVisualizerWorkspace(
  createVisualizerWorkspace(activeSequence, {
    autoplay: true,
    resumeOnSequenceChange: true
  })
);
const { core } = workspace;

const showAxes = ref(true);
const showGrid = ref(true);
const showHandTrails = ref(true);
const showHeadTrails = ref(true);
const showPlaneSheets = ref(true);
const cameraResetVersion = ref(0);
const trailLengthSteps = computed({
  get: () => core.session.trailDecaySteps.value,
  set: (value: number) => core.session.setTrailDecaySteps(value)
});

const sceneState = computed(() =>
  buildThreeDDebugSceneState(core.worldPoses.value, core.sceneWorldRadius.value)
);
const bodyRigIds = computed(() => ({
  left: core.rigOrder.value[0],
  right: core.rigOrder.value[1]
}));
const bodyScene = computed(() => buildBodyStickFigureScene(core.worldPoses.value, undefined, bodyRigIds.value));
const worldTrails = computed(() => {
  const prepared = core.session.playback.prepared.value;
  if (!prepared || (!showHandTrails.value && !showHeadTrails.value)) {
    return {};
  }

  return sampleMultiRigWorldTrails(
    prepared,
    core.transport.currentTime.value,
    TRAIL_STEP_FIXED,
    core.session.trailDecaySteps.value,
    {
      loopMode: core.session.trailLoopMode.value,
      loopDuration: prepared.maxSequenceDuration
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

    <DocumentSelector
      :documents="documents"
      :selected-id="selectedId"
      @select="selectDocument($event)"
    />

    <section
      class="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-5 lg:grid-cols-[minmax(0,1fr)_20rem]"
    >
      <div class="grid gap-4">
        <div
          v-if="core.errorMessage.value"
          class="rounded-xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-100"
        >
          <p class="text-xs uppercase tracking-[0.2em] text-rose-300">Playback Error</p>
          <p class="mt-2">{{ core.errorMessage.value }}</p>
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
      </aside>
    </section>
  </main>
</template>
