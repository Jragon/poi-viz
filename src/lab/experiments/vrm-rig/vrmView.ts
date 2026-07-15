import * as THREE from "three";

export function updateVrmCameraProjection(camera: THREE.PerspectiveCamera): void {
  camera.updateProjectionMatrix();
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
}

/**
 * Mirrors the finished pixels rather than the camera projection. A negative
 * projection reverses triangle winding and breaks single-sided VRM materials.
 */
export function resolveVrmCanvasTransform(mirrored: boolean): string {
  return mirrored ? "scaleX(-1)" : "";
}
