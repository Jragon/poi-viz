import {
  completeStallPattern,
  createEmptyStallPatternDraft,
  STALL_PATTERN_VERSION,
  validateStallPatternDraft
} from "@/lab/experiments/qt-stall-graph/stallPattern";
import { describe, expect, it } from "vitest";

describe("stall pattern model", () => {
  it("creates a serializable empty four-beat draft", () => {
    expect(createEmptyStallPatternDraft()).toEqual({
      version: STALL_PATTERN_VERSION,
      beatCount: 4,
      tracks: {
        left: [null, null, null, null],
        right: [null, null, null, null]
      }
    });
  });

  it("clones a valid unknown draft at the validation boundary", () => {
    const input = {
      version: 1,
      beatCount: 4,
      tracks: { left: ["U", "R", null, "L"], right: null }
    };
    const result = validateStallPatternDraft(input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.draft).toEqual(input);
    expect(result.draft).not.toBe(input);
    expect(result.draft.tracks.left).not.toBe(input.tracks.left);
  });

  it("rejects mismatched track lengths and invalid nodes", () => {
    const result = validateStallPatternDraft({
      version: 1,
      beatCount: 4,
      tracks: { left: ["U", "X"], right: null }
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((issue) => issue.code)).toEqual([
      "TRACK_LENGTH_MISMATCH",
      "INVALID_STEP"
    ]);
  });

  it("rejects a draft with both hands absent", () => {
    const result = validateStallPatternDraft({
      version: 1,
      beatCount: 4,
      tracks: { left: null, right: null }
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "NO_TRACKS", path: "tracks" })
    );
  });

  it("promotes a filled draft to a complete pattern", () => {
    const result = completeStallPattern({
      version: 1,
      beatCount: 4,
      tracks: { left: ["U", "R", "D", "L"], right: null }
    });

    expect(result).toEqual({
      ok: true,
      pattern: {
        version: 1,
        beatCount: 4,
        tracks: { left: ["U", "R", "D", "L"], right: null }
      }
    });
  });

  it("reports every missing node when completion is requested", () => {
    const result = completeStallPattern(createEmptyStallPatternDraft(2));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map((issue) => issue.path)).toEqual([
      "tracks.left.0",
      "tracks.left.1",
      "tracks.right.0",
      "tracks.right.1"
    ]);
  });
});
