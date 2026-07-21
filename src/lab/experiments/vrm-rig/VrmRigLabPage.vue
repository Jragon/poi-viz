<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue";

import { BodyRigMotionSolver, buildBodyRigDimensionsForCanonicalUnitRadius } from "@/body-rig";
import type { RigId } from "@/engine/types";
import { buildBodyHumanoidScene } from "@/lab/experiments/three-d-debug/bodyHumanoidScene";
import { buildThreeDDebugSceneState } from "@/lab/experiments/three-d-debug/worldPoseScene";
import PatternRegistryControls from "@/patterns/components/PatternRegistryControls.vue";
import { useSelectedPatternSequence } from "@/patterns/useSelectedPatternSequence";
import { threeDDebugSequence } from "@/visualizer/demoSequence";
import TransportControls from "@/visualizer/TransportControls.vue";
import {
  createVisualizerWorkspace,
  provideVisualizerWorkspace
} from "@/visualizer/visualizerWorkspace";

import VrmRigCanvas from "./VrmRigCanvas.vue";
import { buildVrmRigPoseCases, type VrmRigPoseCaseId } from "./rigPoseCases";
import {
  VRM_RIG_MODEL_AUTHOR,
  VRM_RIG_MODEL_FORMAT,
  VRM_RIG_MODEL_LICENSE,
  VRM_RIG_MODEL_NAME,
  VRM_RIG_MODEL_SOURCE
} from "./vrmModel";
import type { VrmPoseDiagnostics } from "./vrmStandingPose";
import type { VrmRigProfile } from "./vrmRigProfile";

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

const showModel = ref(true);
const showTargetRig = ref(true);
const showVrmHelpers = ref(false);
const showPoiTargets = ref(true);
const showAxes = ref(true);
const showGrid = ref(true);
const showUnitCircle = ref(true);
const mirroredView = ref(false);
const cameraResetVersion = ref(0);
const poseSource = ref<"live" | VrmRigPoseCaseId>("live");
const vrmRigProfile = shallowRef<VrmRigProfile | null>(null);
const vrmPoseDiagnostics = shallowRef<VrmPoseDiagnostics | null>(null);
const canonicalBodyDimensions = buildBodyRigDimensionsForCanonicalUnitRadius(1);
const poseCases = buildVrmRigPoseCases(canonicalBodyDimensions);
const bodyRigMotionSolver = new BodyRigMotionSolver();

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
const activeWorldPoses = computed(() => activePoseCase.value?.worldPoses ?? core.worldPoses.value);
const activeRigOrder = computed<readonly RigId[]>(() =>
  activePoseCase.value ? ["left", "right"] : core.rigOrder.value
);
const sceneState = computed(() =>
  buildThreeDDebugSceneState(activeWorldPoses.value, core.sceneWorldRadius.value)
);
const bodyRigIds = computed(() => resolveBodyRigIds(activeRigOrder.value));
const bodyFrame = computed(() =>
  buildBodyHumanoidScene(
    activeWorldPoses.value,
    undefined,
    bodyRigIds.value,
    canonicalBodyDimensions,
    activePoseCase.value
      ? undefined
      : {
          solver: bodyRigMotionSolver,
          time: core.transport.currentTime.value
        }
  )
);
watch([() => core.sequence.value, poseSource], () => bodyRigMotionSolver.reset());
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
function formatRadiansAsDegrees(radians: number): string {
  return `${((radians * 180) / Math.PI).toFixed(1)}°`;
}
const pelvisYaw = computed(() =>
  formatRadiansAsDegrees(bodyFrame.value?.solverDiagnostics.pelvisYawRad ?? 0)
);
const chestYaw = computed(() =>
  formatRadiansAsDegrees(bodyFrame.value?.solverDiagnostics.chestYawRad ?? 0)
);
const spineTwist = computed(() => {
  const diagnostics = bodyFrame.value?.solverDiagnostics;
  return formatRadiansAsDegrees(
    diagnostics ? diagnostics.chestYawRad - diagnostics.pelvisYawRad : 0
  );
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
const targetSideMapping = computed(() => {
  const mapping = vrmRigProfile.value?.targetToVrmSide;
  return mapping
    ? `anatomical left → VRM ${mapping.left} · anatomical right → VRM ${mapping.right}`
    : "measuring";
});
const viewModeSummary = computed(() =>
  mirroredView.value
    ? "Mirror view · final image flipped · anatomy unchanged"
    : "Audience view · final image unflipped · anatomy unchanged"
);
const modelJointError = computed(() => vrmPoseDiagnostics.value?.maxJointError.toFixed(4) ?? "—");
const pelvisError = computed(() => vrmPoseDiagnostics.value?.pelvisError.toFixed(4) ?? "—");
const footErrors = computed(() => {
  const diagnostics = vrmPoseDiagnostics.value;
  return diagnostics
    ? `${diagnostics.leftFootError.toFixed(4)} · ${diagnostics.rightFootError.toFixed(4)}`
    : "—";
});
const patternRadius = computed(() =>
  canonicalBodyDimensions.canonicalPatternSpace.unitRadius.toFixed(4)
);
const avatarScale = computed(() => vrmRigProfile.value?.scale.toFixed(4) ?? "—");
const armReachComparison = computed(() => {
  const profile = vrmRigProfile.value;
  return profile
    ? `${canonicalBodyDimensions.armReach.toFixed(3)} · ${(profile.modelArmReach * profile.scale).toFixed(3)}`
    : "—";
});
const legReachComparison = computed(() => {
  const profile = vrmRigProfile.value;
  if (!profile) {
    return "—";
  }
  const modelLegReach =
    ((profile.legs.left.upperLegLength +
      profile.legs.left.lowerLegLength +
      profile.legs.right.upperLegLength +
      profile.legs.right.lowerLegLength) /
      2) *
    profile.scale;
  const targetLegReach = canonicalBodyDimensions.thighLength + canonicalBodyDimensions.shinLength;
  return `${targetLegReach.toFixed(3)} · ${modelLegReach.toFixed(3)}`;
});
function formatArmJointErrors(side: "left" | "right") {
  const diagnostics = vrmPoseDiagnostics.value?.[side];
  return diagnostics
    ? `${diagnostics.shoulderError.toFixed(4)} · ${diagnostics.elbowError.toFixed(4)} · ${diagnostics.palmError.toFixed(4)}`
    : "—";
}

const leftJointErrors = computed(() => formatArmJointErrors("left"));
const rightJointErrors = computed(() => formatArmJointErrors("right"));

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
        A skinned VRM humanoid driven procedurally from the current POI hand coordinates. The
        translucent target rig exposes the solver result; the solid model exposes the actual
        normalized-bone and skinning result.
      </p>
    </section>

    <PatternRegistryControls :current-name="selectedEntry?.name ?? '3D demo pattern'" />

    <section
      class="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-5 xl:grid-cols-[minmax(0,1fr)_21rem]"
    >
      <div class="grid gap-4">
        <div
          v-if="playbackError"
          class="rounded-xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-100"
        >
          {{ playbackError }}
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
          :show-unit-circle="showUnitCircle"
          :mirrored-view="mirroredView"
          :camera-reset-version="cameraResetVersion"
          @rig-profile="vrmRigProfile = $event"
          @pose-diagnostics="vrmPoseDiagnostics = $event"
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
          <label class="flex items-center justify-between gap-3">
            <span>Unit hand-overlap circle</span>
            <input v-model="showUnitCircle" type="checkbox" />
          </label>
          <label class="flex items-center justify-between gap-3">
            <span>Mirror view</span>
            <input v-model="mirroredView" type="checkbox" />
          </label>
          <p class="text-xs leading-5 text-slate-500">{{ viewModeSummary }}</p>

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
            <span>Pelvis yaw</span>
            <span class="font-mono text-slate-200">{{ pelvisYaw }}</span>
          </p>
          <p class="flex justify-between gap-3 text-slate-400">
            <span>Chest yaw</span>
            <span class="font-mono text-slate-200">{{ chestYaw }}</span>
          </p>
          <p class="flex justify-between gap-3 text-slate-400">
            <span>Spine twist</span>
            <span class="font-mono text-slate-200">{{ spineTwist }}</span>
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
          <p class="grid gap-1 border-t border-slate-800 pt-3 text-slate-400">
            <span>Side mapping</span>
            <span class="font-mono text-xs text-slate-200">{{ targetSideMapping }}</span>
          </p>
          <p class="flex justify-between gap-3 text-slate-400">
            <span>Pattern radius</span>
            <span class="font-mono text-slate-200">{{ patternRadius }}</span>
          </p>
          <p class="flex justify-between gap-3 text-slate-400">
            <span>Avatar scale</span>
            <span class="font-mono text-slate-200">{{ avatarScale }}</span>
          </p>
          <p class="flex justify-between gap-3 text-slate-400">
            <span>Arm reach target/model</span>
            <span class="font-mono text-slate-200">{{ armReachComparison }}</span>
          </p>
          <p class="flex justify-between gap-3 text-slate-400">
            <span>Leg reach target/model</span>
            <span class="font-mono text-slate-200">{{ legReachComparison }}</span>
          </p>
          <p class="flex justify-between gap-3 text-slate-400">
            <span>VRM max joint error</span>
            <span class="font-mono text-slate-200">{{ modelJointError }}</span>
          </p>
          <p class="flex justify-between gap-3 text-slate-400">
            <span>VRM pelvis error</span>
            <span class="font-mono text-slate-200">{{ pelvisError }}</span>
          </p>
          <p class="flex justify-between gap-3 text-slate-400">
            <span>VRM feet L/R</span>
            <span class="font-mono text-slate-200">{{ footErrors }}</span>
          </p>
          <p class="flex justify-between gap-3 text-slate-400">
            <span>VRM left S/E/P</span>
            <span class="font-mono text-xs text-slate-200">{{ leftJointErrors }}</span>
          </p>
          <p class="flex justify-between gap-3 text-slate-400">
            <span>VRM right S/E/P</span>
            <span class="font-mono text-xs text-slate-200">{{ rightJointErrors }}</span>
          </p>
        </div>

        <div
          class="grid gap-2 rounded-xl border border-slate-800 bg-slate-900/65 p-4 text-xs leading-5 text-slate-400"
        >
          <p class="font-medium text-slate-200">{{ VRM_RIG_MODEL_NAME }}</p>
          <p>{{ VRM_RIG_MODEL_AUTHOR }} · {{ VRM_RIG_MODEL_FORMAT }} · CC0</p>
          <div class="flex flex-wrap gap-x-3 gap-y-1">
            <a class="text-sky-300 hover:text-sky-200" :href="VRM_RIG_MODEL_SOURCE">Source</a>
            <a class="text-sky-300 hover:text-sky-200" :href="VRM_RIG_MODEL_LICENSE">Licence</a>
          </div>
        </div>
      </aside>
    </section>
  </main>
</template>
