import { describe, expect, it } from "vitest";
import { rotatePositions, rotateTrailSeries } from "@/render/viewTransform";
import { PI } from "@/state/constants";

const HALF_PI = PI / 2;

describe("view transform helpers", () => {
  it("rotates sampled positions in view space", () => {
    const positions = {
      L: {
        hand: { x: 1, y: 0 },
        head: { x: 0, y: 1 },
        tether: { x: -1, y: 0 }
      },
      R: {
        hand: { x: 0, y: -2 },
        head: { x: 2, y: 0 },
        tether: { x: 0, y: 1 }
      }
    };

    const rotated = rotatePositions(positions, HALF_PI);

    expect(rotated.L.hand.x).toBeCloseTo(0, 10);
    expect(rotated.L.hand.y).toBeCloseTo(1, 10);
    expect(rotated.R.head.x).toBeCloseTo(0, 10);
    expect(rotated.R.head.y).toBeCloseTo(2, 10);
  });

  it("rotates trail samples in view space", () => {
    const trails = {
      L: [{ tBeats: 0, point: { x: 1, y: 0 } }],
      R: [{ tBeats: 0.5, point: { x: 0, y: -1 } }]
    };

    const rotated = rotateTrailSeries(trails, HALF_PI);

    expect(rotated.L[0]?.point.x).toBeCloseTo(0, 10);
    expect(rotated.L[0]?.point.y).toBeCloseTo(1, 10);
    expect(rotated.R[0]?.point.x).toBeCloseTo(1, 10);
    expect(rotated.R[0]?.point.y).toBeCloseTo(0, 10);
  });
});
