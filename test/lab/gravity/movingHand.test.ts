import { describe, expect, it } from "vitest";

import { createCircularHandPath } from "@/lab/experiments/gravity/physics/handPaths";
import { createDefaultLaunchConfig, simulateIdealTether } from "@/lab/experiments/gravity/physics/idealTether";

describe("moving-hand tether traces", () => {
  it("records radial hand motion and closes the mechanical energy ledger", () => {
    const defaults = createDefaultLaunchConfig();
    const result = simulateIdealTether({
      ...defaults,
      duration: 8,
      initialAngularVelocity: Math.sqrt(2 * 2.65),
      handPath: createCircularHandPath({
        amplitude: 0.08,
        angularVelocity: 2.2,
        phase: 0
      })
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    expect(result.trace.samples.some((sample) => Math.abs(sample.radialHandVelocity) > 1e-4)).toBe(true);
    expect(result.trace.samples.every((sample) =>
      Math.abs(sample.normalizedRadialHandVelocity - sample.radialHandVelocity) < 1e-10
    )).toBe(true);
    expect(result.trace.samples.every((sample) =>
      Math.abs(sample.handPower + sample.tension * sample.radialHandVelocity) < 1e-10
    )).toBe(true);
    expect(result.trace.metrics.positiveHandWork).toBeGreaterThan(0);
    expect(result.trace.metrics.negativeHandWork).toBeLessThan(0);
    expect(Math.abs(result.trace.metrics.energyBalanceResidual)).toBeLessThan(0.03);
  });
});
