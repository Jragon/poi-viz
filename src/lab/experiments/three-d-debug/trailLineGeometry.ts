import * as THREE from "three";

import type { Vec3 } from "@/engine/types";

export function setLineGeometryPoints(
  geometry: THREE.BufferGeometry,
  points: readonly Vec3[]
): void {
  const existingPosition = geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
  const requiredLength = points.length * 3;
  const positions =
    existingPosition && existingPosition.array.length === requiredLength
      ? (existingPosition.array as Float32Array)
      : new Float32Array(requiredLength);

  points.forEach((point, index) => {
    const offset = index * 3;
    positions[offset] = point.x;
    positions[offset + 1] = point.y;
    positions[offset + 2] = point.z;
  });

  if (existingPosition && existingPosition.array === positions) {
    existingPosition.needsUpdate = true;
  } else {
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  }

  geometry.setDrawRange(0, points.length);
  geometry.computeBoundingSphere();
}