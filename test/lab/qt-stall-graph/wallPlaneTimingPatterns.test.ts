import { describe, expect, it } from "vitest";

import { compileStallPattern } from "@/lab/experiments/qt-stall-graph/compileStallGraph";
import {
  decodeStallPattern,
  encodeStallPattern
} from "@/lab/experiments/qt-stall-graph/stallPatternCodec";
import { shiftStallPatternTrack } from "@/lab/experiments/qt-stall-graph/stallPatternTransforms";
import {
  WALL_PLANE_OPPOSITE_DIRECTION_PATTERNS,
  WALL_PLANE_SAME_DIRECTION_PATTERNS,
  WALL_TIMING_OFFSETS
} from "@/lab/experiments/qt-stall-graph/wallPlaneTimingPatterns";

const expectedSame = ["q1.4.URDL.URDL", "q1.4.LURD.URDL", "q1.4.DLUR.URDL", "q1.4.RDLU.URDL"];
const expectedOpposite = ["q1.4.ULDR.URDL", "q1.4.RULD.URDL", "q1.4.DRUL.URDL", "q1.4.LDRU.URDL"];

describe("wall-plane timing pattern data", () => {
  it("uses the established offset labels in order", () => {
    expect(WALL_TIMING_OFFSETS).toEqual([
      { offset: "0/4", label: "Same" },
      { offset: "1/4", label: "R +¼" },
      { offset: "2/4", label: "Split" },
      { offset: "3/4", label: "L +¼" }
    ]);
  });

  it("keeps same-direction codecs in increasing offset order", () => {
    expect(WALL_PLANE_SAME_DIRECTION_PATTERNS.map(({ codec }) => codec)).toEqual(expectedSame);
  });

  it("keeps opposite-direction codecs in increasing offset order", () => {
    expect(WALL_PLANE_OPPOSITE_DIRECTION_PATTERNS.map(({ codec }) => codec)).toEqual(
      expectedOpposite
    );
  });

  it.each([...expectedSame, ...expectedOpposite])("decodes and compiles %s", (codec) => {
    const decoded = decodeStallPattern(codec);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;

    const compiled = compileStallPattern(decoded.draft);
    expect(compiled.diagnostics).toEqual([]);
    expect(compiled.sequence?.rigs).toHaveLength(2);
    expect(compiled.sequence?.rigs.every((rig) => rig.sequence.segments.length === 4)).toBe(true);
  });

  it("cycles the same-direction left track through the raw codecs", () => {
    const shiftedEarlier = [expectedSame[3], expectedSame[0], expectedSame[1], expectedSame[2]];

    for (let index = 0; index < expectedSame.length; index++) {
      const decoded = decodeStallPattern(expectedSame[index]);
      expect(decoded.ok).toBe(true);
      if (!decoded.ok) continue;
      const shifted = shiftStallPatternTrack(decoded.draft, "left", -1);
      const encoded = encodeStallPattern(shifted);
      expect(encoded).toEqual({ ok: true, codec: shiftedEarlier[index] });
    }
  });
});
