import { describe, expect, it } from "vitest";
import { nextTick, ref } from "vue";

import type { MultiRigSequence, Segment } from "@/engine/types";
import { useMultiRigPlayback } from "@/visualizer/useMultiRigPlayback";

function makeSegment(handOmega: number, headOmega: number): Segment {
  return {
    hand: {
      startPose: { phaseAbs: 0, radius: 1 },
      driver: { kind: "circle", omega: handOmega }
    },
    head: {
      startPose: { phaseAbs: 0, radius: 1 },
      driver: { kind: "circle", omega: headOmega }
    }
  };
}

function makeSequence(durationUnits: number): MultiRigSequence {
  return {
    rigs: [
      {
        rigId: "left",
        sequence: {
          segments: [{ segment: makeSegment(1, 2), durationUnits }]
        }
      },
      {
        rigId: "right",
        sequence: {
          segments: [{ segment: makeSegment(2, 3), durationUnits: durationUnits * 2 }]
        }
      }
    ]
  };
}

function makeSingleRigSequence(segment: Segment, durationUnits: number): MultiRigSequence {
  return {
    rigs: [
      {
        rigId: "left",
        sequence: {
          segments: [{ segment, durationUnits }]
        }
      }
    ]
  };
}

describe("useMultiRigPlayback", () => {
  it("prepares immediately and evaluates both raw and Cartesian pose views", () => {
    const playback = useMultiRigPlayback(makeSequence(2));

    expect(playback.prepareErrors.value).toEqual([]);
    expect(playback.maxSequenceDuration.value).toBe(4);

    const result = playback.evaluate(1);
    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(Object.keys(result.evaluatedPoses)).toEqual(["left", "right"]);
    expect(result.evaluatedPoses.left.segmentIndex).toBe(0);
    expect(result.relativePoses.left).toEqual(result.evaluatedPoses.left.pose);
    expect(result.worldPoses.left.handPosition).toEqual({
      x: Math.cos(1),
      y: Math.sin(1),
      z: 0
    });
    expect(result.worldPoses.left.planeId).toBe("wall");
    expect(result.worldPoses.left.segmentIndex).toBe(0);
    expect(result.cartesianPoses.left.handPosition.x).toBeCloseTo(Math.cos(1));
  });

  it("uses orthographic projection by default", () => {
    const playback = useMultiRigPlayback({
      rigs: [
        {
          rigId: "left",
          sequence: {
            segments: [{ segment: makeSegment(0, 0), durationUnits: 1, planeId: "wheel" }]
          }
        }
      ]
    });

    const result = playback.evaluate(0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.cartesianPoses.left.handPosition).toEqual({ x: 0, y: 0 });
    expect(result.cartesianPoses.left.headPosition).toEqual({ x: 0, y: 0 });
    expect(result.worldPoses.left.handPosition).toEqual({ x: 0, y: 0, z: 1 });
    expect(result.worldPoses.left.headPosition).toEqual({ x: 0, y: 0, z: 2 });
  });

  it("projects current poses through tilted settings", () => {
    const playback = useMultiRigPlayback(
      {
        rigs: [
          {
            rigId: "left",
            sequence: {
              segments: [{ segment: makeSegment(0, 0), durationUnits: 1, planeId: "wheel" }]
            }
          }
        ]
      },
      { mode: "tilted", yawDeg: -25, pitchDeg: 18 }
    );

    const result = playback.evaluate(0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.cartesianPoses.left.handPosition.x).toBeCloseTo(-0.422618, 6);
    expect(result.cartesianPoses.left.handPosition.y).toBeCloseTo(-0.280065, 6);
  });

  it("exposes evaluated plane side metadata without changing projection", () => {
    const segment = makeSegment(0, 0);
    const withSide = useMultiRigPlayback({
      rigs: [
        {
          rigId: "left",
          sequence: {
            segments: [{ segment, durationUnits: 1, planeId: "wall", planeSide: "b" }]
          }
        }
      ]
    });
    const withoutSide = useMultiRigPlayback({
      rigs: [
        {
          rigId: "left",
          sequence: {
            segments: [{ segment, durationUnits: 1, planeId: "wall" }]
          }
        }
      ]
    });

    const withSideResult = withSide.evaluate(0);
    const withoutSideResult = withoutSide.evaluate(0);
    expect(withSideResult.ok).toBe(true);
    expect(withoutSideResult.ok).toBe(true);

    if (!withSideResult.ok || !withoutSideResult.ok) return;
    expect(withSideResult.evaluatedPoses.left.planeSide).toBe("b");
    expect(withSideResult.worldPoses.left.planeSide).toBe("b");
    expect(withoutSideResult.evaluatedPoses.left.planeSide).toBeUndefined();
    expect(withoutSideResult.worldPoses.left.planeSide).toBeUndefined();
    expect("planeSide" in withoutSideResult.evaluatedPoses.left).toBe(false);
    expect("planeSide" in withoutSideResult.worldPoses.left).toBe(false);
    expect(withSideResult.cartesianPoses).toEqual(withoutSideResult.cartesianPoses);
  });

  it("reports unprepared state when the input sequence fails validation", async () => {
    const sequence = ref<MultiRigSequence>({ rigs: [] });
    const playback = useMultiRigPlayback(sequence);

    await nextTick();

    expect(playback.prepared.value).toBeNull();
    expect(playback.prepareErrors.value).toEqual([{ code: "EMPTY_MULTI_RIG_SEQUENCE" }]);
    expect(playback.evaluate(0)).toEqual({ ok: false, reason: "UNPREPARED_SEQUENCE" });
  });

  it("resets prepared state and last evaluation when the sequence reference changes", async () => {
    const sequence = ref<MultiRigSequence>(makeSequence(2));
    const playback = useMultiRigPlayback(sequence);

    const firstEval = playback.evaluate(1);
    expect(firstEval.ok).toBe(true);
    expect(playback.lastEvaluation.value?.ok).toBe(true);
    expect(playback.maxSequenceDuration.value).toBe(4);

    sequence.value = makeSequence(3);
    await nextTick();

    expect(playback.lastEvaluation.value).toBeNull();
    expect(playback.prepareErrors.value).toEqual([]);
    expect(playback.maxSequenceDuration.value).toBe(6);

    const secondEval = playback.evaluate(1);
    expect(secondEval.ok).toBe(true);
  });

  it("passes through negative and non-finite time failures", () => {
    const playback = useMultiRigPlayback(makeSequence(2));

    expect(playback.evaluate(-1)).toEqual({ ok: false, reason: "NEGATIVE_TIME" });
    expect(playback.evaluate(Number.NaN)).toEqual({ ok: false, reason: "INVALID_TIME" });
  });
});

describe("useMultiRigPlayback.sampleTrails", () => {
  it("returns origin and the live current tip when t < dt", () => {
    const playback = useMultiRigPlayback(makeSequence(2));

    expect(playback.sampleTrails(0, 0.1)).toEqual({});
    const trails = playback.sampleTrails(0.05, 0.1);
    const evaluated = playback.evaluate(0.05);
    if (!evaluated.ok) throw new Error("evaluate failed");

    expect(trails.left?.hand).toHaveLength(2);
    expect(trails.left?.head).toHaveLength(2);
    expect(trails.left?.hand?.[0]).toEqual({ x: 1, y: 0 });
    expect(trails.left?.hand?.[1]).toEqual(evaluated.cartesianPoses.left.handPosition);
    expect(trails.left?.head?.[1]).toEqual(evaluated.cartesianPoses.left.headPosition);
  });

  it("projects trail tips using orthographic projection by default", () => {
    const playback = useMultiRigPlayback({
      rigs: [
        {
          rigId: "left",
          sequence: {
            segments: [{ segment: makeSegment(0, 0), durationUnits: 1, planeId: "wheel" }]
          }
        }
      ]
    });

    const trails = playback.sampleTrails(0.05, 0.1);
    expect(trails.left?.hand?.[0]).toEqual({ x: 0, y: 0 });
    expect(trails.left?.head?.[0]).toEqual({ x: 0, y: 0 });
  });

  it("projects trail tips through tilted settings", () => {
    const playback = useMultiRigPlayback(
      {
        rigs: [
          {
            rigId: "left",
            sequence: {
              segments: [{ segment: makeSegment(0, 0), durationUnits: 1, planeId: "wheel" }]
            }
          }
        ]
      },
      { mode: "tilted", yawDeg: -25, pitchDeg: 18 }
    );

    const trails = playback.sampleTrails(0.05, 0.1);
    expect(trails.left?.hand?.[0].x).toBeCloseTo(-0.422618, 6);
    expect(trails.left?.hand?.[0].y).toBeCloseTo(-0.280065, 6);
  });

  it("returns empty for invalid dt", () => {
    const playback = useMultiRigPlayback(makeSequence(2));

    expect(playback.sampleTrails(1, 0)).toEqual({});
    expect(playback.sampleTrails(1, -0.1)).toEqual({});
    expect(playback.sampleTrails(1, Number.NaN)).toEqual({});
    expect(playback.sampleTrails(Number.NaN, 0.1)).toEqual({});
  });

  it("returns empty for invalid holdSteps", () => {
    const playback = useMultiRigPlayback(makeSequence(2));

    expect(playback.sampleTrails(1, 0.1, 1)).toEqual({});
    expect(playback.sampleTrails(1, 0.1, 0)).toEqual({});
    expect(playback.sampleTrails(1, 0.1, Number.NaN)).toEqual({});
  });

  it("returns empty when prepared sequence is unavailable", () => {
    const playback = useMultiRigPlayback({ rigs: [] });
    expect(playback.sampleTrails(1, 0.1)).toEqual({});
  });

  it("returns exactly two samples per node trail at t = dt", () => {
    const playback = useMultiRigPlayback(makeSequence(2));
    const trails = playback.sampleTrails(0.1, 0.1);

    expect(Object.keys(trails).sort()).toEqual(["left", "right"]);
    expect(trails.left?.hand).toHaveLength(2);
    expect(trails.left?.head).toHaveLength(2);
    expect(trails.right?.hand).toHaveLength(2);
    expect(trails.right?.head).toHaveLength(2);
  });

  it("keeps the grid prefix and appends the live current tip between grid samples", () => {
    const playback = useMultiRigPlayback(makeSequence(2));
    const dt = 0.5;
    const t = 1.6;
    const sampleIndex = Math.floor(t / dt);
    const trails = playback.sampleTrails(t, dt);

    expect(trails.left?.hand).toHaveLength(sampleIndex + 2);

    const evaluated = playback.evaluate(0);
    if (!evaluated.ok) throw new Error("evaluate failed");
    expect(trails.left?.hand?.[0]).toEqual(evaluated.cartesianPoses.left.handPosition);
    expect(trails.left?.head?.[0]).toEqual(evaluated.cartesianPoses.left.headPosition);

    const evaluatedAtIndex = playback.evaluate(sampleIndex * dt);
    if (!evaluatedAtIndex.ok) throw new Error("evaluate failed");
    expect(trails.left?.hand?.[sampleIndex]).toEqual(
      evaluatedAtIndex.cartesianPoses.left.handPosition
    );

    const evaluatedAtCurrent = playback.evaluate(t);
    if (!evaluatedAtCurrent.ok) throw new Error("evaluate failed");
    expect(trails.left?.hand?.[sampleIndex + 1]).toEqual(
      evaluatedAtCurrent.cartesianPoses.left.handPosition
    );
    expect(trails.left?.head?.[sampleIndex + 1]).toEqual(
      evaluatedAtCurrent.cartesianPoses.left.headPosition
    );
  });

  it("limits trail size when holdSteps is provided", () => {
    const playback = useMultiRigPlayback(makeSequence(2));
    const dt = 0.1;
    const trails = playback.sampleTrails(1.0, dt, 3);

    expect(trails.left?.hand).toHaveLength(3);
    expect(trails.left?.head).toHaveLength(3);

    const firstVisibleTime = 0.8;
    const evaluated = playback.evaluate(firstVisibleTime);
    if (!evaluated.ok) throw new Error("evaluate failed");

    expect(trails.left?.hand?.[0]).toEqual(evaluated.cartesianPoses.left.handPosition);
    expect(trails.left?.head?.[0]).toEqual(evaluated.cartesianPoses.left.headPosition);
  });

  it("is deterministic across repeated calls", () => {
    const playback = useMultiRigPlayback(makeSequence(2));
    const a = playback.sampleTrails(1.25, 0.05);
    const b = playback.sampleTrails(1.25, 0.05);
    expect(a).toEqual(b);
  });

  it("wraps finite trails at t = 0 for continuous loops in auto mode", () => {
    const playback = useMultiRigPlayback(
      makeSingleRigSequence(makeSegment(Math.PI * 2, Math.PI * 2), 1)
    );
    const trails = playback.sampleTrails(0, 0.1, 3, { loopMode: "auto", loopDuration: 1 });

    expect(trails.left?.hand).toHaveLength(3);
    expect(trails.left?.hand?.[0].x).toBeCloseTo(Math.cos(Math.PI * 2 * 0.8), 12);
    expect(trails.left?.hand?.[1].x).toBeCloseTo(Math.cos(Math.PI * 2 * 0.9), 12);
    expect(trails.left?.hand?.[2]).toEqual({ x: 1, y: 0 });
  });

  it("keeps t = 0 empty when loop mode is off", () => {
    const playback = useMultiRigPlayback(
      makeSingleRigSequence(makeSegment(Math.PI * 2, Math.PI * 2), 1)
    );

    expect(playback.sampleTrails(0, 0.1, 3, { loopMode: "off", loopDuration: 1 })).toEqual({});
  });

  it("does not wrap discontinuous loops in auto mode", () => {
    const playback = useMultiRigPlayback(makeSingleRigSequence(makeSegment(1, 1), 1));

    expect(playback.sampleTrails(0, 0.1, 3, { loopMode: "auto", loopDuration: 1 })).toEqual({});
  });

  it("separates cached trail windows by loop mode", () => {
    const playback = useMultiRigPlayback(
      makeSingleRigSequence(makeSegment(Math.PI * 2, Math.PI * 2), 1)
    );
    const off = playback.sampleTrails(0.05, 0.1, 3, { loopMode: "off", loopDuration: 1 });
    const auto = playback.sampleTrails(0.05, 0.1, 3, { loopMode: "auto", loopDuration: 1 });

    expect(off.left?.hand).toHaveLength(2);
    expect(auto.left?.hand).toHaveLength(3);
    expect(auto).not.toEqual(off);
  });

  it("leaves unbounded trails unchanged in auto mode", () => {
    const playback = useMultiRigPlayback(
      makeSingleRigSequence(makeSegment(Math.PI * 2, Math.PI * 2), 1)
    );
    const off = playback.sampleTrails(1.25, 0.05, undefined, {
      loopMode: "off",
      loopDuration: 1
    });
    const auto = playback.sampleTrails(1.25, 0.05, undefined, {
      loopMode: "auto",
      loopDuration: 1
    });

    expect(auto).toEqual(off);
  });
});
