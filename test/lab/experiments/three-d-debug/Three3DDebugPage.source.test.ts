import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const THREE_D_DEBUG_PAGE_FILE = resolve(
  process.cwd(),
  "src/lab/experiments/three-d-debug/Three3DDebugPage.vue"
);
const THREE_D_DEBUG_CANVAS_FILE = resolve(
  process.cwd(),
  "src/lab/experiments/three-d-debug/Three3DDebugCanvas.vue"
);

describe("Three3DDebugPage task 4 wiring", () => {
  it("keeps motion inspection controls wired", () => {
    const source = readFileSync(THREE_D_DEBUG_PAGE_FILE, "utf8");

    expect(source).toContain("Reset View");
    expect(source).toContain("Trail Length");
    expect(source).toContain(">Hand Trails<");
    expect(source).toContain(">Head Trails<");
    expect(source).toContain(':show-hand-trails="showHandTrails"');
    expect(source).toContain(':show-head-trails="showHeadTrails"');
    expect(source).toContain("<DocumentSelector");
  });

  it("skips world trail sampling when both hand and head trails are hidden", () => {
    const source = readFileSync(THREE_D_DEBUG_PAGE_FILE, "utf8");

    expect(source).toContain("const showHandTrails = ref(true);");
    expect(source).toContain("const showHeadTrails = ref(true);");
    expect(source).toContain("if (!prepared || (!showHandTrails.value && !showHeadTrails.value)) {");
  });
  it("checks trail length input model", () => {
    const source = readFileSync(THREE_D_DEBUG_PAGE_FILE, "utf8");
    expect(source).toContain('v-model.number="trailLengthSteps"');
  });
});

describe("Three3DDebugCanvas task 4 maintenance", () => {
  it("uses one trail sync path and shared cleanup", () => {
    const source = readFileSync(THREE_D_DEBUG_CANVAS_FILE, "utf8");

    expect(source).toContain("function disposeThreeSceneResources() {");
    expect(source).toMatch(/catch \(error\) \{[\s\S]*disposeThreeSceneResources\(\)/);
    expect(source).not.toMatch(
      /watch\([\s\S]*\(\) => \[props\.poses, props\.rigOrder\],[\s\S]*syncRigObjects\(\);\s*syncTrailObjects\(\);/
    );
  });

  it("renders smaller hand markers and separate hand/head trail visibility", () => {
    const source = readFileSync(THREE_D_DEBUG_CANVAS_FILE, "utf8");

    expect(source).toContain("new THREE.SphereGeometry(0.05, 24, 24)");
    expect(source).toContain("new THREE.SphereGeometry(0.1, 24, 24)");
    expect(source).toContain("objects.hand.visible = props.showHandTrails && handPoints.length >= 2;");
    expect(source).toContain("objects.head.visible = props.showHeadTrails && headPoints.length >= 2;");
  });
});
