import {
  decodeStallPattern,
  encodeStallPattern
} from "@/lab/experiments/qt-stall-graph/stallPatternCodec";
import { describe, expect, it } from "vitest";

describe("stall pattern codec", () => {
  it("round-trips a complete two-hand pattern", () => {
    const decoded = decodeStallPattern("q1.4.URDL.RDLU");
    expect(decoded).toEqual({
      ok: true,
      draft: {
        version: 1,
        beatCount: 4,
        tracks: { left: ["U", "R", "D", "L"], right: ["R", "D", "L", "U"] }
      }
    });

    if (!decoded.ok) return;
    expect(encodeStallPattern(decoded.draft)).toEqual({ ok: true, codec: "q1.4.URDL.RDLU" });
  });

  it("round-trips draft gaps and an absent hand", () => {
    const decoded = decodeStallPattern("q1.4.U__L.-");
    expect(decoded).toEqual({
      ok: true,
      draft: {
        version: 1,
        beatCount: 4,
        tracks: { left: ["U", null, null, "L"], right: null }
      }
    });

    if (!decoded.ok) return;
    expect(encodeStallPattern(decoded.draft)).toEqual({ ok: true, codec: "q1.4.U__L.-" });
  });

  it("supports readable patterns longer than 22 beats", () => {
    const left = "URDL".repeat(6);
    const right = "RDLU".repeat(6);
    const codec = `q1.24.${left}.${right}`;
    const decoded = decodeStallPattern(codec);

    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.draft.beatCount).toBe(24);
    expect(encodeStallPattern(decoded.draft)).toEqual({ ok: true, codec });
  });

  it.each([
    ["q2.4.URDL.RDLU", "UNSUPPORTED_VERSION"],
    ["q1.one.URDL.RDLU", "INVALID_BEAT_COUNT"],
    ["q1.1.U.R", "INVALID_BEAT_COUNT"],
    ["q1.4.URD.RDLU", "INVALID_TRACK_LENGTH"],
    ["q1.4.URdL.RDLU", "INVALID_TRACK_TOKEN"],
    ["q1.4.-.-", "NO_TRACKS"],
    ["q1.4.URDL", "INVALID_FORMAT"],
    [" q1.4.URDL.RDLU", "UNSUPPORTED_VERSION"]
  ])("rejects malformed codec %s", (codec, code) => {
    const result = decodeStallPattern(codec);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe(code);
  });

  it("refuses to encode an invalid draft", () => {
    const result = encodeStallPattern({
      version: 1,
      beatCount: 4,
      tracks: { left: ["U", "R"], right: null }
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("INVALID_PATTERN");
  });
});
