import { describe, expect, it } from "vitest";

import { simulateConstantSpeedCircle } from "@/lab/experiments/gravity/physics/constantSpeedCircle";

describe("constant-speed circle reference", () => {
  it("reports the top-tautness threshold at normalized speed one", () => {
    const trace = simulateConstantSpeedCircle({
      length: 1,
      mass: 1,
      gravity: 1,
      normalizedSpeed: 1,
      direction: 1
    });
    expect(trace.topTension).toBeCloseTo(0, 10);
    expect(trace.tautThroughout).toBe(true);
    expect(trace.minimumTension).toBeCloseTo(0, 10);
  });

  it("shows negative required tension below the taut threshold", () => {
    const trace = simulateConstantSpeedCircle({
      length: 1,
      mass: 1,
      gravity: 1,
      normalizedSpeed: 0.75,
      direction: 1
    });
    expect(trace.topTension).toBeCloseTo(-0.4375, 10);
    expect(trace.tautThroughout).toBe(false);
    expect(trace.samples.some((sample) => sample.mode === "slack")).toBe(true);
  });

  it("requires equal positive and negative work over a complete circle", () => {
    const trace = simulateConstantSpeedCircle({
      length: 1,
      mass: 1,
      gravity: 1,
      normalizedSpeed: 1.5,
      direction: -1
    });
    expect(trace.positiveWork).toBeCloseTo(2, 3);
    expect(trace.negativeWork).toBeCloseTo(-2, 3);
    expect(trace.absoluteWork).toBeCloseTo(4, 3);
    expect(trace.samples.at(-1)?.normalizedEnergy).toBeCloseTo(trace.samples[0]!.normalizedEnergy, 10);
    expect(trace.samples.every((sample) =>
      Math.abs(sample.gravityPower + sample.drivePower) < 1e-10
    )).toBe(true);
  });
});
