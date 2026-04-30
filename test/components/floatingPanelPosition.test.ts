import { describe, expect, it } from "vitest";

import { clampPanelPosition } from "@/components/floatingPanelPosition";

describe("clampPanelPosition", () => {
  it("keeps a panel inside the viewport margin", () => {
    expect(
      clampPanelPosition(
        { x: -100, y: 1000 },
        { width: 800, height: 600 },
        { width: 200, height: 150 },
        16
      )
    ).toEqual({ x: 16, y: 434 });
  });

  it("falls back to the margin for non-finite positions", () => {
    expect(
      clampPanelPosition(
        { x: Number.NaN, y: Number.POSITIVE_INFINITY },
        { width: 800, height: 600 },
        { width: 200, height: 150 },
        20
      )
    ).toEqual({ x: 20, y: 20 });
  });

  it("handles panels wider than the viewport without producing negative coordinates", () => {
    expect(
      clampPanelPosition(
        { x: 500, y: 500 },
        { width: 300, height: 240 },
        { width: 500, height: 400 },
        12
      )
    ).toEqual({ x: 12, y: 12 });
  });
});
