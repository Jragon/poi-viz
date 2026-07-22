import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const VRM_RIG_LAB_PAGE_FILE = resolve(
  process.cwd(),
  "src/lab/experiments/vrm-rig/VrmRigLabPage.vue"
);

describe("VrmRigLabPage source wiring", () => {
  it("keeps independent plane-side depth controls wired to VRM-only poses", () => {
    const source = readFileSync(VRM_RIG_LAB_PAGE_FILE, "utf8");

    expect(source).toContain('v-model.number="sideADepthWorld"');
    expect(source).toContain('v-model.number="sideBDepthWorld"');
    expect(source).toContain("applyAsymmetricPlaneSideDisplayOffset");
    expect(source).toContain(':poses="vrmWorldPoses"');
    expect(source).toContain("buildThreeDDebugSceneState(");
    expect(source).toContain("activeWorldPoses.value,");
  });

  it("offers VRM playback speed presets through the shared transport", () => {
    const source = readFileSync(VRM_RIG_LAB_PAGE_FILE, "utf8");

    expect(source).toContain("const VRM_PLAYBACK_SPEEDS = [0.25, 0.5, 1, 2] as const;");
    expect(source).toContain("core.transport.setSpeed(speed);");
    expect(source).toContain("Playback speed");
    expect(source).toContain('v-for="speed in VRM_PLAYBACK_SPEEDS"');
  });
});
