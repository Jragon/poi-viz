import { describe, expect, it } from "vitest";

import {
  classifyLaunchEnergy,
  launchReleaseAngleSquaredSpeed,
  limitingTautLoopDuration,
  normalizedLaunchEnergy,
  tautLoopSpeed,
  tautLoopTension
} from "@/lab/experiments/gravity/physics/analyticReferences";
import {
  createDefaultLaunchConfig,
  simulateIdealTether
} from "@/lab/experiments/gravity/physics/idealTether";

function simulateAtEnergy(energy: number) {
  const config = createDefaultLaunchConfig();
  const result = simulateIdealTether({
    ...config,
    duration: 6,
    initialAngularVelocity: Math.sqrt(2 * energy * config.gravity * config.length)
  });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error);
  return result.trace;
}

describe("gravity analytic references", () => {
  it("matches the limiting taut-loop speeds and tensions", () => {
    expect(tautLoopSpeed(0, 1, 1)).toBeCloseTo(Math.sqrt(5), 8);
    expect(tautLoopSpeed(Math.PI / 2, 1, 1)).toBeCloseTo(Math.sqrt(3), 8);
    expect(tautLoopSpeed(Math.PI, 1, 1)).toBeCloseTo(1, 8);
    expect(tautLoopTension(0, 1, 1)).toBeCloseTo(6, 8);
    expect(tautLoopTension(Math.PI / 2, 1, 1)).toBeCloseTo(3, 8);
    expect(tautLoopTension(Math.PI, 1, 1)).toBeCloseTo(0, 8);
    expect(limitingTautLoopDuration(1, 1)).toBeCloseTo(4.037811639956846, 8);
  });

  it("classifies the launch thresholds", () => {
    expect(classifyLaunchEnergy(0.99)).toBe("pendulum");
    expect(classifyLaunchEnergy(1)).toBe("slack");
    expect(classifyLaunchEnergy(2.49)).toBe("slack");
    expect(classifyLaunchEnergy(2.5)).toBe("taut-loop");
    expect(normalizedLaunchEnergy(Math.sqrt(5), 1, 1)).toBeCloseTo(2.5, 10);
  });

  it("reports the analytic release angle for the slack regime", () => {
    expect(launchReleaseAngleSquaredSpeed(2, 1, 1)).toBeCloseTo(Math.acos(-2 / 3), 8);
    expect(launchReleaseAngleSquaredSpeed(Math.sqrt(2), 1, 1)).toBeNull();
    expect(launchReleaseAngleSquaredSpeed(Math.sqrt(5), 1, 1)).toBeNull();
  });
});

describe("ideal unilateral tether simulation", () => {
  it("keeps the limiting launch taut through the loop", () => {
    const trace = simulateAtEnergy(2.5);
    expect(trace.events.some((event) => event.kind === "release")).toBe(false);
    expect(trace.metrics.classification).toBe("taut-loop");
    expect(trace.metrics.maximumUnwrappedAngle).toBeGreaterThan(Math.PI * 2 - 0.08);
    expect(trace.metrics.energyDrift).toBeLessThan(1e-5);
    const firstLoopSample = trace.samples.find((sample) => sample.theta >= Math.PI * 2);
    expect(firstLoopSample?.time).toBeCloseTo(limitingTautLoopDuration(1, 1), 2);
  });

  it("releases and catches when launch energy is between horizontal and taut thresholds", () => {
    const trace = simulateAtEnergy(2.25);
    expect(trace.events.some((event) => event.kind === "release")).toBe(true);
    expect(trace.events.some((event) => event.kind === "catch")).toBe(true);
    expect(trace.metrics.classification).toBe("slack-loop");
    expect(trace.metrics.maximumRadiusRatio).toBeLessThan(1.000001);
    expect(Math.abs(trace.metrics.energyBalanceResidual)).toBeLessThan(1e-4);
  });

  it("preserves the signed swing direction when the string catches", () => {
    const trace = simulateAtEnergy(2.25);
    const catchEvent = trace.events.find((event) => event.kind === "catch");
    expect(catchEvent).toBeDefined();
    if (!catchEvent) return;

    const catchIndex = trace.samples.findIndex(
      (sample) => sample.time >= catchEvent.time && sample.mode === "taut"
    );
    expect(catchIndex).toBeGreaterThan(0);
    const beforeCatch = trace.samples[catchIndex - 1];
    const afterCatch = trace.samples[catchIndex];
    expect(beforeCatch?.mode).toBe("slack");
    expect(afterCatch?.mode).toBe("taut");
    expect(beforeCatch?.angularVelocity).toBeGreaterThan(0);
    expect(afterCatch?.angularVelocity).toBeGreaterThan(0);
  });

  it("reports complete hand-relative speed during slack flight", () => {
    const trace = simulateAtEnergy(2.25);
    const slackSample = trace.samples.find((sample) => sample.mode === "slack");
    expect(slackSample).toBeDefined();
    if (!slackSample) return;

    const relativeVelocity = {
      x: slackSample.poiVelocity.x - slackSample.handVelocity.x,
      y: slackSample.poiVelocity.y - slackSample.handVelocity.y
    };
    expect(slackSample.relativeSpeed).toBeCloseTo(
      Math.hypot(relativeVelocity.x, relativeVelocity.y),
      10
    );
  });

  it("remains a pendulum below horizontal energy", () => {
    const trace = simulateAtEnergy(0.5);
    expect(trace.events).toHaveLength(0);
    expect(trace.metrics.classification).toBe("pendulum");
    expect(trace.metrics.maximumUnwrappedAngle).toBeLessThan(Math.PI);
  });

  it("is deterministic for identical input", () => {
    const first = simulateAtEnergy(2.25);
    const second = simulateAtEnergy(2.25);
    expect(first).toEqual(second);
  });
});
