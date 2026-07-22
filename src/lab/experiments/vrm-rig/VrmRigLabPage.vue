<script setup lang="ts">
import { computed, ref, shallowRef, watch } from "vue";

import { BodyRigMotionSolver, buildBodyRigDimensionsForCanonicalUnitRadius } from "@/body-rig";
import type { RigId } from "@/engine/types";
import { buildBodyHumanoidScene } from "@/lab/experiments/three-d-debug/bodyHumanoidScene";
import { buildThreeDDebugSceneState } from "@/lab/experiments/three-d-debug/worldPoseScene";
import PatternRegistryControls from "@/patterns/components/PatternRegistryControls.vue";
import { useSelectedPatternSequence } from "@/patterns/useSelectedPatternSequence";
import { applyAsymmetricPlaneSideDisplayOffset } from "@/visualizer/planeSideDisplay";
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
const PLANE_SIDE_DEPTH_MAX = 1;
const sideADepthWorld = ref(0.12);
const sideBDepthWorld = ref(0.12);
const VRM_PLAYBACK_SPEEDS = [0.25, 0.5, 1, 2] as const;
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
const vrmWorldPoses = computed(() =>
  Object.fromEntries(
    Object.entries(activeWorldPoses.value).map(([rigId, pose]) => [
      rigId,
      applyAsymmetricPlaneSideDisplayOffset(pose, {
        sideADepthWorld: sideADepthWorld.value,
        sideBDepthWorld: sideBDepthWorld.value,
        defaultSide: "a"
      })
    ])
  )
);
const activeRigOrder = computed<readonly RigId[]>(() =>
  activePoseCase.value ? ["left", "right"] : core.rigOrder.value
);
const sceneState = computed(() =>
  buildThreeDDebugSceneState(
    activeWorldPoses.value,
    core.sceneWorldRadius.value + PLANE_SIDE_DEPTH_MAX
  )
);
const bodyRigIds = computed(() => resolveBodyRigIds(activeRigOrder.value));
const bodyFrame = computed(() =>
  buildBodyHumanoidScene(
    vrmWorldPoses.value,
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

function setPlaybackSpeed(speed: number) {
  core.transport.setSpeed(speed);
}
</script>

<template>
  <main class="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-6 py-8">
    <section class="rounded-2xl border border-ui-border-subtle bg-ui-surface p-5">
      <p class="text-xs uppercase tracking-[0.24em] text-ui-text-muted">Lab Experiment</p>
      <h1 class="mt-2 text-3xl font-semibold text-slate-100">VRM Standing Rig</h1>
      <p class="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
        A skinned VRM humanoid driven procedurally from the current POI hand coordinates. The
        translucent target rig exposes the solver result; the solid model exposes the actual
        normalized-bone and skinning result.
      </p>
    </section>

    <PatternRegistryControls :current-name="selectedEntry?.name ?? '3D demo pattern'" />

    <section
      class="grid gap-4 rounded-2xl border border-ui-border-subtle bg-ui-surface p-5 xl:grid-cols-[minmax(0,1fr)_21rem]"
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
          :poses="vrmWorldPoses"
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
        <div class="rounded-xl border border-ui-border-subtle bg-ui-surface-raised p-4">
          <template v-if="poseSource === 'live'">
            <TransportControls />
            <div class="mt-3 grid gap-2 border-t border-ui-border-subtle pt-3">
              <div class="flex items-center justify-between gap-3">
                <p class="text-xs uppercase tracking-[0.2em] text-ui-text-muted">
                  Playback speed
                </p>
                <p class="font-mono text-xs text-slate-200">
                  {{ core.transport.speed.value }}×
                </p>
              </div>
              <div
                class="grid grid-cols-4 overflow-hidden rounded-lg border border-ui-border-strong"
              >
                <button
                  v-for="speed in VRM_PLAYBACK_SPEEDS"
                  :key="speed"
                  type="button"
                  class="border-r border-ui-border-strong px-2 py-2 text-xs transition last:border-r-0 hover:bg-slate-800 hover:text-white"
                  :class="
                    core.transport.speed.value === speed
                      ? 'bg-sky-400 text-slate-950 hover:bg-sky-300 hover:text-slate-950'
                      : 'bg-ui-input text-ui-text-secondary'
                  "
                  :aria-pressed="core.transport.speed.value === speed"
                  @click="setPlaybackSpeed(speed)"
                >
                  {{ speed }}×
                </button>
              </div>
            </div>
          </template>
          <div v-else class="grid gap-2 text-sm text-slate-300">
            <p class="text-xs uppercase tracking-[0.2em] text-ui-text-muted">Fixed pose case</p>
            <p class="font-medium text-slate-100">{{ activePoseCase?.label }}</p>
            <p class="leading-5 text-slate-400">{{ activePoseCase?.description }}</p>
          </div>
        </div>

        <div class="grid gap-3 rounded-xl border border-ui-border-subtle bg-ui-surface-raised p-4">
          <p class="text-xs uppercase tracking-[0.2em] text-ui-text-muted">Rig Inspection</p>

          <label class="grid gap-1 text-slate-400">
            <span>Pose source</span>
            <select
              v-model="poseSource"
              class="rounded-lg border border-ui-border-strong bg-ui-input px-3 py-2 text-ui-text"
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
          <p class="text-xs leading-5 text-ui-text-muted">{{ viewModeSummary }}</p>

          <div class="grid gap-3 border-t border-ui-border-subtle pt-3">
            <p class="text-xs uppercase tracking-[0.2em] text-ui-text-muted">Plane Side Depth</p>
            <label class="grid gap-1 text-slate-400">
              <span class="flex items-center justify-between gap-3">
                <span>Side A front depth</span>
                <span class="font-mono text-slate-200">{{ sideADepthWorld.toFixed(2) }}</span>
              </span>
              <input
                v-model.number="sideADepthWorld"
                aria-label="Plane side A front depth"
                type="range"
                min="0"
                :max="PLANE_SIDE_DEPTH_MAX"
                step="0.01"
              />
            </label>
            <label class="grid gap-1 text-slate-400">
              <span class="flex items-center justify-between gap-3">
                <span>Side B rear depth</span>
                <span class="font-mono text-slate-200">{{ sideBDepthWorld.toFixed(2) }}</span>
              </span>
              <input
                v-model.number="sideBDepthWorld"
                aria-label="Plane side B rear depth"
                type="range"
                min="0"
                :max="PLANE_SIDE_DEPTH_MAX"
                step="0.01"
              />
            </label>
            <p class="text-xs leading-5 text-ui-text-muted">
              Display-only offsets along each active plane normal. For the wall plane, side A is in
              front of the character and side B is behind.
            </p>
          </div>

          <button
            type="button"
            class="rounded-lg border border-ui-border-strong bg-ui-surface px-3 py-2 text-left text-sm text-ui-text-secondary transition hover:border-sky-400 hover:bg-ui-surface-raised hover:text-sky-100"
            @click="resetView"
          >
            Reset view
          </button>
        </div>

        <div class="grid gap-2 rounded-xl border border-ui-border-subtle bg-ui-surface-raised p-4">
          <p class="text-xs uppercase tracking-[0.2em] text-ui-text-muted">Live Diagnostics</p>
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
          <p class="grid gap-1 border-t border-ui-border-subtle pt-3 text-slate-400">
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
          class="grid gap-2 rounded-xl border border-ui-border-subtle bg-ui-surface-raised p-4 text-xs leading-5 text-ui-text-muted"
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
