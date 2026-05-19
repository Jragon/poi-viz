import { describe, expect, it } from "vitest";

import { THREE_D_DEBUG_LAB_LINK } from "@/lab/experiments/three-d-debug/routeMeta";
import { labLinks } from "@/lab/labLinks";

describe("labLinks", () => {
  it("includes the shared Three.js Debug lab link", () => {
    expect(labLinks).toContain(THREE_D_DEBUG_LAB_LINK);
  });
});
