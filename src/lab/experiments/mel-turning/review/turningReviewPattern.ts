import { getMelTurningLanes } from "@/lab/experiments/mel-turning/adapter/melBeatGraphAdapter";
import type {
  TurningReviewCandidate,
  TurningReviewContinuationKind,
  TurningReviewEditedNode,
  TurningReviewEditedPattern,
  TurningReviewEditedStep,
  TurningReviewOutgoingEdge,
  TurningReviewRegion,
  TurningPatternReview
} from "@/lab/experiments/mel-turning/review/turningReviewArtifact";
import type {
  BodyFacing,
  LowReelLocation,
  TurningDirection,
  TurningHandPlacement,
  TurningLaneId,
  TurningNode,
  TurningTrace
} from "@/lab/experiments/mel-turning/model/turningTypes";

export interface TurningReviewEffectiveStep {
  readonly id: string;
  readonly step: number;
  readonly facing: BodyFacing;
  readonly region: TurningReviewRegion | "edited";
  readonly left: TurningReviewEditedNode;
  readonly right: TurningReviewEditedNode;
  readonly outgoingKind: TurningReviewContinuationKind | "body-turn" | null;
  readonly originalEdge: TurningReviewOutgoingEdge | null;
}

const LOCATION_PARTS: Readonly<
  Record<
    LowReelLocation,
    {
      readonly laneId: TurningLaneId;
      readonly handPlacement: TurningHandPlacement;
    }
  >
> = {
  C: { laneId: "center", handPlacement: "wall" },
  L: { laneId: "left-low", handPlacement: "wall" },
  R: { laneId: "right-low", handPlacement: "wall" },
  Cb: { laneId: "center", handPlacement: "behind-body" },
  Lb: { laneId: "left-low", handPlacement: "behind-body" },
  Rb: { laneId: "right-low", handPlacement: "behind-body" }
};

function editedNode(node: {
  readonly location: LowReelLocation;
  readonly planeSide: TurningReviewEditedNode["planeSide"];
  readonly phase: TurningReviewEditedNode["phase"];
}): TurningReviewEditedNode {
  return {
    location: node.location,
    planeSide: node.planeSide,
    phase: node.phase
  };
}

function fallbackContinuationKind(
  kind: TurningReviewOutgoingEdge["kind"] | undefined
): TurningReviewContinuationKind {
  if (
    kind === "source-cycle" ||
    kind === "target-cycle" ||
    kind === "reel-continuation" ||
    kind === "circle-extension"
  ) {
    return kind;
  }
  return "reel-continuation";
}

export function createTurningReviewEditedPattern(
  candidate: TurningReviewCandidate
): TurningReviewEditedPattern {
  const turnAfterIndex = candidate.steps.findIndex(
    (step) => step.outgoingEdge?.kind === "body-turn"
  );
  if (turnAfterIndex < 0 || turnAfterIndex >= candidate.steps.length - 1) {
    throw new Error(`Turning review candidate ${candidate.caseId} has no editable turn boundary.`);
  }
  return {
    turnAfterIndex,
    steps: candidate.steps.map((step) => ({
      id: `original-${step.step}`,
      left: editedNode(step.left),
      right: editedNode(step.right),
      continuationKind: fallbackContinuationKind(step.outgoingEdge?.kind)
    }))
  };
}

function nextInsertedId(pattern: TurningReviewEditedPattern): string {
  let suffix = 1;
  const ids = new Set(pattern.steps.map((step) => step.id));
  while (ids.has(`inserted-${suffix}`)) suffix += 1;
  return `inserted-${suffix}`;
}

function oppositePhase(phase: TurningReviewEditedNode["phase"]): TurningReviewEditedNode["phase"] {
  return phase === "up" ? "down" : "up";
}

export function insertTurningReviewStep(
  pattern: TurningReviewEditedPattern,
  afterIndex: number
): TurningReviewEditedPattern {
  if (!Number.isInteger(afterIndex) || afterIndex < 0 || afterIndex >= pattern.steps.length - 1) {
    throw new Error("Turning review insertion requires an existing outgoing interval.");
  }
  const from = pattern.steps[afterIndex];
  if (!from) throw new Error(`Turning review has no row ${afterIndex}.`);
  const inserted: TurningReviewEditedStep = {
    id: nextInsertedId(pattern),
    left: { ...from.left, phase: oppositePhase(from.left.phase) },
    right: { ...from.right, phase: oppositePhase(from.right.phase) },
    continuationKind: from.continuationKind
  };
  const steps = [...pattern.steps];
  steps.splice(afterIndex + 1, 0, inserted);
  steps[afterIndex] = { ...from, continuationKind: "circle-extension" };
  return {
    turnAfterIndex:
      pattern.turnAfterIndex > afterIndex ? pattern.turnAfterIndex + 1 : pattern.turnAfterIndex,
    steps
  };
}

export function removeTurningReviewStep(
  pattern: TurningReviewEditedPattern,
  index: number
): TurningReviewEditedPattern {
  if (pattern.steps.length <= 2) {
    throw new Error("Turning review patterns require at least two rows.");
  }
  if (!Number.isInteger(index) || index < 0 || index >= pattern.steps.length) {
    throw new Error(`Turning review has no removable row ${index}.`);
  }
  const removed = pattern.steps[index];
  const steps = pattern.steps.filter((_, stepIndex) => stepIndex !== index);
  if (index > 0 && index < pattern.steps.length - 1 && removed) {
    const predecessor = steps[index - 1];
    if (predecessor) {
      steps[index - 1] = {
        ...predecessor,
        continuationKind: removed.continuationKind
      };
    }
  }
  const shiftedTurn =
    index <= pattern.turnAfterIndex ? pattern.turnAfterIndex - 1 : pattern.turnAfterIndex;
  return {
    turnAfterIndex: Math.max(0, Math.min(shiftedTurn, steps.length - 2)),
    steps
  };
}

export function getTurningReviewEffectiveSteps(
  candidate: TurningReviewCandidate,
  review: TurningPatternReview | undefined
): readonly TurningReviewEffectiveStep[] {
  if (!review?.editedPattern) {
    return candidate.steps.map((step) => ({
      id: `original-${step.step}`,
      step: step.step,
      facing: step.facing,
      region: step.region,
      left: editedNode(step.left),
      right: editedNode(step.right),
      outgoingKind: step.outgoingEdge?.kind ?? null,
      originalEdge: step.outgoingEdge
    }));
  }

  return review.editedPattern.steps.map((step, index) => ({
    id: step.id,
    step: index,
    facing: index <= review.editedPattern!.turnAfterIndex ? 0 : 180,
    region: "edited",
    left: step.left,
    right: step.right,
    outgoingKind:
      index === review.editedPattern!.steps.length - 1
        ? null
        : index === review.editedPattern!.turnAfterIndex
          ? "body-turn"
          : step.continuationKind,
    originalEdge: null
  }));
}

function poiDirections(candidate: TurningReviewCandidate): {
  readonly left: TurningDirection;
  readonly right: TurningDirection;
} {
  const direction = candidate.source.direction;
  if (direction.mode === "same") {
    return { left: direction.direction, right: direction.direction };
  }
  return direction.flow === "inwards"
    ? { left: "clockwise", right: "counterclockwise" }
    : { left: "counterclockwise", right: "clockwise" };
}

function traceNode(node: TurningReviewEditedNode, step: number): TurningNode {
  return {
    step,
    ...LOCATION_PARTS[node.location],
    planeSide: node.planeSide,
    phase: node.phase
  };
}

export function buildTurningReviewTrace(
  candidate: TurningReviewCandidate,
  review: TurningPatternReview | undefined
): TurningTrace {
  const steps = getTurningReviewEffectiveSteps(candidate, review);
  const turnAfterIndex = steps.findIndex((step) => step.outgoingKind === "body-turn");
  if (turnAfterIndex < 0 || turnAfterIndex >= steps.length - 1) {
    throw new Error(`Turning review candidate ${candidate.caseId} has no displayable turn.`);
  }
  const directions = poiDirections(candidate);
  const edited = Boolean(review?.editedPattern);

  return {
    id: `${candidate.routeId}-${edited ? "edited" : "generated"}`,
    label: `${candidate.summary.timing} ${candidate.summary.sourceFamily} → ${candidate.summary.targetFamily}`,
    timing: candidate.summary.timing,
    summary: `${candidate.selectionReason}; ${edited ? "edited review pattern" : "generated candidate"}.`,
    source: `Turning pattern verifier batch case ${candidate.caseId}.`,
    verificationStatus: "unverified",
    lanes: getMelTurningLanes(),
    tracks: [
      {
        id: "left",
        hand: "left",
        poiDirection: directions.left,
        initialPhase: steps[0]!.left.phase,
        nodes: steps.map((step) => traceNode(step.left, step.step))
      },
      {
        id: "right",
        hand: "right",
        poiDirection: directions.right,
        initialPhase: steps[0]!.right.phase,
        nodes: steps.map((step) => traceNode(step.right, step.step))
      }
    ],
    events: [
      {
        kind: "body-turn",
        afterStep: turnAfterIndex,
        direction: candidate.turnDirection,
        degrees: 180,
        fromFacing: 0,
        toFacing: 180,
        note: edited
          ? "Turn boundary selected in the review edit."
          : "Turn boundary generated by the route solver."
      }
    ]
  };
}
