import * as THREE from "three";

import type { RigId, WorldMultiRigPose } from "@/engine/types";
import type { WorldMultiRigTrailSamples } from "@/visualizer/worldTrailSampling";

import type { FirePoiSettings } from "./firePoiSettings";
import { buildFirePoiRigState } from "./firePoiWake";
import type { FirePoiWakeParticle } from "./firePoiWake";
import type { SceneEffectController } from "./sceneEffectController";

const CORE_BASE_OPACITY = 0.95;
const WAKE_BASE_OPACITY = 0.55;

function createCoreGlowTexture(): THREE.DataTexture {
  const SIZE = 32;
  const data = new Uint8Array(SIZE * SIZE * 4);

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const u = col / (SIZE - 1) - 0.5;
      const v = row / (SIZE - 1) - 0.5;
      const dist = Math.min(1, Math.sqrt(u * u + v * v) * 2);
      const fade = Math.pow(1 - dist, 2.2);

      const idx = (row * SIZE + col) * 4;
      data[idx]     = 255;
      data[idx + 1] = Math.round(220 + 35 * (1 - dist));
      data[idx + 2] = Math.round(fade * 80);
      data[idx + 3] = Math.round(fade * 255);
    }
  }

  const texture = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

const WAKE_VERTEX_SHADER = `
attribute float aHeat;
attribute float aSize;
varying float vHeat;

const float POINT_SIZE_FACTOR = 400.0;

void main() {
  vHeat = aHeat;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * POINT_SIZE_FACTOR / (-mvPosition.z);
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
  readonly core: THREE.Sprite;
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
  (objects.core.material as THREE.SpriteMaterial).map?.dispose();
  disposeMaterial(objects.core.material);
  objects.wake.geometry.dispose();
  disposeMaterial(objects.wake.material);
}

function createRigObjects(rigId: RigId): FirePoiRigObjects {
  const group = new THREE.Group();
  group.name = `fire-poi:${rigId}`;
  group.visible = false;

  const core = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createCoreGlowTexture(),
      color: "#fff7cc",
      transparent: true,
      opacity: CORE_BASE_OPACITY,
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

  group.add(core, wake);

  return { group, core, wake };
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

  (objects.core.material as THREE.SpriteMaterial).opacity = Math.min(
    1,
    CORE_BASE_OPACITY * intensityMultiplier
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
      objects.core.scale.setScalar(input.settings.coreRadius * 1.5);

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
    for (const objects of this.rigObjects.values()) {
      disposeRigObjects(scene, objects);
    }
    this.rigObjects.clear();
  }
}