import { evalSegment } from "@/engine/engine";
import type { Segment } from "@/engine/types";
import { describe, expect, it } from "vitest";

describe("evalSegment", () => {
  it("evaluates circle driver deterministically at time t", () => {
    const segment: Segment = {
      durationUnits: 1,
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

  it("evaluates hand point-to-point drivers with circle head drivers", () => {
    const segment: Segment = {
      durationUnits: 2,
      hand: {
        startPose: { phaseAbs: 0, radius: 1 },
        driver: { kind: "point-to-point", endPose: { phaseAbs: Math.PI / 2, radius: 1 } }
      },
      head: {
        startPose: { phaseAbs: 0, radius: 2 },
        driver: { kind: "circle", omega: 1 }
      }
    };

    const pose = evalSegment(segment, 1);

    expect(pose.handPose.radius).toBeCloseTo(Math.SQRT1_2);
    expect(pose.handPose.phaseAbs).toBeCloseTo(Math.PI / 4);
    expect(pose.headPose).toEqual({ phaseAbs: 1, radius: 2 });
  });
});
