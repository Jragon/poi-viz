<script setup lang="ts">
import { computed, ref } from "vue";

import { threeDDebugSequence } from "@/visualizer/demoSequence";
import TransportControls from "@/visualizer/TransportControls.vue";
import {
  createVisualizerWorkspace,
  provideVisualizerWorkspace
} from "@/visualizer/visualizerWorkspace";

import Three3DDebugCanvas from "./Three3DDebugCanvas.vue";
import { buildThreeDDebugSceneState } from "./worldPoseScene";

const workspace = provideVisualizerWorkspace(
  createVisualizerWorkspace(threeDDebugSequence, {
    autoplay: true,
    resumeOnSequenceChange: true
  })
);
const { core } = workspace;

const showAxes = ref(true);
const showGrid = ref(true);
const showPlaneHelpers = ref(true);

const sceneState = computed(() =>
  buildThreeDDebugSceneState(core.worldPoses.value, core.sceneWorldRadius.value)
);
const activePlaneLabel = computed(() =>
  sceneState.value.activePlanes.length > 0 ? sceneState.value.activePlanes.join(", ") : "none"
);
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
          :rig-order="core.rigOrder.value"
          :scene-radius-world="sceneState.sceneRadiusWorld"
          :scene-center-world="sceneState.sceneCenterWorld"
          :active-planes="sceneState.activePlanes"
          :show-axes="showAxes"
          :show-grid="showGrid"
          :show-plane-helpers="showPlaneHelpers"
        />
      </div>

      <aside
        class="grid gap-4 rounded-xl border border-slate-800 bg-slate-900/65 p-4 text-sm text-slate-300"
      >
        <TransportControls />

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
          <span>Plane Helpers</span>
          <input v-model="showPlaneHelpers" type="checkbox" class="h-4 w-4 accent-sky-400" />
        </label>
      </aside>
    </section>
  </main>
</template>
