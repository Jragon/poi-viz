import { describe, expect, it } from "vitest";

import { analyzeFirstLoop } from "@/lab/experiments/gravity/physics/diagnostics";
import {
  createDefaultLaunchConfig,
  simulateIdealTether
} from "@/lab/experiments/gravity/physics/idealTether";
import { createEllipseHandPath } from "@/lab/experiments/gravity/physics/handPaths";

function limitingTrace(timestep: number) {
  const defaults = createDefaultLaunchConfig();
  const result = simulateIdealTether({
    ...defaults,
    timestep,
    duration: 4.2,
    initialAngularVelocity: Math.sqrt(5)
  });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error);
  return result.trace;
}

describe("gravity loop diagnostics", () => {
  it("finds cardinal markers and first-loop metrics", () => {
    const loop = analyzeFirstLoop(limitingTrace(1 / 480));
    expect(loop.complete).toBe(true);
    expect(loop.duration).toBeCloseTo(4.03781164, 2);
    expect(loop.markers.filter((marker) => marker.kind === "cardinal").map((marker) => marker.label))
      .toEqual(["bottom", "side", "top", "side", "bottom"]);
    expect(loop.speedRipple).toBeGreaterThan(0);
    expect(loop.minimumTension).toBeCloseTo(0, 3);
    expect(Math.abs(loop.energyBalanceResidual)).toBeLessThan(1e-4);
  });

  it("shows timestep convergence for the limiting taut loop", () => {
    const coarse = analyzeFirstLoop(limitingTrace(1 / 240));
    const medium = analyzeFirstLoop(limitingTrace(1 / 480));
    const fine = analyzeFirstLoop(limitingTrace(1 / 960));
    expect(Math.abs(fine.duration - medium.duration)).toBeLessThan(0.005);
    expect(Math.abs(medium.duration - coarse.duration)).toBeLessThan(0.01);
  });

  it("works with a moving ellipse path", () => {
    const defaults = createDefaultLaunchConfig();
    const result = simulateIdealTether({
      ...defaults,
      duration: 8,
      initialAngularVelocity: Math.sqrt(2 * 2.65),
      handPath: createEllipseHandPath({
        radiusX: 0.08,
        radiusY: 0.05,
        angularVelocity: 2.2,
        phase: 0
      })
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    const loop = analyzeFirstLoop(result.trace);
    expect(loop.complete).toBe(true);
    expect(Number.isFinite(loop.speedRipple)).toBe(true);
    expect(Math.abs(loop.energyBalanceResidual)).toBeLessThan(0.03);
  });
});
