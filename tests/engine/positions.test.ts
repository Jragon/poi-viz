import { describe, expect, it } from "vitest";
import { getPositions } from "@/engine/positions";
import { vectorMagnitude } from "@/engine/math";
import type { EngineParams } from "@/engine/types";

function createStaticParams(): EngineParams {
  return {
    bpm: 120,
    hands: {
      L: {
        armSpeed: 0,
        armPhase: 0,
        armRadius: 10,
        poiSpeed: 0,
        poiPhase: Math.PI / 2,
        poiRadius: 5
      },
      R: {
        armSpeed: 0,
        armPhase: 0,
        armRadius: 6,
        poiSpeed: 0,
        poiPhase: Math.PI,
        poiRadius: 4
      }
    }
  };
}

describe("getPositions", () => {
  it("follows H(t) and P(t) formulas for each hand", () => {
    const params = createStaticParams();
    const positions = getPositions(params, 0);

    expect(positions.L.hand.x).toBeCloseTo(10, 12);
    expect(positions.L.hand.y).toBeCloseTo(0, 12);
    expect(positions.L.head.x).toBeCloseTo(10, 12);
    expect(positions.L.head.y).toBeCloseTo(5, 12);

    expect(positions.R.hand.x).toBeCloseTo(6, 12);
    expect(positions.R.hand.y).toBeCloseTo(0, 12);
    expect(positions.R.head.x).toBeCloseTo(2, 12);
    expect(positions.R.head.y).toBeCloseTo(0, 12);
  });

  it("keeps tether vector magnitude equal to poi radius", () => {
    const params = createStaticParams();
    const positions = getPositions(params, 0);

    expect(vectorMagnitude(positions.L.tether)).toBeCloseTo(params.hands.L.poiRadius, 12);
    expect(vectorMagnitude(positions.R.tether)).toBeCloseTo(params.hands.R.poiRadius, 12);
  });
});

