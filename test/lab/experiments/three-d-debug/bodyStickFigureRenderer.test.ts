import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { SKELETON_SEGMENTS } from "@/body-rig";
import type { BodySkeletonFrame, SkeletonJointName } from "@/body-rig";
import { BodyStickFigureRenderer } from "@/lab/experiments/three-d-debug/bodyStickFigureRenderer";

function makeFrame(
  overrides: Partial<Record<SkeletonJointName, { x: number; y: number; z: number }>> = {}
): BodySkeletonFrame {
  const joints: Record<SkeletonJointName, { x: number; y: number; z: number }> = {
    headCenter: { x: 0, y: 1.65, z: 0 },
    neck: { x: 0, y: 1.52, z: 0 },
    shoulderCenter: { x: 0, y: 1.4, z: 0 },
    shoulderLeft: { x: -0.18, y: 1.4, z: 0 },
    shoulderRight: { x: 0.18, y: 1.4, z: 0 },
    elbowLeft: { x: -0.45, y: 1.25, z: 0.05 },
    elbowRight: { x: 0.45, y: 1.25, z: 0.05 },
    handLeft: { x: -0.68, y: 1.05, z: 0.12 },
    handRight: { x: 0.68, y: 1.05, z: 0.12 },
    pelvis: { x: 0, y: 0.95, z: 0 },
    hipLeft: { x: -0.14, y: 0.95, z: 0 },
    hipRight: { x: 0.14, y: 0.95, z: 0 },
    kneeLeft: { x: -0.14, y: 0.52, z: 0.02 },
    kneeRight: { x: 0.14, y: 0.52, z: 0.02 },
    footLeft: { x: -0.14, y: 0.08, z: 0.08 },
    footRight: { x: 0.14, y: 0.08, z: 0.08 }
  };

  return {
    joints: { ...joints, ...overrides },
    segments: SKELETON_SEGMENTS,
    orientation: {
      up: { x: 0, y: 1, z: 0 },
      forward: { x: 0, y: 0, z: 1 },
      right: { x: 1, y: 0, z: 0 }
    },
    supportPose: {
      armReach: 0.65,
      upperArmLength: 0.32,
      forearmLength: 0.33,
      shoulderSpan: 0.36
    },
    solverDiagnostics: {
      yawRad: 0,
      leftArm: {
        isClamped: false,
        reach: { min: 0, max: 0.65 },
        distanceToHand: 0.6
      },
      rightArm: {
        isClamped: false,
        reach: { min: 0, max: 0.65 },
        distanceToHand: 0.6
      }
    }
  };
}

describe("BodyStickFigureRenderer", () => {
  it("reuses segment geometry across syncs and hides all meshes for a null frame", () => {
    const scene = new THREE.Scene();
    const renderer = new BodyStickFigureRenderer();
    const frameA = makeFrame();
    const frameB = makeFrame({
      handLeft: { x: -0.8, y: 0.92, z: 0.18 },
      handRight: { x: 0.8, y: 0.92, z: 0.18 },
      headCenter: { x: 0, y: 1.7, z: 0.03 }
    });

    renderer.sync(scene, frameA);

    const internals = renderer as unknown as {
      segmentMeshes: Map<string, THREE.Mesh>;
      jointMeshes: Map<SkeletonJointName, THREE.Mesh>;
      torsoCueMesh: THREE.Mesh | null;
      headCueMesh: THREE.Mesh | null;
    };
    const segmentMeshes = Array.from(internals.segmentMeshes.values());
    const segmentGeometries = segmentMeshes.map((mesh) => mesh.geometry);

    expect(segmentMeshes).toHaveLength(SKELETON_SEGMENTS.length);

    renderer.sync(scene, null);

    expect(segmentMeshes.every((mesh) => mesh.visible === false)).toBe(true);
    expect(Array.from(internals.jointMeshes.values()).every((mesh) => mesh.visible === false)).toBe(true);
    expect(internals.torsoCueMesh?.visible).toBe(false);
    expect(internals.headCueMesh?.visible).toBe(false);

    renderer.sync(scene, frameB);

    const segmentMeshesAfter = Array.from(internals.segmentMeshes.values());
    expect(segmentMeshesAfter).toEqual(segmentMeshes);
    expect(segmentMeshesAfter.map((mesh) => mesh.geometry)).toEqual(segmentGeometries);

    renderer.dispose(scene);
  });
});