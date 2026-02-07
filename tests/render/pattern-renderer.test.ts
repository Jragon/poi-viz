import { describe, expect, it } from "vitest";
import { createPatternTransform, worldToCanvas } from "@/render/math";
import { createPolarRingRadii, getWorldRadius } from "@/render/patternRenderer";
import type { HandsState } from "@/types/state";

function createHandsState(): HandsState {
  return {
    L: {
      armSpeed: 1,
      armPhase: 0,
      armRadius: 120,
      poiSpeed: 1,
      poiPhase: 0,
      poiRadius: 180
    },
    R: {
      armSpeed: 1,
      armPhase: 0,
      armRadius: 90,
      poiSpeed: 1,
      poiPhase: 0,
      poiRadius: 210
    }
  };
}

describe("pattern renderer helpers", () => {
  it("derives world radius from max hand reach", () => {
    const radius = getWorldRadius(createHandsState());
    expect(radius).toBe(300);
  });

  it("creates evenly spaced polar radii", () => {
    const radii = createPolarRingRadii(300, 6);
    expect(radii).toEqual([50, 100, 150, 200, 250, 300]);
  });

  it("maps world origin to canvas center", () => {
    const transform = createPatternTransform(800, 600, 300, 1.2);
    const mapped = worldToCanvas({ x: 0, y: 0 }, transform);

    expect(mapped.x).toBeCloseTo(400, 10);
    expect(mapped.y).toBeCloseTo(300, 10);
  });
});

