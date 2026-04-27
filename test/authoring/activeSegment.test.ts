import { describe, expect, it } from "vitest";

import { findActiveSegmentIndex } from "@/authoring/activeSegment";

describe("findActiveSegmentIndex", () => {
  const boundaries = [
    { startUnit: 0, endUnit: 1 },
    { startUnit: 1, endUnit: 3 },
    { startUnit: 3, endUnit: 4 }
  ];

  it("returns -1 when there are no boundaries", () => {
    expect(findActiveSegmentIndex([], 0)).toBe(-1);
  });

  it("returns -1 when total duration is zero", () => {
    expect(findActiveSegmentIndex([{ startUnit: 0, endUnit: 0 }], 0)).toBe(-1);
  });

  it("matches the boundary at the start of its half-open interval", () => {
    expect(findActiveSegmentIndex(boundaries, 0)).toBe(0);
    expect(findActiveSegmentIndex(boundaries, 1)).toBe(1);
    expect(findActiveSegmentIndex(boundaries, 3)).toBe(2);
  });

  it("excludes the end of each boundary's half-open interval", () => {
    expect(findActiveSegmentIndex(boundaries, 0.999)).toBe(0);
    expect(findActiveSegmentIndex(boundaries, 2.999)).toBe(1);
  });

  it("wraps at the total duration boundary", () => {
    expect(findActiveSegmentIndex(boundaries, 4)).toBe(0);
    expect(findActiveSegmentIndex(boundaries, 4.5)).toBe(0);
    expect(findActiveSegmentIndex(boundaries, 7)).toBe(2);
  });

  it("handles negative times by wrapping into range", () => {
    expect(findActiveSegmentIndex(boundaries, -1)).toBe(2);
    expect(findActiveSegmentIndex(boundaries, -4)).toBe(0);
  });
});
