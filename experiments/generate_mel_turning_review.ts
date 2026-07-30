import { access, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type {
  TurningReelDirection,
  TurningReelOffset
} from "@/lab/experiments/mel-turning/adapter/melBeatGraphAdapter";
import {
  solveLowReelTurningRoutes,
  type LowReelRouteSolverResult,
  type LowReelRouteState,
  type LowReelTurningRoute
} from "@/lab/experiments/mel-turning/model/lowReelRouteSolver";
import {
  buildLowReelRouteProjectionSteps,
  type LowReelRouteProjectionStep
} from "@/lab/experiments/mel-turning/model/lowReelRouteProjection";
import { projectTurningHandPoint } from "@/lab/experiments/mel-turning/model/turningDisplayFrame";
import { getLowReelLocation } from "@/lab/experiments/mel-turning/model/turnTopology";
import {
  TURNING_REVIEW_SCHEMA_VERSION,
  serializeTurningReviewArtifact,
  type TurningReviewArtifact,
  type TurningReviewCandidate,
  type TurningReviewNode,
  type TurningReviewOutgoingEdge
} from "@/lab/experiments/mel-turning/review/turningReviewArtifact";
import type {
  BodyTurnDirection,
  TurningHand,
  TurningHandPoint
} from "@/lab/experiments/mel-turning/model/turningTypes";

export const MEL_TURNING_REVIEW_BATCH_ID = "low-weave-opposite-review-001";
export const MEL_TURNING_REVIEW_SEED = 20260730;
export const MEL_TURNING_REVIEW_CASE_COUNT = 16;

export interface MelTurningReviewCase {
  readonly caseId: string;
  readonly selectionReason: string;
  readonly result: LowReelRouteSolverResult;
  readonly route: LowReelTurningRoute;
}

export interface MelTurningReviewStep {
  readonly batchId: string;
  readonly caseId: string;
  readonly routeId: string;
  readonly step: number;
  readonly facing: number;
  readonly region: "source" | "preparation" | "turn-target" | "recovery" | "target";
  readonly leftNode: string;
  readonly rightNode: string;
  readonly leftAnchorBody: string;
  readonly rightAnchorBody: string;
  readonly leftAnchorObserver: string;
  readonly rightAnchorObserver: string;
  readonly edgeKind: string;
  readonly leftAction: string;
  readonly rightAction: string;
  readonly edgeModelStatus: string;
  readonly provenance: string;
}

export interface MelTurningReviewBatch {
  readonly batchId: string;
  readonly seed: number;
  readonly cases: readonly MelTurningReviewCase[];
  readonly steps: readonly MelTurningReviewStep[];
  readonly casesCsv: string;
  readonly stepsCsv: string;
  readonly workbenchArtifact: TurningReviewArtifact;
  readonly workbenchJson: string;
}

export interface WriteMelTurningReviewBatchOptions {
  /**
   * A generated directory may sit beside an exported physical-review artifact,
   * so replacing its inputs must always be an explicit CLI or API choice.
   */
  readonly overwrite?: boolean;
}

function fnv1a(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function directionId(direction: TurningReelDirection): string {
  if (direction.mode === "same") {
    return direction.direction === "clockwise" ? "same-cw" : "same-ccw";
  }
  return direction.flow === "inwards" ? "opposite-in" : "opposite-out";
}

function cloneDirection(direction: TurningReelDirection): TurningReelDirection {
  return direction.mode === "same"
    ? { mode: "same", direction: direction.direction }
    : { mode: "opposite", flow: direction.flow };
}

interface OppositeWeaveReviewQuery {
  readonly timing: "SO" | "TO";
  readonly sourceOffset: TurningReelOffset;
  readonly targetOffset: TurningReelOffset;
  readonly offsetClass: "same-offset" | "alternate-offset";
  readonly includeEveryRoute: boolean;
}

const OPPOSITE_WEAVE_REVIEW_QUERIES = [
  {
    timing: "SO",
    sourceOffset: 0,
    targetOffset: 0,
    offsetClass: "same-offset",
    includeEveryRoute: true
  },
  {
    timing: "TO",
    sourceOffset: 1,
    targetOffset: 1,
    offsetClass: "same-offset",
    includeEveryRoute: true
  },
  {
    timing: "SO",
    sourceOffset: 0,
    targetOffset: 2,
    offsetClass: "alternate-offset",
    includeEveryRoute: false
  },
  {
    timing: "TO",
    sourceOffset: 1,
    targetOffset: 3,
    offsetClass: "alternate-offset",
    includeEveryRoute: false
  }
] as const satisfies readonly OppositeWeaveReviewQuery[];

function solveOppositeWeaveQuery(
  query: OppositeWeaveReviewQuery,
  turnDirection: BodyTurnDirection
): LowReelRouteSolverResult {
  return solveLowReelTurningRoutes({
    source: {
      left: "low-native",
      right: "low-non-native",
      direction: { mode: "opposite", flow: "inwards" },
      offset: query.sourceOffset
    },
    target: {
      left: "low-native",
      right: "low-non-native",
      direction: { mode: "opposite", flow: "outwards" },
      offset: query.targetOffset
    },
    turnDirection,
    options: {
      maxRoutes: 40,
      maxExtraHalfbeats: 0,
      includeUnresolved: true
    }
  });
}

function routesForOppositeWeaveQuery(
  query: OppositeWeaveReviewQuery,
  turnDirection: BodyTurnDirection
): readonly {
  readonly result: LowReelRouteSolverResult;
  readonly route: LowReelTurningRoute;
  readonly selectionReason: string;
}[] {
  const result = solveOppositeWeaveQuery(query, turnDirection);
  if (result.shortestBridgeHalfbeats !== 1) {
    throw new Error(
      `Expected a direct ${query.timing} opposite-weave route for offset ${query.sourceOffset}→${query.targetOffset}, turn ${turnDirection}.`
    );
  }
  const routes = result.routes.filter((route) => route.isShortest && route.bridgeHalfbeats === 1);
  if (routes.length !== result.shortestRouteCount) {
    throw new Error(
      `Expected all ${result.shortestRouteCount} direct routes for ${query.timing} offset ${query.sourceOffset}→${query.targetOffset}, turn ${turnDirection}; materialized ${routes.length}.`
    );
  }
  const selectedRoutes = query.includeEveryRoute ? routes : routes.slice(0, 1);
  return selectedRoutes.map((route, index) => ({
    result,
    route,
    selectionReason: [
      "left low weave",
      "opposite inwards→outwards",
      query.timing,
      query.offsetClass,
      `offset ${query.sourceOffset}→${query.targetOffset}`,
      `turn ${turnDirection}`,
      query.includeEveryRoute
        ? `phase variant ${index + 1}/${routes.length}`
        : `first phase representative; ${routes.length - 1} partner deferred`
    ].join(" · ")
  }));
}

function buildOppositeWeaveReviewSelection(): readonly Omit<MelTurningReviewCase, "caseId">[] {
  const selection = OPPOSITE_WEAVE_REVIEW_QUERIES.flatMap((query) =>
    (["left", "right"] as const).flatMap((turnDirection) =>
      routesForOppositeWeaveQuery(query, turnDirection)
    )
  );
  if (selection.length !== MEL_TURNING_REVIEW_CASE_COUNT) {
    throw new Error(
      `Expected ${MEL_TURNING_REVIEW_CASE_COUNT} opposite-weave review routes, received ${selection.length}.`
    );
  }
  return selection;
}

function nodeLabel(state: LowReelRouteState, hand: TurningHand): string {
  const handState = hand === "left" ? state.left : state.right;
  const location = getLowReelLocation(handState);
  if (!location) throw new Error(`Review route contains unsupported lane ${handState.laneId}.`);
  return `${location} ${handState.planeSide} ${handState.phase}`;
}

function pointLabel(point: TurningHandPoint): string {
  return `${point.x.toFixed(3)} ${point.y.toFixed(3)}`;
}

function reviewStepsForCase(reviewCase: MelTurningReviewCase): readonly MelTurningReviewStep[] {
  return buildLowReelRouteProjectionSteps(reviewCase.result, reviewCase.route).map(
    (projectionStep) => {
      const interval = projectionStep.outgoingInterval;
      const leftObserver = projectTurningHandPoint(
        projectionStep.state.left.handPoint,
        projectionStep.state.facing,
        "observer-relative"
      );
      const rightObserver = projectTurningHandPoint(
        projectionStep.state.right.handPoint,
        projectionStep.state.facing,
        "observer-relative"
      );
      return {
        batchId: MEL_TURNING_REVIEW_BATCH_ID,
        caseId: reviewCase.caseId,
        routeId: reviewCase.route.id,
        step: projectionStep.step,
        facing: projectionStep.state.facing,
        region: projectionStep.region,
        leftNode: nodeLabel(projectionStep.state, "left"),
        rightNode: nodeLabel(projectionStep.state, "right"),
        leftAnchorBody: pointLabel(projectionStep.state.left.handPoint),
        rightAnchorBody: pointLabel(projectionStep.state.right.handPoint),
        leftAnchorObserver: pointLabel(leftObserver),
        rightAnchorObserver: pointLabel(rightObserver),
        edgeKind: interval?.kind ?? "",
        leftAction: interval?.leftAction ?? "",
        rightAction: interval?.rightAction ?? "",
        edgeModelStatus: interval?.modelStatus ?? "",
        provenance: interval?.provenance.join("; ") ?? ""
      };
    }
  );
}

function reviewNodeForState(state: LowReelRouteState, hand: TurningHand): TurningReviewNode {
  const handState = hand === "left" ? state.left : state.right;
  const location = getLowReelLocation(handState);
  if (!location) throw new Error(`Review route contains unsupported lane ${handState.laneId}.`);
  return {
    location,
    planeSide: handState.planeSide,
    phase: handState.phase,
    handPointBody: { ...handState.handPoint },
    handPointObserver: projectTurningHandPoint(
      handState.handPoint,
      state.facing,
      "observer-relative"
    )
  };
}

function artifactOutgoingEdge(
  projectionStep: LowReelRouteProjectionStep
): TurningReviewOutgoingEdge | null {
  return projectionStep.outgoingInterval
    ? {
        ...projectionStep.outgoingInterval,
        provenance: [...projectionStep.outgoingInterval.provenance]
      }
    : null;
}

function artifactCandidate(reviewCase: MelTurningReviewCase): TurningReviewCandidate {
  const { result, route } = reviewCase;
  const shortestBridgeHalfbeats = result.shortestBridgeHalfbeats;
  if (shortestBridgeHalfbeats === null) {
    throw new Error(`Selected review route ${route.id} has no shortest bridge length.`);
  }
  return {
    caseId: reviewCase.caseId,
    routeId: route.id,
    selectionReason: reviewCase.selectionReason,
    source: {
      ...result.source,
      direction: cloneDirection(result.source.direction)
    },
    target: {
      ...result.target,
      direction: cloneDirection(result.target.direction)
    },
    turnDirection: result.turnDirection,
    summary: {
      timing: result.compatibility.sourceTiming,
      sourceFamily: result.compatibility.sourcePatternType,
      targetFamily: result.compatibility.targetPatternType,
      bridgeHalfbeats: route.bridgeHalfbeats,
      preparationHalfbeats: route.preparationHalfbeats,
      recoveryHalfbeats: route.recoveryHalfbeats,
      shortestBridgeHalfbeats,
      isShortest: route.isShortest,
      modelStatus: route.modelStatus,
      evidenceStatus: route.evidenceStatus,
      evidenceReferences: [...route.evidenceReferences]
    },
    steps: buildLowReelRouteProjectionSteps(result, route).map((projectionStep) => ({
      step: projectionStep.step,
      facing: projectionStep.state.facing,
      region: projectionStep.region,
      left: reviewNodeForState(projectionStep.state, "left"),
      right: reviewNodeForState(projectionStep.state, "right"),
      outgoingEdge: artifactOutgoingEdge(projectionStep)
    }))
  };
}

function workbenchArtifact(cases: readonly MelTurningReviewCase[]): TurningReviewArtifact {
  const candidates = cases.map(artifactCandidate);
  const contentHash = fnv1a(JSON.stringify(candidates)).toString(16).padStart(8, "0");
  return {
    schemaVersion: TURNING_REVIEW_SCHEMA_VERSION,
    batch: {
      id: MEL_TURNING_REVIEW_BATCH_ID,
      generator: "low-reel-route-solver-v1",
      seed: MEL_TURNING_REVIEW_SEED,
      contentHash,
      candidates
    },
    reviews: {}
  };
}

function csvCell(value: string | number | boolean): string {
  const stringValue = String(value);
  if (!/[",\r\n]/.test(stringValue)) return stringValue;
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function csvRow(values: readonly (string | number | boolean)[]): string {
  return values.map(csvCell).join(",");
}

function casesCsv(cases: readonly MelTurningReviewCase[]): string {
  const header = [
    "batch_id",
    "case_id",
    "route_id",
    "selection_reason",
    "seed",
    "source_left",
    "source_right",
    "source_direction",
    "source_offset",
    "target_left",
    "target_right",
    "target_direction",
    "target_offset",
    "timing",
    "source_family",
    "target_family",
    "turn_direction",
    "bridge_halfbeats",
    "preparation_halfbeats",
    "recovery_halfbeats",
    "shortest_bridge_halfbeats",
    "is_shortest",
    "model_status",
    "evidence_status",
    "evidence_references"
  ];
  const rows = cases.map(({ caseId, selectionReason, result, route }) =>
    csvRow([
      MEL_TURNING_REVIEW_BATCH_ID,
      caseId,
      route.id,
      selectionReason,
      MEL_TURNING_REVIEW_SEED,
      result.source.left,
      result.source.right,
      directionId(result.source.direction),
      result.source.offset,
      result.target.left,
      result.target.right,
      directionId(result.target.direction),
      result.target.offset,
      result.compatibility.sourceTiming,
      result.compatibility.sourcePatternType,
      result.compatibility.targetPatternType,
      result.turnDirection,
      route.bridgeHalfbeats,
      route.preparationHalfbeats,
      route.recoveryHalfbeats,
      result.shortestBridgeHalfbeats ?? "",
      route.isShortest,
      route.modelStatus,
      route.evidenceStatus,
      route.evidenceReferences.join("; ")
    ])
  );
  return `${[csvRow(header), ...rows].join("\n")}\n`;
}

function stepsCsv(steps: readonly MelTurningReviewStep[]): string {
  const header = [
    "batch_id",
    "case_id",
    "route_id",
    "step",
    "facing",
    "region",
    "left_node",
    "right_node",
    "left_anchor_body",
    "right_anchor_body",
    "left_anchor_observer",
    "right_anchor_observer",
    "edge_kind",
    "left_action",
    "right_action",
    "edge_model_status",
    "provenance"
  ];
  const rows = steps.map((step) =>
    csvRow([
      step.batchId,
      step.caseId,
      step.routeId,
      step.step,
      step.facing,
      step.region,
      step.leftNode,
      step.rightNode,
      step.leftAnchorBody,
      step.rightAnchorBody,
      step.leftAnchorObserver,
      step.rightAnchorObserver,
      step.edgeKind,
      step.leftAction,
      step.rightAction,
      step.edgeModelStatus,
      step.provenance
    ])
  );
  return `${[csvRow(header), ...rows].join("\n")}\n`;
}

export function buildMelTurningReviewBatch(): MelTurningReviewBatch {
  const selected = buildOppositeWeaveReviewSelection();
  const cases: MelTurningReviewCase[] = selected.map((entry, index) => ({
    caseId: `${MEL_TURNING_REVIEW_BATCH_ID}-${String(index + 1).padStart(2, "0")}`,
    ...entry
  }));
  const steps = cases.flatMap(reviewStepsForCase);
  const artifact = workbenchArtifact(cases);
  return {
    batchId: MEL_TURNING_REVIEW_BATCH_ID,
    seed: MEL_TURNING_REVIEW_SEED,
    cases,
    steps,
    casesCsv: casesCsv(cases),
    stepsCsv: stepsCsv(steps),
    workbenchArtifact: artifact,
    workbenchJson: serializeTurningReviewArtifact(artifact)
  };
}

export async function writeMelTurningReviewBatch(
  outputDirectory = resolve(
    process.cwd(),
    "research/mel-turning/candidates",
    MEL_TURNING_REVIEW_BATCH_ID
  ),
  options: WriteMelTurningReviewBatchOptions = {}
): Promise<void> {
  await mkdir(outputDirectory, { recursive: true });
  const casesPath = resolve(outputDirectory, "cases.csv");
  const stepsPath = resolve(outputDirectory, "steps.csv");
  const workbenchPath = resolve(outputDirectory, "workbench.json");

  if (!options.overwrite) {
    const existing = (
      await Promise.all(
        [casesPath, stepsPath, workbenchPath].map(async (path) => {
          try {
            await access(path);
            return path;
          } catch {
            return null;
          }
        })
      )
    ).filter((path): path is string => path !== null);

    if (existing.length > 0) {
      throw new Error(
        `Refusing to replace existing review batch files: ${existing.join(
          ", "
        )}. Pass overwrite: true or --force only after preserving any exported review.`
      );
    }
  }

  const batch = buildMelTurningReviewBatch();
  const flag = options.overwrite ? "w" : "wx";
  await Promise.all([
    writeFile(casesPath, batch.casesCsv, { encoding: "utf8", flag }),
    writeFile(stepsPath, batch.stepsCsv, { encoding: "utf8", flag }),
    writeFile(workbenchPath, batch.workbenchJson, { encoding: "utf8", flag })
  ]);
}

const executedFile = process.argv[1] ? resolve(process.argv[1]) : "";
if (executedFile === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const separatorIndex = args.indexOf("--");
  if (separatorIndex >= 0) args.splice(separatorIndex, 1);
  const forceIndex = args.indexOf("--force");
  const overwrite = forceIndex >= 0;
  if (overwrite) args.splice(forceIndex, 1);

  let outputDirectory: string | undefined;
  const outputIndex = args.indexOf("--output");
  if (outputIndex >= 0) {
    const requestedOutput = args[outputIndex + 1];
    if (!requestedOutput) {
      throw new Error("--output requires a directory path.");
    }
    outputDirectory = resolve(requestedOutput);
    args.splice(outputIndex, 2);
  }
  if (args.length > 0) {
    throw new Error(`Unknown review-batch arguments: ${args.join(" ")}`);
  }

  await writeMelTurningReviewBatch(outputDirectory, { overwrite });
}
