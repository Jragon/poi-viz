import { describe, expect, it } from "vitest";
import {
  DEGREES_PER_RADIAN,
  RADIANS_PER_DEGREE,
  degreesToRadians,
  radiansToDegrees
} from "@/state/angleUnits";

describe("angle unit conversions", () => {
  it("converts radians to degrees", () => {
    expect(radiansToDegrees(Math.PI)).toBeCloseTo(180, 12);
    expect(radiansToDegrees(2 * Math.PI)).toBeCloseTo(360, 12);
  });

  it("converts degrees to radians", () => {
    expect(degreesToRadians(180)).toBeCloseTo(Math.PI, 12);
    expect(degreesToRadians(360)).toBeCloseTo(2 * Math.PI, 12);
  });

  it("keeps conversion constants reciprocal", () => {
    expect(DEGREES_PER_RADIAN * RADIANS_PER_DEGREE).toBeCloseTo(1, 12);
  });
});

