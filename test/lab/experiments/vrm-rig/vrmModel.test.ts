import { describe, expect, it } from "vitest";

import {
  VRM_CONSTRAINT_FIXTURE_FILENAME,
  VRM_RIG_MODEL_FILENAME,
  VRM_RIG_MODEL_FORMAT,
  buildVrmRigModelUrl
} from "@/lab/experiments/vrm-rig/vrmModel";

describe("buildVrmRigModelUrl", () => {
  it("selects Aurora while retaining the VRM 1.0 constraint fixture", () => {
    expect(VRM_RIG_MODEL_FILENAME).toBe("Aurora.vrm");
    expect(VRM_RIG_MODEL_FORMAT).toBe("VRM 0.x");
    expect(VRM_CONSTRAINT_FIXTURE_FILENAME).toBe("VRM1_Constraint_Twist_Sample.vrm");
  });

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
