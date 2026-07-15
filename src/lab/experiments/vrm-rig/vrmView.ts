import * as THREE from "three";

/**
 * Mirrors only the rendered view. World coordinates, rig IDs, and anatomical
 * humanoid bone names remain unchanged.
 */
export function updateVrmCameraProjection(
  camera: THREE.PerspectiveCamera,
  mirrored: boolean
): void {
  camera.updateProjectionMatrix();
  if (mirrored) {
    camera.projectionMatrix.elements[0] *= -1;
  }
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
}
