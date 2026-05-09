import { PI } from "@/engine/constants";
import { evalDriver } from "@/engine/drivers";
import type { Driver, RelativeNodePose } from "@/engine/types";
import { describe, expect, it } from "vitest";

const context = { tLocal: 0, durationUnits: 1 };

describe("evalDriver", () => {
  it("evaluates circle driver deterministically at time t", () => {
    const start: RelativeNodePose = { phaseAbs: 1, radius: 2 };
    const driver: Driver = { kind: "circle", omega: 0.5 };

    const t = 3;
    const poseA = evalDriver(driver, start, { ...context, tLocal: t });
    const poseB = evalDriver(driver, start, { ...context, tLocal: t });
    expect(poseA).toEqual(poseB);
    expect(poseA.phaseAbs).toBeCloseTo(t * driver.omega + 1);
    expect(poseA.radius).toEqual(start.radius);
  });

  it("interpolates radius profile from the implicit start radius anchor", () => {
    const start: RelativeNodePose = { phaseAbs: 1, radius: 2 };
    const driver: Driver = {
      kind: "circle",
      omega: 0,
      radiusProfile: {
        kind: "time-keyed",
        keys: [
          { t: 1, radius: 4 },
          { t: 3, radius: 0 }
        ]
      }
    };

    expect(evalDriver(driver, start, { ...context, tLocal: 0.5 }).radius).toBeCloseTo(3);
    expect(evalDriver(driver, start, { ...context, tLocal: 2 }).radius).toBeCloseTo(2);
  });

  it("holds the final keyed radius after the final profile key", () => {
    const start: RelativeNodePose = { phaseAbs: 0, radius: 1 };
    const driver: Driver = {
      kind: "circle",
      omega: 0,
      radiusProfile: {
        kind: "time-keyed",
        keys: [{ t: 0.25, radius: 0 }]
      }
    };

    expect(evalDriver(driver, start, { ...context, tLocal: 1 }).radius).toBe(0);
  });

  it("interpolates point-to-point drivers along a local Cartesian chord", () => {
    const start: RelativeNodePose = { phaseAbs: 0, radius: 1 };
    const driver: Driver = {
      kind: "point-to-point",
      endPose: { phaseAbs: PI / 2, radius: 1 }
    };

    const pose = evalDriver(driver, start, { tLocal: 1, durationUnits: 2 });

    expect(pose.radius).toBeCloseTo(Math.SQRT1_2);
    expect(pose.phaseAbs).toBeCloseTo(PI / 4);
  });

  it("returns exact point-to-point boundary poses when clamped", () => {
    const start: RelativeNodePose = { phaseAbs: 0.25, radius: 1 };
    const endPose: RelativeNodePose = { phaseAbs: PI / 2, radius: 2 };
    const driver: Driver = { kind: "point-to-point", endPose };

    expect(evalDriver(driver, start, { tLocal: -1, durationUnits: 2 })).toEqual(start);
    expect(evalDriver(driver, start, { tLocal: 2, durationUnits: 2 })).toEqual(endPose);
    expect(evalDriver(driver, start, { tLocal: 3, durationUnits: 2 })).toEqual(endPose);
  });

  it("keeps point-to-point center crossings finite and deterministic", () => {
    const start: RelativeNodePose = { phaseAbs: 0, radius: 1 };
    const driver: Driver = { kind: "point-to-point", endPose: { phaseAbs: PI, radius: 1 } };

    const pose = evalDriver(driver, start, { tLocal: 1, durationUnits: 2 });

    expect(pose).toEqual({ phaseAbs: 0, radius: 0 });
  });

  it("supports radius-zero point-to-point endpoints", () => {
    const start: RelativeNodePose = { phaseAbs: 0, radius: 0 };
    const driver: Driver = { kind: "point-to-point", endPose: { phaseAbs: PI / 2, radius: 1 } };

    const pose = evalDriver(driver, start, { tLocal: 0.5, durationUnits: 1 });

    expect(pose.radius).toBeCloseTo(0.5);
    expect(pose.phaseAbs).toBeCloseTo(PI / 2);
  });

  it("uses geometric atan2 phase for point-to-point quadrant crossings", () => {
    const start: RelativeNodePose = { phaseAbs: (-3 * PI) / 4, radius: 1 };
    const driver: Driver = {
      kind: "point-to-point",
      endPose: { phaseAbs: (3 * PI) / 4, radius: 1 }
    };

    const pose = evalDriver(driver, start, { tLocal: 0.5, durationUnits: 1 });

    expect(pose.radius).toBeCloseTo(Math.SQRT1_2);
    expect(Math.abs(pose.phaseAbs)).toBeCloseTo(PI);
  });

  it("evaluates runtime drivers with the start pose and local timing context", () => {
    const start: RelativeNodePose = { phaseAbs: 0.25, radius: 2 };
    const driver: Driver = {
      kind: "runtime",
      label: "test runtime",
      evalPose: (startPose, evalContext) => ({
        phaseAbs: startPose.phaseAbs + evalContext.tLocal,
        radius: startPose.radius + evalContext.durationUnits
      })
    };

    const pose = evalDriver(driver, start, { tLocal: 0.5, durationUnits: 2 });

    expect(pose).toEqual({ phaseAbs: 0.75, radius: 4 });
  });

  it("keeps pure runtime driver evaluation deterministic", () => {
    const start: RelativeNodePose = { phaseAbs: 0, radius: 1 };
    const driver: Driver = {
      kind: "runtime",
      label: "deterministic runtime",
      evalPose: (startPose, evalContext) => ({
        phaseAbs: startPose.phaseAbs,
        radius: startPose.radius * evalContext.durationUnits + evalContext.tLocal
      })
    };

    const evalContext = { tLocal: 0.25, durationUnits: 3 };

    expect(evalDriver(driver, start, evalContext)).toEqual(evalDriver(driver, start, evalContext));
  });
});
