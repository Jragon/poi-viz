import { evalSegment } from "@/engine/engine";
import {
  evalPreparedSequenceAt,
  prepareSequence,
  validateSequenceStructure
} from "@/engine/sequence";
import type { Segment, SequenceSpec } from "@/engine/types";
import { describe, expect, it } from "vitest";

function makeSegment(handOmega: number, headOmega: number): Segment {
  return {
    durationUnits: 1,
    hand: {
      startPose: { phaseAbs: 0, radius: 1 },
      driver: { kind: "circle", omega: handOmega }
    },
    head: {
      startPose: { phaseAbs: 0, radius: 2 },
      driver: { kind: "circle", omega: headOmega }
    }
  };
}

describe("validateSequenceStructure", () => {
  const base = makeSegment(1, 2);
  it("accepts a valid contiguous sequence", () => {
    const seq: SequenceSpec = {
      segments: [
        { ...base, durationUnits: 2 },
        { ...base, durationUnits: 3 }
      ]
    };
    const result = validateSequenceStructure(seq);
    if (!result.ok) {
      throw new Error(`expected valid sequence, got errors: ${JSON.stringify(result.errors)}`);
    }
  });

  it("returns structural errors instead of throwing for malformed input", () => {
    expect(validateSequenceStructure(null)).toEqual({
      ok: false,
      errors: [{ code: "EXPECTED_SEQUENCE", path: [] }]
    });
    expect(validateSequenceStructure({})).toEqual({
      ok: false,
      errors: [{ code: "EXPECTED_SEGMENTS_ARRAY", path: ["segments"] }]
    });
    expect(validateSequenceStructure({ segments: [[]] })).toEqual({
      ok: false,
      errors: [{ code: "EXPECTED_SEGMENT", index: 0, path: ["segments", 0] }]
    });

    const malformed = {
      segments: [
        {
          durationUnits: 1,
          head: base.head
        },
        {
          ...base,
          hand: {
            driver: { kind: "circle", omega: 0 }
          }
        },
        {
          ...base,
          hand: {
            ...base.hand,
            driver: {
              kind: "circle",
              omega: 0,
              radiusProfile: { kind: "time-keyed", keys: {} }
            }
          }
        }
      ]
    };

    const result = validateSequenceStructure(malformed);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "EXPECTED_NODE_MOTION",
        index: 0,
        node: "hand",
        path: ["segments", 0, "hand"]
      });
      expect(result.errors).toContainEqual({
        code: "EXPECTED_POSE",
        index: 1,
        node: "hand",
        path: ["segments", 1, "hand", "startPose"]
      });
      expect(result.errors).toContainEqual({
        code: "INVALID_RADIUS_PROFILE",
        index: 2,
        node: "hand",
        path: ["segments", 2, "hand", "driver", "radiusProfile"]
      });
    }
  });

  it("rejects invalid built-in pose and driver values", () => {
    const sequence = {
      segments: [
        {
          ...base,
          hand: {
            startPose: { phaseAbs: Number.NaN, radius: -1 },
            driver: { kind: "circle", omega: Number.POSITIVE_INFINITY }
          },
          head: {
            startPose: { phaseAbs: 0, radius: Number.NEGATIVE_INFINITY },
            driver: {
              kind: "point-to-point",
              endPose: { phaseAbs: Number.POSITIVE_INFINITY, radius: -2 }
            }
          }
        }
      ]
    };

    const result = validateSequenceStructure(sequence);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ code: "NON_FINITE_PHASE", index: 0, node: "hand" });
      expect(result.errors).toContainEqual({ code: "NEGATIVE_RADIUS", index: 0, node: "hand" });
      expect(result.errors).toContainEqual({ code: "NON_FINITE_OMEGA", index: 0, node: "hand" });
      expect(result.errors).toContainEqual({ code: "NON_FINITE_RADIUS", index: 0, node: "head" });
      expect(result.errors).toContainEqual({
        code: "DRIVER_UNSUPPORTED_FOR_NODE",
        index: 0,
        node: "head"
      });
      expect(result.errors).toContainEqual({ code: "NON_FINITE_PHASE", index: 0, node: "head" });
      expect(result.errors).toContainEqual({ code: "NEGATIVE_RADIUS", index: 0, node: "head" });
    }
  });

  it("reports independent circle driver errors together", () => {
    const result = validateSequenceStructure({
      segments: [
        {
          ...base,
          hand: {
            ...base.hand,
            driver: {
              kind: "circle",
              omega: Number.NaN,
              radiusProfile: { kind: "time-keyed", keys: {} }
            }
          }
        }
      ]
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ code: "NON_FINITE_OMEGA", index: 0, node: "hand" });
      expect(result.errors).toContainEqual({
        code: "INVALID_RADIUS_PROFILE",
        index: 0,
        node: "hand",
        path: ["segments", 0, "hand", "driver", "radiusProfile"]
      });
    }
  });

  it("accepts pendulum drivers on hand and head in wall and wheel planes", () => {
    for (const planeId of ["wall", "wheel"] as const) {
      const driver = {
        kind: "pendulum" as const,
        amplitudeRad: Math.PI / 2,
        cyclesPerUnit: 0.5,
        swingPhaseRad: 0
      };
      expect(
        validateSequenceStructure({
          segments: [
            {
              ...base,
              planeId,
              hand: { ...base.hand, driver },
              head: { startPose: { phaseAbs: -Math.PI / 2, radius: 2 }, driver }
            }
          ]
        })
      ).toEqual({ ok: true });
    }
  });

  it("rejects pendulum drivers in the floor plane", () => {
    const driver = {
      kind: "pendulum" as const,
      amplitudeRad: Math.PI / 2,
      cyclesPerUnit: 0.5,
      swingPhaseRad: 0
    };
    const result = validateSequenceStructure({
      segments: [
        {
          ...base,
          planeId: "floor",
          hand: { ...base.hand, driver },
          head: { startPose: { phaseAbs: -Math.PI / 2, radius: 2 }, driver }
        }
      ]
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "PENDULUM_UNSUPPORTED_PLANE",
        index: 0,
        node: "hand"
      });
      expect(result.errors).toContainEqual({
        code: "PENDULUM_UNSUPPORTED_PLANE",
        index: 0,
        node: "head"
      });
    }
  });

  it("requires poi-head pendulums to be centred on local down", () => {
    const result = validateSequenceStructure({
      segments: [
        {
          ...base,
          head: {
            startPose: { phaseAbs: 0, radius: 2 },
            driver: {
              kind: "pendulum",
              amplitudeRad: Math.PI / 2,
              cyclesPerUnit: 0.5,
              swingPhaseRad: 0
            }
          }
        }
      ]
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "PENDULUM_HEAD_CENTER_NOT_DOWN",
        index: 0,
        node: "head"
      });
    }
  });

  it("rejects invalid pendulum parameters without fixing them", () => {
    const result = validateSequenceStructure({
      segments: [
        {
          ...base,
          hand: {
            ...base.hand,
            driver: {
              kind: "pendulum",
              amplitudeRad: 0,
              cyclesPerUnit: Number.NaN,
              swingPhaseRad: Number.POSITIVE_INFINITY
            }
          },
          head: {
            ...base.head,
            driver: {
              kind: "pendulum",
              amplitudeRad: Math.PI,
              cyclesPerUnit: -1,
              swingPhaseRad: 0
            }
          }
        }
      ]
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "PENDULUM_AMPLITUDE_OUT_OF_RANGE",
        index: 0,
        node: "hand"
      });
      expect(result.errors).toContainEqual({
        code: "NON_FINITE_PENDULUM_CYCLES",
        index: 0,
        node: "hand"
      });
      expect(result.errors).toContainEqual({
        code: "NON_FINITE_PENDULUM_SWING_PHASE",
        index: 0,
        node: "hand"
      });
      expect(result.errors).toContainEqual({
        code: "PENDULUM_AMPLITUDE_OUT_OF_RANGE",
        index: 0,
        node: "head"
      });
      expect(result.errors).toContainEqual({
        code: "NON_POSITIVE_PENDULUM_CYCLES",
        index: 0,
        node: "head"
      });
    }
  });

  it("validates radius-profile key domains without fixing them", () => {
    const sequence = {
      segments: [
        {
          ...base,
          durationUnits: 2,
          hand: {
            ...base.hand,
            driver: {
              kind: "circle",
              omega: 0,
              radiusProfile: {
                kind: "time-keyed",
                keys: [
                  { t: 0, radius: 1 },
                  { t: 1, radius: -1 },
                  { t: 1, radius: 2 },
                  { t: 3, radius: Number.NaN }
                ]
              }
            }
          }
        }
      ]
    };

    const result = validateSequenceStructure(sequence);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "PROFILE_TIME_OUT_OF_RANGE",
        index: 0,
        node: "hand",
        keyIndex: 0
      });
      expect(result.errors).toContainEqual({
        code: "NEGATIVE_PROFILE_RADIUS",
        index: 0,
        node: "hand",
        keyIndex: 1
      });
      expect(result.errors).toContainEqual({
        code: "NON_INCREASING_PROFILE_TIME",
        index: 0,
        node: "hand",
        keyIndex: 2
      });
      expect(result.errors).toContainEqual({
        code: "PROFILE_TIME_OUT_OF_RANGE",
        index: 0,
        node: "hand",
        keyIndex: 3
      });
      expect(result.errors).toContainEqual({
        code: "NON_FINITE_PROFILE_RADIUS",
        index: 0,
        node: "hand",
        keyIndex: 3
      });
    }
  });

  it("accepts empty profiles and a final key exactly at duration", () => {
    const sequence: SequenceSpec = {
      segments: [
        {
          ...base,
          durationUnits: 2,
          hand: {
            ...base.hand,
            driver: {
              kind: "circle",
              omega: 0,
              radiusProfile: { kind: "time-keyed", keys: [] }
            }
          },
          head: {
            ...base.head,
            driver: {
              kind: "circle",
              omega: 0,
              radiusProfile: { kind: "time-keyed", keys: [{ t: 2, radius: 0 }] }
            }
          }
        }
      ]
    };

    expect(validateSequenceStructure(sequence)).toEqual({ ok: true });
  });

  it("rejects non-boolean behind-body metadata", () => {
    const result = validateSequenceStructure({
      segments: [{ ...base, behindBody: "yes" }]
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ code: "INVALID_BEHIND_BODY", index: 0 });
    }
  });

  it("ignores unknown properties on otherwise valid engine input", () => {
    expect(
      validateSequenceStructure({
        extraRootMetadata: true,
        segments: [{ ...base, extraSegmentMetadata: "lab" }]
      })
    ).toEqual({ ok: true });
  });

  it("rejects circle phase ranges that overflow", () => {
    const result = validateSequenceStructure({
      segments: [
        {
          ...base,
          durationUnits: 2,
          hand: {
            ...base.hand,
            driver: { kind: "circle", omega: Number.MAX_VALUE }
          }
        }
      ]
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "CIRCLE_PHASE_RANGE_OVERFLOW",
        index: 0,
        node: "hand"
      });
    }
  });

  it("rejects non-finite and non-advancing derived intervals", () => {
    const overflow = validateSequenceStructure({
      segments: [
        { ...base, durationUnits: Number.MAX_VALUE },
        { ...base, durationUnits: Number.MAX_VALUE }
      ]
    });
    expect(overflow.ok).toBe(false);
    if (!overflow.ok) {
      expect(overflow.errors).toContainEqual({ code: "NON_FINITE_TOTAL_DURATION", index: 1 });
    }

    const absorbed = validateSequenceStructure({
      segments: [
        { ...base, durationUnits: Number.MAX_VALUE },
        { ...base, durationUnits: 1 }
      ]
    });
    expect(absorbed.ok).toBe(false);
    if (!absorbed.ok) {
      expect(absorbed.errors).toContainEqual({ code: "NON_ADVANCING_INTERVAL", index: 1 });
    }
  });
  it("rejects empty sequence", () => {
    const seq: SequenceSpec = { segments: [] };
    const result = validateSequenceStructure(seq);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ code: "EMPTY_SEQUENCE" });
    }
  });
  it("rejects non-positive durations", () => {
    const seq: SequenceSpec = {
      segments: [
        { ...base, durationUnits: 0 },
        { ...base, durationUnits: -1 }
      ]
    };
    const result = validateSequenceStructure(seq);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ code: "NON_POSITIVE_DURATION", index: 0 });
      expect(result.errors).toContainEqual({ code: "NON_POSITIVE_DURATION", index: 1 });
    }
  });
  it("rejects non-finite durations", () => {
    const seq: SequenceSpec = {
      segments: [
        { ...base, durationUnits: Number.POSITIVE_INFINITY },
        { ...base, durationUnits: Number.NaN }
      ]
    };
    const result = validateSequenceStructure(seq);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ code: "INVALID_DURATION_UNITS", index: 0 });
      expect(result.errors).toContainEqual({ code: "INVALID_DURATION_UNITS", index: 1 });
    }
  });
  it("reports errors in stable index order", () => {
    const seq: SequenceSpec = {
      segments: [
        { ...base, durationUnits: Number.NaN },
        { ...base, durationUnits: 0 },
        { ...base, durationUnits: Number.POSITIVE_INFINITY },
        { ...base, durationUnits: -10 }
      ]
    };
    const result = validateSequenceStructure(seq);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([
        { code: "INVALID_DURATION_UNITS", index: 0 },
        { code: "NON_POSITIVE_DURATION", index: 1 },
        { code: "INVALID_DURATION_UNITS", index: 2 },
        { code: "NON_POSITIVE_DURATION", index: 3 }
      ]);
    }
  });
  it("rejects invalid segment plane ids", () => {
    const seq = {
      segments: [{ ...base, durationUnits: 1, planeId: "diagonal" }]
    } as unknown as SequenceSpec;
    const result = validateSequenceStructure(seq);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ code: "INVALID_PLANE_ID", index: 0 });
    }
  });
  it("accepts valid segment plane sides", () => {
    const seq: SequenceSpec = {
      segments: [
        { ...base, durationUnits: 1, planeSide: "a" },
        { ...base, durationUnits: 1, planeSide: "b" },
        { ...base, durationUnits: 1 }
      ]
    };

    const result = validateSequenceStructure(seq);
    expect(result.ok).toBe(true);
  });
  it("rejects invalid segment plane sides", () => {
    const seq = {
      segments: [{ ...base, durationUnits: 1, planeSide: "front" }]
    } as unknown as SequenceSpec;
    const result = validateSequenceStructure(seq);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ code: "INVALID_PLANE_SIDE", index: 0 });
    }
  });
  it("rejects point-to-point drivers on head nodes from imported data", () => {
    const seq = {
      segments: [
        {
          ...base,
          head: {
            ...base.head,
            driver: { kind: "point-to-point", endPose: { phaseAbs: 0, radius: 1 } }
          }
        }
      ]
    } as unknown as SequenceSpec;

    const result = validateSequenceStructure(seq);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "DRIVER_UNSUPPORTED_FOR_NODE",
        index: 0,
        node: "head"
      });
    }
  });
  it("accepts runtime drivers on hand and head nodes", () => {
    const seq: SequenceSpec = {
      segments: [
        {
          ...base,
          hand: {
            ...base.hand,
            driver: {
              kind: "runtime",
              label: "runtime hand",
              evalPose: (startPose) => startPose
            }
          },
          head: {
            ...base.head,
            driver: {
              kind: "runtime",
              label: "runtime head",
              evalPose: (startPose) => startPose
            }
          }
        }
      ]
    };

    const result = validateSequenceStructure(seq);

    expect(result.ok).toBe(true);
  });
  it("rejects malformed runtime drivers from imported data", () => {
    const seq = {
      segments: [
        {
          ...base,
          hand: {
            ...base.hand,
            driver: {
              kind: "runtime",
              label: "missing eval"
            }
          },
          head: {
            ...base.head,
            driver: {
              kind: "runtime",
              evalPose: (startPose: unknown) => startPose
            }
          }
        }
      ]
    } as unknown as SequenceSpec;

    const result = validateSequenceStructure(seq);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ code: "INVALID_DRIVER", index: 0, node: "hand" });
      expect(result.errors).toContainEqual({ code: "INVALID_DRIVER", index: 0, node: "head" });
    }
  });
  it("rejects unknown driver kinds from imported data", () => {
    const seq = {
      segments: [
        {
          ...base,
          hand: {
            ...base.hand,
            driver: {
              kind: "teleport"
            }
          }
        }
      ]
    } as unknown as SequenceSpec;

    const result = validateSequenceStructure(seq);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({ code: "INVALID_DRIVER", index: 0, node: "hand" });
    }
  });
  it("reports invalid plane side errors in stable segment order", () => {
    const seq = {
      segments: [
        { ...base, durationUnits: 1, planeSide: "front" },
        { ...base, durationUnits: 1, planeId: "diagonal", planeSide: "back" }
      ]
    } as unknown as SequenceSpec;
    const result = validateSequenceStructure(seq);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([
        { code: "INVALID_PLANE_SIDE", index: 0 },
        { code: "INVALID_PLANE_ID", index: 1 },
        { code: "INVALID_PLANE_SIDE", index: 1 }
      ]);
    }
  });
});
describe("prepareSequence", () => {
  const segA = makeSegment(1, 2);
  const segB = makeSegment(10, 20);
  it("returns validation errors for invalid sequence", () => {
    const seq: SequenceSpec = {
      segments: [{ ...segA, durationUnits: 0 }]
    };
    const prepared = prepareSequence(seq);
    expect(prepared.ok).toBe(false);
    if (!prepared.ok) {
      expect(prepared.errors).toContainEqual({ code: "NON_POSITIVE_DURATION", index: 0 });
    }
  });
  it("returns prepared sequence for valid input", () => {
    const seq: SequenceSpec = {
      segments: [
        { ...segA, durationUnits: 2 },
        { ...segB, durationUnits: 3 }
      ]
    };
    const prepared = prepareSequence(seq);
    expect(prepared.ok).toBe(true);
    if (prepared.ok) {
      expect(prepared.prepared.totalDuration).toBe(5);
      expect(prepared.prepared.segments.length).toBe(2);
    }
  });
  it("defaults omitted segment planes to wall", () => {
    const seq: SequenceSpec = {
      segments: [{ ...segA, durationUnits: 2 }]
    };
    const prepared = prepareSequence(seq);
    expect(prepared.ok).toBe(true);
    if (prepared.ok) {
      expect(prepared.prepared.segments[0].planeId).toBe("wall");
    }
  });
  it("preserves explicit segment planes", () => {
    const seq: SequenceSpec = {
      segments: [{ ...segA, durationUnits: 2, planeId: "wheel" }]
    };
    const prepared = prepareSequence(seq);
    expect(prepared.ok).toBe(true);
    if (prepared.ok) {
      expect(prepared.prepared.segments[0].planeId).toBe("wheel");
    }
  });
  it("preserves explicit segment sides and leaves omitted sides unspecified", () => {
    const seq: SequenceSpec = {
      segments: [
        { ...segA, durationUnits: 2, planeSide: "a" },
        { ...segB, durationUnits: 3 }
      ]
    };
    const prepared = prepareSequence(seq);
    expect(prepared.ok).toBe(true);
    if (prepared.ok) {
      expect(prepared.prepared.segments[0].planeSide).toBe("a");
      expect(prepared.prepared.segments[1].planeSide).toBeUndefined();
    }
  });
  it("preserves explicit behind-body metadata and leaves omitted values unspecified", () => {
    const seq: SequenceSpec = {
      segments: [
        { ...segA, durationUnits: 2, behindBody: true },
        { ...segB, durationUnits: 3, behindBody: false },
        { ...segA, durationUnits: 1 }
      ]
    };
    const prepared = prepareSequence(seq);
    expect(prepared.ok).toBe(true);
    if (prepared.ok) {
      expect(prepared.prepared.segments[0].behindBody).toBe(true);
      expect(prepared.prepared.segments[1].behindBody).toBe(false);
      expect(prepared.prepared.segments[2].behindBody).toBeUndefined();
      expect("behindBody" in prepared.prepared.segments[2]).toBe(false);
    }
  });

  it("snapshots and freezes prepared state without freezing runtime closures", () => {
    const runtimeEval = (startPose: Segment["hand"]["startPose"]) => startPose;
    const sequence: SequenceSpec = {
      segments: [
        {
          ...segA,
          hand: {
            startPose: { phaseAbs: 0, radius: 1 },
            driver: { kind: "runtime", label: "trusted lab path", evalPose: runtimeEval }
          },
          head: {
            ...segA.head,
            driver: {
              kind: "circle",
              omega: 0,
              radiusProfile: { kind: "time-keyed", keys: [{ t: 1, radius: 2 }] }
            }
          }
        }
      ]
    };
    const result = prepareSequence(sequence);
    if (!result.ok) throw new Error("fixture must prepare");

    const preparedSegment = result.prepared.segments[0];
    sequence.segments[0].hand.startPose.radius = 99;
    sequence.segments[0].head.driver = { kind: "circle", omega: 99 };

    expect(preparedSegment.hand.startPose.radius).toBe(1);
    expect(preparedSegment.head.driver).toEqual({
      kind: "circle",
      omega: 0,
      radiusProfile: { kind: "time-keyed", keys: [{ t: 1, radius: 2 }] }
    });
    expect(preparedSegment.hand.driver.kind).toBe("runtime");
    if (preparedSegment.hand.driver.kind === "runtime") {
      expect(preparedSegment.hand.driver.evalPose).toBe(runtimeEval);
      expect(Object.isFrozen(preparedSegment.hand.driver.evalPose)).toBe(false);
    }

    expect(Object.isFrozen(result.prepared)).toBe(true);
    expect(Object.isFrozen(result.prepared.segments)).toBe(true);
    expect(Object.isFrozen(preparedSegment)).toBe(true);
    expect(Object.isFrozen(preparedSegment.hand)).toBe(true);
    expect(Object.isFrozen(preparedSegment.hand.startPose)).toBe(true);
    expect(Object.isFrozen(preparedSegment.hand.driver)).toBe(true);
    expect(Object.isFrozen(preparedSegment.head.driver)).toBe(true);
    if (preparedSegment.head.driver.kind === "circle") {
      expect(Object.isFrozen(preparedSegment.head.driver.radiusProfile)).toBe(true);
      expect(Object.isFrozen(preparedSegment.head.driver.radiusProfile?.keys)).toBe(true);
      expect(Object.isFrozen(preparedSegment.head.driver.radiusProfile?.keys[0])).toBe(true);
    }

    expect(() => {
      (result.prepared.segments as unknown as Segment[]).pop();
    }).toThrow(TypeError);
    expect(() => {
      preparedSegment.hand.startPose.radius = 5;
    }).toThrow(TypeError);
  });
});
describe("evalPreparedSequenceAt", () => {
  const segA = makeSegment(1, 2);
  const segB = makeSegment(10, 20);
  const seq: SequenceSpec = {
    segments: [
      { ...segA, durationUnits: 2 },
      { ...segB, durationUnits: 3 }
    ]
  };
  const preparedResult = prepareSequence(seq);
  if (!preparedResult.ok) {
    throw new Error("Test fixture sequence must be valid");
  }
  const prepared = preparedResult.prepared;
  it("returns INVALID_TIME for NaN and infinities", () => {
    expect(evalPreparedSequenceAt(prepared, Number.NaN)).toEqual({
      ok: false,
      reason: "INVALID_TIME"
    });
    expect(evalPreparedSequenceAt(prepared, Number.POSITIVE_INFINITY)).toEqual({
      ok: false,
      reason: "INVALID_TIME"
    });
    expect(evalPreparedSequenceAt(prepared, Number.NEGATIVE_INFINITY)).toEqual({
      ok: false,
      reason: "INVALID_TIME"
    });
  });
  it("returns NEGATIVE_TIME for negative time", () => {
    expect(evalPreparedSequenceAt(prepared, -0.001)).toEqual({
      ok: false,
      reason: "NEGATIVE_TIME"
    });
  });
  it("treats negative zero as sequence start", () => {
    expect(evalPreparedSequenceAt(prepared, -0)).toEqual(evalPreparedSequenceAt(prepared, 0));
  });
  it("wraps at total duration and beyond", () => {
    expect(evalPreparedSequenceAt(prepared, 5)).toEqual(evalPreparedSequenceAt(prepared, 0));
    expect(evalPreparedSequenceAt(prepared, 6)).toEqual(evalPreparedSequenceAt(prepared, 1));
    expect(evalPreparedSequenceAt(prepared, 10)).toEqual(evalPreparedSequenceAt(prepared, 0));
  });
  it("evaluates first segment for time inside [0, d0)", () => {
    const tGlobal = 1.25;
    const result = evalPreparedSequenceAt(prepared, tGlobal);
    if (!result.ok) {
      throw new Error(`expected ok result, got ${result.reason}`);
    }
    expect(result.segmentIndex).toBe(0);
    expect(result.planeId).toBe("wall");
    expect(result.tLocal).toBeCloseTo(1.25, 12);
    expect(result.pose).toEqual(evalSegment(segA, 1.25));
  });
  it("returns the active plane for explicit segment planes", () => {
    const explicitPlanePrepared = prepareSequence({
      segments: [{ ...segA, durationUnits: 2, planeId: "floor" }]
    });
    if (!explicitPlanePrepared.ok) {
      throw new Error("Test fixture sequence must be valid");
    }

    const result = evalPreparedSequenceAt(explicitPlanePrepared.prepared, 1);
    if (!result.ok) {
      throw new Error(`expected ok result, got ${result.reason}`);
    }

    expect(result.planeId).toBe("floor");
  });
  it("returns the active side for explicit segment sides", () => {
    const explicitSidePrepared = prepareSequence({
      segments: [{ ...segA, durationUnits: 2, planeId: "wall", planeSide: "b" }]
    });
    if (!explicitSidePrepared.ok) {
      throw new Error("Test fixture sequence must be valid");
    }

    const result = evalPreparedSequenceAt(explicitSidePrepared.prepared, 1);
    if (!result.ok) {
      throw new Error(`expected ok result, got ${result.reason}`);
    }

    expect(result.planeSide).toBe("b");
  });
  it("leaves active side unspecified when segment side is omitted", () => {
    const result = evalPreparedSequenceAt(prepared, 1);
    if (!result.ok) {
      throw new Error(`expected ok result, got ${result.reason}`);
    }

    expect(result.planeSide).toBeUndefined();
    expect("planeSide" in result).toBe(false);
  });
  it("returns active behind-body metadata when specified", () => {
    const behindBodyPrepared = prepareSequence({
      segments: [
        { ...segA, durationUnits: 2, behindBody: true },
        { ...segB, durationUnits: 3, behindBody: false }
      ]
    });
    if (!behindBodyPrepared.ok) {
      throw new Error("Test fixture sequence must be valid");
    }

    const trueResult = evalPreparedSequenceAt(behindBodyPrepared.prepared, 1);
    const falseResult = evalPreparedSequenceAt(behindBodyPrepared.prepared, 2);
    if (!trueResult.ok || !falseResult.ok) {
      throw new Error("expected ok results");
    }

    expect(trueResult.behindBody).toBe(true);
    expect(falseResult.behindBody).toBe(false);
  });
  it("uses half-open boundary semantics: exact boundary selects next segment", () => {
    const tGlobal = 2;
    const result = evalPreparedSequenceAt(prepared, tGlobal);
    if (!result.ok) {
      throw new Error(`expected ok result, got ${result.reason}`);
    }
    expect(result.segmentIndex).toBe(1);
    expect(result.tLocal).toBe(0);
    expect(result.pose).toEqual(evalSegment(segB, 0));
  });
  it("uses half-open boundary semantics for active side", () => {
    const sidePrepared = prepareSequence({
      segments: [
        { ...segA, durationUnits: 2, planeSide: "a" },
        { ...segB, durationUnits: 3, planeSide: "b" }
      ]
    });
    if (!sidePrepared.ok) {
      throw new Error("Test fixture sequence must be valid");
    }

    const result = evalPreparedSequenceAt(sidePrepared.prepared, 2);
    if (!result.ok) {
      throw new Error(`expected ok result, got ${result.reason}`);
    }

    expect(result.segmentIndex).toBe(1);
    expect(result.planeSide).toBe("b");
  });
  it("evaluates second segment with shifted local time", () => {
    const tGlobal = 4;
    const result = evalPreparedSequenceAt(prepared, tGlobal);
    if (!result.ok) {
      throw new Error(`expected ok result, got ${result.reason}`);
    }
    expect(result.segmentIndex).toBe(1);
    expect(result.tLocal).toBe(2);
    expect(result.pose).toEqual(evalSegment(segB, 2));
  });
  it("is deterministic for repeated calls", () => {
    const tGlobal = 3.333;
    const a = evalPreparedSequenceAt(prepared, tGlobal);
    const b = evalPreparedSequenceAt(prepared, tGlobal);
    expect(a).toEqual(b);
  });
});
