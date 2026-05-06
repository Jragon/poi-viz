import {
  authoredDocumentFromMultiRigSequence,
  compileAuthoredDocument,
  validateAuthoredDocument
} from "@/authoring/compile";
import type { AuthoredSequenceDocument } from "@/authoring/types";
import { evalSegment } from "@/engine/engine";
import { prepareMultiRigSequence } from "@/engine/multirig";
import type { MultiRigSequence, PlaneId, Segment } from "@/engine/types";
import { describe, expect, it } from "vitest";

function makeStaticSegment(): Segment {
  return {
    durationUnits: 1,
    hand: {
      startPose: { phaseAbs: 0, radius: 1 },
      driver: { kind: "circle", omega: 0 }
    },
    head: {
      startPose: { phaseAbs: 0, radius: 1 },
      driver: { kind: "circle", omega: 0 }
    }
  };
}

function makePlaneBreakDocument(
  sourcePlaneId: PlaneId,
  targetPlaneId: PlaneId,
  handPhaseDeg: number,
  headPhaseDeg: number
): AuthoredSequenceDocument {
  return {
    name: "Plane break",
    description: null,
    tracks: {
      left: {
        segments: [
          {
            kind: "first",
            durationUnits: 1,
            planeId: sourcePlaneId,
            hand: {
              startPose: { phaseDeg: handPhaseDeg, radius: 1 },
              driver: { kind: "circle", omega: 0, omegaUnit: "radians-per-unit" }
            },
            head: {
              startPose: { phaseDeg: headPhaseDeg, radius: 1 },
              driver: { kind: "circle", omega: 0, omegaUnit: "radians-per-unit" }
            }
          },
          {
            kind: "continuation",
            durationUnits: 1,
            planeId: targetPlaneId,
            hand: {
              driver: { kind: "circle", omega: 0, omegaUnit: "radians-per-unit" }
            },
            head: {
              driver: { kind: "circle", omega: 0, omegaUnit: "radians-per-unit" }
            }
          }
        ]
      }
    }
  };
}

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

  it("rejects invalid authored plane ids", () => {
    const document = {
      name: "Invalid plane",
      description: null,
      tracks: {
        left: {
          segments: [
            {
              kind: "first",
              durationUnits: 1,
              planeId: "diagonal",
              hand: {
                startPose: { phaseDeg: 0, radius: 1 },
                driver: { kind: "circle", omega: 0, omegaUnit: "radians-per-unit" }
              },
              head: {
                startPose: { phaseDeg: 0, radius: 1 },
                driver: { kind: "circle", omega: 0, omegaUnit: "radians-per-unit" }
              }
            }
          ]
        }
      }
    } as unknown as AuthoredSequenceDocument;

    const result = validateAuthoredDocument(document);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "INVALID_PLANE_ID",
        trackId: "left",
        segmentIndex: 0
      });
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
    expect(leftBoundaries[0].planeId).toBe("wall");
    expect(leftBoundaries[1].planeId).toBe("wall");
    expect(leftBoundaries[0].endPose).toEqual(expectedFirstEnd);
    expect(leftBoundaries[1].startPose).toEqual(expectedFirstEnd);
    expect(result.sequence.rigs[0].sequence.segments[1].hand.startPose).toEqual(
      expectedFirstEnd.handPose
    );
    expect(result.sequence.rigs[0].sequence.segments[1].head.startPose).toEqual(
      expectedFirstEnd.headPose
    );
    expect(result.sequence.rigs[0].sequence.segments[0].planeId).toBe("wall");
    expect(result.sequence.rigs[0].sequence.segments[1].planeId).toBe("wall");

    const prepared = prepareMultiRigSequence(result.sequence);
    expect(prepared.ok).toBe(true);
  });

  it("compiles radius profiles for either node and carries the evaluated end radius forward", () => {
    const document: AuthoredSequenceDocument = {
      name: "Radius profile",
      description: null,
      tracks: {
        left: {
          segments: [
            {
              kind: "first",
              durationUnits: 1,
              hand: {
                startPose: { phaseDeg: 0, radius: 1 },
                driver: {
                  kind: "circle",
                  omega: 0,
                  omegaUnit: "radians-per-unit",
                  radiusProfile: { kind: "time-keyed", keys: [{ t: 0.5, radius: 2 }] }
                }
              },
              head: {
                startPose: { phaseDeg: 0, radius: 1 },
                driver: {
                  kind: "circle",
                  omega: 0,
                  omegaUnit: "radians-per-unit",
                  radiusProfile: { kind: "time-keyed", keys: [{ t: 1, radius: 0.25 }] }
                }
              }
            },
            {
              kind: "continuation",
              durationUnits: 1,
              hand: {
                driver: { kind: "circle", omega: 0, omegaUnit: "radians-per-unit" }
              },
              head: {
                driver: { kind: "circle", omega: 0, omegaUnit: "radians-per-unit" }
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

    const firstBoundary = result.boundariesByTrack.left?.[0];
    const secondBoundary = result.boundariesByTrack.left?.[1];
    expect(firstBoundary?.endPose.handPose.radius).toBe(2);
    expect(firstBoundary?.endPose.headPose.radius).toBe(0.25);
    expect(secondBoundary?.startPose.handPose.radius).toBe(2);
    expect(secondBoundary?.startPose.headPose.radius).toBe(0.25);
    const handDriver = result.sequence.rigs[0].sequence.segments[0].hand.driver;
    expect(handDriver.kind).toBe("circle");
    if (handDriver.kind !== "circle") {
      throw new Error("expected compiled authored hand driver to be circle");
    }
    expect(handDriver.radiusProfile?.keys).toEqual([{ t: 0.5, radius: 2 }]);
  });

  it("rejects radius profile keys outside the segment duration", () => {
    const document: AuthoredSequenceDocument = {
      name: "Invalid profile",
      description: null,
      tracks: {
        left: {
          segments: [
            {
              kind: "first",
              durationUnits: 0.5,
              hand: {
                startPose: { phaseDeg: 0, radius: 1 },
                driver: {
                  kind: "circle",
                  omega: 0,
                  omegaUnit: "radians-per-unit",
                  radiusProfile: { kind: "time-keyed", keys: [{ t: 0.75, radius: 1 }] }
                }
              },
              head: {
                startPose: { phaseDeg: 0, radius: 1 },
                driver: { kind: "circle", omega: 0, omegaUnit: "radians-per-unit" }
              }
            }
          ]
        }
      }
    };

    const result = validateAuthoredDocument(document);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "INVALID_RADIUS_PROFILE",
        trackId: "left",
        segmentIndex: 0,
        node: "hand"
      });
    }
  });

  it("rejects negative start and profile radii", () => {
    const document: AuthoredSequenceDocument = {
      name: "Invalid radii",
      description: null,
      tracks: {
        left: {
          segments: [
            {
              kind: "first",
              durationUnits: 1,
              hand: {
                startPose: { phaseDeg: 0, radius: -1 },
                driver: { kind: "circle", omega: 0, omegaUnit: "radians-per-unit" }
              },
              head: {
                startPose: { phaseDeg: 0, radius: 1 },
                driver: {
                  kind: "circle",
                  omega: 0,
                  omegaUnit: "radians-per-unit",
                  radiusProfile: { kind: "time-keyed", keys: [{ t: 0.5, radius: -0.25 }] }
                }
              }
            }
          ]
        }
      }
    };

    const result = validateAuthoredDocument(document);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "INVALID_RADIUS",
        trackId: "left",
        segmentIndex: 0,
        node: "hand"
      });
      expect(result.errors).toContainEqual({
        code: "INVALID_RADIUS_PROFILE",
        trackId: "left",
        segmentIndex: 0,
        node: "head"
      });
    }
  });

  it("preserves authored plane ids in derived boundaries and compiled segments", () => {
    const document: AuthoredSequenceDocument = {
      name: "Planes",
      description: null,
      tracks: {
        left: {
          segments: [
            {
              kind: "first",
              durationUnits: 1,
              planeId: "wheel",
              hand: {
                startPose: { phaseDeg: 0, radius: 1 },
                driver: { kind: "circle", omega: 0, omegaUnit: "radians-per-unit" }
              },
              head: {
                startPose: { phaseDeg: 0, radius: 1 },
                driver: { kind: "circle", omega: 0, omegaUnit: "radians-per-unit" }
              }
            },
            {
              kind: "continuation",
              durationUnits: 1,
              planeId: "floor",
              hand: {
                driver: { kind: "circle", omega: 0, omegaUnit: "radians-per-unit" }
              },
              head: {
                driver: { kind: "circle", omega: 0, omegaUnit: "radians-per-unit" }
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

    expect(result.boundariesByTrack.left?.map((boundary) => boundary.planeId)).toEqual([
      "wheel",
      "floor"
    ]);
    expect(result.sequence.rigs[0].sequence.segments.map((segment) => segment.planeId)).toEqual([
      "wheel",
      "floor"
    ]);
  });

  it("allows wall to floor breaks at the shared X axis with a collinear head", () => {
    const result = compileAuthoredDocument(makePlaneBreakDocument("wall", "floor", 0, 180));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(`expected valid plane break, got ${JSON.stringify(result.errors)}`);
    }

    expect(result.boundariesByTrack.left?.[1].startPose.handPose.phaseAbs).toBeCloseTo(0, 12);
    expect(result.boundariesByTrack.left?.[1].startPose.headPose.phaseAbs).toBeCloseTo(Math.PI, 12);
  });

  it("rejects plane breaks when the hand is off the shared source-plane axis", () => {
    const result = compileAuthoredDocument(makePlaneBreakDocument("wall", "floor", 90, 90));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "PLANE_BREAK_INVALID_HAND_ALIGNMENT",
        trackId: "left",
        segmentIndex: 1,
        node: "hand"
      });
    }
  });

  it("rejects plane breaks when the head is perpendicular to the hand", () => {
    const result = compileAuthoredDocument(makePlaneBreakDocument("wall", "floor", 0, 90));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "PLANE_BREAK_INVALID_HEAD_ALIGNMENT",
        trackId: "left",
        segmentIndex: 1,
        node: "head"
      });
    }
  });

  it("allows wall to wheel breaks at the shared Y axis", () => {
    const result = compileAuthoredDocument(makePlaneBreakDocument("wall", "wheel", 90, 270));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(`expected valid plane break, got ${JSON.stringify(result.errors)}`);
    }
  });

  it("remaps wheel to floor breaks while preserving head phase relative to hand", () => {
    const result = compileAuthoredDocument(makePlaneBreakDocument("wheel", "floor", 0, 180));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(`expected valid plane break, got ${JSON.stringify(result.errors)}`);
    }

    const continuationBoundary = result.boundariesByTrack.left?.[1];
    expect(continuationBoundary?.startPose.handPose.phaseAbs).toBeCloseTo(Math.PI / 2, 12);
    expect(continuationBoundary?.startPose.headPose.phaseAbs).toBeCloseTo((3 * Math.PI) / 2, 12);
    expect(
      (continuationBoundary?.startPose.headPose.phaseAbs ?? 0) -
        (continuationBoundary?.startPose.handPose.phaseAbs ?? 0)
    ).toBeCloseTo(Math.PI, 12);
  });

  it("remaps floor to wheel breaks while preserving head phase relative to hand", () => {
    const result = compileAuthoredDocument(makePlaneBreakDocument("floor", "wheel", 90, 270));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(`expected valid plane break, got ${JSON.stringify(result.errors)}`);
    }

    const continuationBoundary = result.boundariesByTrack.left?.[1];
    expect(continuationBoundary?.startPose.handPose.phaseAbs).toBeCloseTo(0, 12);
    expect(continuationBoundary?.startPose.headPose.phaseAbs).toBeCloseTo(Math.PI, 12);
    expect(
      (continuationBoundary?.startPose.headPose.phaseAbs ?? 0) -
        (continuationBoundary?.startPose.handPose.phaseAbs ?? 0)
    ).toBeCloseTo(Math.PI, 12);
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

describe("authoredDocumentFromMultiRigSequence", () => {
  it("round-trips segment plane ids into authored segments", () => {
    const segment = makeStaticSegment();
    const sequence: MultiRigSequence = {
      rigs: [
        {
          rigId: "left",
          sequence: {
            segments: [
              { ...segment, durationUnits: 1, planeId: "wall" },
              { ...segment, durationUnits: 1, planeId: "floor" }
            ]
          }
        }
      ]
    };

    const document = authoredDocumentFromMultiRigSequence(sequence, {
      name: "Round trip",
      description: null
    });

    expect(
      document.tracks.left?.segments.map((authoredSegment) => authoredSegment.planeId)
    ).toEqual(["wall", "floor"]);
  });

  it("round-trips compiled remapped plane-break starts", () => {
    const compiled = compileAuthoredDocument(makePlaneBreakDocument("wheel", "floor", 0, 180));
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) {
      throw new Error(`expected valid plane break, got ${JSON.stringify(compiled.errors)}`);
    }

    const document = authoredDocumentFromMultiRigSequence(compiled.sequence, {
      name: "Compiled round trip",
      description: null
    });

    expect(
      document.tracks.left?.segments.map((authoredSegment) => authoredSegment.planeId)
    ).toEqual(["wheel", "floor"]);
  });

  it("defaults omitted segment plane ids to wall when converting to authored documents", () => {
    const segment = makeStaticSegment();
    const sequence: MultiRigSequence = {
      rigs: [
        {
          rigId: "left",
          sequence: { segments: [{ ...segment, durationUnits: 1 }] }
        }
      ]
    };

    const document = authoredDocumentFromMultiRigSequence(sequence, {
      name: "Round trip default",
      description: null
    });

    expect(document.tracks.left?.segments[0].planeId).toBe("wall");
  });

  it("fails explicitly when converting point-to-point engine segments to authored documents", () => {
    const sequence: MultiRigSequence = {
      rigs: [
        {
          rigId: "left",
          sequence: {
            segments: [
              {
                durationUnits: 1,
                hand: {
                  startPose: { phaseAbs: 0, radius: 1 },
                  driver: { kind: "point-to-point", endPose: { phaseAbs: Math.PI / 2, radius: 1 } }
                },
                head: {
                  startPose: { phaseAbs: 0, radius: 1 },
                  driver: { kind: "circle", omega: 0 }
                }
              }
            ]
          }
        }
      ]
    };

    expect(() =>
      authoredDocumentFromMultiRigSequence(sequence, {
        name: "Point-to-point",
        description: null
      })
    ).toThrow(/cannot be represented as an authored circle driver/);
  });
});
