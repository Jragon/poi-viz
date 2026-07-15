import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  resolveVrmCanvasTransform,
  updateVrmCameraProjection
} from "@/lab/experiments/vrm-rig/vrmView";

describe("updateVrmCameraProjection", () => {
  it("updates projection without changing the world-space camera transform", () => {
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 4);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    const worldMatrix = camera.matrixWorld.clone();

    updateVrmCameraProjection(camera);

    expect(camera.projectionMatrixInverse.equals(camera.projectionMatrix.clone().invert())).toBe(
      true
    );
    expect(camera.matrixWorld.equals(worldMatrix)).toBe(true);
  });
});

describe("resolveVrmCanvasTransform", () => {
  it("mirrors only the finished canvas pixels", () => {
    expect(resolveVrmCanvasTransform(false)).toBe("");
    expect(resolveVrmCanvasTransform(true)).toBe("scaleX(-1)");
  });
});
