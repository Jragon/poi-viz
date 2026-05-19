import * as THREE from "three";

import type { RigId, WorldMultiRigPose } from "@/engine/types";
import type { WorldMultiRigTrailSamples } from "@/visualizer/worldTrailSampling";

import type { FirePoiSettings } from "./firePoiSettings";
import { buildFirePoiRigState } from "./firePoiWake";
import type { FirePoiWakeParticle } from "./firePoiWake";
import type { SceneEffectController } from "./sceneEffectController";

const CORE_BASE_OPACITY = 0.95;
const INNER_FLAME_BASE_OPACITY = 0.45;
const WAKE_BASE_OPACITY = 0.55;

const WAKE_VERTEX_SHADER = `
attribute float aHeat;
attribute float aSize;
varying float vHeat;

void main() {
  vHeat = aHeat;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * 400.0 / (-mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const WAKE_FRAGMENT_SHADER = `
uniform float uOpacity;
varying float vHeat;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord) * 2.0;
  if (dist > 1.0) discard;

  float alpha = (1.0 - dist) * (1.0 - dist) * vHeat * uOpacity;

  vec3 hotColor = vec3(1.0, 0.97, 0.65);
  vec3 coolColor = vec3(1.0, 0.38, 0.05);
  vec3 color = mix(coolColor, hotColor, vHeat * vHeat);

  gl_FragColor = vec4(color, alpha);
}
`;

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
    new THREE.ShaderMaterial({
      vertexShader: WAKE_VERTEX_SHADER,
      fragmentShader: WAKE_FRAGMENT_SHADER,
      uniforms: {
        uOpacity: { value: WAKE_BASE_OPACITY }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );

  group.add(core, innerFlame, wake);

  return { group, core, innerFlame, wake };
}

function setWakeGeometry(
  geometry: THREE.BufferGeometry,
  particles: readonly FirePoiWakeParticle[]
): void {
  const count = particles.length;

  function syncAttribute(
    name: string,
    itemSize: number,
    setter: (arr: Float32Array, i: number) => void
  ): void {
    const existing = geometry.getAttribute(name);
    const reusable =
      existing instanceof THREE.BufferAttribute &&
      existing.itemSize === itemSize &&
      existing.array.length === count * itemSize
        ? existing
        : null;
    const arr = (reusable?.array as Float32Array | undefined) ?? new Float32Array(count * itemSize);

    for (let i = 0; i < count; i++) {
      setter(arr, i);
    }

    if (reusable) {
      reusable.needsUpdate = true;
    } else {
      geometry.setAttribute(
        name,
        new THREE.BufferAttribute(arr, itemSize).setUsage(THREE.DynamicDrawUsage)
      );
    }
  }

  syncAttribute("position", 3, (arr, i) => {
    arr[i * 3] = particles[i].position.x;
    arr[i * 3 + 1] = particles[i].position.y;
    arr[i * 3 + 2] = particles[i].position.z;
  });

  syncAttribute("aHeat", 1, (arr, i) => {
    arr[i] = particles[i].heat;
  });

  syncAttribute("aSize", 1, (arr, i) => {
    arr[i] = particles[i].size;
  });

  geometry.setDrawRange(0, count);

  if (count === 0) {
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
  (objects.wake.material as THREE.ShaderMaterial).uniforms.uOpacity.value = Math.min(
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

      setWakeGeometry(
        objects.wake.geometry as THREE.BufferGeometry,
        rigState.particles
      );
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