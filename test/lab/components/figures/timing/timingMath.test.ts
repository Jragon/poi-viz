import { describe, expect, it } from "vitest";

import {
  cardinalForPhase,
  classifyOffset,
  downbeatTimes,
  formatCycleTime,
  normalizePhase,
  phaseAtTime,
  swapOffset,
  swapTiming,
  wallHeightAtTime
} from "@/lab/components/figures/timing/timingMath";

describe("timingMath", () => {
  it.each([
    [0, 0],
    [1, 0],
    [1.25, 0.25],
    [-0.25, 0.75],
    [-1.5, 0.5]
  ])("normalizes phase %s to %s", (input, expected) => {
    expect(normalizePhase(input)).toBeCloseTo(expected);
  });

  it("visits the wall cardinals in positive phase order from the downbeat", () => {
    expect(
      [0, 0.25, 0.5, 0.75].map((time) => cardinalForPhase(phaseAtTime(time, 0, "positive")))
    ).toEqual(["D", "R", "U", "L"]);
  });

  it("visits the wall cardinals in negative phase order from the downbeat", () => {
    expect(
      [0, 0.25, 0.5, 0.75].map((time) => cardinalForPhase(phaseAtTime(time, 0, "negative")))
    ).toEqual(["D", "L", "U", "R"]);
  });

  it.each([
    [0, "same"],
    [0.25, "quarter-right"],
    [0.5, "split"],
    [0.75, "quarter-left"]
  ] as const)("classifies offset %s as %s", (offset, expected) => {
    expect(classifyOffset(offset)).toBe(expected);
    expect(downbeatTimes(offset)).toEqual({ left: 0, right: offset });
  });

  it.each([
    [0, 0],
    [0.25, 0.75],
    [0.5, 0.5],
    [0.75, 0.25]
  ] as const)("swaps offset %s to %s", (offset, expected) => {
    expect(swapOffset(offset)).toBe(expected);
  });

  it("swaps the complete handed timing model", () => {
    expect(
      swapTiming({
        downbeatOffset: 0.25,
        leftDirection: "positive",
        rightDirection: "negative"
      })
    ).toEqual({
      downbeatOffset: 0.75,
      leftDirection: "negative",
      rightDirection: "positive"
    });
  });

  it("changes spatial phase under direction reversal without changing the downbeat schedule", () => {
    const events = downbeatTimes(0.25);

    expect(cardinalForPhase(phaseAtTime(0, events.right, "positive"))).toBe("L");
    expect(cardinalForPhase(phaseAtTime(0, events.right, "negative"))).toBe("R");
    expect(cardinalForPhase(phaseAtTime(events.right, events.right, "positive"))).toBe("D");
    expect(cardinalForPhase(phaseAtTime(events.right, events.right, "negative"))).toBe("D");
    expect(events.right).toBe(0.25);
  });

  it("uses bottom, centre, and top as the physical wall-height landmarks", () => {
    expect(wallHeightAtTime(0, 0)).toBeCloseTo(-1);
    expect(wallHeightAtTime(0.25, 0)).toBeCloseTo(0);
    expect(wallHeightAtTime(0.5, 0)).toBeCloseTo(1);
    expect(wallHeightAtTime(0.75, 0)).toBeCloseTo(0);
  });

  it("formats quarter landmarks and continuous cycle times", () => {
    expect(formatCycleTime(0.25)).toBe("1/4");
    expect(formatCycleTime(1)).toBe("0/4");
    expect(formatCycleTime(0.1)).toBe("0.10");
  });
});
