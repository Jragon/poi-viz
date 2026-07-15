<script setup lang="ts">
import { computed, ref } from "vue";

import { useAuthoringLibrary } from "@/authoring/useAuthoringLibrary";
import type { RigId } from "@/engine/types";
import { buildBodyHumanoidScene } from "@/lab/experiments/three-d-debug/bodyHumanoidScene";
import { buildThreeDDebugSceneState } from "@/lab/experiments/three-d-debug/worldPoseScene";
import DocumentSelector from "@/pages/components/DocumentSelector.vue";
import { useVisualizerDocumentSource } from "@/pages/useVisualizerDocumentSource";
import { threeDDebugSequence } from "@/visualizer/demoSequence";
import TransportControls from "@/visualizer/TransportControls.vue";
import {
  createVisualizerWorkspace,
  provideVisualizerWorkspace
} from "@/visualizer/visualizerWorkspace";

import VrmRigCanvas from "./VrmRigCanvas.vue";
import {
  buildVrmRigPoseCases,
  type VrmRigPoseCaseId
} from "./rigPoseCases";
import {
  VRM_RIG_MODEL_AUTHOR,
  VRM_RIG_MODEL_LICENSE,
  VRM_RIG_MODEL_NAME,
  VRM_RIG_MODEL_SOURCE
} from "./vrmModel";

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

const showModel = ref(true);
const showTargetRig = ref(true);
const showVrmHelpers = ref(false);
const showPoiTargets = ref(true);
const showAxes = ref(true);
const showGrid = ref(true);
const cameraResetVersion = ref(0);
const poseSource = ref<"live" | VrmRigPoseCaseId>("live");
const poseCases = buildVrmRigPoseCases();

function resolveBodyRigIds(rigOrder: readonly RigId[]) {
  const customIds = rigOrder.filter((rigId) => rigId !== "left" && rigId !== "right");

  return {
    left: rigOrder.includes("left") ? "left" : (customIds[0] ?? "left"),
    right: rigOrder.includes("right") ? "right" : (customIds[1] ?? "right")
  };
}

const activePoseCase = computed(() =>
  poseSource.value === "live"
    ? null
    : (poseCases.find((entry) => entry.id === poseSource.value) ?? null)
);
const activeWorldPoses = computed(
  () => activePoseCase.value?.worldPoses ?? core.worldPoses.value
);
const activeRigOrder = computed<readonly RigId[]>(() =>
  activePoseCase.value ? ["left", "right"] : core.rigOrder.value
);
const sceneState = computed(() =>
  buildThreeDDebugSceneState(activeWorldPoses.value, core.sceneWorldRadius.value)
);
const bodyRigIds = computed(() => resolveBodyRigIds(activeRigOrder.value));
const bodyFrame = computed(() =>
  buildBodyHumanoidScene(activeWorldPoses.value, undefined, bodyRigIds.value)
);
const solverSummary = computed(() => {
  const diagnostics = bodyFrame.value?.solverDiagnostics;
  if (!diagnostics) {
    return "Waiting for left/right hand targets";
  }

  const reasons = diagnostics.bestEffortReasons;
  if (reasons.length > 0) {
    return `Best effort: ${reasons.join(", ")}`;
  }

  return "Both arm targets solved";
});
const torsoYaw = computed(() => {
  const radians = bodyFrame.value?.solverDiagnostics.chestYawRad ?? 0;
  return `${((radians * 180) / Math.PI).toFixed(1)}°`;
});
const leftElbowBend = computed(() => {
  const radians = bodyFrame.value?.solverDiagnostics.leftArm.elbowBendRad ?? 0;
  return `${((radians * 180) / Math.PI).toFixed(1)}°`;
});
const rightElbowBend = computed(() => {
  const radians = bodyFrame.value?.solverDiagnostics.rightArm.elbowBendRad ?? 0;
  return `${((radians * 180) / Math.PI).toFixed(1)}°`;
});
const leftReachError = computed(
  () => bodyFrame.value?.solverDiagnostics.leftArm.reachError.toFixed(3) ?? "0.000"
);
const rightReachError = computed(
  () => bodyFrame.value?.solverDiagnostics.rightArm.reachError.toFixed(3) ?? "0.000"
);

function resetView() {
  cameraResetVersion.value += 1;
}
</script>

<template>
  <main class="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-8">
    <section class="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
      <p class="text-xs uppercase tracking-[0.24em] text-slate-500">Lab Experiment</p>
      <h1 class="mt-2 text-3xl font-semibold text-slate-100">VRM Standing Rig</h1>
      <p class="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
        A real VRM 1.0 skinned humanoid driven procedurally from the current POI hand coordinates.
        The translucent target rig exposes the solver result; the solid model exposes the actual
        normalized-bone and skinning result.
      </p>
    </section>

    <DocumentSelector
      :documents="documents"
      :selected-id="selectedId"
      @select="selectDocument($event)"
    />

    <section
      class="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-5 xl:grid-cols-[minmax(0,1fr)_21rem]"
    >
      <div class="grid gap-4">
        <div
          v-if="core.errorMessage.value"
          class="rounded-xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-100"
        >
          {{ core.errorMessage.value }}
        </div>

        <VrmRigCanvas
          v-else
          :body-frame="bodyFrame"
          :poses="sceneState.worldPoses"
          :rig-order="activeRigOrder"
          :scene-center-world="sceneState.sceneCenterWorld"
          :scene-radius-world="sceneState.sceneRadiusWorld"
          :show-model="showModel"
          :show-target-rig="showTargetRig"
          :show-vrm-helpers="showVrmHelpers"
          :show-poi-targets="showPoiTargets"
          :show-axes="showAxes"
          :show-grid="showGrid"
          :camera-reset-version="cameraResetVersion"
        />
      </div>

      <aside class="grid content-start gap-4 text-sm text-slate-300">
        <div class="rounded-xl border border-slate-800 bg-slate-900/65 p-4">
          <TransportControls v-if="poseSource === 'live'" />
          <div v-else class="grid gap-2 text-sm text-slate-300">
            <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Fixed pose case</p>
            <p class="font-medium text-slate-100">{{ activePoseCase?.label }}</p>
            <p class="leading-5 text-slate-400">{{ activePoseCase?.description }}</p>
          </div>
        </div>

        <div class="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/65 p-4">
          <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Rig Inspection</p>

          <label class="grid gap-1 text-slate-400">
            <span>Pose source</span>
            <select
              v-model="poseSource"
              class="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
            >
              <option value="live">Live POI playback</option>
              <option v-for="poseCase in poseCases" :key="poseCase.id" :value="poseCase.id">
                {{ poseCase.label }}
              </option>
            </select>
          </label>

          <label class="flex items-center justify-between gap-3">
            <span>VRM model</span>
            <input v-model="showModel" type="checkbox" />
          </label>
          <label class="flex items-center justify-between gap-3">
            <span>Solver target rig</span>
            <input v-model="showTargetRig" type="checkbox" />
          </label>
          <label class="flex items-center justify-between gap-3">
            <span>VRM bone helpers</span>
            <input v-model="showVrmHelpers" type="checkbox" />
          </label>
          <label class="flex items-center justify-between gap-3">
            <span>POI targets</span>
            <input v-model="showPoiTargets" type="checkbox" />
          </label>
          <label class="flex items-center justify-between gap-3">
            <span>Axes</span>
            <input v-model="showAxes" type="checkbox" />
          </label>
          <label class="flex items-center justify-between gap-3">
            <span>Grid</span>
            <input v-model="showGrid" type="checkbox" />
          </label>

          <button
            type="button"
            class="rounded-lg border border-slate-700 px-3 py-2 text-left text-sm text-slate-200 transition hover:border-sky-500 hover:text-sky-200"
            @click="resetView"
          >
            Reset view
          </button>
        </div>

        <div class="grid gap-2 rounded-xl border border-slate-800 bg-slate-900/65 p-4">
          <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Live Diagnostics</p>
          <p>{{ solverSummary }}</p>
          <p class="flex justify-between gap-3 text-slate-400">
            <span>Chest yaw</span>
            <span class="font-mono text-slate-200">{{ torsoYaw }}</span>
          </p>
          <p class="flex justify-between gap-3 text-slate-400">
            <span>Left reach</span>
            <span class="font-mono text-slate-200">
              {{ bodyFrame?.solverDiagnostics.leftArm.isClamped ? "clamped" : "ok" }}
            </span>
          </p>
          <p class="flex justify-between gap-3 text-slate-400">
            <span>Right reach</span>
            <span class="font-mono text-slate-200">
              {{ bodyFrame?.solverDiagnostics.rightArm.isClamped ? "clamped" : "ok" }}
            </span>
          </p>
          <p class="flex justify-between gap-3 text-slate-400">
            <span>Left elbow bend</span>
            <span class="font-mono text-slate-200">{{ leftElbowBend }}</span>
          </p>
          <p class="flex justify-between gap-3 text-slate-400">
            <span>Right elbow bend</span>
            <span class="font-mono text-slate-200">{{ rightElbowBend }}</span>
          </p>
          <p class="flex justify-between gap-3 text-slate-400">
            <span>Left target error</span>
            <span class="font-mono text-slate-200">{{ leftReachError }}</span>
          </p>
          <p class="flex justify-between gap-3 text-slate-400">
            <span>Right target error</span>
            <span class="font-mono text-slate-200">{{ rightReachError }}</span>
          </p>
        </div>

        <div
          class="grid gap-2 rounded-xl border border-slate-800 bg-slate-900/65 p-4 text-xs leading-5 text-slate-400"
        >
          <p class="font-medium text-slate-200">{{ VRM_RIG_MODEL_NAME }}</p>
          <p>{{ VRM_RIG_MODEL_AUTHOR }} · official VRM 1.0 constraint sample</p>
          <div class="flex flex-wrap gap-x-3 gap-y-1">
            <a class="text-sky-300 hover:text-sky-200" :href="VRM_RIG_MODEL_SOURCE">Source</a>
            <a class="text-sky-300 hover:text-sky-200" :href="VRM_RIG_MODEL_LICENSE">Licence</a>
          </div>
        </div>
      </aside>
    </section>
  </main>
</template>
