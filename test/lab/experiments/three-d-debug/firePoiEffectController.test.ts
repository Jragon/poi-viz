import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { FirePoiEffectController } from "@/lab/experiments/three-d-debug/firePoiEffectController";
import { DEFAULT_FIRE_POI_SETTINGS } from "@/lab/experiments/three-d-debug/firePoiSettings";

type FirePoiEffectControllerInput = Parameters<FirePoiEffectController["sync"]>[1];

function createEnabledInput(
  overrides: Partial<FirePoiEffectControllerInput> = {}
): FirePoiEffectControllerInput {
  return {
    rigOrder: ["left"],
    settings: { ...DEFAULT_FIRE_POI_SETTINGS, enabled: true },
    poses: {
      left: {
        handPosition: { x: -0.2, y: 0.7, z: 0 },
        headPosition: { x: -0.1, y: 1.1, z: 0 },
        planeId: "wall"
      }
    },
    trails: {
      left: {
        hand: [],
        head: [
          { x: -0.22, y: 0.95, z: 0 },
          { x: -0.16, y: 1.03, z: 0 },
          { x: -0.1, y: 1.1, z: 0 }
        ]
      }
    },
    ...overrides
  };
}

describe("FirePoiEffectController", () => {
  it("creates a named group with a core mesh, flame plane group, and wake points per active rig", () => {
    const scene = new THREE.Scene();
    const controller = new FirePoiEffectController();

    controller.sync(
      scene,
      createEnabledInput({
        rigOrder: ["left", "right"],
        poses: {
          left: {
            handPosition: { x: -0.2, y: 0.7, z: 0 },
            headPosition: { x: -0.1, y: 1.1, z: 0 },
            planeId: "wall"
          },
          right: {
            handPosition: { x: 0.2, y: 0.7, z: 0 },
            headPosition: { x: 0.12, y: 1.08, z: 0 },
            planeId: "wall"
          }
        },
        trails: {
          left: {
            hand: [],
            head: [
              { x: -0.22, y: 0.95, z: 0 },
              { x: -0.16, y: 1.03, z: 0 },
              { x: -0.1, y: 1.1, z: 0 }
            ]
          },
          right: {
            hand: [],
            head: [
              { x: 0.02, y: 0.92, z: 0 },
              { x: 0.08, y: 1.0, z: 0 },
              { x: 0.12, y: 1.08, z: 0 }
            ]
          }
        }
      })
    );

    for (const rigId of ["left", "right"] as const) {
      const group = scene.getObjectByName(`fire-poi:${rigId}`);
      const wake = group?.children[1] as THREE.Points | undefined;
      const wakePositions = wake?.geometry.getAttribute("position");

      expect(group).toBeInstanceOf(THREE.Group);
      expect(group?.children).toHaveLength(2);
      expect(group?.children[0]).toBeInstanceOf(THREE.Sprite);
      expect(wake).toBeInstanceOf(THREE.Points);
      expect(wakePositions?.count).toBeGreaterThan(0);
    }
  });

  it("tears down created rig objects when sync receives disabled settings", () => {
    const scene = new THREE.Scene();
    const controller = new FirePoiEffectController();

    controller.sync(scene, createEnabledInput());

    expect(scene.getObjectByName("fire-poi:left")).toBeTruthy();

    controller.sync(scene, {
      ...createEnabledInput(),
      settings: { ...DEFAULT_FIRE_POI_SETTINGS, enabled: false }
    });

    expect(scene.children).toHaveLength(0);
  });

  it("removes all effect objects during dispose", () => {
    const scene = new THREE.Scene();
    const controller = new FirePoiEffectController();

    controller.sync(scene, createEnabledInput());

    controller.dispose(scene);

    expect(scene.children).toHaveLength(0);
  });

  it("reuses existing rig objects across sync calls and updates the current pose", () => {
    const scene = new THREE.Scene();
    const controller = new FirePoiEffectController();

    controller.sync(scene, createEnabledInput());

    const firstGroup = scene.getObjectByName("fire-poi:left");
    const firstCore = firstGroup?.children[0];

    controller.sync(
      scene,
      createEnabledInput({
        poses: {
          left: {
            handPosition: { x: -0.25, y: 0.72, z: 0 },
            headPosition: { x: 0.35, y: 1.25, z: 0.1 },
            planeId: "wall"
          }
        },
        trails: {
          left: {
            hand: [],
            head: [
              { x: 0.23, y: 1.09, z: 0.08 },
              { x: 0.29, y: 1.17, z: 0.09 },
              { x: 0.35, y: 1.25, z: 0.1 }
            ]
          }
        }
      })
    );

    const secondGroup = scene.getObjectByName("fire-poi:left");
    const secondCore = secondGroup?.children[0];

    expect(scene.children).toHaveLength(1);
    expect(secondGroup).toBe(firstGroup);
    expect(secondCore).toBe(firstCore);
    expect(secondCore?.position.x).toBeCloseTo(0.35);
    expect(secondCore?.position.y).toBeCloseTo(1.25);
    expect(secondCore?.position.z).toBeCloseTo(0.1);
  });

  it("updates wake positions in place when the particle count stays constant", () => {
    const scene = new THREE.Scene();
    const controller = new FirePoiEffectController();

    controller.sync(scene, createEnabledInput());

    const wake = scene.getObjectByName("fire-poi:left")?.children[1] as THREE.Points;
    const firstPositions = wake.geometry.getAttribute("position") as THREE.BufferAttribute;
    const firstSnapshot = Array.from(firstPositions.array as ArrayLike<number>);

    controller.sync(
      scene,
      createEnabledInput({
        poses: {
          left: {
            handPosition: { x: -0.26, y: 0.71, z: 0.03 },
            headPosition: { x: 0.34, y: 1.23, z: 0.12 },
            planeId: "wall"
          }
        },
        trails: {
          left: {
            hand: [],
            head: [
              { x: 0.22, y: 1.07, z: 0.08 },
              { x: 0.28, y: 1.15, z: 0.1 },
              { x: 0.34, y: 1.23, z: 0.12 }
            ]
          }
        }
      })
    );

    const secondWake = scene.getObjectByName("fire-poi:left")?.children[1] as THREE.Points;
    const secondPositions = secondWake.geometry.getAttribute("position") as THREE.BufferAttribute;
    const secondSnapshot = Array.from(secondPositions.array as ArrayLike<number>);

    expect(secondWake).toBe(wake);
    expect(secondPositions).toBe(firstPositions);
    expect(secondPositions.count).toBe(firstPositions.count);
    expect(secondSnapshot).not.toEqual(firstSnapshot);
  });

  it("re-allocates wake position attribute when particle count grows from N to M (both > 0)", () => {
    const scene = new THREE.Scene();
    const controller = new FirePoiEffectController();

    // Shorter trail: 2 input points, last matches headPosition → window = 2 points
    // → 1 segment → N = 1 * emissionDensity particles
    controller.sync(
      scene,
      createEnabledInput({
        poses: {
          left: {
            handPosition: { x: -0.2, y: 0.7, z: 0 },
            headPosition: { x: -0.1, y: 1.1, z: 0 },
            planeId: "wall"
          }
        },
        trails: {
          left: {
            hand: [],
            head: [
              { x: -0.16, y: 1.03, z: 0 },
              { x: -0.1, y: 1.1, z: 0 }
            ]
          }
        }
      })
    );

    const wake = scene.getObjectByName("fire-poi:left")?.children[1] as THREE.Points;
    const firstPositions = wake.geometry.getAttribute("position") as THREE.BufferAttribute;
    const firstCount = firstPositions.count;

    // Shorter trail (1 segment, near-head) → 3 * emissionDensity particles
    expect(firstCount).toBe(3 * DEFAULT_FIRE_POI_SETTINGS.emissionDensity);

    // Longer trail: 4 input points → 3 segments (2 base + 1 near-head×3) = 5 * emissionDensity
    controller.sync(
      scene,
      createEnabledInput({
        poses: {
          left: {
            handPosition: { x: -0.2, y: 0.7, z: 0 },
            headPosition: { x: -0.1, y: 1.1, z: 0 },
            planeId: "wall"
          }
        },
        trails: {
          left: {
            hand: [],
            head: [
              { x: -0.28, y: 0.87, z: 0 },
              { x: -0.22, y: 0.95, z: 0 },
              { x: -0.16, y: 1.03, z: 0 },
              { x: -0.1, y: 1.1, z: 0 }
            ]
          }
        }
      })
    );

    const secondPositions = wake.geometry.getAttribute("position") as THREE.BufferAttribute;

    expect(secondPositions).not.toBe(firstPositions);
    expect(secondPositions.count).toBe(5 * DEFAULT_FIRE_POI_SETTINGS.emissionDensity);
  });

  it("uses intensity to scale wake uOpacity uniform and core mesh opacity", () => {
    const scene = new THREE.Scene();
    const controller = new FirePoiEffectController();

    controller.sync(
      scene,
      createEnabledInput({
        settings: {
          ...DEFAULT_FIRE_POI_SETTINGS,
          enabled: true,
          coreRadius: 0.13,
          coreIntensity: 0.6
        }
      })
    );

    const lowGroup = scene.getObjectByName("fire-poi:left") as THREE.Group;
    const lowCore = lowGroup.children[0] as THREE.Sprite;
    const lowWake = lowGroup.children[1] as THREE.Points;
    const lowCoreMaterial = lowCore.material as THREE.SpriteMaterial;
    const lowWakeMaterial = lowWake.material as THREE.ShaderMaterial;
    const lowCoreScale = lowCore.scale.x;
    const lowCoreOpacity = lowCoreMaterial.opacity;
    const lowWakeOpacity = lowWakeMaterial.uniforms.uOpacity.value as number;

    controller.sync(
      scene,
      createEnabledInput({
        settings: {
          ...DEFAULT_FIRE_POI_SETTINGS,
          enabled: true,
          coreRadius: 0.13,
          coreIntensity: 3.2
        }
      })
    );

    const highGroup = scene.getObjectByName("fire-poi:left") as THREE.Group;
    const highCore = highGroup.children[0] as THREE.Sprite;
    const highWake = highGroup.children[1] as THREE.Points;
    const highCoreMaterial = highCore.material as THREE.SpriteMaterial;
    const highWakeMaterial = highWake.material as THREE.ShaderMaterial;

    expect(highCore.scale.x).toBeCloseTo(0.13 * 1.5);
    expect(highCore.scale.y).toBeCloseTo(0.13 * 1.5);
    expect(highCore.scale.z).toBeCloseTo(0.13 * 1.5);
    expect(highCore.scale.x).toBeCloseTo(lowCoreScale);
    expect(highCoreMaterial.opacity).toBeGreaterThan(lowCoreOpacity);
    expect(highWakeMaterial.uniforms.uOpacity.value as number).toBeGreaterThan(lowWakeOpacity);
  });

  it("wake uses ShaderMaterial with additive blending and transparent rendering", () => {
    const scene = new THREE.Scene();
    const controller = new FirePoiEffectController();

    controller.sync(scene, createEnabledInput());

    const group = scene.getObjectByName("fire-poi:left");
    const wake = group?.children[1] as THREE.Points;

    expect(wake.material).toBeInstanceOf(THREE.ShaderMaterial);
    expect((wake.material as THREE.ShaderMaterial).blending).toBe(THREE.AdditiveBlending);
    expect((wake.material as THREE.ShaderMaterial).transparent).toBe(true);
    expect((wake.material as THREE.ShaderMaterial).depthWrite).toBe(false);
  });

  it("wake geometry includes per-particle aHeat and aSize attributes with counts matching position", () => {
    const scene = new THREE.Scene();
    const controller = new FirePoiEffectController();

    controller.sync(scene, createEnabledInput());

    const group = scene.getObjectByName("fire-poi:left");
    const wake = group?.children[1] as THREE.Points;
    const geometry = wake.geometry as THREE.BufferGeometry;
    const positionAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
    const heatAttr = geometry.getAttribute("aHeat") as THREE.BufferAttribute;
    const sizeAttr = geometry.getAttribute("aSize") as THREE.BufferAttribute;

    expect(positionAttr.count).toBeGreaterThan(0);
    expect(heatAttr).toBeDefined();
    expect(sizeAttr).toBeDefined();
    expect(heatAttr.count).toBe(positionAttr.count);
    expect(sizeAttr.count).toBe(positionAttr.count);
  });

  it("wake aHeat values are in [0, 1] and aSize values are positive", () => {
    const scene = new THREE.Scene();
    const controller = new FirePoiEffectController();

    controller.sync(scene, createEnabledInput());

    const group = scene.getObjectByName("fire-poi:left");
    const wake = group?.children[1] as THREE.Points;
    const geometry = wake.geometry as THREE.BufferGeometry;
    const heatAttr = geometry.getAttribute("aHeat") as THREE.BufferAttribute;
    const sizeAttr = geometry.getAttribute("aSize") as THREE.BufferAttribute;

    for (let i = 0; i < heatAttr.count; i++) {
      expect(heatAttr.getX(i)).toBeGreaterThanOrEqual(0);
      expect(heatAttr.getX(i)).toBeLessThanOrEqual(1);
      expect(sizeAttr.getX(i)).toBeGreaterThan(0);
    }
  });

  it("clears draw range to zero when transitioning from non-zero to zero wake particles", () => {
    const scene = new THREE.Scene();
    const controller = new FirePoiEffectController();

    controller.sync(scene, createEnabledInput());

    const wake = scene.getObjectByName("fire-poi:left")?.children[1] as THREE.Points;
    expect(wake.geometry.getAttribute("position").count).toBeGreaterThan(0);

    // Empty head trail -> buildTrailWindow returns [headPosition] (length 1) -> particles: []
    controller.sync(
      scene,
      createEnabledInput({
        trails: {
          left: {
            hand: [],
            head: []
          }
        }
      })
    );

    expect(wake.geometry.drawRange.count).toBe(0);
  });

  it("removes stale rig objects when a previously active rig is omitted from the next sync", () => {
    const scene = new THREE.Scene();
    const controller = new FirePoiEffectController();

    controller.sync(
      scene,
      createEnabledInput({
        rigOrder: ["left", "right"],
        poses: {
          left: {
            handPosition: { x: -0.2, y: 0.7, z: 0 },
            headPosition: { x: -0.1, y: 1.1, z: 0 },
            planeId: "wall"
          },
          right: {
            handPosition: { x: 0.2, y: 0.7, z: 0 },
            headPosition: { x: 0.15, y: 1.05, z: 0 },
            planeId: "wall"
          }
        },
        trails: {
          left: {
            hand: [],
            head: [
              { x: -0.22, y: 0.95, z: 0 },
              { x: -0.16, y: 1.03, z: 0 },
              { x: -0.1, y: 1.1, z: 0 }
            ]
          },
          right: {
            hand: [],
            head: [
              { x: 0.08, y: 0.9, z: 0 },
              { x: 0.12, y: 0.98, z: 0 },
              { x: 0.15, y: 1.05, z: 0 }
            ]
          }
        }
      })
    );

    controller.sync(scene, createEnabledInput());

    expect(scene.getObjectByName("fire-poi:left")).toBeTruthy();
    expect(scene.getObjectByName("fire-poi:right")).toBeUndefined();
    expect(scene.children).toHaveLength(1);
  });

  it("group contains only core sprite and wake points with no flame plane group", () => {
    const scene = new THREE.Scene();
    const controller = new FirePoiEffectController();

    controller.sync(scene, createEnabledInput());

    const group = scene.getObjectByName("fire-poi:left");

    expect(group?.children).toHaveLength(2);
    expect(group?.children[0]).toBeInstanceOf(THREE.Sprite);
    expect(group?.children[1]).toBeInstanceOf(THREE.Points);
  });

  it("core sprite scale is 1.5x the coreRadius setting", () => {
    const scene = new THREE.Scene();
    const controller = new FirePoiEffectController();

    controller.sync(
      scene,
      createEnabledInput({
        settings: { ...DEFAULT_FIRE_POI_SETTINGS, enabled: true, coreRadius: 0.12 }
      })
    );

    const group = scene.getObjectByName("fire-poi:left") as THREE.Group;
    const core = group.children[0] as THREE.Sprite;

    expect(core.scale.x).toBeCloseTo(0.12 * 1.5);
    expect(core.scale.y).toBeCloseTo(0.12 * 1.5);
  });
});