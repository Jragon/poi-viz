import continuityScenario from "@/vtg/thing.json";
import {
  computeSequenceBoundariesBeats,
  createDefaultVTGSequence,
  deriveSequenceSegmentSpeedProfile,
  deserializeVTGSequence,
  detectPoiDirectionViolations,
  getArmPhaseEventSpacingBeats,
  normalizeSequenceEventSnap,
  resolveSequenceContinuity,
  resolveSequenceContinuityAtBeat,
  resolveSequencePlayheadBeats,
  sanitizeVTGSequence,
  serializeVTGSequence,
  snapDurationToArmPhaseEvents,
  validateVTGSequence,
  VTG_SEQUENCE_MIN_DURATION_BEATS,
  type VTGSequence
} from "@/vtg/sequence";
import { describe, expect, it } from "vitest";

const EPSILON = 1e-9;

function createTwoSegmentSequence(): VTGSequence {
  return {
    name: "Demo",
    loop: true,
    snapSetting: "none",
    startPhaseDeg: 90,
    allowPoiDirectionFlip: false,
    segments: [
      {
        id: "seg-a",
        durationBeats: 1,
        descriptor: {
          armElement: "Earth",
          poiElement: "Earth",
          poiHeadCyclesPerArmCycle: -3,
          rightArmSign: 1
        }
      },
      {
        id: "seg-b",
        durationBeats: 2,
        descriptor: {
          armElement: "Air",
          poiElement: "Water",
          poiHeadCyclesPerArmCycle: -1,
          rightArmSign: 1
        }
      }
    ]
  };
}

function angleAt(start: number, speed: number, localBeat: number): number {
  return start + speed * localBeat;
}

describe("VTG sequence domain", () => {
  it("sanitizes unknown input into defaults", () => {
    const sanitized = sanitizeVTGSequence({
      name: "",
      loop: "bad",
      snapSetting: "bad",
      startPhaseDeg: 42,
      allowPoiDirectionFlip: "bad",
      segments: [
        {
          id: "",
          durationBeats: -1,
          descriptor: {
            armElement: "bad",
            poiElement: "bad",
            poiHeadCyclesPerArmCycle: 0,
            rightArmSign: 0
          }
        }
      ]
    });

    expect(sanitized.name).toBe("Untitled Sequence");
    expect(sanitized.loop).toBe(true);
    expect(sanitized.snapSetting).toBe("event");
    expect(sanitized.startPhaseDeg).toBe(0);
    expect(sanitized.allowPoiDirectionFlip).toBe(false);
    expect(sanitized.segments[0]?.id).toBe("seg-1");
    expect(sanitized.segments[0]?.durationBeats).toBe(VTG_SEQUENCE_MIN_DURATION_BEATS);
    expect(sanitized.segments[0]?.descriptor).toEqual({
      armElement: "Earth",
      poiElement: "Earth",
      poiHeadCyclesPerArmCycle: -3,
      rightArmSign: 1
    });
  });

  it("validates duplicate ids, phase bucket, arm sign, and descriptor constraints", () => {
    const invalid = createDefaultVTGSequence();
    invalid.startPhaseDeg = 45 as 0;
    invalid.segments = [
      {
        id: "dup",
        durationBeats: 1,
        descriptor: {
          armElement: "Earth",
          poiElement: "Earth",
          poiHeadCyclesPerArmCycle: -3,
          rightArmSign: 1
        }
      },
      {
        id: "dup",
        durationBeats: 0,
        descriptor: {
          armElement: "Earth",
          poiElement: "Earth",
          poiHeadCyclesPerArmCycle: 0,
          rightArmSign: 0 as 1
        }
      }
    ];

    const result = validateVTGSequence(invalid);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.includes("startPhaseDeg"))).toBe(true);
    expect(result.errors.some((error) => error.includes("unique"))).toBe(true);
    expect(result.errors.some((error) => error.includes("duration"))).toBe(true);
    expect(result.errors.some((error) => error.includes("non-zero"))).toBe(true);
    expect(result.errors.some((error) => error.includes("rightArmSign"))).toBe(true);
  });

  it("computes segment boundaries and deterministic playhead mapping", () => {
    const sequence = createTwoSegmentSequence();
    const boundaries = computeSequenceBoundariesBeats(sequence);

    expect(boundaries.startsBeats).toEqual([0, 1]);
    expect(boundaries.totalBeats).toBe(3);

    const atHalf = resolveSequencePlayheadBeats(sequence, 0.5);
    const atSecondSegment = resolveSequencePlayheadBeats(sequence, 1.5);
    const wrapped = resolveSequencePlayheadBeats(sequence, 3.25);

    expect(atHalf).toEqual({
      sequenceBeat: 0.5,
      segmentIndex: 0,
      segmentId: "seg-a",
      localBeat: 0.5,
      totalBeats: 3
    });
    expect(atSecondSegment).toEqual({
      sequenceBeat: 1.5,
      segmentIndex: 1,
      segmentId: "seg-b",
      localBeat: 0.5,
      totalBeats: 3
    });
    expect(wrapped).toEqual({
      sequenceBeat: 0.25,
      segmentIndex: 0,
      segmentId: "seg-a",
      localBeat: 0.25,
      totalBeats: 3
    });
    expect(resolveSequencePlayheadBeats(sequence, 1.5)).toEqual(atSecondSegment);
  });

  it("applies optional event snap normalization", () => {
    const spacing = getArmPhaseEventSpacingBeats();
    expect(spacing).toBeCloseTo(0.25, 12);

    const snapped = createTwoSegmentSequence();
    snapped.snapSetting = "event";
    snapped.segments[0] = {
      ...snapped.segments[0],
      durationBeats: 0.62
    };

    expect(normalizeSequenceEventSnap(snapped).segments[0]?.durationBeats).toBeCloseTo(snapDurationToArmPhaseEvents(0.62), 12);

    const unsnapped = createTwoSegmentSequence();
    unsnapped.snapSetting = "none";
    unsnapped.segments[0] = {
      ...unsnapped.segments[0],
      durationBeats: 0.62
    };

    expect(normalizeSequenceEventSnap(unsnapped).segments[0]?.durationBeats).toBeCloseTo(0.62, 12);
  });

  it("propagates segment starts from previous segment end without boundary jumps", () => {
    const sequence: VTGSequence = {
      name: "No Jump",
      loop: false,
      snapSetting: "none",
      startPhaseDeg: 180,
      allowPoiDirectionFlip: false,
      segments: [
        {
          id: "seg-1",
          durationBeats: 0.75,
          descriptor: {
            armElement: "Earth",
            poiElement: "Earth",
            poiHeadCyclesPerArmCycle: -3,
            rightArmSign: 1
          }
        },
        {
          id: "seg-2",
          durationBeats: 0.5,
          descriptor: {
            armElement: "Air",
            poiElement: "Fire",
            poiHeadCyclesPerArmCycle: -1,
            rightArmSign: -1
          }
        }
      ]
    };

    const continuity = resolveSequenceContinuity(sequence);
    const first = continuity.segments[0];
    const second = continuity.segments[1];

    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (!first || !second) {
      return;
    }

    expect(second.startAngles.rightArmRadians).toBeCloseTo(
      angleAt(first.startAngles.rightArmRadians, first.speedProfile.rightArmSpeedRadiansPerBeat, first.durationBeats),
      10
    );
    expect(second.startAngles.leftArmRadians).toBeCloseTo(
      angleAt(first.startAngles.leftArmRadians, first.speedProfile.leftArmSpeedRadiansPerBeat, first.durationBeats),
      10
    );
    expect(second.startAngles.rightHeadRadians).toBeCloseTo(
      angleAt(first.startAngles.rightHeadRadians, first.speedProfile.rightHeadSpeedRadiansPerBeat, first.durationBeats),
      10
    );
    expect(second.startAngles.leftHeadRadians).toBeCloseTo(
      angleAt(first.startAngles.leftHeadRadians, first.speedProfile.leftHeadSpeedRadiansPerBeat, first.durationBeats),
      10
    );

    const atBoundary = resolveSequenceContinuityAtBeat(sequence, first.durationBeats);
    expect(atBoundary?.segmentIndex).toBe(1);
    expect(atBoundary?.localBeat).toBeCloseTo(0, 10);
  });

  it("preserves final non-loop pose at clamped end beat", () => {
    const sequence = createTwoSegmentSequence();
    sequence.loop = false;

    const continuity = resolveSequenceContinuity(sequence);
    const totalBeats = continuity.totalBeats;
    const last = continuity.segments.at(-1);
    const atEnd = resolveSequenceContinuityAtBeat(sequence, totalBeats);

    expect(last).toBeDefined();
    expect(atEnd).toBeDefined();
    if (!last || !atEnd) {
      return;
    }

    expect(atEnd.segmentIndex).toBe(last.segmentIndex);
    expect(atEnd.localBeat).toBeCloseTo(last.durationBeats, 10);
  });

  it("resets to anchored start pose at loop seam", () => {
    const sequence: VTGSequence = {
      name: "Loop Reset",
      loop: true,
      snapSetting: "none",
      startPhaseDeg: 0,
      allowPoiDirectionFlip: false,
      segments: [
        {
          id: "seg-1",
          durationBeats: 0.5,
          descriptor: {
            armElement: "Earth",
            poiElement: "Earth",
            poiHeadCyclesPerArmCycle: -3,
            rightArmSign: 1
          }
        },
        {
          id: "seg-2",
          durationBeats: 0.75,
          descriptor: {
            armElement: "Air",
            poiElement: "Fire",
            poiHeadCyclesPerArmCycle: 2,
            rightArmSign: -1
          }
        }
      ]
    };

    const continuity = resolveSequenceContinuity(sequence);
    const last = continuity.segments[1];
    const anchored = continuity.anchoredStartAngles;

    expect(last).toBeDefined();
    expect(anchored).toBeDefined();
    if (!last || !anchored) {
      return;
    }

    const lastEndRightArm = angleAt(last.startAngles.rightArmRadians, last.speedProfile.rightArmSpeedRadiansPerBeat, last.durationBeats);
    expect(Math.abs(lastEndRightArm - anchored.rightArmRadians)).toBeGreaterThan(EPSILON);

    const atLoopStart = resolveSequenceContinuityAtBeat(sequence, 0);
    const atLoopSeam = resolveSequenceContinuityAtBeat(sequence, continuity.totalBeats);

    expect(atLoopStart).toBeDefined();
    expect(atLoopSeam).toBeDefined();
    if (!atLoopStart || !atLoopSeam) {
      return;
    }

    expect(atLoopSeam.segmentIndex).toBe(0);
    expect(atLoopSeam.localBeat).toBeCloseTo(0, 10);
    expect(atLoopSeam.segment.startAngles.rightArmRadians).toBeCloseTo(anchored.rightArmRadians, 10);
    expect(atLoopSeam.segment.startAngles.leftArmRadians).toBeCloseTo(anchored.leftArmRadians, 10);
    expect(atLoopSeam.segment.startAngles.rightHeadRadians).toBeCloseTo(anchored.rightHeadRadians, 10);
    expect(atLoopSeam.segment.startAngles.leftHeadRadians).toBeCloseTo(anchored.leftHeadRadians, 10);
  });

  it("uses rightArmSign to branch arm-direction profiles deterministically", () => {
    const positive = deriveSequenceSegmentSpeedProfile({
      armElement: "Earth",
      poiElement: "Earth",
      poiHeadCyclesPerArmCycle: -3,
      rightArmSign: 1
    });
    const negative = deriveSequenceSegmentSpeedProfile({
      armElement: "Earth",
      poiElement: "Earth",
      poiHeadCyclesPerArmCycle: -3,
      rightArmSign: -1
    });

    expect(positive.rightArmSpeedRadiansPerBeat).toBeGreaterThan(0);
    expect(positive.leftArmSpeedRadiansPerBeat).toBeGreaterThan(0);
    expect(negative.rightArmSpeedRadiansPerBeat).toBeLessThan(0);
    expect(negative.leftArmSpeedRadiansPerBeat).toBeLessThan(0);
    expect(Math.sign(positive.rightHeadSpeedRadiansPerBeat)).toBe(-Math.sign(negative.rightHeadSpeedRadiansPerBeat));
  });

  it("enforces no poi direction flips when allowPoiDirectionFlip is false", () => {
    const sequence: VTGSequence = {
      name: "No Poi Flip",
      loop: true,
      snapSetting: "none",
      startPhaseDeg: 0,
      allowPoiDirectionFlip: false,
      segments: [
        {
          id: "seg-1",
          durationBeats: 1,
          descriptor: {
            armElement: "Earth",
            poiElement: "Earth",
            poiHeadCyclesPerArmCycle: -3,
            rightArmSign: 1
          }
        },
        {
          id: "seg-2",
          durationBeats: 1,
          descriptor: {
            armElement: "Earth",
            poiElement: "Earth",
            poiHeadCyclesPerArmCycle: 3,
            rightArmSign: 1
          }
        }
      ]
    };

    const violations = detectPoiDirectionViolations(sequence);
    expect(violations).toHaveLength(1);
    expect(violations[0]?.segmentId).toBe("seg-2");

    const continuity = resolveSequenceContinuity(sequence);
    const second = continuity.segments[1];
    expect(second?.poiDirectionFlipBlocked).toBe(true);
    expect(second?.authoredDescriptor.poiHeadCyclesPerArmCycle).toBe(3);
    expect(second?.descriptor.poiHeadCyclesPerArmCycle).toBe(-3);

    const firstHeadSign = Math.sign(continuity.segments[0]?.speedProfile.rightHeadSpeedRadiansPerBeat ?? 0);
    const secondHeadSign = Math.sign(second?.speedProfile.rightHeadSpeedRadiansPerBeat ?? 0);
    expect(firstHeadSign).toBe(secondHeadSign);
  });

  it("allows authored poi direction flips when allowPoiDirectionFlip is true", () => {
    const sequence = createTwoSegmentSequence();
    sequence.allowPoiDirectionFlip = true;
    sequence.segments[1] = {
      ...sequence.segments[1],
      descriptor: {
        ...sequence.segments[1].descriptor,
        poiHeadCyclesPerArmCycle: 3
      }
    };

    expect(detectPoiDirectionViolations(sequence)).toEqual([]);

    const continuity = resolveSequenceContinuity(sequence);
    const second = continuity.segments[1];

    expect(second?.poiDirectionFlipBlocked).toBe(false);
    expect(second?.descriptor.poiHeadCyclesPerArmCycle).toBe(3);
  });

  it("resolves continuity deterministically for identical inputs", () => {
    const sequence = createTwoSegmentSequence();

    const continuityA = resolveSequenceContinuity(sequence);
    const continuityB = resolveSequenceContinuity(sequence);
    expect(continuityA).toEqual(continuityB);

    const atBeatA = resolveSequenceContinuityAtBeat(sequence, 1.375);
    const atBeatB = resolveSequenceContinuityAtBeat(sequence, 1.375);
    expect(atBeatA).toEqual(atBeatB);
  });

  it("serializes/deserializes new shape and rejects legacy payloads", () => {
    const sequence = createTwoSegmentSequence();
    const serialized = serializeVTGSequence(sequence);
    const parsed = deserializeVTGSequence(serialized);

    expect(parsed.error).toBeNull();
    expect(parsed.sequence).toEqual(sequence);

    const legacyPayload = JSON.stringify({
      schema: "poi-vtg-sequence",
      version: 1,
      guidanceMode: "strict",
      name: "Legacy",
      loop: true,
      snapSetting: "event",
      segments: []
    });
    const rejected = deserializeVTGSequence(legacyPayload);

    expect(rejected.sequence).toBeNull();
    expect(rejected.error).toContain("Legacy sequence payload is unsupported.");
  });

  it("uses thing.json continuity scenario without per-segment restart", () => {
    const scenario = sanitizeVTGSequence(continuityScenario);
    const continuity = resolveSequenceContinuity(scenario);

    const first = continuity.segments[0];
    const second = continuity.segments[1];
    const anchored = continuity.anchoredStartAngles;

    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(anchored).toBeDefined();
    if (!first || !second || !anchored) {
      return;
    }

    expect(second.startAngles.rightArmRadians).toBeCloseTo(
      angleAt(first.startAngles.rightArmRadians, first.speedProfile.rightArmSpeedRadiansPerBeat, first.durationBeats),
      10
    );
    expect(second.startAngles.rightArmRadians).not.toBeCloseTo(anchored.rightArmRadians, 10);
  });
});
