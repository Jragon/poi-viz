import { describe, expect, it } from "vitest";

import { THREE_D_DEBUG_LAB_LINK } from "@/lab/experiments/three-d-debug/routeMeta";
import { VRM_RIG_LAB_LINK } from "@/lab/experiments/vrm-rig/routeMeta";
import { labLinks } from "@/lab/labLinks";

describe("labLinks", () => {
  it("includes the shared Three.js Debug lab link", () => {
    expect(labLinks).toContain(THREE_D_DEBUG_LAB_LINK);
  });

  it("includes the shared VRM rig lab link", () => {
    expect(labLinks).toContain(VRM_RIG_LAB_LINK);
  });
});
