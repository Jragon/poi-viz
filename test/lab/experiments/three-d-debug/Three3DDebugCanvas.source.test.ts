import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const THREE_D_DEBUG_CANVAS_FILE = resolve(
  process.cwd(),
  "src/lab/experiments/three-d-debug/Three3DDebugCanvas.vue"
);

const BODY_STICK_FIGURE_RENDERER_FILE = resolve(
  process.cwd(),
  "src/lab/experiments/three-d-debug/bodyStickFigureRenderer.ts"
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

describe("Three3DDebugCanvas task 4 stick figure wiring", () => {
  it("has a bodyScene prop and references BodyStickFigureRenderer", () => {
    const source = readFileSync(THREE_D_DEBUG_CANVAS_FILE, "utf8");

    expect(source).toContain("bodyScene");
    expect(source).toContain("BodyStickFigureRenderer");
  });

  it("disposes the stick figure renderer inside disposeThreeSceneResources", () => {
    const source = readFileSync(THREE_D_DEBUG_CANVAS_FILE, "utf8");

    expect(source).toContain("function disposeThreeSceneResources() {");
    expect(source).toMatch(/disposeThreeSceneResources[\s\S]*bodyFigureRenderer/);
  });

  it("does not contain the old tether line in its rig object path", () => {
    const source = readFileSync(THREE_D_DEBUG_CANVAS_FILE, "utf8");

    expect(source).not.toContain("readonly tether: THREE.Line");
  });

  it("renders head and hand spheres inside the stick figure renderer", () => {
    const rendererSource = readFileSync(BODY_STICK_FIGURE_RENDERER_FILE, "utf8");

    expect(rendererSource).toContain("new THREE.SphereGeometry(0.05");
    expect(rendererSource).toContain("new THREE.SphereGeometry(0.1");
  });

  it("renders separate hand/head trail visibility in the canvas trail sync", () => {
    const source = readFileSync(THREE_D_DEBUG_CANVAS_FILE, "utf8");

    expect(source).toContain("objects.hand.visible = props.showHandTrails && handPoints.length >= 2;");
    expect(source).toContain("objects.head.visible = props.showHeadTrails && headPoints.length >= 2;");
  });

  it("uses CapsuleGeometry for limb segments instead of THREE.Line", () => {
    const rendererSource = readFileSync(BODY_STICK_FIGURE_RENDERER_FILE, "utf8");

    expect(rendererSource).toContain("THREE.CapsuleGeometry");
    expect(rendererSource).not.toContain("segmentLines");
  });

  it("renders sphere joints for all skeleton joints using a generic joint mesh map", () => {
    const rendererSource = readFileSync(BODY_STICK_FIGURE_RENDERER_FILE, "utf8");

    expect(rendererSource).toContain("jointMeshes");
    expect(rendererSource).not.toContain("handLeftMesh");
    expect(rendererSource).not.toContain("handRightMesh");
  });

  it("includes a torso orientation cue using ConeGeometry", () => {
    const rendererSource = readFileSync(BODY_STICK_FIGURE_RENDERER_FILE, "utf8");

    expect(rendererSource).toContain("THREE.ConeGeometry");
    expect(rendererSource).toContain("torsoCueMesh");
  });

  it("includes a head-front readability cue", () => {
    const rendererSource = readFileSync(BODY_STICK_FIGURE_RENDERER_FILE, "utf8");

    expect(rendererSource).toContain("headCueMesh");
  });
});