import { describe, expect, it } from "vitest";

import {
  circularHandPeriod,
  createCircularHandPath,
  createConstantSpeedEllipseController,
  createEllipseHandPath,
  createLineHandPath,
  createPhaseLockedEllipseController
} from "@/lab/experiments/gravity/physics/handPaths";

describe("circular hand paths", () => {
  it("starts at the fixed-hand origin and returns after one period", () => {
    const path = createCircularHandPath({ amplitude: 0.1, angularVelocity: 2, phase: 0.7 });
    const start = path.sample(0);
    const end = path.sample(circularHandPeriod(2));
    expect(start.position).toEqual({ x: 0, y: 0 });
    expect(end.position.x).toBeCloseTo(0, 10);
    expect(end.position.y).toBeCloseTo(0, 10);
    expect(start.velocity).not.toEqual({ x: 0, y: 0 });
  });

  it("returns exact analytic velocity and acceleration", () => {
    const amplitude = 0.2;
    const angularVelocity = -1.5;
    const phase = 0.4;
    const time = 0.8;
    const path = createCircularHandPath({ amplitude, angularVelocity, phase });
    const sample = path.sample(time);
    const currentPhase = phase + angularVelocity * time;
    expect(sample.velocity.x).toBeCloseTo(-amplitude * angularVelocity * Math.sin(currentPhase), 10);
    expect(sample.velocity.y).toBeCloseTo(amplitude * angularVelocity * Math.cos(currentPhase), 10);
    expect(sample.acceleration.x).toBeCloseTo(-amplitude * angularVelocity ** 2 * Math.cos(currentPhase), 10);
    expect(sample.acceleration.y).toBeCloseTo(-amplitude * angularVelocity ** 2 * Math.sin(currentPhase), 10);
  });

  it("supports elliptical and line paths with exact derivatives", () => {
    const ellipse = createEllipseHandPath({
      radiusX: 0.2,
      radiusY: 0.1,
      angularVelocity: 2,
      phase: 0.3
    });
    const ellipseSample = ellipse.sample(0.4);
    const phase = 0.3 + 2 * 0.4;
    expect(ellipseSample.velocity.x).toBeCloseTo(-0.2 * 2 * Math.sin(phase), 10);
    expect(ellipseSample.velocity.y).toBeCloseTo(0.1 * 2 * Math.cos(phase), 10);
    expect(ellipseSample.acceleration.x).toBeCloseTo(-0.2 * 4 * Math.cos(phase), 10);
    expect(ellipseSample.acceleration.y).toBeCloseTo(-0.1 * 4 * Math.sin(phase), 10);

    const line = createLineHandPath({
      amplitude: 0.2,
      angularVelocity: 2,
      phase: 0,
      axis: "vertical"
    });
    const lineSample = line.sample(0.4);
    expect(lineSample.position.x).toBeCloseTo(0, 10);
    expect(lineSample.velocity.x).toBeCloseTo(0, 10);
    expect(lineSample.acceleration.x).toBeCloseTo(0, 10);
  });

  it("keeps a phase-locked ellipse continuous across controller steps", () => {
    const controller = createPhaseLockedEllipseController({
      radiusX: 0.2,
      radiusY: 0.1,
      baseAngularVelocity: 2,
      initialPhase: 0.4,
      phaseOffset: 0,
      phaseGain: 1.5,
      maxRateCorrection: 0.5,
      maxRateAcceleration: 20
    });
    let state = controller.initialize(0, 2);
    const first = controller.pathForStep(state, 0);
    const firstEnd = first.sample(0.01);
    state = controller.advance(state, { theta: 0.6, angularVelocity: 2, mode: "taut" }, 0.01);
    const second = controller.pathForStep(state, 0.01);
    const secondStart = second.sample(0.01);
    expect(secondStart.position.x).toBeCloseTo(firstEnd.position.x, 10);
    expect(secondStart.position.y).toBeCloseTo(firstEnd.position.y, 10);
    expect(state.angularVelocity).toBe(2);
    expect(state.angularAcceleration).toBeGreaterThan(0);
  });

  it("uses gravity feed-forward and PI correction for constant speed", () => {
    const controller = createConstantSpeedEllipseController({
      radiusX: 0.2,
      radiusY: 0.1,
      gravity: 1,
      tetherLength: 1,
      targetAngularVelocity: 2,
      baseAngularVelocity: 2,
      initialPhase: 0,
      speedGain: 1,
      integralGain: 0.5,
      integralLimit: 2,
      maxRateCorrection: 1,
      maxPhaseAcceleration: 20
    });
    let state = controller.initialize(0, 2);
    state = controller.advance(state, {
      theta: Math.PI / 2,
      angularVelocity: 1.5,
      mode: "taut"
    }, 0.01);
    expect(state.integralError).toBeGreaterThan(0);
    expect(Number.isFinite(state.angularAcceleration)).toBe(true);
    expect(Math.abs(state.angularAcceleration)).toBeLessThanOrEqual(20);
  });
});
