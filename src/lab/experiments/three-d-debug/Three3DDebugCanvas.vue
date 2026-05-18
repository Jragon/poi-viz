<script setup lang="ts">
import * as THREE from "three";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import type { PlaneId, RigId, Vec3, WorldMultiRigPose } from "@/engine/types";

import { buildDebugRigSceneEntries, buildPlaneHelperStates } from "./worldPoseScene";

const props = withDefaults(
  defineProps<{
    poses: WorldMultiRigPose;
    rigOrder: RigId[];
    sceneRadiusWorld: number;
    sceneCenterWorld: Vec3;
    activePlanes: PlaneId[];
    showAxes?: boolean;
    showGrid?: boolean;
    showPlaneHelpers?: boolean;
  }>(),
  {
    showAxes: true,
    showGrid: true,
    showPlaneHelpers: true
  }
);

interface RigObjects {
  readonly hand: THREE.Mesh;
  readonly head: THREE.Mesh;
  readonly tether: THREE.Line;
}

interface PlaneObjects {
  readonly group: THREE.Group;
  readonly surface: THREE.Mesh;
  readonly edge: THREE.LineSegments;
}

const mountRef = ref<HTMLDivElement | null>(null);
const rendererError = ref<string | null>(null);
const backgroundColor = new THREE.Color("#020617");
const resolvedSceneRadius = computed(() => Math.max(props.sceneRadiusWorld, 2));

const rigObjects = new Map<RigId, RigObjects>();
const planeObjects = new Map<PlaneId, PlaneObjects>();

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let axesHelper: THREE.AxesHelper | null = null;
let gridHelper: THREE.GridHelper | null = null;
let resizeObserver: ResizeObserver | null = null;

function vectorFromPoint(point: Vec3): THREE.Vector3 {
  return new THREE.Vector3(point.x, point.y, point.z);
}

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

function updateCamera() {
  if (!camera) {
    return;
  }

  const radius = resolvedSceneRadius.value;
  camera.near = 0.1;
  camera.far = Math.max(100, radius * 16);
  camera.position.set(
    props.sceneCenterWorld.x + radius * 1.8,
    props.sceneCenterWorld.y + radius * 1.15,
    props.sceneCenterWorld.z + radius * 1.8
  );
  camera.lookAt(props.sceneCenterWorld.x, props.sceneCenterWorld.y, props.sceneCenterWorld.z);
  camera.updateProjectionMatrix();
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

function createRigObjects(entry: ReturnType<typeof buildDebugRigSceneEntries>[number]): RigObjects {
  const hand = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 24, 24),
    new THREE.MeshBasicMaterial({ color: entry.handColor })
  );
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 24, 24),
    new THREE.MeshBasicMaterial({ color: entry.headColor })
  );
  const tether = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      vectorFromPoint(entry.handPosition),
      vectorFromPoint(entry.headPosition)
    ]),
    new THREE.LineBasicMaterial({ color: entry.tetherColor })
  );

  return { hand, head, tether };
}

function syncRigObjects() {
  if (!scene) {
    return;
  }

  const currentScene = scene;

  const entries = buildDebugRigSceneEntries(props.poses, props.rigOrder);
  const activeRigIds = new Set(entries.map((entry) => entry.rigId));

  entries.forEach((entry) => {
    let objects = rigObjects.get(entry.rigId);

    if (!objects) {
      objects = createRigObjects(entry);
      rigObjects.set(entry.rigId, objects);
      currentScene.add(objects.hand, objects.head, objects.tether);
    }

    const handMaterial = objects.hand.material as THREE.MeshBasicMaterial;
    const headMaterial = objects.head.material as THREE.MeshBasicMaterial;
    const tetherMaterial = objects.tether.material as THREE.LineBasicMaterial;

    handMaterial.color.set(entry.handColor);
    headMaterial.color.set(entry.headColor);
    tetherMaterial.color.set(entry.tetherColor);

    objects.hand.visible = true;
    objects.head.visible = true;
    objects.tether.visible = true;
    objects.hand.position.copy(vectorFromPoint(entry.handPosition));
    objects.head.position.copy(vectorFromPoint(entry.headPosition));
    (objects.tether.geometry as THREE.BufferGeometry).setFromPoints([
      vectorFromPoint(entry.handPosition),
      vectorFromPoint(entry.headPosition)
    ]);
  });

  for (const [rigId, objects] of rigObjects.entries()) {
    if (activeRigIds.has(rigId)) {
      continue;
    }

    objects.hand.visible = false;
    objects.head.visible = false;
    objects.tether.visible = false;
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
      side: THREE.DoubleSide
    })
  );
  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1)),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.3 })
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

  buildPlaneHelperStates(props.activePlanes, props.showPlaneHelpers).forEach((state) => {
    let objects = planeObjects.get(state.planeId);

    if (!objects) {
      objects = createPlaneObjects(state.color);
      planeObjects.set(state.planeId, objects);
      currentScene.add(objects.group);
    }

    (objects.surface.material as THREE.MeshBasicMaterial).color.set(state.color);
    (objects.edge.material as THREE.LineBasicMaterial).color.set(state.color);
    objects.group.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
    objects.group.scale.setScalar(resolvedSceneRadius.value * 3);
    objects.group.visible = state.visible;
  });

  renderScene();
}

function disposeRigObjects(objects: RigObjects) {
  objects.hand.geometry.dispose();
  disposeMaterial(objects.hand.material);
  objects.head.geometry.dispose();
  disposeMaterial(objects.head.material);
  objects.tether.geometry.dispose();
  disposeMaterial(objects.tether.material);
}

function disposePlaneObjects(objects: PlaneObjects) {
  objects.surface.geometry.dispose();
  disposeMaterial(objects.surface.material);
  objects.edge.geometry.dispose();
  disposeMaterial(objects.edge.material);
}

onMounted(() => {
  if (!mountRef.value) {
    return;
  }

  try {
    scene = new THREE.Scene();
    scene.background = backgroundColor;

    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    updateCamera();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    mountRef.value.appendChild(renderer.domElement);

    resizeObserver = new ResizeObserver(() => {
      resizeRenderer();
    });
    resizeObserver.observe(mountRef.value);

    syncHelpers();
    syncRigObjects();
    resizeRenderer();
  } catch (error) {
    rendererError.value =
      error instanceof Error ? error.message : "Unable to initialize Three.js renderer.";

    renderer?.dispose();
    renderer = null;
    camera = null;
    scene = null;
  }
});

watch(
  () => [props.poses, props.rigOrder],
  () => {
    syncRigObjects();
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
    updateCamera();
    syncHelpers();
    renderScene();
  },
  { immediate: true }
);

watch(
  () => [props.activePlanes, props.showAxes, props.showGrid, props.showPlaneHelpers],
  () => {
    syncHelpers();
  },
  { deep: true, immediate: true }
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;

  for (const objects of rigObjects.values()) {
    disposeRigObjects(objects);
  }
  rigObjects.clear();

  for (const objects of planeObjects.values()) {
    disposePlaneObjects(objects);
  }
  planeObjects.clear();

  if (axesHelper) {
    axesHelper.geometry.dispose();
    disposeMaterial(axesHelper.material);
    scene?.remove(axesHelper);
    axesHelper = null;
  }

  if (gridHelper) {
    gridHelper.geometry.dispose();
    disposeMaterial(gridHelper.material);
    scene?.remove(gridHelper);
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
      Hand / head / tether debug
    </div>
  </div>
</template>
