import { evalSegment } from "@/engine/engine";
import type { Segment } from "@/engine/types";
import { describe, expect, it } from "vitest";

describe("evalSegment", () => {
  it("evaluates circle driver deterministically at time t", () => {
    const segment: Segment = {
      hand: {
        startPose: {
          phaseAbs: 0,
          radius: 1
        },
        driver: { kind: "circle", omega: 1 }
      },
      head: {
        startPose: {
          phaseAbs: 0,
          radius: 2
        },
        driver: { kind: "circle", omega: 1 }
      }
    };

    const t = 3;
    // pose after t
    const poseA = evalSegment(segment, t);
    const poseB = evalSegment(segment, t);
    expect(poseA).toEqual(poseB);

    expect(poseA.handPose).toEqual({
      phaseAbs: 3,
      radius: 1
    });
    expect(poseA.headPose).toEqual({
      phaseAbs: 3,
      radius: 2
    });
  });
});
