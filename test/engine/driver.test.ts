import { evalDriver } from "@/engine/drivers";
import type { Driver, RelativeNodePose } from "@/engine/types";
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
});
