import { describe, expect, it } from "vitest";
import {
  classifyPoiSpinMode,
  cyclesPerBeatToRadiansPerBeat,
  getAbsoluteHeadSpeedRadiansPerBeat,
  getRelativePoiSpeedFromAbsoluteHeadRadiansPerBeat,
  radiansPerBeatToCyclesPerBeat,
  speedFromRadiansPerBeat,
  speedToRadiansPerBeat
} from "@/state/speedUnits";

describe("speed unit conversions", () => {
  it("converts cycles/beat to radians/beat and back", () => {
    const radiansPerBeat = cyclesPerBeatToRadiansPerBeat(1);
    expect(radiansPerBeat).toBeCloseTo(2 * Math.PI, 12);
    expect(radiansPerBeatToCyclesPerBeat(radiansPerBeat)).toBeCloseTo(1, 12);
  });

  it("converts between radians/beat and configured display units", () => {
    expect(speedFromRadiansPerBeat(2 * Math.PI, "cycles")).toBeCloseTo(1, 12);
    expect(speedFromRadiansPerBeat(2 * Math.PI, "degrees")).toBeCloseTo(360, 12);

    expect(speedToRadiansPerBeat(1, "cycles")).toBeCloseTo(2 * Math.PI, 12);
    expect(speedToRadiansPerBeat(360, "degrees")).toBeCloseTo(2 * Math.PI, 12);
  });
});

describe("relative and absolute poi speed model", () => {
  it("computes absolute head speed as h = a + r", () => {
    const armSpeed = 2 * Math.PI;
    const relativePoiSpeed = -3 * 2 * Math.PI;

    const absoluteHeadSpeed = getAbsoluteHeadSpeedRadiansPerBeat(armSpeed, relativePoiSpeed);

    expect(absoluteHeadSpeed).toBeCloseTo(-2 * 2 * Math.PI, 12);
  });

  it("reconstructs relative speed from absolute speed as r = h - a", () => {
    const armSpeed = 2 * Math.PI;
    const absoluteHeadSpeed = 1 * 2 * Math.PI;

    const relativePoiSpeed = getRelativePoiSpeedFromAbsoluteHeadRadiansPerBeat(armSpeed, absoluteHeadSpeed);

    expect(relativePoiSpeed).toBeCloseTo(0, 12);
  });

  it("classifies extension, inspin, and antispin from arm/relative sign relationship", () => {
    const armSpeed = 2 * Math.PI;

    expect(classifyPoiSpinMode(armSpeed, 0)).toBe("extension");
    expect(classifyPoiSpinMode(armSpeed, 2 * Math.PI)).toBe("inspin");
    expect(classifyPoiSpinMode(armSpeed, -2 * Math.PI)).toBe("antispin");
    expect(classifyPoiSpinMode(0, 2 * Math.PI)).toBe("static-spin");
  });
});
