import { describe, expect, it } from "vitest";

import { createSceneLayout } from "@/visualizer/sceneLayout";

describe("createSceneLayout", () => {
  it("fits the configured scene radius into the viewport when no explicit scale is provided", () => {
    const layout = createSceneLayout({
      cssWidth: 600,
      cssHeight: 400,
      sceneRadiusWorld: 2,
      scenePaddingWorld: 0.5
    });

    expect(layout.pixelsPerWorldUnit).toBeCloseTo(80);
    expect(layout.canvasWidth).toBe(600);
    expect(layout.canvasHeight).toBe(400);
  });

  it("prefers an explicit scale when one is supplied", () => {
    const layout = createSceneLayout({
      cssWidth: 600,
      cssHeight: 400,
      pixelsPerWorldUnit: 120,
      sceneRadiusWorld: 2,
      scenePaddingWorld: 0.5
    });

    expect(layout.pixelsPerWorldUnit).toBe(120);
  });
});
