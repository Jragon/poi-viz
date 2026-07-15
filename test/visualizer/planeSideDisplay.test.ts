import { describe, expect, it } from "vitest";

import type { PreparedMultiRigSequence } from "@/engine/multirig";
import type { PreparedSegment } from "@/engine/sequence";
import type { WorldRigPose } from "@/engine/types";
import {
  applyPlaneSideDisplayOffset,
  applyPlaneSideTransitionOffsets,
  computePlaneSideDepthFactor,
  lookupAdjacentPlaneSide,
  projectWorldMultiRigPose
} from "@/visualizer/planeSideDisplay";

function worldPose(planeSide?: "a" | "b"): WorldRigPose {
  return {
    handPosition: { x: 1, y: 0, z: 0 },
    headPosition: { x: 1.5, y: 0, z: 0 },
    planeId: "wall",
    ...(planeSide ? { planeSide } : {})
  };
}

function worldPoseWithMeta(
  planeSide: "a" | "b",
  segmentIndex: number,
  tLocal: number
): WorldRigPose {
  return {
    ...worldPose(planeSide),
    segmentIndex,
    tLocal
  };
}

function makePreparedSegment(planeSide?: "a" | "b", durationUnits: number = 1): PreparedSegment {
  return {
    durationUnits,
    planeId: "wall",
    ...(planeSide ? { planeSide } : {}),
    hand: {
      startPose: { phaseAbs: 0, radius: 1 },
      driver: { kind: "circle", omega: 0 }
    },
    head: {
      startPose: { phaseAbs: 0, radius: 1 },
      driver: { kind: "circle", omega: 0 }
    },
    startUnit: 0,
    endUnit: durationUnits
  };
}

function makePreparedMultiRig(segments: PreparedSegment[]): PreparedMultiRigSequence {
  return {
    rigs: [
      {
        rigId: "left",
        prepared: {
          segments,
          totalDuration: segments.reduce((sum, s) => sum + s.durationUnits, 0)
        }
      }
    ],
    maxSequenceDuration: segments.reduce((sum, s) => sum + s.durationUnits, 0)
  };
}

describe("planeSideDisplay", () => {
  it("uses side a as the display-only default for legacy poses", () => {
    const displayed = applyPlaneSideDisplayOffset(worldPose());

    expect(displayed.handPosition.z).toBeCloseTo(0.12);
    expect(displayed.headPosition.z).toBeCloseTo(0.12);
    expect(displayed.planeSide).toBeUndefined();
    expect(
      applyPlaneSideDisplayOffset(worldPose(), {
        separationWorld: 0.2,
        defaultSide: null
      })
    ).toEqual(worldPose());
  });

  it("offsets wall side a and side b in opposite depth directions", () => {
    const settings = { separationWorld: 0.2, defaultSide: null };
    const front = applyPlaneSideDisplayOffset(worldPose("a"), settings);
    const back = applyPlaneSideDisplayOffset(worldPose("b"), settings);

    expect(front.handPosition).toEqual({ x: 1, y: 0, z: 0.2 });
    expect(front.headPosition).toEqual({ x: 1.5, y: 0, z: 0.2 });
    expect(back.handPosition).toEqual({ x: 1, y: 0, z: -0.2 });
    expect(back.headPosition).toEqual({ x: 1.5, y: 0, z: -0.2 });
  });

  it("projects side-offset world poses through tilted projection", () => {
    const prepared = makePreparedMultiRig([makePreparedSegment("a"), makePreparedSegment("b")]);
    const poses = applyPlaneSideTransitionOffsets(
      {
        front: worldPoseWithMeta("a", 0, 0),
        back: worldPoseWithMeta("b", 1, 0)
      },
      {
        ...prepared,
        rigs: [
          { rigId: "front", prepared: prepared.rigs[0].prepared },
          { rigId: "back", prepared: prepared.rigs[0].prepared }
        ]
      },
      { separationWorld: 0.2, defaultSide: null }
    );
    const projected = projectWorldMultiRigPose(poses, {
      mode: "tilted",
      yawDeg: -25,
      pitchDeg: 18
    });

    expect(projected.front?.handPosition.x).not.toBeCloseTo(projected.back!.handPosition.x, 6);
    expect(projected.front?.handPosition.y).not.toBeCloseTo(projected.back!.handPosition.y, 6);
  });
});

describe("lookupAdjacentPlaneSide", () => {
  it("returns previous segment planeSide", () => {
    const segments = [makePreparedSegment("a"), makePreparedSegment("b")];
    expect(lookupAdjacentPlaneSide(segments, 1, null)).toBe("a");
  });

  it("wraps around to last segment for index 0", () => {
    const segments = [makePreparedSegment("a"), makePreparedSegment("b")];
    expect(lookupAdjacentPlaneSide(segments, 0, null)).toBe("b");
  });

  it("returns undefined when previous segment has no planeSide", () => {
    const segments = [makePreparedSegment(), makePreparedSegment("a")];
    expect(lookupAdjacentPlaneSide(segments, 1, null)).toBeUndefined();
    expect(lookupAdjacentPlaneSide(segments, 1, "a")).toBe("a");
  });

  it("returns undefined for empty segments", () => {
    expect(lookupAdjacentPlaneSide([], 0, "a")).toBeUndefined();
  });
});

describe("computePlaneSideDepthFactor", () => {
  it("returns constant +1 for same side a", () => {
    expect(computePlaneSideDepthFactor("a", "a", 0)).toBe(1);
    expect(computePlaneSideDepthFactor("a", "a", 0.5)).toBe(1);
    expect(computePlaneSideDepthFactor("a", "a", 1)).toBe(1);
  });

  it("returns constant -1 for same side b", () => {
    expect(computePlaneSideDepthFactor("b", "b", 0)).toBe(-1);
    expect(computePlaneSideDepthFactor("b", "b", 0.5)).toBe(-1);
    expect(computePlaneSideDepthFactor("b", "b", 1)).toBe(-1);
  });

  it("returns 0 when no current side", () => {
    expect(computePlaneSideDepthFactor(undefined, "a", 0.5)).toBe(0);
    expect(computePlaneSideDepthFactor(undefined, undefined, 0.5)).toBe(0);
  });

  it("returns constant offset when no previous side", () => {
    expect(computePlaneSideDepthFactor("a", undefined, 0)).toBe(1);
    expect(computePlaneSideDepthFactor("a", undefined, 0.5)).toBe(1);
    expect(computePlaneSideDepthFactor("b", undefined, 0.5)).toBe(-1);
  });

  it("interpolates a→b transition through crosspoint at midpoint", () => {
    // With default window 0.75: window is [0.125, 0.875]
    // current=b (offset -1), previous=a (offset +1)
    expect(computePlaneSideDepthFactor("b", "a", 0)).toBe(1);
    expect(computePlaneSideDepthFactor("b", "a", 0.125)).toBe(1);
    expect(computePlaneSideDepthFactor("b", "a", 0.5)).toBeCloseTo(0, 10);
    expect(computePlaneSideDepthFactor("b", "a", 0.875)).toBe(-1);
    expect(computePlaneSideDepthFactor("b", "a", 1)).toBe(-1);
  });

  it("interpolates b→a transition through crosspoint at midpoint", () => {
    expect(computePlaneSideDepthFactor("a", "b", 0)).toBe(-1);
    expect(computePlaneSideDepthFactor("a", "b", 0.125)).toBe(-1);
    expect(computePlaneSideDepthFactor("a", "b", 0.5)).toBeCloseTo(0, 10);
    expect(computePlaneSideDepthFactor("a", "b", 0.875)).toBe(1);
    expect(computePlaneSideDepthFactor("a", "b", 1)).toBe(1);
  });

  it("clamps to previous offset before window and current after", () => {
    // window fraction 0.5 → window [0.25, 0.75]
    expect(computePlaneSideDepthFactor("b", "a", 0.1, 0.5)).toBe(1);
    expect(computePlaneSideDepthFactor("b", "a", 0.9, 0.5)).toBe(-1);
  });

  it("respects narrower transition window", () => {
    // window fraction 0.2 → window [0.4, 0.6]
    expect(computePlaneSideDepthFactor("b", "a", 0.35, 0.2)).toBe(1);
    expect(computePlaneSideDepthFactor("b", "a", 0.5, 0.2)).toBeCloseTo(0, 10);
    expect(computePlaneSideDepthFactor("b", "a", 0.65, 0.2)).toBe(-1);
  });
});

describe("applyPlaneSideTransitionOffsets", () => {
  it("returns poses unchanged when separation is zero", () => {
    const prepared = makePreparedMultiRig([makePreparedSegment("a"), makePreparedSegment("b")]);
    const poses = { left: worldPoseWithMeta("b", 1, 0.5) };
    const result = applyPlaneSideTransitionOffsets(poses, prepared, {
      separationWorld: 0,
      defaultSide: null
    });
    expect(result.left).toBe(poses.left);
  });

  it("applies constant offset for same-side consecutive segments", () => {
    const prepared = makePreparedMultiRig([makePreparedSegment("b"), makePreparedSegment("b")]);
    const pose = worldPoseWithMeta("b", 1, 0.5);
    const result = applyPlaneSideTransitionOffsets({ left: pose }, prepared, {
      separationWorld: 0.2,
      defaultSide: null
    });
    expect(result.left.handPosition.z).toBeCloseTo(-0.2, 10);
  });

  it("interpolates through zero at midpoint for a→b transition", () => {
    const prepared = makePreparedMultiRig([makePreparedSegment("a"), makePreparedSegment("b")]);
    const settings = { separationWorld: 0.2, defaultSide: null };

    const atStart = applyPlaneSideTransitionOffsets(
      { left: worldPoseWithMeta("b", 1, 0) },
      prepared,
      settings
    );
    const atMid = applyPlaneSideTransitionOffsets(
      { left: worldPoseWithMeta("b", 1, 0.5) },
      prepared,
      settings
    );
    const atEnd = applyPlaneSideTransitionOffsets(
      { left: worldPoseWithMeta("b", 1, 1) },
      prepared,
      settings
    );

    // At start of transition segment: still near previous side (a → +0.2)
    expect(atStart.left.handPosition.z).toBeCloseTo(0.2, 10);
    // At midpoint: crosspoint (z ≈ 0)
    expect(atMid.left.handPosition.z).toBeCloseTo(0, 10);
    // At end: established on current side (b → -0.2)
    expect(atEnd.left.handPosition.z).toBeCloseTo(-0.2, 10);
  });

  it("falls back to constant offset when pose lacks metadata", () => {
    const prepared = makePreparedMultiRig([makePreparedSegment("a"), makePreparedSegment("b")]);
    const pose = worldPose("b");
    const result = applyPlaneSideTransitionOffsets({ left: pose }, prepared, {
      separationWorld: 0.2,
      defaultSide: null
    });
    expect(result.left.handPosition.z).toBeCloseTo(-0.2, 10);
  });

  it("uses the configured display fallback when no planeSide is authored", () => {
    const prepared = makePreparedMultiRig([makePreparedSegment(), makePreparedSegment()]);
    const noPose = { ...worldPose(), segmentIndex: 0, tLocal: 0 };
    const result = applyPlaneSideTransitionOffsets({ left: noPose }, prepared, {
      separationWorld: 0.2,
      defaultSide: "a"
    });
    expect(result.left.handPosition.z).toBeCloseTo(0.2);
    expect(result.left.planeSide).toBeUndefined();
  });
});
