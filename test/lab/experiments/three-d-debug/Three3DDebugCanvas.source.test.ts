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

  it("keeps the live poi hand-to-head tether in its rig marker path", () => {
    const source = readFileSync(THREE_D_DEBUG_CANVAS_FILE, "utf8");

    expect(source).toContain("readonly tether: THREE.Mesh");
    expect(source).toContain("new THREE.CylinderGeometry(TETHER_RADIUS");
    expect(source).toContain("tetherMaterial.color.set(entry.tetherColor);");
    expect(source).toContain("objects.tether.quaternion.setFromUnitVectors");
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

  it("keeps live poi hand/head rig markers and connector in the canvas", () => {
    const source = readFileSync(THREE_D_DEBUG_CANVAS_FILE, "utf8");

    expect(source).toContain("interface RigMarkerObjects");
    expect(source).toContain("const rigMarkerObjects = new Map<RigId, RigMarkerObjects>()");
    expect(source).toContain("function createRigMarkerObjects(");
    expect(source).toContain("objects.tether.visible = true;");
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

describe("Three3DDebugCanvas task 4 fire poi controller wiring", () => {
  it("accepts fire poi settings and references FirePoiEffectController", () => {
    const source = readFileSync(THREE_D_DEBUG_CANVAS_FILE, "utf8");

    expect(source).toContain("firePoiSettings: FirePoiSettings;");
    expect(source).toContain("FirePoiEffectController");
    expect(source).toContain("syncRecoverableFirePoiEffect");
    expect(source).toContain("./firePoiSettings");
  });

  it("routes fire poi sync through a recoverable helper instead of a sticky disable flag", () => {
    const source = readFileSync(THREE_D_DEBUG_CANVAS_FILE, "utf8");

    expect(source).toContain("let firePoiEffectController: FirePoiEffectController | null = null;");
    expect(source).toContain("function syncFirePoiEffect() {");
    expect(source).toContain('import { syncRecoverableFirePoiEffect } from "./firePoiEffectSync";');
    expect(source).toContain("firePoiEffectController = syncRecoverableFirePoiEffect({");
    expect(source).toContain("createController: () => new FirePoiEffectController(),");
    expect(source).not.toContain("function disableFirePoiEffect() {");
    expect(source).not.toContain("firePoiEffectEnabled = false;");
    expect(source).toMatch(/disposeThreeSceneResources\([\s\S]*firePoiEffectController\.dispose\(scene\)/);
  });

  it("watches fire poi settings alongside poses trails and rig order when syncing the fire effect", () => {
    const source = readFileSync(THREE_D_DEBUG_CANVAS_FILE, "utf8");

    expect(source).toContain(
      "() => [props.poses, props.trails, props.rigOrder, props.firePoiSettings]"
    );
  });
});

describe("Three3DDebugCanvas fire poi head marker visibility", () => {
  it("hides the head rig marker sphere when fire poi is enabled", () => {
    const source = readFileSync(THREE_D_DEBUG_CANVAS_FILE, "utf8");

    expect(source).toContain("objects.head.visible = !props.firePoiSettings.enabled;");
  });

  it("includes firePoiSettings in the rig markers watch trigger", () => {
    const source = readFileSync(THREE_D_DEBUG_CANVAS_FILE, "utf8");

    expect(source).toContain(
      "() => [props.poses, props.rigOrder, props.firePoiSettings],"
    );
  });
});