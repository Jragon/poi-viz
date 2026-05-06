import { describe, expect, it } from "vitest";

import { getPlaneSideOffset, isPlaneSide } from "@/engine/planeSide";

describe("planeSide", () => {
  it("maps side a and b to opposite deterministic offsets", () => {
    expect(getPlaneSideOffset("a")).toBe(1);
    expect(getPlaneSideOffset("b")).toBe(-1);
  });

  it("identifies valid generic plane sides", () => {
    expect(isPlaneSide("a")).toBe(true);
    expect(isPlaneSide("b")).toBe(true);
    expect(isPlaneSide("front")).toBe(false);
    expect(isPlaneSide(undefined)).toBe(false);
  });
});
