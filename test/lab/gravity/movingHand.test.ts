import { describe, expect, it } from "vitest";

import {
  createCircularHandPath,
  createConstantSpeedEllipseController,
  createPhaseLockedEllipseController
} from "@/lab/experiments/gravity/physics/handPaths";
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

  it("runs the phase-locked ellipse deterministically", () => {
    const defaults = createDefaultLaunchConfig();
    const input = {
      ...defaults,
      duration: 6,
      initialAngularVelocity: Math.sqrt(2 * 2.65),
      handController: createPhaseLockedEllipseController({
        radiusX: 0.08,
        radiusY: 0.05,
        baseAngularVelocity: 2.2,
        initialPhase: 0,
        phaseOffset: 0,
        phaseGain: 1.5,
        maxRateCorrection: 1,
        maxRateAcceleration: 8
      })
    };
    const first = simulateIdealTether(input);
    const second = simulateIdealTether(input);
    expect(first).toEqual(second);
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error(first.error);
    expect(first.trace.samples.some((sample) => Math.abs(sample.radialHandVelocity) > 1e-4)).toBe(true);
    expect(first.trace.metrics.energyBalanceResidual).toBeLessThan(0.04);
  });

  it("runs the constant-speed controller deterministically", () => {
    const defaults = createDefaultLaunchConfig();
    const input = {
      ...defaults,
      duration: 6,
      initialAngularVelocity: Math.sqrt(2 * 2.65),
      handController: createConstantSpeedEllipseController({
        radiusX: 0.08,
        radiusY: 0.05,
        gravity: defaults.gravity,
        tetherLength: defaults.length,
        targetAngularVelocity: 2,
        baseAngularVelocity: 2.2,
        initialPhase: 0,
        speedGain: 1.5,
        integralGain: 0.35,
        integralLimit: 2,
        maxRateCorrection: 1.5,
        maxPhaseAcceleration: 12
      })
    };
    const first = simulateIdealTether(input);
    const second = simulateIdealTether(input);
    expect(first).toEqual(second);
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error(first.error);
    expect(first.trace.samples.some((sample) => Math.abs(sample.radialHandVelocity) > 1e-4)).toBe(true);
    expect(first.trace.samples.some((sample) => Math.abs(sample.angularVelocity - 2) < 0.1)).toBe(true);
  });
});
