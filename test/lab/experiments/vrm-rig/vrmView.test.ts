import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { updateVrmCameraProjection } from "@/lab/experiments/vrm-rig/vrmView";

describe("updateVrmCameraProjection", () => {
  it("mirrors projection without changing the world-space camera transform", () => {
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 4);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    const worldMatrix = camera.matrixWorld.clone();
    const point = new THREE.Vector3(1, 0, 0);

    updateVrmCameraProjection(camera, false);
    const audienceX = point.clone().project(camera).x;
    updateVrmCameraProjection(camera, true);
    const mirrorX = point.clone().project(camera).x;

    expect(audienceX).toBeGreaterThan(0);
    expect(mirrorX).toBeCloseTo(-audienceX);
    expect(camera.matrixWorld.equals(worldMatrix)).toBe(true);
  });

  it("restores the audience projection after mirror mode is disabled", () => {
    const camera = new THREE.PerspectiveCamera(40, 1.5, 0.1, 100);

    updateVrmCameraProjection(camera, false);
    const audienceProjection = camera.projectionMatrix.clone();
    updateVrmCameraProjection(camera, true);
    updateVrmCameraProjection(camera, false);

    expect(camera.projectionMatrix.equals(audienceProjection)).toBe(true);
  });
});
