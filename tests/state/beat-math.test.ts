import { describe, expect, it } from "vitest";
import { normalizeLoopBeat } from "@/state/beatMath";

describe("beat math helpers", () => {
  it("normalizes positive and negative beats into loop range", () => {
    expect(normalizeLoopBeat(5.25, 4)).toBeCloseTo(1.25, 10);
    expect(normalizeLoopBeat(-0.5, 4)).toBeCloseTo(3.5, 10);
  });

  it("returns zero for non-positive loop sizes", () => {
    expect(normalizeLoopBeat(1.2, 0)).toBe(0);
    expect(normalizeLoopBeat(1.2, -3)).toBe(0);
  });
});
