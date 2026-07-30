import { describe, expect, it } from "vitest";

import type {
  TurningReviewCandidate,
  TurningPatternReview
} from "@/lab/experiments/mel-turning/review/turningReviewArtifact";
import {
  buildTurningReviewTrace,
  createTurningReviewEditedPattern,
  getTurningReviewEffectiveSteps,
  insertTurningReviewStep,
  removeTurningReviewStep
} from "@/lab/experiments/mel-turning/review/turningReviewPattern";

function candidateFixture(): TurningReviewCandidate {
  const node = (location: "C" | "L", planeSide: "a" | "b", phase: "up" | "down", x: number) => ({
    location,
    planeSide,
    phase,
    handPointBody: { x, y: -0.35 },
    handPointObserver: { x, y: -0.35 }
  });
  return {
    caseId: "case-01",
    routeId: "route-01",
    selectionReason: "fixture",
    source: {
      left: "low-native",
      right: "low-native",
      direction: { mode: "same", direction: "clockwise" },
      offset: 0
    },
    target: {
      left: "low-native",
      right: "low-native",
      direction: { mode: "same", direction: "counterclockwise" },
      offset: 0
    },
    turnDirection: "right",
    summary: {
      timing: "TS",
      sourceFamily: "mill",
      targetFamily: "mill",
      bridgeHalfbeats: 1,
      preparationHalfbeats: 0,
      recoveryHalfbeats: 0,
      shortestBridgeHalfbeats: 1,
      isShortest: true,
      modelStatus: "valid",
      evidenceStatus: "unreviewed",
      evidenceReferences: []
    },
    steps: [
      {
        step: 0,
        facing: 0,
        region: "source",
        left: node("C", "a", "up", -0.5),
        right: node("C", "a", "up", 0.5),
        outgoingEdge: {
          kind: "source-cycle",
          leftAction: "reel-continuation",
          rightAction: "reel-continuation",
          modelStatus: "valid",
          provenance: ["source"]
        }
      },
      {
        step: 1,
        facing: 0,
        region: "source",
        left: node("L", "b", "down", -0.5),
        right: node("C", "a", "down", 0.5),
        outgoingEdge: {
          kind: "body-turn",
          leftAction: "cross",
          rightAction: "hold",
          modelStatus: "valid",
          provenance: ["turn"]
        }
      },
      {
        step: 2,
        facing: 180,
        region: "target",
        left: node("L", "a", "up", -0.5),
        right: node("C", "b", "up", 0.5),
        outgoingEdge: {
          kind: "target-cycle",
          leftAction: "reel-continuation",
          rightAction: "reel-continuation",
          modelStatus: "valid",
          provenance: ["target"]
        }
      },
      {
        step: 3,
        facing: 180,
        region: "target",
        left: node("C", "b", "down", -0.5),
        right: node("C", "b", "down", 0.5),
        outgoingEdge: null
      }
    ]
  };
}

describe("turning review editable pattern", () => {
  it("creates a notation-only working copy without mutating the generated candidate", () => {
    const candidate = candidateFixture();
    const pattern = createTurningReviewEditedPattern(candidate);

    expect(pattern.turnAfterIndex).toBe(1);
    expect(pattern.steps.map((step) => step.left.location)).toEqual(["C", "L", "L", "C"]);
    expect(candidate.steps[1]?.outgoingEdge?.kind).toBe("body-turn");
    expect(pattern.steps[1]?.continuationKind).toBe("reel-continuation");
  });

  it("inserts an alternating same-location row and keeps the turn boundary explicit", () => {
    const original = createTurningReviewEditedPattern(candidateFixture());
    const inserted = insertTurningReviewStep(original, 0);

    expect(inserted.steps).toHaveLength(5);
    expect(inserted.steps[1]).toMatchObject({
      left: { location: "C", phase: "down" },
      right: { location: "C", phase: "down" }
    });
    expect(inserted.steps[0]?.continuationKind).toBe("circle-extension");
    expect(inserted.turnAfterIndex).toBe(2);
    expect(removeTurningReviewStep(inserted, 1)).toEqual(original);
  });

  it("renders the edited notation and selected turn without claiming physical verification", () => {
    const candidate = candidateFixture();
    const pattern = {
      ...createTurningReviewEditedPattern(candidate),
      turnAfterIndex: 0
    };
    const review: TurningPatternReview = {
      outcome: "inconclusive",
      notes: "Turn placement remains uncertain.",
      editedPattern: pattern,
      updatedAt: "2026-07-30T12:00:00.000Z"
    };
    const effective = getTurningReviewEffectiveSteps(candidate, review);
    const trace = buildTurningReviewTrace(candidate, review);

    expect(effective.map((step) => step.facing)).toEqual([0, 180, 180, 180]);
    expect(effective.map((step) => step.outgoingKind)).toEqual([
      "body-turn",
      "reel-continuation",
      "target-cycle",
      null
    ]);
    expect(trace.events).toEqual([expect.objectContaining({ afterStep: 0, direction: "right" })]);
    expect(trace.verificationStatus).toBe("unverified");
  });
});
