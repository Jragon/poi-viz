import { describe, expect, it } from "vitest";
import { getAngles } from "@/engine/angles";
import type { EngineParams } from "@/engine/types";
import { TWO_PI } from "@/state/constants";

function createTestParams(): EngineParams {
  return {
    bpm: 120,
    hands: {
      L: {
        armSpeed: TWO_PI,
        armPhase: 0,
        armRadius: 120,
        poiSpeed: 3 * TWO_PI,
        poiPhase: 0,
        poiRadius: 180
      },
      R: {
        armSpeed: TWO_PI,
        armPhase: Math.PI,
        armRadius: 120,
        poiSpeed: 3 * TWO_PI,
        poiPhase: 0,
        poiRadius: 180
      }
    }
  };
}

describe("getAngles", () => {
  it("computes default split-time values at t=0", () => {
    const params = createTestParams();
    const angles = getAngles(params, 0);

    expect(angles.L.arm).toBe(0);
    expect(angles.L.rel).toBe(0);
    expect(angles.L.head).toBe(0);
    expect(angles.R.arm).toBe(Math.PI);
    expect(angles.R.rel).toBe(0);
    expect(angles.R.head).toBe(Math.PI);
  });

  it("keeps arm, rel, and head channels linear in beats", () => {
    const params = createTestParams();
    const tBeats = 0.25;
    const angles = getAngles(params, tBeats);

    expect(angles.L.arm).toBeCloseTo(0.5 * Math.PI, 12);
    expect(angles.L.rel).toBeCloseTo(1.5 * Math.PI, 12);
    expect(angles.L.head).toBeCloseTo(2 * Math.PI, 12);
  });
});

