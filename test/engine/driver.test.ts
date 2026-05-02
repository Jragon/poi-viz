import { evalDriver } from "@/engine/drivers";
import type { Driver, RadiusProfile, RelativeNodePose } from "@/engine/types";
import { describe, expect, it } from "vitest";

describe("evalDriver", () => {
  it("evaluates circle driver deterministically at time t", () => {
    const start: RelativeNodePose = { phaseAbs: 1, radius: 2 };
    const driver: Driver = { kind: "circle", omega: 0.5 };

    const t = 3;
    const poseA = evalDriver(driver, start, t);
    const poseB = evalDriver(driver, start, t);
    expect(poseA).toEqual(poseB);
    expect(poseA.phaseAbs).toBeCloseTo(t * driver.omega + 1);
    expect(poseA.radius).toEqual(start.radius);
  });

  it("interpolates radius profile from the implicit start radius anchor", () => {
    const start: RelativeNodePose = { phaseAbs: 1, radius: 2 };
    const driver: Driver = { kind: "circle", omega: 0 };
    const radiusProfile: RadiusProfile = {
      kind: "time-keyed",
      keys: [
        { t: 1, radius: 4 },
        { t: 3, radius: 0 }
      ]
    };

    expect(evalDriver(driver, start, 0.5, radiusProfile).radius).toBeCloseTo(3);
    expect(evalDriver(driver, start, 2, radiusProfile).radius).toBeCloseTo(2);
  });

  it("holds the final keyed radius after the final profile key", () => {
    const start: RelativeNodePose = { phaseAbs: 0, radius: 1 };
    const driver: Driver = { kind: "circle", omega: 0 };
    const radiusProfile: RadiusProfile = {
      kind: "time-keyed",
      keys: [{ t: 0.25, radius: 0 }]
    };

    expect(evalDriver(driver, start, 1, radiusProfile).radius).toBe(0);
  });
});
