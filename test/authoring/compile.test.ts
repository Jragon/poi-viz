import { compileAuthoredDocument, validateAuthoredDocument } from "@/authoring/compile";
import type { AuthoredSequenceDocument } from "@/authoring/types";
import { evalSegment } from "@/engine/engine";
import { prepareMultiRigSequence } from "@/engine/multirig";
import { describe, expect, it } from "vitest";

describe("validateAuthoredDocument", () => {
  it("rejects a document with no present tracks", () => {
    const result = validateAuthoredDocument({
      name: "Empty",
      description: null,
      tracks: {}
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([{ code: "EMPTY_DOCUMENT" }]);
    }
  });

  it("rejects a present track with no segments", () => {
    const result = validateAuthoredDocument({
      name: "Left only",
      description: null,
      tracks: {
        left: { segments: [] }
      }
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([{ code: "EMPTY_TRACK", trackId: "left" }]);
    }
  });
});

describe("compileAuthoredDocument", () => {
  it("propagates later segment start poses from the previous segment end", () => {
    const document: AuthoredSequenceDocument = {
      name: "Continuity",
      description: null,
      tracks: {
        left: {
          segments: [
            {
              kind: "first",
              durationUnits: 2,
              hand: {
                startPose: { phaseDeg: 90, radius: 1 },
                driver: { kind: "circle", omega: 1, omegaUnit: "radians-per-unit" }
              },
              head: {
                startPose: { phaseDeg: 180, radius: 2 },
                driver: { kind: "circle", omega: -2, omegaUnit: "radians-per-unit" }
              }
            },
            {
              kind: "continuation",
              durationUnits: 3,
              hand: {
                driver: { kind: "circle", omega: 10, omegaUnit: "radians-per-unit" }
              },
              head: {
                driver: { kind: "circle", omega: 20, omegaUnit: "radians-per-unit" }
              }
            }
          ]
        }
      }
    };

    const result = compileAuthoredDocument(document);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected valid authored document");
    }

    const leftBoundaries = result.boundariesByTrack.left;
    expect(leftBoundaries).toBeDefined();
    if (!leftBoundaries) {
      throw new Error("expected left boundaries");
    }

    const expectedFirstEnd = evalSegment(leftBoundaries[0].segment, 2);
    expect(leftBoundaries[0].endPose).toEqual(expectedFirstEnd);
    expect(leftBoundaries[1].startPose).toEqual(expectedFirstEnd);
    expect(result.sequence.rigs[0].sequence.segments[1].segment.hand.startPose).toEqual(
      expectedFirstEnd.handPose
    );
    expect(result.sequence.rigs[0].sequence.segments[1].segment.head.startPose).toEqual(
      expectedFirstEnd.headPose
    );

    const prepared = prepareMultiRigSequence(result.sequence);
    expect(prepared.ok).toBe(true);
  });

  it("supports documents with only one optional track present", () => {
    const document: AuthoredSequenceDocument = {
      name: "Right only",
      description: "single side",
      tracks: {
        right: {
          segments: [
            {
              kind: "first",
              durationUnits: 1,
              hand: {
                startPose: { phaseDeg: 0, radius: 1 },
                driver: { kind: "circle", omega: 1, omegaUnit: "circles-per-unit" }
              },
              head: {
                startPose: { phaseDeg: 0, radius: 1 },
                driver: { kind: "circle", omega: 2, omegaUnit: "circles-per-unit" }
              }
            }
          ]
        }
      }
    };

    const result = compileAuthoredDocument(document);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("expected valid authored document");
    }

    expect(result.sequence.rigs).toHaveLength(1);
    expect(result.sequence.rigs[0].rigId).toBe("right");
    expect(result.boundariesByTrack.left).toBeUndefined();
    expect(result.boundariesByTrack.right).toHaveLength(1);
  });
});
