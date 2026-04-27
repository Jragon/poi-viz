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
    expect(result.cartesianPoses.left.handPosition.x).toBeCloseTo(Math.cos(1));
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
