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
  it("creates a named group with a core mesh, inner flame mesh, and wake points per active rig", () => {
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
      const wake = group?.children[2] as THREE.Points | undefined;
      const wakePositions = wake?.geometry.getAttribute("position");

      expect(group).toBeInstanceOf(THREE.Group);
      expect(group?.children).toHaveLength(3);
      expect(group?.children[0]).toBeInstanceOf(THREE.Mesh);
      expect(group?.children[1]).toBeInstanceOf(THREE.Mesh);
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

    const wake = scene.getObjectByName("fire-poi:left")?.children[2] as THREE.Points;
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

    const secondWake = scene.getObjectByName("fire-poi:left")?.children[2] as THREE.Points;
    const secondPositions = secondWake.geometry.getAttribute("position") as THREE.BufferAttribute;
    const secondSnapshot = Array.from(secondPositions.array as ArrayLike<number>);

    expect(secondWake).toBe(wake);
    expect(secondPositions).toBe(firstPositions);
    expect(secondPositions.count).toBe(firstPositions.count);
    expect(secondSnapshot).not.toEqual(firstSnapshot);
  });

  it("keeps rendered sizes tied to coreRadius and uses intensity to increase opacity", () => {
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

    const lowIntensityGroup = scene.getObjectByName("fire-poi:left") as THREE.Group;
    const lowCore = lowIntensityGroup.children[0] as THREE.Mesh;
    const lowWake = lowIntensityGroup.children[2] as THREE.Points;
    const lowCoreMaterial = lowCore.material as THREE.MeshBasicMaterial;
    const lowWakeMaterial = lowWake.material as THREE.PointsMaterial;
    const lowCoreScale = lowCore.scale.x;
    const lowWakeSize = lowWakeMaterial.size;
    const lowCoreOpacity = lowCoreMaterial.opacity;

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

    const highIntensityGroup = scene.getObjectByName("fire-poi:left") as THREE.Group;
    const highCore = highIntensityGroup.children[0] as THREE.Mesh;
    const highWake = highIntensityGroup.children[2] as THREE.Points;
    const highCoreMaterial = highCore.material as THREE.MeshBasicMaterial;
    const highWakeMaterial = highWake.material as THREE.PointsMaterial;

    expect(highCore.scale.x).toBeCloseTo(0.13);
    expect(highCore.scale.y).toBeCloseTo(0.13);
    expect(highCore.scale.z).toBeCloseTo(0.13);
    expect(highWakeMaterial.size).toBeCloseTo(0.13 * 1.1);
    expect(highCore.scale.x).toBeCloseTo(lowCoreScale);
    expect(highWakeMaterial.size).toBeCloseTo(lowWakeSize);
    expect(highCoreMaterial.opacity).toBeGreaterThan(lowCoreOpacity);
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
});