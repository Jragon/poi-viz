import * as THREE from "three";

import type { RigId, WorldMultiRigPose } from "@/engine/types";
import type { WorldMultiRigTrailSamples } from "@/visualizer/worldTrailSampling";

import type { FirePoiSettings } from "./firePoiSettings";
import { buildFirePoiRigState } from "./firePoiWake";
import type { SceneEffectController } from "./sceneEffectController";

const CORE_BASE_OPACITY = 0.95;
const INNER_FLAME_BASE_OPACITY = 0.45;
const WAKE_BASE_OPACITY = 0.55;

interface FirePoiRigObjects {
  readonly group: THREE.Group;
  readonly core: THREE.Mesh;
  readonly innerFlame: THREE.Mesh;
  readonly wake: THREE.Points;
}

export interface FirePoiEffectControllerInput {
  readonly poses: WorldMultiRigPose;
  readonly trails: WorldMultiRigTrailSamples;
  readonly rigOrder: readonly RigId[];
  readonly settings: FirePoiSettings;
}

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(material)) {
    material.forEach((entry) => entry.dispose());
    return;
  }

  material.dispose();
}

function disposeRigObjects(scene: THREE.Scene, objects: FirePoiRigObjects): void {
  scene.remove(objects.group);
  objects.core.geometry.dispose();
  objects.innerFlame.geometry.dispose();
  objects.wake.geometry.dispose();
  disposeMaterial(objects.core.material);
  disposeMaterial(objects.innerFlame.material);
  disposeMaterial(objects.wake.material);
}

function createRigObjects(rigId: RigId): FirePoiRigObjects {
  const group = new THREE.Group();
  group.name = `fire-poi:${rigId}`;
  group.visible = false;

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 24, 24),
    new THREE.MeshBasicMaterial({
      color: "#fff7cc",
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );

  const innerFlame = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 20, 20),
    new THREE.MeshBasicMaterial({
      color: "#ff8a1f",
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );

  const wake = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({
      color: "#ffb347",
      size: 0.08,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );

  group.add(core, innerFlame, wake);

  return { group, core, innerFlame, wake };
}

function setWakePositions(
  geometry: THREE.BufferGeometry,
  points: readonly { x: number; y: number; z: number }[]
): void {
  const requiredLength = points.length * 3;
  const existingPositions = geometry.getAttribute("position");
  const reusablePositions =
    existingPositions instanceof THREE.BufferAttribute &&
    existingPositions.itemSize === 3 &&
    existingPositions.array.length === requiredLength
      ? existingPositions
      : null;
  const positions = reusablePositions?.array as Float32Array | undefined;
  const nextPositions = positions ?? new Float32Array(requiredLength);

  points.forEach((point, index) => {
    nextPositions[index * 3] = point.x;
    nextPositions[index * 3 + 1] = point.y;
    nextPositions[index * 3 + 2] = point.z;
  });

  if (reusablePositions) {
    reusablePositions.needsUpdate = true;
  } else {
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(nextPositions, 3).setUsage(THREE.DynamicDrawUsage)
    );
  }

  if (points.length === 0) {
    geometry.boundingSphere = null;
    return;
  }

  geometry.computeBoundingSphere();
}

function applyIntensityToMaterials(objects: FirePoiRigObjects, settings: FirePoiSettings): void {
  const intensityMultiplier = THREE.MathUtils.clamp(
    settings.coreIntensity / 1.8,
    0.35,
    1.4
  );

  (objects.core.material as THREE.MeshBasicMaterial).opacity = Math.min(
    1,
    CORE_BASE_OPACITY * intensityMultiplier
  );
  (objects.innerFlame.material as THREE.MeshBasicMaterial).opacity = Math.min(
    1,
    INNER_FLAME_BASE_OPACITY * intensityMultiplier
  );
  (objects.wake.material as THREE.PointsMaterial).opacity = Math.min(
    1,
    WAKE_BASE_OPACITY * intensityMultiplier
  );
}

export class FirePoiEffectController
  implements SceneEffectController<FirePoiEffectControllerInput>
{
  private readonly rigObjects = new Map<RigId, FirePoiRigObjects>();

  create(scene: THREE.Scene, input: FirePoiEffectControllerInput): void {
    for (const rigId of input.rigOrder) {
      const pose = input.poses[rigId];

      if (!pose) {
        continue;
      }

      let objects = this.rigObjects.get(rigId);

      if (!objects) {
        objects = createRigObjects(rigId);
        this.rigObjects.set(rigId, objects);
        scene.add(objects.group);
      }
    }
  }

  sync(scene: THREE.Scene, input: FirePoiEffectControllerInput): void {
    if (!input.settings.enabled) {
      this.dispose(scene);
      return;
    }

    this.create(scene, input);

    const activeRigIds = new Set(input.rigOrder.filter((rigId) => input.poses[rigId]));

    for (const rigId of input.rigOrder) {
      const pose = input.poses[rigId];

      if (!pose) {
        continue;
      }

      const objects = this.rigObjects.get(rigId);

      if (!objects) {
        continue;
      }

      const rigState = buildFirePoiRigState({
        rigId,
        headPosition: pose.headPosition,
        headTrail: input.trails[rigId]?.head ?? [],
        settings: input.settings
      });

      objects.core.position.set(
        rigState.corePosition.x,
        rigState.corePosition.y,
        rigState.corePosition.z
      );
      objects.core.scale.setScalar(input.settings.coreRadius);

      objects.innerFlame.position.copy(objects.core.position);
      objects.innerFlame.scale.set(
        rigState.flameScale.x,
        rigState.flameScale.y,
        rigState.flameScale.z
      );
      objects.innerFlame.lookAt(
        rigState.corePosition.x + rigState.flameDirection.x,
        rigState.corePosition.y + rigState.flameDirection.y,
        rigState.corePosition.z + rigState.flameDirection.z
      );

      setWakePositions(
        objects.wake.geometry as THREE.BufferGeometry,
        rigState.particles.map((particle) => particle.position)
      );
      (objects.wake.material as THREE.PointsMaterial).size = input.settings.coreRadius * 1.1;
      applyIntensityToMaterials(objects, input.settings);
      objects.group.visible = true;
    }

    for (const [rigId, objects] of this.rigObjects.entries()) {
      if (activeRigIds.has(rigId)) {
        continue;
      }

      disposeRigObjects(scene, objects);
      this.rigObjects.delete(rigId);
    }
  }

  dispose(scene: THREE.Scene): void {
    for (const [rigId, objects] of this.rigObjects.entries()) {
      disposeRigObjects(scene, objects);
      this.rigObjects.delete(rigId);
    }
  }
}