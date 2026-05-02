import { describe, expect, it } from "vitest";

import { evalPreparedMultiRigSequenceAt, prepareMultiRigSequence } from "@/engine/multirig";
import { toProjectedMultiRigPose } from "@/engine/planeProjection";
import { demoSequence, planeBreakDemoSequence } from "@/visualizer/demoSequence";

describe("demoSequence", () => {
  it("prepares successfully and exposes the outer transport duration", () => {
    const result = prepareMultiRigSequence(demoSequence);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.prepared.rigs.map((rig) => rig.rigId)).toEqual(["left", "right"]);
    expect(result.prepared.maxSequenceDuration).toBeCloseTo(6 * Math.PI);
  });

  it("includes a plane-break proof fixture with continuous projected endpoints", () => {
    const result = prepareMultiRigSequence(planeBreakDemoSequence);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const beforeBreak = evalPreparedMultiRigSequenceAt(result.prepared, 1 - Number.EPSILON);
    const afterBreak = evalPreparedMultiRigSequenceAt(result.prepared, 1);
    expect(beforeBreak.ok).toBe(true);
    expect(afterBreak.ok).toBe(true);
    if (!beforeBreak.ok || !afterBreak.ok) return;

    const beforeProjected = toProjectedMultiRigPose(beforeBreak.poses);
    const afterProjected = toProjectedMultiRigPose(afterBreak.poses);

    expect(beforeProjected.left.handPosition.x).toBeCloseTo(afterProjected.left.handPosition.x, 12);
    expect(beforeProjected.left.handPosition.y).toBeCloseTo(afterProjected.left.handPosition.y, 12);
    expect(beforeProjected.left.headPosition.x).toBeCloseTo(afterProjected.left.headPosition.x, 12);
    expect(beforeProjected.left.headPosition.y).toBeCloseTo(afterProjected.left.headPosition.y, 12);
  });
});
