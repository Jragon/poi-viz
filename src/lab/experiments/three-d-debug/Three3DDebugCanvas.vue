<script setup lang="ts">
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import type { BodySkeletonFrame } from "@/body-rig";
import type { PlaneId, RigId, Vec3, WorldMultiRigPose } from "@/engine/types";
import type { WorldMultiRigTrailSamples } from "@/visualizer/worldTrailSampling";

import {
  buildDebugRigSceneEntries,
  buildDefaultCameraViewState,
  buildOriginPlaneSheetStates,
  resolveSceneRadiusWorld
} from "./worldPoseScene";
import { BodyStickFigureRenderer } from "./bodyStickFigureRenderer";
import { setLineGeometryPoints } from "./trailLineGeometry";

const TETHER_RADIUS = 0.012;
const UNIT_TETHER_LENGTH = 1;
const Y_AXIS = new THREE.Vector3(0, 1, 0);

const props = withDefaults(
  defineProps<{
    poses: WorldMultiRigPose;
    trails: WorldMultiRigTrailSamples;
    rigOrder: RigId[];
    bodyScene: BodySkeletonFrame | null;
    sceneRadiusWorld: number;
    sceneCenterWorld: Vec3;
    activePlanes: PlaneId[];
    showAxes?: boolean;
    showGrid?: boolean;
    showHandTrails?: boolean;
    showHeadTrails?: boolean;
    showPlaneSheets?: boolean;
    cameraResetVersion?: number;
  }>(),
  {
    showAxes: true,
    showGrid: true,
    showHandTrails: true,
    showHeadTrails: true,
    showPlaneSheets: true,
    cameraResetVersion: 0
  }
);

interface TrailObjects {
  readonly hand: THREE.Line;
  readonly head: THREE.Line;
}

interface RigMarkerObjects {
  readonly hand: THREE.Mesh;
  readonly head: THREE.Mesh;
  readonly tether: THREE.Mesh;
}

interface PlaneObjects {
  readonly group: THREE.Group;
  readonly surface: THREE.Mesh;
  readonly edge: THREE.LineSegments;
}

const mountRef = ref<HTMLDivElement | null>(null);
const rendererError = ref<string | null>(null);
const backgroundColor = new THREE.Color("#020617");
const resolvedSceneRadius = computed(() => resolveSceneRadiusWorld(props.sceneRadiusWorld));

const rigMarkerObjects = new Map<RigId, RigMarkerObjects>();
const trailObjects = new Map<RigId, TrailObjects>();
const planeObjects = new Map<PlaneId, PlaneObjects>();

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let orbitControls: OrbitControls | null = null;
let axesHelper: THREE.AxesHelper | null = null;
let gridHelper: THREE.GridHelper | null = null;
let resizeObserver: ResizeObserver | null = null;
let bodyFigureRenderer: BodyStickFigureRenderer | null = null;

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) {
    material.forEach((entry) => entry.dispose());
    return;
  }

  material.dispose();
}

function renderScene() {
  if (!renderer || !scene || !camera) {
    return;
  }

  renderer.render(scene, camera);
}

function syncCamera(shouldResetPosition: boolean) {
  if (!camera) {
    return;
  }

  const viewState = buildDefaultCameraViewState(props.sceneCenterWorld, props.sceneRadiusWorld);

  camera.near = viewState.near;
  camera.far = viewState.far;
  camera.updateProjectionMatrix();

  if (orbitControls) {
    orbitControls.minDistance = viewState.minDistanceWorld;
    orbitControls.maxDistance = viewState.maxDistanceWorld;
    orbitControls.target.set(viewState.target.x, viewState.target.y, viewState.target.z);

    if (shouldResetPosition) {
      camera.position.set(viewState.position.x, viewState.position.y, viewState.position.z);
    }

    orbitControls.update();
    return;
  }

  camera.position.set(viewState.position.x, viewState.position.y, viewState.position.z);
  camera.lookAt(viewState.target.x, viewState.target.y, viewState.target.z);
}

function resizeRenderer() {
  if (!renderer || !camera || !mountRef.value) {
    return;
  }

  const width = Math.max(mountRef.value.clientWidth, 320);
  const height = Math.max(mountRef.value.clientHeight, 320);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderScene();
}

function createRigMarkerObjects(
  entry: ReturnType<typeof buildDebugRigSceneEntries>[number]
): RigMarkerObjects {
  const hand = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 24, 24),
    new THREE.MeshBasicMaterial({ color: entry.handColor })
  );
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 24, 24),
    new THREE.MeshBasicMaterial({ color: entry.headColor })
  );
  const tether = new THREE.Mesh(
    new THREE.CylinderGeometry(TETHER_RADIUS, TETHER_RADIUS, UNIT_TETHER_LENGTH, 8),
    new THREE.MeshBasicMaterial({
      color: entry.headColor,
      transparent: true,
      opacity: 0.5
    })
  );

  return { hand, head, tether };
}

function createTrailObjects(
  entry: ReturnType<typeof buildDebugRigSceneEntries>[number]
): TrailObjects {
  const hand = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({
      color: entry.handColor,
      transparent: true,
      opacity: 0.75
    })
  );
  const head = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({
      color: entry.headColor,
      transparent: true,
      opacity: 0.45
    })
  );

  return { hand, head };
}

function syncBodyScene() {
  if (!scene || !bodyFigureRenderer) {
    return;
  }

  bodyFigureRenderer.sync(scene, props.bodyScene);
  renderScene();
}

function syncRigMarkers() {
  if (!scene) {
    return;
  }

  const currentScene = scene;
  const entries = buildDebugRigSceneEntries(props.poses, props.rigOrder);
  const activeRigIds = new Set(entries.map((entry) => entry.rigId));

  entries.forEach((entry) => {
    let objects = rigMarkerObjects.get(entry.rigId);

    if (!objects) {
      objects = createRigMarkerObjects(entry);
      rigMarkerObjects.set(entry.rigId, objects);
      currentScene.add(objects.tether, objects.hand, objects.head);
    }

    const handMaterial = objects.hand.material as THREE.MeshBasicMaterial;
    const headMaterial = objects.head.material as THREE.MeshBasicMaterial;
    const tetherMaterial = objects.tether.material as THREE.MeshBasicMaterial;
    const handPosition = new THREE.Vector3(
      entry.handPosition.x,
      entry.handPosition.y,
      entry.handPosition.z
    );
    const headPosition = new THREE.Vector3(
      entry.headPosition.x,
      entry.headPosition.y,
      entry.headPosition.z
    );
    const tetherDirection = new THREE.Vector3().subVectors(headPosition, handPosition);
    const tetherLength = tetherDirection.length();

    handMaterial.color.set(entry.handColor);
    headMaterial.color.set(entry.headColor);
    tetherMaterial.color.set(entry.tetherColor);
    objects.tether.position.lerpVectors(handPosition, headPosition, 0.5);
    objects.tether.scale.set(1, Math.max(tetherLength, 1e-6), 1);
    if (tetherLength > 1e-6) {
      objects.tether.quaternion.setFromUnitVectors(Y_AXIS, tetherDirection.normalize());
    } else {
      objects.tether.quaternion.identity();
    }
    objects.hand.position.set(entry.handPosition.x, entry.handPosition.y, entry.handPosition.z);
    objects.head.position.set(entry.headPosition.x, entry.headPosition.y, entry.headPosition.z);
    objects.hand.visible = true;
    objects.head.visible = true;
    objects.tether.visible = true;
  });

  for (const [rigId, objects] of rigMarkerObjects.entries()) {
    if (activeRigIds.has(rigId)) {
      continue;
    }

    objects.hand.visible = false;
    objects.head.visible = false;
    objects.tether.visible = false;
  }

  renderScene();
}

function syncTrailObjects() {
  if (!scene) {
    return;
  }

  const currentScene = scene;
  const entries = buildDebugRigSceneEntries(props.poses, props.rigOrder);
  const activeRigIds = new Set(entries.map((entry) => entry.rigId));

  entries.forEach((entry) => {
    let objects = trailObjects.get(entry.rigId);

    if (!objects) {
      objects = createTrailObjects(entry);
      trailObjects.set(entry.rigId, objects);
      currentScene.add(objects.hand, objects.head);
    }

    const handMaterial = objects.hand.material as THREE.LineBasicMaterial;
    const headMaterial = objects.head.material as THREE.LineBasicMaterial;
    const trails = props.trails[entry.rigId];
    const handPoints = trails?.hand ?? [];
    const headPoints = trails?.head ?? [];

    handMaterial.color.set(entry.handColor);
    headMaterial.color.set(entry.headColor);
    setLineGeometryPoints(objects.hand.geometry as THREE.BufferGeometry, handPoints);
    setLineGeometryPoints(objects.head.geometry as THREE.BufferGeometry, headPoints);
    objects.hand.visible = props.showHandTrails && handPoints.length >= 2;
    objects.head.visible = props.showHeadTrails && headPoints.length >= 2;
  });

  for (const [rigId, objects] of trailObjects.entries()) {
    if (activeRigIds.has(rigId)) {
      continue;
    }

    objects.hand.visible = false;
    objects.head.visible = false;
  }

  renderScene();
}

function createPlaneObjects(color: string): PlaneObjects {
  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1)),
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3,
      depthWrite: false
    })
  );
  const group = new THREE.Group();

  group.add(surface, edge);
  return { group, surface, edge };
}

function syncHelpers() {
  if (!scene) {
    return;
  }

  const currentScene = scene;

  if (!axesHelper) {
    axesHelper = new THREE.AxesHelper(1);
    currentScene.add(axesHelper);
  }

  axesHelper.visible = props.showAxes;
  axesHelper.scale.setScalar(resolvedSceneRadius.value + 0.5);

  if (!gridHelper) {
    gridHelper = new THREE.GridHelper(1, 12, "#334155", "#1e293b");
    currentScene.add(gridHelper);
  }

  gridHelper.visible = props.showGrid;
  gridHelper.scale.setScalar(resolvedSceneRadius.value * 4);

  buildOriginPlaneSheetStates(props.activePlanes, props.showPlaneSheets).forEach((state) => {
    let objects = planeObjects.get(state.planeId);

    if (!objects) {
      objects = createPlaneObjects(state.color);
      planeObjects.set(state.planeId, objects);
      currentScene.add(objects.group);
    }

    const surfaceMaterial = objects.surface.material as THREE.MeshBasicMaterial;
    const edgeMaterial = objects.edge.material as THREE.LineBasicMaterial;

    surfaceMaterial.color.set(state.color);
    surfaceMaterial.opacity = state.opacity;
    edgeMaterial.color.set(state.color);
    edgeMaterial.opacity = Math.min(state.opacity * 2.5, 0.35);
    objects.group.position.set(state.center.x, state.center.y, state.center.z);
    objects.group.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
    objects.group.scale.set(state.radiusWorld * 2, state.radiusWorld * 2, 1);
    objects.group.visible = state.visible;
  });

  renderScene();
}

function disposeRigMarkerObjects(objects: RigMarkerObjects) {
  objects.hand.geometry.dispose();
  disposeMaterial(objects.hand.material);
  objects.head.geometry.dispose();
  disposeMaterial(objects.head.material);
  objects.tether.geometry.dispose();
  disposeMaterial(objects.tether.material);
}

function disposeTrailObjects(objects: TrailObjects) {
  objects.hand.geometry.dispose();
  disposeMaterial(objects.hand.material);
  objects.head.geometry.dispose();
  disposeMaterial(objects.head.material);
}

function disposePlaneObjects(objects: PlaneObjects) {
  objects.surface.geometry.dispose();
  disposeMaterial(objects.surface.material);
  objects.edge.geometry.dispose();
  disposeMaterial(objects.edge.material);
}

function disposeThreeSceneResources() {
  resizeObserver?.disconnect();
  resizeObserver = null;

  orbitControls?.removeEventListener("change", renderScene);
  orbitControls?.dispose();
  orbitControls = null;

  if (bodyFigureRenderer && scene) {
    bodyFigureRenderer.dispose(scene);
  }
  bodyFigureRenderer = null;

  for (const objects of rigMarkerObjects.values()) {
    scene?.remove(objects.tether, objects.hand, objects.head);
    disposeRigMarkerObjects(objects);
  }
  rigMarkerObjects.clear();

  for (const objects of trailObjects.values()) {
    scene?.remove(objects.hand, objects.head);
    disposeTrailObjects(objects);
  }
  trailObjects.clear();

  for (const objects of planeObjects.values()) {
    scene?.remove(objects.group);
    disposePlaneObjects(objects);
  }
  planeObjects.clear();

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

  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();

    if (mountRef.value?.contains(renderer.domElement)) {
      mountRef.value.removeChild(renderer.domElement);
    }

    renderer = null;
  }

  camera = null;
  scene = null;
}

onMounted(() => {
  if (!mountRef.value) {
    return;
  }

  try {
    scene = new THREE.Scene();
    scene.background = backgroundColor;

    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    syncCamera(true);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    mountRef.value.appendChild(renderer.domElement);

    try {
      orbitControls = new OrbitControls(camera, renderer.domElement);
      orbitControls.enablePan = false;
      orbitControls.enableZoom = true;
      orbitControls.enableRotate = true;
      orbitControls.addEventListener("change", renderScene);
      syncCamera(true);
    } catch {
      orbitControls = null;
    }

    resizeObserver = new ResizeObserver(() => {
      resizeRenderer();
    });
    resizeObserver.observe(mountRef.value);

    bodyFigureRenderer = new BodyStickFigureRenderer();
    syncHelpers();
    syncBodyScene();
    syncRigMarkers();
    syncTrailObjects();
    resizeRenderer();
  } catch (error) {
    rendererError.value =
      error instanceof Error ? error.message : "Unable to initialize Three.js renderer.";

    disposeThreeSceneResources();
  }
});

watch(
  () => props.bodyScene,
  () => {
    syncBodyScene();
  },
  { immediate: true }
);

watch(
  () => [props.poses, props.rigOrder],
  () => {
    syncRigMarkers();
  },
  { deep: true, immediate: true }
);

watch(
  () => [props.trails, props.rigOrder, props.showHandTrails, props.showHeadTrails],
  () => {
    syncTrailObjects();
  },
  { deep: true, immediate: true }
);

watch(
  [
    () => props.sceneRadiusWorld,
    () => props.sceneCenterWorld.x,
    () => props.sceneCenterWorld.y,
    () => props.sceneCenterWorld.z
  ],
  () => {
    syncCamera(false);
    syncHelpers();
    renderScene();
  },
  { immediate: true }
);

watch(
  () => [props.activePlanes, props.showAxes, props.showGrid, props.showPlaneSheets],
  () => {
    syncHelpers();
  },
  { deep: true, immediate: true }
);

watch(
  () => props.cameraResetVersion,
  () => {
    syncCamera(true);
    renderScene();
  }
);

onBeforeUnmount(() => {
  disposeThreeSceneResources();
});
</script>

<template>
  <div
    ref="mountRef"
    class="relative min-h-112 overflow-hidden rounded-xl border border-slate-800 bg-slate-950"
  >
    <div
      v-if="rendererError"
      class="absolute inset-4 grid place-items-center rounded-lg border border-rose-900/60 bg-rose-950/40 px-4 py-6 text-center text-sm text-rose-100"
    >
      <p>{{ rendererError }}</p>
    </div>

    <div
      v-else
      class="pointer-events-none absolute left-4 top-4 rounded-md border border-slate-800 bg-slate-950/80 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-slate-400 backdrop-blur-sm"
    >
      Stick figure / trails debug
    </div>
  </div>
</template>
