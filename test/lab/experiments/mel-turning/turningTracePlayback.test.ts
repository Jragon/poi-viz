import { describe, expect, it } from "vitest";

import { evalPreparedMultiRigSequenceAt, prepareMultiRigSequence } from "@/engine/multirig";
import { toWorldMultiRigPose } from "@/engine/planeProjection";
import {
  compileTurningTracePlayback,
  getTurningRootFacingDeg
} from "@/lab/experiments/mel-turning/adapter/turningTracePlayback";
import { buildLowReelTurningTrace } from "@/lab/experiments/mel-turning/model/buildLowReelTurningTrace";
import { searchLowReelDirectTurns } from "@/lab/experiments/mel-turning/model/lowReelDirectTurnSearch";
import type { TurningTrace } from "@/lab/experiments/mel-turning/model/turningTypes";
import { applyPlaneSideTransitionOffsets } from "@/visualizer/planeSideDisplay";

function makeTrace(direction: "left" | "right" = "left"): TurningTrace {
  return {
    id: "direct-turn",
    label: "Direct turn",
    timing: "TO",
    summary: "Test trace",
    source: "generated",
    verificationStatus: "unverified",
    lanes: [
      { id: "left-high", label: "Left high" },
      { id: "left-low", label: "Left low" },
      { id: "center", label: "Center" },
      { id: "right-low", label: "Right low" },
      { id: "right-high", label: "Right high" }
    ],
    tracks: [
      {
        id: "left",
        hand: "left",
        poiDirection: "clockwise",
        initialPhase: "up",
        nodes: [
          {
            step: 0,
            laneId: "left-low",
            planeSide: "b",
            phase: "up",
            handPlacement: "wall"
          },
          {
            step: 1,
            laneId: "left-low",
            planeSide: "a",
            phase: "down",
            handPlacement: "wall"
          }
        ]
      },
      {
        id: "right",
        hand: "right",
        poiDirection: "counterclockwise",
        initialPhase: "down",
        nodes: [
          {
            step: 0,
            laneId: "right-low",
            planeSide: "b",
            phase: "down",
            handPlacement: "wall"
          },
          {
            step: 1,
            laneId: "right-low",
            planeSide: "a",
            phase: "up",
            handPlacement: "wall"
          }
        ]
      }
    ],
    events: [
      {
        kind: "body-turn",
        afterStep: 0,
        direction,
        degrees: 180,
        fromFacing: 0,
        toFacing: 180,
        note: "test"
      }
    ]
  };
}

describe("turning trace playback adapter", () => {
  it("mirrors target body lanes into observer space while preserving source lanes", () => {
    const sequence = compileTurningTracePlayback(makeTrace());
    const left = sequence.rigs.find((rig) => rig.rigId === "left")?.sequence.segments[0];
    const right = sequence.rigs.find((rig) => rig.rigId === "right")?.sequence.segments[0];

    expect(left?.hand.startPose.phaseAbs).toBeCloseTo(Math.atan2(-0.35, -0.5));
    expect(right?.hand.startPose.phaseAbs).toBeCloseTo(Math.atan2(-0.35, 0.5));

    if (left?.hand.driver.kind !== "runtime" || right?.hand.driver.kind !== "runtime") {
      throw new Error("Expected mirrored hand transfers.");
    }

    const leftEnd = left.hand.driver.evalPose(left.hand.startPose, {
      tLocal: 0.5,
      durationUnits: 0.5
    });
    const rightEnd = right.hand.driver.evalPose(right.hand.startPose, {
      tLocal: 0.5,
      durationUnits: 0.5
    });

    expect(Math.cos(leftEnd.phaseAbs) * leftEnd.radius).toBeCloseTo(0.5);
    expect(Math.cos(rightEnd.phaseAbs) * rightEnd.radius).toBeCloseTo(-0.5);
  });

  it("uses trace node zero rather than the loop tail for finite display depth", () => {
    const trace = makeTrace();
    const prepared = prepareMultiRigSequence(compileTurningTracePlayback(trace));
    if (!prepared.ok) throw new Error("Expected the turning trace to prepare.");

    const evaluated = evalPreparedMultiRigSequenceAt(prepared.prepared, 0);
    if (!evaluated.ok) throw new Error("Expected the turning trace to evaluate.");

    const displayed = applyPlaneSideTransitionOffsets(
      toWorldMultiRigPose(evaluated.poses),
      prepared.prepared,
      {
        sideADepthWorld: 0.2,
        sideBDepthWorld: 0.2,
        defaultSide: null,
        boundary: {
          mode: "finite",
          initialSideByRig: { left: "b", right: "b" }
        }
      }
    );

    expect(displayed.left.handPosition.z).toBeCloseTo(-0.2);
    expect(displayed.right.handPosition.z).toBeCloseTo(-0.2);
  });

  it("keeps symbolic low-reel center rows at their Mel-resolved peripheral hand anchors", () => {
    const result = searchLowReelDirectTurns({
      source: {
        left: "low-native",
        right: "low-non-native",
        direction: { mode: "same", direction: "clockwise" },
        offset: 3
      },
      target: {
        left: "low-native",
        right: "low-non-native",
        direction: { mode: "same", direction: "counterclockwise" },
        offset: 1
      },
      turnDirection: "left"
    });
    const candidate = result.candidates.find((entry) => entry.topologyStatus === "valid");
    if (!candidate) throw new Error("Expected a valid low-reel turn candidate.");

    const trace = buildLowReelTurningTrace(result, candidate);
    expect(trace.tracks.some((track) => track.nodes.some((node) => node.laneId === "center"))).toBe(
      true
    );

    const sequence = compileTurningTracePlayback(trace);
    for (const rig of sequence.rigs) {
      expect(rig.sequence.segments).toHaveLength(9);
      for (const segment of rig.sequence.segments) {
        const point = {
          x: Math.cos(segment.hand.startPose.phaseAbs) * segment.hand.startPose.radius,
          y: Math.sin(segment.hand.startPose.phaseAbs) * segment.hand.startPose.radius
        };
        expect(Math.abs(point.x)).toBeCloseTo(0.5);
        expect(point.y).toBeCloseTo(-0.35);
      }
    }
  });

  it("interpolates an unwrapped deterministic body-root turn over the turn halfbeat", () => {
    const leftTrace = makeTrace("left");
    const rightTrace = makeTrace("right");

    expect(getTurningRootFacingDeg(leftTrace, 0)).toBe(0);
    expect(getTurningRootFacingDeg(leftTrace, 0.25)).toBe(-90);
    expect(getTurningRootFacingDeg(leftTrace, 0.5)).toBe(-180);
    expect(getTurningRootFacingDeg(leftTrace, 2)).toBe(-180);

    expect(getTurningRootFacingDeg(rightTrace, 0.25)).toBe(90);
    expect(getTurningRootFacingDeg(rightTrace, 0.5)).toBe(180);
    expect(getTurningRootFacingDeg(leftTrace, 0.25, Number.NaN)).toBe(0);
  });
});
