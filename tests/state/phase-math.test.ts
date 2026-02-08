import { describe, expect, it } from "vitest";
import {
  normalizeDegrees0ToTurn,
  normalizeRadians0ToTau,
  shortestAngularDistanceRadians
} from "@/state/phaseMath";

describe("phase math helpers", () => {
  it("wraps degrees to [0, 360)", () => {
    expect(normalizeDegrees0ToTurn(450)).toBeCloseTo(90, 10);
    expect(normalizeDegrees0ToTurn(-90)).toBeCloseTo(270, 10);
    expect(normalizeDegrees0ToTurn(0)).toBeCloseTo(0, 10);
  });

  it("wraps radians to [0, 2π)", () => {
    expect(normalizeRadians0ToTau(2 * Math.PI)).toBeCloseTo(0, 10);
    expect(normalizeRadians0ToTau(-Math.PI / 2)).toBeCloseTo((3 * Math.PI) / 2, 10);
  });

  it("computes shortest wrapped angular distance", () => {
    const rightNearWrap = (359 * Math.PI) / 180;
    const zero = 0;
    const oneDegree = Math.PI / 180;

    expect(shortestAngularDistanceRadians(rightNearWrap, zero)).toBeCloseTo(oneDegree, 10);
    expect(shortestAngularDistanceRadians(Math.PI / 2, Math.PI)).toBeCloseTo(Math.PI / 2, 10);
  });
});
