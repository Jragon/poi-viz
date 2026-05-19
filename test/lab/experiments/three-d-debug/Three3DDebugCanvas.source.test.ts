import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const THREE_D_DEBUG_CANVAS_FILE = resolve(
  process.cwd(),
  "src/lab/experiments/three-d-debug/Three3DDebugCanvas.vue"
);

const BODY_HUMANOID_RENDERER_FILE = resolve(
  process.cwd(),
  "src/lab/experiments/three-d-debug/bodyHumanoidRenderer.ts"
);

describe("Three3DDebugCanvas trail sync", () => {
  it("does not update trail line geometry through raw setFromPoints reuse", () => {
    const source = readFileSync(THREE_D_DEBUG_CANVAS_FILE, "utf8");

    expect(source).not.toContain(
      "(objects.hand.geometry as THREE.BufferGeometry).setFromPoints(vectorsFromPoints(handPoints));"
    );
    expect(source).not.toContain(
      "(objects.head.geometry as THREE.BufferGeometry).setFromPoints(vectorsFromPoints(headPoints));"
    );
  });
});

describe("Three3DDebugCanvas task 8 humanoid body-volume wiring", () => {
  it("has a bodyScene prop and references BodyHumanoidRenderer", () => {
    const source = readFileSync(THREE_D_DEBUG_CANVAS_FILE, "utf8");

    expect(source).toContain("bodyScene");
    expect(source).toContain("BodyHumanoidRenderer");
  });

  it("disposes the humanoid body renderer inside disposeThreeSceneResources", () => {
    const source = readFileSync(THREE_D_DEBUG_CANVAS_FILE, "utf8");

    expect(source).toContain("function disposeThreeSceneResources() {");
    expect(source).toMatch(/disposeThreeSceneResources[\s\S]*bodyFigureRenderer/);
  });

  it("keeps the live poi hand-to-head tether in its rig marker path", () => {
    const source = readFileSync(THREE_D_DEBUG_CANVAS_FILE, "utf8");

    expect(source).toContain("readonly tether: THREE.Mesh");
    expect(source).toContain("new THREE.CylinderGeometry(TETHER_RADIUS");
    expect(source).toContain("tetherMaterial.color.set(entry.tetherColor);");
    expect(source).toContain("objects.tether.quaternion.setFromUnitVectors");
  });

  it("renders hand joint node spheres inside the humanoid body renderer", () => {
    const rendererSource = readFileSync(BODY_HUMANOID_RENDERER_FILE, "utf8");

    expect(rendererSource).toContain("new THREE.SphereGeometry(0.05");
    expect(rendererSource).toContain("new THREE.SphereGeometry(0.1");
  });

  it("renders separate hand/head trail visibility in the canvas trail sync", () => {
    const source = readFileSync(THREE_D_DEBUG_CANVAS_FILE, "utf8");

    expect(source).toContain("objects.hand.visible = props.showHandTrails && handPoints.length >= 2;");
    expect(source).toContain("objects.head.visible = props.showHeadTrails && headPoints.length >= 2;");
  });

  it("keeps live poi hand/head rig markers and connector in the canvas", () => {
    const source = readFileSync(THREE_D_DEBUG_CANVAS_FILE, "utf8");

    expect(source).toContain("interface RigMarkerObjects");
    expect(source).toContain("const rigMarkerObjects = new Map<RigId, RigMarkerObjects>()");
    expect(source).toContain("function createRigMarkerObjects(");
    expect(source).toContain("objects.tether.visible = true;");
  });

  it("uses CapsuleGeometry for limb segments instead of THREE.Line", () => {
    const rendererSource = readFileSync(BODY_HUMANOID_RENDERER_FILE, "utf8");

    expect(rendererSource).toContain("THREE.CapsuleGeometry");
    expect(rendererSource).not.toContain("segmentLines");
  });

  it("renders sphere joints for hand joint nodes and body volumes using a generic joint mesh map", () => {
    const rendererSource = readFileSync(BODY_HUMANOID_RENDERER_FILE, "utf8");

    expect(rendererSource).toContain("jointMeshes");
    expect(rendererSource).not.toContain("handLeftMesh");
    expect(rendererSource).not.toContain("handRightMesh");
  });

  it("includes a torso orientation cue using ConeGeometry", () => {
    const rendererSource = readFileSync(BODY_HUMANOID_RENDERER_FILE, "utf8");

    expect(rendererSource).toContain("THREE.ConeGeometry");
    expect(rendererSource).toContain("torsoCueMesh");
  });

  it("includes a head-front readability cue", () => {
    const rendererSource = readFileSync(BODY_HUMANOID_RENDERER_FILE, "utf8");

    expect(rendererSource).toContain("headCueMesh");
  });

  it("shows the humanoid body label in the canvas UI, not the stale stick figure label", () => {
    const source = readFileSync(THREE_D_DEBUG_CANVAS_FILE, "utf8");

    expect(source).not.toContain("Stick figure / trails debug");
    expect(source).toContain("Humanoid body / trails debug");
  });
});