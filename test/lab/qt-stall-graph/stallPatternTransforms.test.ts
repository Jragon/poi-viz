import {
  STALL_PATTERN_VERSION,
  type StallPatternDraft
} from "@/lab/experiments/qt-stall-graph/stallPattern";
import {
  appendStallPatternBeat,
  deleteLastStallPatternBeat,
  rotateStallPatternCycleStart,
  setStallPatternNode,
  setStallPatternTrackPresent,
  shiftStallPatternTrack
} from "@/lab/experiments/qt-stall-graph/stallPatternTransforms";
import { describe, expect, it } from "vitest";

function draft(): StallPatternDraft {
  return {
    version: STALL_PATTERN_VERSION,
    beatCount: 4,
    tracks: {
      left: ["U", "R", "D", "L"],
      right: ["R", "D", "L", "U"]
    }
  };
}

describe("stall pattern track offsets", () => {
  it("moves a positive offset later in time and wraps", () => {
    const shifted = shiftStallPatternTrack(draft(), "left", 1);

    expect(shifted.tracks.left).toEqual(["L", "U", "R", "D"]);
    expect(shifted.tracks.right).toEqual(["R", "D", "L", "U"]);
  });

  it("is reversible and reduces large offsets modulo the beat count", () => {
    const source = draft();
    const reversed = shiftStallPatternTrack(
      shiftStallPatternTrack(source, "right", 7),
      "right",
      -7
    );

    expect(reversed).toEqual(source);
    expect(shiftStallPatternTrack(source, "left", source.beatCount)).toEqual(source);
  });

  it("does not mutate the input and ignores an absent hand", () => {
    const source = draft();
    const shifted = shiftStallPatternTrack(source, "left", -1);
    const absent = { ...source, tracks: { ...source.tracks, left: null } };

    expect(source.tracks.left).toEqual(["U", "R", "D", "L"]);
    expect(shifted).not.toBe(source);
    expect(shiftStallPatternTrack(absent, "left", 1)).toBe(absent);
  });
});

describe("stall pattern cycle start", () => {
  it("makes the next beat the new beat one", () => {
    const rotated = rotateStallPatternCycleStart(draft(), 1);

    expect(rotated.tracks.left).toEqual(["R", "D", "L", "U"]);
    expect(rotated.tracks.right).toEqual(["D", "L", "U", "R"]);
  });

  it("rotates every present hand and is reversible", () => {
    const source = draft();
    const reversed = rotateStallPatternCycleStart(rotateStallPatternCycleStart(source, 3), -3);

    expect(reversed).toEqual(source);
    expect(source.tracks.left).toEqual(["U", "R", "D", "L"]);
  });
});

describe("stall pattern structural edits", () => {
  it("sets and clears a node immutably", () => {
    const source = draft();
    const changed = setStallPatternNode(source, "left", 1, "F");
    const cleared = setStallPatternNode(changed, "left", 1, null);

    expect(changed.tracks.left).toEqual(["U", "F", "D", "L"]);
    expect(cleared.tracks.left).toEqual(["U", null, "D", "L"]);
    expect(source.tracks.left).toEqual(["U", "R", "D", "L"]);
  });

  it("adds and removes tracks without changing the beat count", () => {
    const source = draft();
    const absent = setStallPatternTrackPresent(source, "right", false);
    const restored = setStallPatternTrackPresent(absent, "right", true);

    expect(absent.tracks.right).toBeNull();
    expect(restored.tracks.right).toEqual([null, null, null, null]);
    expect(restored.beatCount).toBe(4);
  });

  it("appends and removes a beat for every present hand", () => {
    const appended = appendStallPatternBeat(draft());
    const deleted = deleteLastStallPatternBeat(appended);

    expect(appended.beatCount).toBe(5);
    expect(appended.tracks.left).toEqual(["U", "R", "D", "L", null]);
    expect(appended.tracks.right).toEqual(["R", "D", "L", "U", null]);
    expect(deleted).toEqual(draft());
  });

  it("does not delete below the two-beat minimum", () => {
    const source: StallPatternDraft = {
      version: STALL_PATTERN_VERSION,
      beatCount: 2,
      tracks: { left: ["U", "R"], right: null }
    };

    expect(deleteLastStallPatternBeat(source)).toBe(source);
  });

  it("rejects invalid indices and non-integer offsets", () => {
    expect(() => setStallPatternNode(draft(), "left", 4, "U")).toThrow("outside the pattern");
    expect(() => shiftStallPatternTrack(draft(), "left", 0.5)).toThrow("must be an integer");
    expect(() => rotateStallPatternCycleStart(draft(), Number.NaN)).toThrow("must be an integer");
  });
});
