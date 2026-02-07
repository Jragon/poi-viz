import { describe, expect, it } from "vitest";
import { compareFixtureSamples, type FixtureSample } from "./fixture-harness";

function createFixtureSamples(): FixtureSample[] {
  return [
    {
      tBeats: 0,
      L: { x: 1, y: 2 },
      R: { x: 3, y: 4 }
    },
    {
      tBeats: 1,
      L: { x: 5, y: 6 },
      R: { x: 7, y: 8 }
    }
  ];
}

describe("fixture comparison harness", () => {
  it("returns no mismatches when values are within tolerance", () => {
    const expected = createFixtureSamples();
    const actual = createFixtureSamples();
    actual[1].R.y += 0.00005;

    const mismatches = compareFixtureSamples(expected, actual, 0.0001);
    expect(mismatches).toEqual([]);
  });

  it("returns mismatch metadata when values exceed tolerance", () => {
    const expected = createFixtureSamples();
    const actual = createFixtureSamples();
    actual[1].R.y += 0.01;

    const mismatches = compareFixtureSamples(expected, actual, 0.0001);
    expect(mismatches).toHaveLength(1);

    expect(mismatches[0]).toEqual(
      expect.objectContaining({
        sampleIndex: 1,
        tBeats: 1,
        handId: "R",
        axis: "y",
        expected: 8,
        actual: 8.01
      })
    );
  });
});
