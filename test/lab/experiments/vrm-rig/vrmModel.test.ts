import { describe, expect, it } from "vitest";

import { VRM_RIG_MODEL_FILENAME, buildVrmRigModelUrl } from "@/lab/experiments/vrm-rig/vrmModel";

describe("buildVrmRigModelUrl", () => {
  it("uses the development root without creating a duplicate slash", () => {
    expect(buildVrmRigModelUrl("/")).toBe(`/models/vrm/${VRM_RIG_MODEL_FILENAME}`);
  });

  it("preserves the production base path", () => {
    expect(buildVrmRigModelUrl("/poi-viz/")).toBe(`/poi-viz/models/vrm/${VRM_RIG_MODEL_FILENAME}`);
  });

  it("normalizes a base path without a trailing slash", () => {
    expect(buildVrmRigModelUrl("/poi-viz")).toBe(`/poi-viz/models/vrm/${VRM_RIG_MODEL_FILENAME}`);
  });
});
