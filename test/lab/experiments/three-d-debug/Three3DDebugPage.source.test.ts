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

describe("Three3DDebugPage source wiring", () => {
  it("keeps motion inspection controls wired", () => {
    const source = readFileSync(THREE_D_DEBUG_PAGE_FILE, "utf8");

    expect(source).toContain("Reset View");
    expect(source).toContain("Trail Length");
    expect(source).toContain(">Hand Trails<");
    expect(source).toContain(">Head Trails<");
    expect(source).toContain(':show-hand-trails="showHandTrails"');
    expect(source).toContain(':show-head-trails="showHeadTrails"');
    expect(source).toContain("<PatternRegistryControls");
  });

  it("routes world trail sampling through the shared visibility gate", () => {
    const source = readFileSync(THREE_D_DEBUG_PAGE_FILE, "utf8");

    expect(source).toContain("const showHandTrails = ref(true);");
    expect(source).toContain("const showHeadTrails = ref(true);");
    expect(source).toContain("shouldSampleThreeDDebugWorldTrails");
  });
  it("checks trail length input model", () => {
    const source = readFileSync(THREE_D_DEBUG_PAGE_FILE, "utf8");
    expect(source).toContain('v-model.number="trailLengthSteps"');
  });
});

describe("Three3DDebugCanvas source maintenance", () => {
  it("uses one trail sync path and shared cleanup", () => {
    const source = readFileSync(THREE_D_DEBUG_CANVAS_FILE, "utf8");

    expect(source).toContain("function disposeThreeSceneResources() {");
    expect(source).toMatch(/catch \(error\) \{[\s\S]*disposeThreeSceneResources\(\)/);
    expect(source).not.toMatch(
      /watch\([\s\S]*\(\) => \[props\.poses, props\.rigOrder\],[\s\S]*syncRigObjects\(\);\s*syncTrailObjects\(\);/
    );
  });

  it("renders separate hand/head trail visibility in the canvas trail sync", () => {
    const source = readFileSync(THREE_D_DEBUG_CANVAS_FILE, "utf8");

    expect(source).toContain(
      "objects.hand.visible = props.showHandTrails && handPoints.length >= 2;"
    );
    expect(source).toContain(
      "objects.head.visible = props.showHeadTrails && headPoints.length >= 2;"
    );
  });
});

describe("Three3DDebugPage body scene wiring", () => {
  it("imports and uses buildBodyHumanoidScene", () => {
    const source = readFileSync(THREE_D_DEBUG_PAGE_FILE, "utf8");

    expect(source).toContain("buildBodyHumanoidScene");
  });

  it("computes bodyScene and passes it to the canvas", () => {
    const source = readFileSync(THREE_D_DEBUG_PAGE_FILE, "utf8");

    expect(source).toContain("bodyScene");
    expect(source).toContain(':body-scene="bodyScene"');
  });

  it("resolves body rig sides before building the humanoid scene", () => {
    const source = readFileSync(THREE_D_DEBUG_PAGE_FILE, "utf8");

    expect(source).toContain("function resolveBodyRigIds");
    expect(source).toContain('rigOrder.includes("left")');
    expect(source).toContain('rigOrder.includes("right")');
    expect(source).toContain("const bodyRigIds = computed(() => resolveBodyRigIds(core.rigOrder.value));");
    expect(source).toContain("const bodyRigMotionSolver = new BodyRigMotionSolver();");
    expect(source).toContain("const bodyScene = computed(() =>");
    expect(source).toContain(
      "buildBodyHumanoidScene(core.worldPoses.value, undefined, bodyRigIds.value, undefined, {"
    );
    expect(source).not.toContain("left: core.rigOrder.value[0],");
    expect(source).not.toContain("right: core.rigOrder.value[1]");
  });
});

describe("Three3DDebugPage fire poi wiring", () => {
  it("stores fire settings and passes them to the canvas", () => {
    const source = readFileSync(THREE_D_DEBUG_PAGE_FILE, "utf8");

    expect(source).toContain("reconcileStoredFirePoiSettings");
    expect(source).toContain("const firePoiPanelOpen = useStorage(");
    expect(source).toContain("const firePoiSettings = useStorage(");
    expect(source).toContain(':fire-poi-settings="resolvedFirePoiSettings"');
  });

  it("uses the task 3 trail-sampling gate so fire poi can keep sampling alive", () => {
    const source = readFileSync(THREE_D_DEBUG_PAGE_FILE, "utf8");

    expect(source).toContain("shouldSampleThreeDDebugWorldTrails");
  });

  it("renders a fire poi toggle and fire controls button", () => {
    const source = readFileSync(THREE_D_DEBUG_PAGE_FILE, "utf8");

    expect(source).toContain(">Fire Poi<");
    expect(source).toContain("Fire Controls");
    expect(source).toContain("<FirePoiControlPanel");
  });
});
