<script setup lang="ts">
import { type VRM, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { buildBodyRigDimensionsForCanonicalUnitRadius, type BodySkeletonFrame } from "@/body-rig";
import type { RigId, Vec3, WorldMultiRigPose } from "@/engine/types";
import { BodyHumanoidRenderer } from "@/lab/experiments/three-d-debug/bodyHumanoidRenderer";
import {
  buildDebugRigSceneEntries,
  buildDefaultCameraViewState,
  resolveSceneRadiusWorld
} from "@/lab/experiments/three-d-debug/worldPoseScene";

import { VRM_RIG_MODEL_FORMAT, buildVrmRigModelUrl } from "./vrmModel";
import { type VrmPoseDiagnostics, VrmStandingPoseAdapter } from "./vrmStandingPose";
import { buildVrmRigProfile, type VrmRigProfile } from "./vrmRigProfile";
import { resolveVrmCanvasTransform, updateVrmCameraProjection } from "./vrmView";

const props = withDefaults(
  defineProps<{
    bodyFrame: BodySkeletonFrame | null;
    poses: WorldMultiRigPose;
    rigOrder: readonly RigId[];
    sceneCenterWorld: Vec3;
    sceneRadiusWorld: number;
    showModel?: boolean;
    showTargetRig?: boolean;
    showVrmHelpers?: boolean;
    showPoiTargets?: boolean;
    showAxes?: boolean;
    showGrid?: boolean;
    showUnitCircle?: boolean;
    mirroredView?: boolean;
    cameraResetVersion?: number;
  }>(),
  {
    showModel: true,
    showTargetRig: true,
    showVrmHelpers: false,
    showPoiTargets: true,
    showAxes: true,
    showGrid: true,
    showUnitCircle: true,
    mirroredView: false,
    cameraResetVersion: 0
  }
);

const emit = defineEmits<{
  rigProfile: [profile: VrmRigProfile];
  poseDiagnostics: [diagnostics: VrmPoseDiagnostics | null];
}>();

type LoadState = "loading" | "ready" | "error";

interface PoiObjects {
  readonly hand: THREE.Mesh;
  readonly head: THREE.Mesh;
  readonly tether: THREE.Mesh;
}

const TETHER_RADIUS = 0.01;
const UNIT_TETHER_LENGTH = 1;
const Y_AXIS = new THREE.Vector3(0, 1, 0);

const mountRef = ref<HTMLDivElement | null>(null);
const loadState = ref<LoadState>("loading");
const loadMessage = ref(`Loading ${VRM_RIG_MODEL_FORMAT} avatar…`);
const resolvedSceneRadius = computed(() => resolveSceneRadiusWorld(props.sceneRadiusWorld));

const poiObjects = new Map<RigId, PoiObjects>();

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let orbitControls: OrbitControls | null = null;
let resizeObserver: ResizeObserver | null = null;
let axesHelper: THREE.AxesHelper | null = null;
let gridHelper: THREE.GridHelper | null = null;
let unitCircle: THREE.LineLoop | null = null;
let targetRigRenderer: BodyHumanoidRenderer | null = null;
let helperRoot: THREE.Group | null = null;
let currentVrm: VRM | null = null;
let standingPoseAdapter: VrmStandingPoseAdapter | null = null;
let disposed = false;

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) {
    material.forEach((entry) => entry.dispose());
    return;
  }

  material.dispose();
}

function renderScene() {
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

function syncCamera(resetPosition: boolean) {
  if (!camera) {
    return;
  }

  const view = buildDefaultCameraViewState(props.sceneCenterWorld, props.sceneRadiusWorld);

  camera.near = view.near;
  camera.far = view.far;
  updateVrmCameraProjection(camera);

  if (orbitControls) {
    orbitControls.target.set(view.target.x, view.target.y, view.target.z);
    orbitControls.minDistance = view.minDistanceWorld;
    orbitControls.maxDistance = view.maxDistanceWorld;
    if (resetPosition) {
      camera.position.set(view.position.x, view.position.y, view.position.z);
    }
    orbitControls.update();
  } else {
    camera.position.set(view.position.x, view.position.y, view.position.z);
    camera.lookAt(view.target.x, view.target.y, view.target.z);
  }
}

function resizeRenderer() {
  if (!renderer || !camera || !mountRef.value) {
    return;
  }

  const width = Math.max(mountRef.value.clientWidth, 320);
  const height = Math.max(mountRef.value.clientHeight, 480);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  updateVrmCameraProjection(camera);
  renderScene();
}

function syncCanvasMirror() {
  if (!renderer) {
    return;
  }

  renderer.domElement.style.transform = resolveVrmCanvasTransform(props.mirroredView);
  renderer.domElement.style.transformOrigin = "center";
}

function createPoiObjects(entry: ReturnType<typeof buildDebugRigSceneEntries>[number]): PoiObjects {
  const hand = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 20, 20),
    new THREE.MeshBasicMaterial({ color: entry.handColor })
  );
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 20, 20),
    new THREE.MeshBasicMaterial({ color: entry.headColor })
  );
  const tether = new THREE.Mesh(
    new THREE.CylinderGeometry(TETHER_RADIUS, TETHER_RADIUS, UNIT_TETHER_LENGTH, 8),
    new THREE.MeshBasicMaterial({
      color: entry.tetherColor,
      transparent: true,
      opacity: 0.7
    })
  );

  return { hand, head, tether };
}

function syncPoiTargets() {
  if (!scene) {
    return;
  }

  const entries = buildDebugRigSceneEntries(props.poses, props.rigOrder);
  const activeIds = new Set(entries.map((entry) => entry.rigId));

  entries.forEach((entry) => {
    let objects = poiObjects.get(entry.rigId);

    if (!objects) {
      objects = createPoiObjects(entry);
      poiObjects.set(entry.rigId, objects);
      scene?.add(objects.hand, objects.head, objects.tether);
    }

    const hand = new THREE.Vector3(
      entry.handPosition.x,
      entry.handPosition.y,
      entry.handPosition.z
    );
    const head = new THREE.Vector3(
      entry.headPosition.x,
      entry.headPosition.y,
      entry.headPosition.z
    );
    const direction = new THREE.Vector3().subVectors(head, hand);
    const length = direction.length();

    objects.hand.position.copy(hand);
    objects.head.position.copy(head);
    objects.tether.position.lerpVectors(hand, head, 0.5);
    objects.tether.scale.set(1, Math.max(length, 1e-6), 1);
    if (length > 1e-6) {
      objects.tether.quaternion.setFromUnitVectors(Y_AXIS, direction.normalize());
    } else {
      objects.tether.quaternion.identity();
    }

    objects.hand.visible = props.showPoiTargets;
    objects.head.visible = props.showPoiTargets;
    objects.tether.visible = props.showPoiTargets;
  });

  for (const [rigId, objects] of poiObjects.entries()) {
    if (!activeIds.has(rigId)) {
      objects.hand.visible = false;
      objects.head.visible = false;
      objects.tether.visible = false;
    }
  }

  renderScene();
}

function syncTargetRig() {
  if (!scene || !targetRigRenderer) {
    return;
  }

  targetRigRenderer.sync(scene, props.showTargetRig ? props.bodyFrame : null);
  renderScene();
}

function syncVrmPose() {
  if (!currentVrm || !standingPoseAdapter) {
    return;
  }

  try {
    if (props.bodyFrame) {
      standingPoseAdapter.apply(props.bodyFrame);
    } else {
      currentVrm.humanoid.resetNormalizedPose();
    }

    // This is the single normalized-to-raw bone copy and constraint update for
    // the frame. Delta zero keeps spring bones independent of playback history.
    currentVrm.update(0);
    emit("poseDiagnostics", props.bodyFrame ? standingPoseAdapter.measure(props.bodyFrame) : null);
    currentVrm.scene.visible = props.showModel;
    renderScene();
  } catch (error) {
    loadState.value = "error";
    loadMessage.value =
      error instanceof Error ? error.message : "Unable to apply the standing VRM pose.";
  }
}

function syncHelpers() {
  if (!scene) {
    return;
  }

  if (!axesHelper) {
    axesHelper = new THREE.AxesHelper(1);
    scene.add(axesHelper);
  }
  axesHelper.visible = props.showAxes;
  axesHelper.scale.setScalar(resolvedSceneRadius.value + 0.5);

  if (!gridHelper) {
    gridHelper = new THREE.GridHelper(1, 12, "#475569", "#1e293b");
    scene.add(gridHelper);
  }
  gridHelper.visible = props.showGrid;
  gridHelper.scale.setScalar(resolvedSceneRadius.value * 4);

  if (helperRoot) {
    helperRoot.visible = props.showVrmHelpers;
  }
  if (unitCircle) {
    unitCircle.visible = props.showUnitCircle;
  }

  renderScene();
}

function replaceUnitCircle() {
  if (!scene) {
    return;
  }

  if (unitCircle) {
    scene.remove(unitCircle);
    unitCircle.geometry.dispose();
    disposeMaterial(unitCircle.material);
  }

  const { origin, unitRadius } =
    buildBodyRigDimensionsForCanonicalUnitRadius(1).canonicalPatternSpace;
  const points = Array.from({ length: 128 }, (_, index) => {
    const angle = (index / 128) * Math.PI * 2;
    return new THREE.Vector3(
      origin.x + Math.cos(angle) * unitRadius,
      origin.y + Math.sin(angle) * unitRadius,
      origin.z
    );
  });
  unitCircle = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({
      color: "#2dd4bf",
      transparent: true,
      opacity: 0.8,
      depthTest: false
    })
  );
  unitCircle.name = "CanonicalHandOverlapCircle";
  unitCircle.renderOrder = 9_000;
  unitCircle.visible = props.showUnitCircle;
  scene.add(unitCircle);
}

function loadVrmModel() {
  if (!scene || !helperRoot) {
    return;
  }

  const currentHelperRoot = helperRoot;
  const loader = new GLTFLoader();
  loader.crossOrigin = "anonymous";
  loader.register(
    (parser) =>
      new VRMLoaderPlugin(parser, {
        helperRoot: currentHelperRoot,
        autoUpdateHumanBones: true
      })
  );

  loader.load(
    buildVrmRigModelUrl(import.meta.env.BASE_URL),
    (gltf) => {
      const vrm = gltf.userData.vrm as VRM | undefined;

      if (!vrm) {
        VRMUtils.deepDispose(gltf.scene);
        loadState.value = "error";
        loadMessage.value = "The selected file loaded as glTF but did not contain a VRM humanoid.";
        return;
      }

      if (disposed || !scene) {
        VRMUtils.deepDispose(vrm.scene);
        return;
      }

      VRMUtils.removeUnnecessaryVertices(gltf.scene);
      VRMUtils.combineSkeletons(gltf.scene);
      VRMUtils.combineMorphs(vrm);

      vrm.scene.traverse((object) => {
        object.frustumCulled = false;
      });

      const rigProfile = buildVrmRigProfile(vrm);
      replaceUnitCircle();
      currentVrm = vrm;
      standingPoseAdapter = new VrmStandingPoseAdapter(vrm, rigProfile);
      emit("rigProfile", rigProfile);
      scene.add(vrm.scene);
      loadState.value = "ready";
      loadMessage.value = `${VRM_RIG_MODEL_FORMAT} ready · normalized humanoid rig active`;
      void nextTick(() => {
        if (!disposed) {
          syncVrmPose();
          syncHelpers();
        }
      });
    },
    (progress) => {
      if (progress.total > 0) {
        loadMessage.value = `Loading ${VRM_RIG_MODEL_FORMAT} avatar · ${Math.round((progress.loaded / progress.total) * 100)}%`;
      }
    },
    (error) => {
      loadState.value = "error";
      loadMessage.value = error instanceof Error ? error.message : "Unable to load the VRM avatar.";
    }
  );
}

function disposePoiObjects(objects: PoiObjects) {
  objects.hand.geometry.dispose();
  disposeMaterial(objects.hand.material);
  objects.head.geometry.dispose();
  disposeMaterial(objects.head.material);
  objects.tether.geometry.dispose();
  disposeMaterial(objects.tether.material);
}

function disposeScene() {
  disposed = true;
  resizeObserver?.disconnect();
  resizeObserver = null;

  orbitControls?.removeEventListener("change", renderScene);
  orbitControls?.dispose();
  orbitControls = null;

  if (targetRigRenderer && scene) {
    targetRigRenderer.dispose(scene);
  }
  targetRigRenderer = null;

  for (const objects of poiObjects.values()) {
    scene?.remove(objects.hand, objects.head, objects.tether);
    disposePoiObjects(objects);
  }
  poiObjects.clear();

  if (currentVrm) {
    scene?.remove(currentVrm.scene);
    VRMUtils.deepDispose(currentVrm.scene);
  }
  currentVrm = null;
  standingPoseAdapter = null;
  emit("poseDiagnostics", null);

  if (helperRoot) {
    scene?.remove(helperRoot);
    VRMUtils.deepDispose(helperRoot);
  }
  helperRoot = null;

  if (axesHelper) {
    scene?.remove(axesHelper);
    axesHelper.geometry.dispose();
    disposeMaterial(axesHelper.material);
    axesHelper = null;
  }
  if (gridHelper) {
    scene?.remove(gridHelper);
    gridHelper.geometry.dispose();
    disposeMaterial(gridHelper.material);
    gridHelper = null;
  }
  if (unitCircle) {
    scene?.remove(unitCircle);
    unitCircle.geometry.dispose();
    disposeMaterial(unitCircle.material);
    unitCircle = null;
  }

  renderer?.dispose();
  renderer?.forceContextLoss();
  if (renderer && mountRef.value?.contains(renderer.domElement)) {
    mountRef.value.removeChild(renderer.domElement);
  }

  renderer = null;
  camera = null;
  scene = null;
}

onMounted(() => {
  if (!mountRef.value) {
    return;
  }

  try {
    disposed = false;
    scene = new THREE.Scene();
    scene.background = new THREE.Color("#020617");

    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    syncCanvasMirror();
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    mountRef.value.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight("#dbeafe", "#172554", 1.5);
    const key = new THREE.DirectionalLight("#ffffff", Math.PI);
    key.position.set(1, 2, 2).normalize();
    scene.add(ambient, key);

    helperRoot = new THREE.Group();
    helperRoot.name = "VrmRigHelpers";
    helperRoot.renderOrder = 10_000;
    scene.add(helperRoot);

    orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = false;
    orbitControls.enablePan = false;
    orbitControls.addEventListener("change", renderScene);

    targetRigRenderer = new BodyHumanoidRenderer();
    syncCamera(true);
    syncHelpers();
    syncTargetRig();
    syncPoiTargets();

    resizeObserver = new ResizeObserver(resizeRenderer);
    resizeObserver.observe(mountRef.value);
    resizeRenderer();
    loadVrmModel();
  } catch (error) {
    loadState.value = "error";
    loadMessage.value =
      error instanceof Error ? error.message : "Unable to initialize the VRM renderer.";
    disposeScene();
  }
});

watch(
  () => props.bodyFrame,
  () => {
    syncTargetRig();
    syncVrmPose();
  },
  { deep: true }
);

watch(
  () => [props.poses, props.rigOrder, props.showPoiTargets],
  () => syncPoiTargets(),
  { deep: true }
);

watch(
  () => [
    props.showModel,
    props.showTargetRig,
    props.showVrmHelpers,
    props.showAxes,
    props.showGrid,
    props.showUnitCircle,
    props.mirroredView
  ],
  () => {
    syncCanvasMirror();
    syncCamera(false);
    syncTargetRig();
    syncVrmPose();
    syncHelpers();
  }
);

watch(
  () => [props.sceneCenterWorld, props.sceneRadiusWorld],
  () => {
    syncCamera(false);
    syncHelpers();
  },
  { deep: true }
);

watch(
  () => props.cameraResetVersion,
  () => {
    syncCamera(true);
    renderScene();
  }
);

onBeforeUnmount(disposeScene);
</script>

<template>
  <div
    ref="mountRef"
    class="relative min-h-144 overflow-hidden rounded-xl border border-slate-800 bg-slate-950"
  >
    <div
      class="pointer-events-none absolute left-4 top-4 z-10 rounded-md border px-3 py-2 text-[11px] uppercase tracking-[0.16em] backdrop-blur-sm"
      :class="
        loadState === 'error'
          ? 'border-rose-800 bg-rose-950/90 text-rose-200'
          : loadState === 'ready'
            ? 'border-emerald-800 bg-emerald-950/85 text-emerald-200'
            : 'border-slate-700 bg-slate-950/85 text-slate-300'
      "
    >
      {{ loadMessage }}
    </div>
  </div>
</template>
