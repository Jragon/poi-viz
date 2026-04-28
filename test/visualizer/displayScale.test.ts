import { describe, expect, it } from "vitest";

import { computeDisplayPixelsPerWorldUnit } from "@/visualizer/displayScale";

describe("computeDisplayPixelsPerWorldUnit", () => {
  it("multiplies the fitted viewport scale by the requested display scale", () => {
    expect(
      computeDisplayPixelsPerWorldUnit({
        cssWidth: 600,
        cssHeight: 400,
        sceneRadiusWorld: 2,
        scenePaddingWorld: 0.5,
        displayScale: 1.5
      })
    ).toBeCloseTo(120);
  });

  it("falls back to safe defaults when inputs are invalid", () => {
    expect(
      computeDisplayPixelsPerWorldUnit({
        cssWidth: 600,
        cssHeight: 400,
        sceneRadiusWorld: Number.NaN,
        scenePaddingWorld: -1,
        displayScale: Number.NaN
      })
    ).toBeCloseTo(85.1063829787);
  });
});
