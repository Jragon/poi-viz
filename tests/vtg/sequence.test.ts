import {
  classifySequenceTransitionGuidance,
  computeSequenceBoundariesBeats,
  createDefaultVTGSequence,
  deserializeVTGSequence,
  getArmPhaseEventSpacingBeats,
  normalizeSequenceEventSnap,
  resolveSequencePlayheadBeats,
  sanitizeVTGSequence,
  serializeVTGSequence,
  snapDurationToArmPhaseEvents,
  validateVTGSequence,
  VTG_SEQUENCE_SCHEMA,
  VTG_SEQUENCE_SCHEMA_VERSION,
  VTG_SEQUENCE_MIN_DURATION_BEATS,
  type VTGSequence
} from "@/vtg/sequence";
import { describe, expect, it } from "vitest";

function createTwoSegmentSequence(): VTGSequence {
  return {
    schema: VTG_SEQUENCE_SCHEMA,
    version: VTG_SEQUENCE_SCHEMA_VERSION,
    name: "Demo",
    loop: true,
    snapSetting: "none",
    guidanceMode: "strict",
    segments: [
      {
        id: "seg-a",
        durationBeats: 1,
        descriptor: {
          armElement: "Earth",
          poiElement: "Earth",
          phaseDeg: 0,
          poiHeadCyclesPerArmCycle: -3
        }
      },
      {
        id: "seg-b",
        durationBeats: 2,
        descriptor: {
          armElement: "Air",
          poiElement: "Water",
          phaseDeg: 90,
          poiHeadCyclesPerArmCycle: -1
        }
      }
    ]
  };
}

describe("VTG sequence domain", () => {
  it("sanitizes unknown input into schema defaults", () => {
    const sanitized = sanitizeVTGSequence({
      name: "",
      loop: "bad",
      snapSetting: "bad",
      guidanceMode: "bad",
      segments: [
        {
          id: "",
          durationBeats: -1,
          descriptor: {
            armElement: "bad",
            poiElement: "bad",
            phaseDeg: 42,
            poiHeadCyclesPerArmCycle: 0
          }
        }
      ]
    });

    expect(sanitized.schema).toBe(VTG_SEQUENCE_SCHEMA);
    expect(sanitized.version).toBe(VTG_SEQUENCE_SCHEMA_VERSION);
    expect(sanitized.name).toBe("Untitled Sequence");
    expect(sanitized.loop).toBe(true);
    expect(sanitized.snapSetting).toBe("event");
    expect(sanitized.guidanceMode).toBe("strict");
    expect(sanitized.segments[0]?.id).toBe("seg-1");
    expect(sanitized.segments[0]?.durationBeats).toBe(VTG_SEQUENCE_MIN_DURATION_BEATS);
    expect(sanitized.segments[0]?.descriptor).toEqual({
      armElement: "Earth",
      poiElement: "Earth",
      phaseDeg: 0,
      poiHeadCyclesPerArmCycle: -3
    });
  });

  it("validates schema invariants and duplicate ids", () => {
    const invalid = createDefaultVTGSequence();
    invalid.segments = [
      {
        id: "dup",
        durationBeats: 1,
        descriptor: {
          armElement: "Earth",
          poiElement: "Earth",
          phaseDeg: 0,
          poiHeadCyclesPerArmCycle: -3
        }
      },
      {
        id: "dup",
        durationBeats: 0,
        descriptor: {
          armElement: "Earth",
          poiElement: "Earth",
          phaseDeg: 0,
          poiHeadCyclesPerArmCycle: 0
        }
      }
    ];

    const result = validateVTGSequence(invalid);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.includes("unique"))).toBe(true);
    expect(result.errors.some((error) => error.includes("duration"))).toBe(true);
    expect(result.errors.some((error) => error.includes("non-zero"))).toBe(true);
  });

  it("computes segment boundaries and total beats", () => {
    const sequence = createTwoSegmentSequence();
    const boundaries = computeSequenceBoundariesBeats(sequence);

    expect(boundaries.startsBeats).toEqual([0, 1]);
    expect(boundaries.totalBeats).toBe(3);
  });

  it("maps playhead beat deterministically to active segment and local beat", () => {
    const sequence = createTwoSegmentSequence();

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

    // Deterministic repeat.
    expect(resolveSequencePlayheadBeats(sequence, 1.5)).toEqual(atSecondSegment);
  });

  it("applies snap normalization using arm-phase event spacing", () => {
    const spacing = getArmPhaseEventSpacingBeats();
    expect(spacing).toBeCloseTo(0.25, 12);

    const unsnapped = createTwoSegmentSequence();
    unsnapped.snapSetting = "event";
    unsnapped.segments[0] = {
      ...unsnapped.segments[0],
      durationBeats: 0.62
    };

    const normalized = normalizeSequenceEventSnap(unsnapped);
    expect(normalized.segments[0]?.durationBeats).toBeCloseTo(snapDurationToArmPhaseEvents(0.62), 12);

    const noSnap = createTwoSegmentSequence();
    noSnap.snapSetting = "none";
    noSnap.segments[0] = {
      ...noSnap.segments[0],
      durationBeats: 0.62
    };

    expect(normalizeSequenceEventSnap(noSnap).segments[0]?.durationBeats).toBeCloseTo(0.62, 12);
  });

  it("classifies transition guidance severity by mode", () => {
    const strictSequence = createTwoSegmentSequence();
    strictSequence.snapSetting = "none";
    strictSequence.guidanceMode = "strict";
    strictSequence.segments[0] = {
      ...strictSequence.segments[0],
      durationBeats: 0.3
    };

    const strictGuidance = classifySequenceTransitionGuidance(strictSequence)[0];
    expect(strictGuidance?.classification).toBe("non-canonical");
    expect(strictGuidance?.severity).toBe("error");

    const softSequence = {
      ...strictSequence,
      guidanceMode: "soft" as const
    };
    const softGuidance = classifySequenceTransitionGuidance(softSequence)[0];
    expect(softGuidance?.severity).toBe("warning");

    const freeformSequence = {
      ...strictSequence,
      guidanceMode: "freeform" as const
    };
    const freeformGuidance = classifySequenceTransitionGuidance(freeformSequence)[0];
    expect(freeformGuidance?.severity).toBe("none");

    const canonicalSequence = createTwoSegmentSequence();
    canonicalSequence.snapSetting = "none";
    canonicalSequence.segments[0] = {
      ...canonicalSequence.segments[0],
      durationBeats: 0.5
    };
    const canonicalGuidance = classifySequenceTransitionGuidance(canonicalSequence)[0];
    expect(canonicalGuidance?.classification).toBe("canonical");
    expect(canonicalGuidance?.severity).toBe("ok");
  });

  it("serializes and deserializes sequence JSON with version checks", () => {
    const sequence = createTwoSegmentSequence();
    const serialized = serializeVTGSequence(sequence);

    const parsed = deserializeVTGSequence(serialized);
    expect(parsed.error).toBeNull();
    expect(parsed.sequence?.name).toBe("Demo");

    const badVersion = JSON.stringify({
      ...JSON.parse(serialized),
      version: VTG_SEQUENCE_SCHEMA_VERSION + 1
    });
    const rejected = deserializeVTGSequence(badVersion);

    expect(rejected.sequence).toBeNull();
    expect(rejected.error).toContain("Unsupported sequence version");
  });
});
