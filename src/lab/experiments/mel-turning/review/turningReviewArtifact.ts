import type {
  TurningReelConfig,
  TurningReelOffset,
  TurningReelPosition
} from "@/lab/experiments/mel-turning/adapter/melBeatGraphAdapter";
import type {
  BodyFacing,
  BodyTurnDirection,
  LowReelLocation,
  TurningHandPoint,
  TurningPhase,
  TurningPlaneSide
} from "@/lab/experiments/mel-turning/model/turningTypes";

export const TURNING_REVIEW_SCHEMA_VERSION = 1;

export const TURNING_REVIEW_OUTCOMES = ["possible", "not-possible", "inconclusive"] as const;

export type TurningReviewOutcome = (typeof TURNING_REVIEW_OUTCOMES)[number];

export const TURNING_REVIEW_LOCATIONS = ["C", "L", "R", "Cb", "Lb", "Rb"] as const;

export const TURNING_REVIEW_CONTINUATION_KINDS = [
  "source-cycle",
  "target-cycle",
  "reel-continuation",
  "circle-extension"
] as const;

export type TurningReviewContinuationKind = (typeof TURNING_REVIEW_CONTINUATION_KINDS)[number];

export type TurningReviewRegion = "source" | "preparation" | "turn-target" | "recovery" | "target";

export interface TurningReviewNode {
  readonly location: LowReelLocation;
  readonly planeSide: TurningPlaneSide;
  readonly phase: TurningPhase;
  readonly handPointBody: TurningHandPoint;
  readonly handPointObserver: TurningHandPoint;
}

export interface TurningReviewOutgoingEdge {
  readonly kind: TurningReviewContinuationKind | "body-turn";
  readonly leftAction: string;
  readonly rightAction: string;
  readonly modelStatus: string;
  readonly provenance: readonly string[];
}

export interface TurningReviewStep {
  readonly step: number;
  readonly facing: BodyFacing;
  readonly region: TurningReviewRegion;
  readonly left: TurningReviewNode;
  readonly right: TurningReviewNode;
  readonly outgoingEdge: TurningReviewOutgoingEdge | null;
}

export interface TurningReviewCandidateSummary {
  readonly timing: "TO" | "SO" | "TS" | "SS";
  readonly sourceFamily: "mill" | "weave";
  readonly targetFamily: "mill" | "weave";
  readonly bridgeHalfbeats: number;
  readonly preparationHalfbeats: number;
  readonly recoveryHalfbeats: number;
  readonly shortestBridgeHalfbeats: number;
  readonly isShortest: boolean;
  readonly modelStatus: "valid" | "unresolved";
  readonly evidenceStatus: "exact-route-verified" | "unreviewed";
  readonly evidenceReferences: readonly string[];
}

export interface TurningReviewCandidate {
  readonly caseId: string;
  readonly routeId: string;
  readonly selectionReason: string;
  readonly source: TurningReelConfig;
  readonly target: TurningReelConfig;
  readonly turnDirection: BodyTurnDirection;
  readonly summary: TurningReviewCandidateSummary;
  readonly steps: readonly TurningReviewStep[];
}

export interface TurningReviewEditedNode {
  readonly location: LowReelLocation;
  readonly planeSide: TurningPlaneSide;
  readonly phase: TurningPhase;
}

export interface TurningReviewEditedStep {
  readonly id: string;
  readonly left: TurningReviewEditedNode;
  readonly right: TurningReviewEditedNode;
  readonly continuationKind: TurningReviewContinuationKind;
}

export interface TurningReviewEditedPattern {
  readonly turnAfterIndex: number;
  readonly steps: readonly TurningReviewEditedStep[];
}

export interface TurningPatternReview {
  readonly outcome: TurningReviewOutcome | null;
  readonly notes: string;
  readonly editedPattern?: TurningReviewEditedPattern;
  readonly updatedAt: string;
}

export interface TurningReviewBatch {
  readonly id: string;
  readonly generator: string;
  readonly seed: number;
  readonly contentHash: string;
  readonly candidates: readonly TurningReviewCandidate[];
}

export interface TurningReviewArtifact {
  readonly schemaVersion: typeof TURNING_REVIEW_SCHEMA_VERSION;
  readonly batch: TurningReviewBatch;
  readonly reviews: Readonly<Partial<Record<string, TurningPatternReview>>>;
}

const REEL_POSITIONS = new Set<TurningReelPosition>(["low-native", "low-non-native", "low-back"]);
const REEL_OFFSETS = new Set<TurningReelOffset>([0, 1, 2, 3]);
const LOCATIONS = new Set<LowReelLocation>(TURNING_REVIEW_LOCATIONS);
const OUTCOMES = new Set<TurningReviewOutcome>(TURNING_REVIEW_OUTCOMES);
const CONTINUATION_KINDS = new Set<TurningReviewContinuationKind>(
  TURNING_REVIEW_CONTINUATION_KINDS
);
const REGIONS = new Set<TurningReviewRegion>([
  "source",
  "preparation",
  "turn-target",
  "recovery",
  "target"
]);

function fail(path: string, message: string): never {
  throw new Error(`Invalid turning review artifact at ${path}: ${message}`);
}

function objectAt(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(path, "expected an object.");
  }
  return value as Record<string, unknown>;
}

function arrayAt(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) fail(path, "expected an array.");
  return value;
}

function stringAt(value: unknown, path: string): string {
  if (typeof value !== "string") fail(path, "expected a string.");
  return value;
}

function nonEmptyStringAt(value: unknown, path: string): string {
  const result = stringAt(value, path);
  if (result.trim().length === 0) fail(path, "must not be empty.");
  return result;
}

function finiteNumberAt(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(path, "expected a finite number.");
  }
  return value;
}

function nonNegativeIntegerAt(value: unknown, path: string): number {
  const result = finiteNumberAt(value, path);
  if (!Number.isInteger(result) || result < 0) {
    fail(path, "expected a non-negative integer.");
  }
  return result;
}

function booleanAt(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") fail(path, "expected a boolean.");
  return value;
}

function enumAt<T extends string>(value: unknown, allowed: ReadonlySet<T>, path: string): T {
  if (typeof value !== "string" || !allowed.has(value as T)) {
    fail(path, `received unsupported value ${String(value)}.`);
  }
  return value as T;
}

function pointAt(value: unknown, path: string): TurningHandPoint {
  const object = objectAt(value, path);
  return {
    x: finiteNumberAt(object.x, `${path}.x`),
    y: finiteNumberAt(object.y, `${path}.y`)
  };
}

function reelConfigAt(value: unknown, path: string): TurningReelConfig {
  const object = objectAt(value, path);
  const direction = objectAt(object.direction, `${path}.direction`);
  const mode = enumAt(
    direction.mode,
    new Set(["same", "opposite"] as const),
    `${path}.direction.mode`
  );
  const parsedDirection =
    mode === "same"
      ? {
          mode,
          direction: enumAt(
            direction.direction,
            new Set(["clockwise", "counterclockwise"] as const),
            `${path}.direction.direction`
          )
        }
      : {
          mode,
          flow: enumAt(
            direction.flow,
            new Set(["inwards", "outwards"] as const),
            `${path}.direction.flow`
          )
        };
  const offset = nonNegativeIntegerAt(object.offset, `${path}.offset`) as TurningReelOffset;
  if (!REEL_OFFSETS.has(offset)) fail(`${path}.offset`, "expected an offset from 0 to 3.");

  return {
    left: enumAt(object.left, REEL_POSITIONS, `${path}.left`),
    right: enumAt(object.right, REEL_POSITIONS, `${path}.right`),
    direction: parsedDirection,
    offset
  };
}

function nodeAt(value: unknown, path: string): TurningReviewNode {
  const object = objectAt(value, path);
  return {
    location: enumAt(object.location, LOCATIONS, `${path}.location`),
    planeSide: enumAt(object.planeSide, new Set(["a", "b"]), `${path}.planeSide`),
    phase: enumAt(object.phase, new Set(["up", "down"]), `${path}.phase`),
    handPointBody: pointAt(object.handPointBody, `${path}.handPointBody`),
    handPointObserver: pointAt(object.handPointObserver, `${path}.handPointObserver`)
  };
}

function outgoingEdgeAt(value: unknown, path: string): TurningReviewOutgoingEdge | null {
  if (value === null) return null;
  const object = objectAt(value, path);
  const kind = enumAt(
    object.kind,
    new Set([...TURNING_REVIEW_CONTINUATION_KINDS, "body-turn"] as const),
    `${path}.kind`
  );
  return {
    kind,
    leftAction: stringAt(object.leftAction, `${path}.leftAction`),
    rightAction: stringAt(object.rightAction, `${path}.rightAction`),
    modelStatus: stringAt(object.modelStatus, `${path}.modelStatus`),
    provenance: arrayAt(object.provenance, `${path}.provenance`).map((entry, index) =>
      stringAt(entry, `${path}.provenance[${index}]`)
    )
  };
}

function stepAt(value: unknown, path: string): TurningReviewStep {
  const object = objectAt(value, path);
  const facing = finiteNumberAt(object.facing, `${path}.facing`);
  if (facing !== 0 && facing !== 180) fail(`${path}.facing`, "expected 0 or 180.");
  return {
    step: nonNegativeIntegerAt(object.step, `${path}.step`),
    facing,
    region: enumAt(object.region, REGIONS, `${path}.region`),
    left: nodeAt(object.left, `${path}.left`),
    right: nodeAt(object.right, `${path}.right`),
    outgoingEdge: outgoingEdgeAt(object.outgoingEdge, `${path}.outgoingEdge`)
  };
}

function summaryAt(value: unknown, path: string): TurningReviewCandidateSummary {
  const object = objectAt(value, path);
  return {
    timing: enumAt(object.timing, new Set(["TO", "SO", "TS", "SS"]), `${path}.timing`),
    sourceFamily: enumAt(object.sourceFamily, new Set(["mill", "weave"]), `${path}.sourceFamily`),
    targetFamily: enumAt(object.targetFamily, new Set(["mill", "weave"]), `${path}.targetFamily`),
    bridgeHalfbeats: nonNegativeIntegerAt(object.bridgeHalfbeats, `${path}.bridgeHalfbeats`),
    preparationHalfbeats: nonNegativeIntegerAt(
      object.preparationHalfbeats,
      `${path}.preparationHalfbeats`
    ),
    recoveryHalfbeats: nonNegativeIntegerAt(object.recoveryHalfbeats, `${path}.recoveryHalfbeats`),
    shortestBridgeHalfbeats: nonNegativeIntegerAt(
      object.shortestBridgeHalfbeats,
      `${path}.shortestBridgeHalfbeats`
    ),
    isShortest: booleanAt(object.isShortest, `${path}.isShortest`),
    modelStatus: enumAt(
      object.modelStatus,
      new Set(["valid", "unresolved"]),
      `${path}.modelStatus`
    ),
    evidenceStatus: enumAt(
      object.evidenceStatus,
      new Set(["exact-route-verified", "unreviewed"]),
      `${path}.evidenceStatus`
    ),
    evidenceReferences: arrayAt(object.evidenceReferences, `${path}.evidenceReferences`).map(
      (entry, index) => stringAt(entry, `${path}.evidenceReferences[${index}]`)
    )
  };
}

function candidateAt(value: unknown, path: string): TurningReviewCandidate {
  const object = objectAt(value, path);
  const steps = arrayAt(object.steps, `${path}.steps`).map((entry, index) =>
    stepAt(entry, `${path}.steps[${index}]`)
  );
  if (steps.length < 2) fail(`${path}.steps`, "expected at least two rows.");
  for (const [index, step] of steps.entries()) {
    if (step.step !== index) fail(`${path}.steps[${index}].step`, "steps must be sequential.");
  }
  if (steps.filter((step) => step.outgoingEdge?.kind === "body-turn").length !== 1) {
    fail(`${path}.steps`, "expected exactly one body-turn edge.");
  }

  return {
    caseId: nonEmptyStringAt(object.caseId, `${path}.caseId`),
    routeId: nonEmptyStringAt(object.routeId, `${path}.routeId`),
    selectionReason: stringAt(object.selectionReason, `${path}.selectionReason`),
    source: reelConfigAt(object.source, `${path}.source`),
    target: reelConfigAt(object.target, `${path}.target`),
    turnDirection: enumAt(
      object.turnDirection,
      new Set(["left", "right"]),
      `${path}.turnDirection`
    ),
    summary: summaryAt(object.summary, `${path}.summary`),
    steps
  };
}

function editedNodeAt(value: unknown, path: string): TurningReviewEditedNode {
  const object = objectAt(value, path);
  return {
    location: enumAt(object.location, LOCATIONS, `${path}.location`),
    planeSide: enumAt(object.planeSide, new Set(["a", "b"]), `${path}.planeSide`),
    phase: enumAt(object.phase, new Set(["up", "down"]), `${path}.phase`)
  };
}

function editedPatternAt(value: unknown, path: string): TurningReviewEditedPattern {
  const object = objectAt(value, path);
  const steps = arrayAt(object.steps, `${path}.steps`).map((entry, index) => {
    const step = objectAt(entry, `${path}.steps[${index}]`);
    return {
      id: nonEmptyStringAt(step.id, `${path}.steps[${index}].id`),
      left: editedNodeAt(step.left, `${path}.steps[${index}].left`),
      right: editedNodeAt(step.right, `${path}.steps[${index}].right`),
      continuationKind: enumAt(
        step.continuationKind,
        CONTINUATION_KINDS,
        `${path}.steps[${index}].continuationKind`
      )
    };
  });
  if (steps.length < 2) fail(`${path}.steps`, "expected at least two edited rows.");
  const turnAfterIndex = nonNegativeIntegerAt(object.turnAfterIndex, `${path}.turnAfterIndex`);
  if (turnAfterIndex >= steps.length - 1) {
    fail(`${path}.turnAfterIndex`, "the turn must have a row after it.");
  }

  return { turnAfterIndex, steps };
}

function reviewAt(value: unknown, path: string): TurningPatternReview {
  const object = objectAt(value, path);
  const outcome =
    object.outcome === null ? null : enumAt(object.outcome, OUTCOMES, `${path}.outcome`);
  return {
    outcome,
    notes: stringAt(object.notes, `${path}.notes`),
    ...(object.editedPattern === undefined
      ? {}
      : { editedPattern: editedPatternAt(object.editedPattern, `${path}.editedPattern`) }),
    updatedAt: nonEmptyStringAt(object.updatedAt, `${path}.updatedAt`)
  };
}

export function parseTurningReviewArtifact(value: unknown): TurningReviewArtifact {
  const root = objectAt(value, "$");
  if (root.schemaVersion !== TURNING_REVIEW_SCHEMA_VERSION) {
    fail("$.schemaVersion", `expected ${TURNING_REVIEW_SCHEMA_VERSION}.`);
  }
  const batchObject = objectAt(root.batch, "$.batch");
  const candidates = arrayAt(batchObject.candidates, "$.batch.candidates").map((entry, index) =>
    candidateAt(entry, `$.batch.candidates[${index}]`)
  );
  if (candidates.length === 0) fail("$.batch.candidates", "expected at least one candidate.");
  const caseIds = new Set<string>();
  for (const [index, candidate] of candidates.entries()) {
    if (caseIds.has(candidate.caseId)) {
      fail(`$.batch.candidates[${index}].caseId`, "case IDs must be unique.");
    }
    caseIds.add(candidate.caseId);
  }

  const reviewsObject = objectAt(root.reviews, "$.reviews");
  const reviews: Partial<Record<string, TurningPatternReview>> = {};
  for (const [caseId, review] of Object.entries(reviewsObject)) {
    if (!caseIds.has(caseId)) fail(`$.reviews.${caseId}`, "case ID is absent from the batch.");
    reviews[caseId] = reviewAt(review, `$.reviews.${caseId}`);
  }

  return {
    schemaVersion: TURNING_REVIEW_SCHEMA_VERSION,
    batch: {
      id: nonEmptyStringAt(batchObject.id, "$.batch.id"),
      generator: nonEmptyStringAt(batchObject.generator, "$.batch.generator"),
      seed: nonNegativeIntegerAt(batchObject.seed, "$.batch.seed"),
      contentHash: nonEmptyStringAt(batchObject.contentHash, "$.batch.contentHash"),
      candidates
    },
    reviews
  };
}

export function serializeTurningReviewArtifact(artifact: TurningReviewArtifact): string {
  return `${JSON.stringify(artifact, null, 2)}\n`;
}
