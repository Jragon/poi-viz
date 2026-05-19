import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { setLineGeometryPoints } from "@/lab/experiments/three-d-debug/trailLineGeometry";

describe("trailLineGeometry", () => {
  it("shrinks an existing line geometry when the next trail is shorter", () => {
    const geometry = new THREE.BufferGeometry();

    setLineGeometryPoints(geometry, [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
      { x: 3, y: 0, z: 0 }
    ]);
    setLineGeometryPoints(geometry, [
      { x: 10, y: 0, z: 0 },
      { x: 11, y: 0, z: 0 }
    ]);

    const position = geometry.getAttribute("position");

    expect(position.count).toBe(2);
    expect(Array.from(position.array)).toEqual([10, 0, 0, 11, 0, 0]);
    expect(geometry.drawRange.count).toBe(2);
  });

  it("clears the line geometry when no trail points remain", () => {
    const geometry = new THREE.BufferGeometry();

    setLineGeometryPoints(geometry, [{ x: 1, y: 2, z: 3 }]);
    setLineGeometryPoints(geometry, []);

    const position = geometry.getAttribute("position");

    expect(position.count).toBe(0);
    expect(Array.from(position.array)).toEqual([]);
    expect(geometry.drawRange.count).toBe(0);
  });

  it("reuses the existing position attribute when trail point count is unchanged", () => {
    const geometry = new THREE.BufferGeometry();

    setLineGeometryPoints(geometry, [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 1, z: 1 }
    ]);

    const firstPosition = geometry.getAttribute("position");

    setLineGeometryPoints(geometry, [
      { x: 2, y: 3, z: 4 },
      { x: 5, y: 6, z: 7 }
    ]);

    const secondPosition = geometry.getAttribute("position");

    expect(secondPosition).toBe(firstPosition);
    expect(Array.from(secondPosition.array)).toEqual([2, 3, 4, 5, 6, 7]);
  });
});