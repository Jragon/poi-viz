import { access, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildTurningReelCycle,
  type TurningReelConfig,
  type TurningReelDirection
} from "@/lab/experiments/mel-turning/adapter/melBeatGraphAdapter";
import {
  LOW_REEL_ROUTE_OFFSETS,
  LOW_REEL_ROUTE_POSITIONS,
  lowReelConfigId,
  solveLowReelTurningRoutes,
  type LowReelRouteCycleEntry,
  type LowReelRouteEdge,
  type LowReelRouteSolverInput,
  type LowReelRouteSolverResult,
  type LowReelRouteState,
  type LowReelTurningRoute
} from "@/lab/experiments/mel-turning/model/lowReelRouteSolver";
import { projectTurningHandPoint } from "@/lab/experiments/mel-turning/model/turningDisplayFrame";
import {
  getCompatibleTargetOffsets,
  getObserverPreservingTargetDirection
} from "@/lab/experiments/mel-turning/model/turningEndpointCompatibility";
import { getLowReelLocation } from "@/lab/experiments/mel-turning/model/turnTopology";
import type {
  BodyTurnDirection,
  TurningHand,
  TurningHandPoint
} from "@/lab/experiments/mel-turning/model/turningTypes";

export const MEL_TURNING_REVIEW_BATCH_ID = "solver-review-001";
export const MEL_TURNING_REVIEW_SEED = 20260730;
export const MEL_TURNING_REVIEW_CASE_COUNT = 16;

interface ReviewQuery extends Omit<LowReelRouteSolverInput, "options"> {
  readonly id: string;
  readonly timing: "TO" | "SO" | "TS" | "SS";
  readonly sourceFamily: "mill" | "weave";
  readonly targetFamily: "mill" | "weave";
  readonly hasBack: boolean;
}

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
}

export interface WriteMelTurningReviewBatchOptions {
  /**
   * Existing CSVs may contain physical-review annotations, so replacing them
   * must always be an explicit CLI or API choice.
   */
  readonly overwrite?: boolean;
}

const DIRECTION_OPTIONS = [
  { mode: "same", direction: "clockwise" },
  { mode: "same", direction: "counterclockwise" },
  { mode: "opposite", flow: "inwards" },
  { mode: "opposite", flow: "outwards" }
] as const satisfies readonly TurningReelDirection[];

const VERIFIED_WEAVE_SOURCE: TurningReelConfig = {
  left: "low-native",
  right: "low-non-native",
  direction: { mode: "same", direction: "clockwise" },
  offset: 3
};

const VERIFIED_WEAVE_TARGET: TurningReelConfig = {
  left: "low-native",
  right: "low-non-native",
  direction: { mode: "same", direction: "counterclockwise" },
  offset: 1
};

const VERIFIED_PREPARATION_SOURCE: TurningReelConfig = {
  left: "low-native",
  right: "low-native",
  direction: { mode: "same", direction: "clockwise" },
  offset: 1
};

const VERIFIED_PREPARATION_TARGET: TurningReelConfig = {
  left: "low-native",
  right: "low-native",
  direction: { mode: "same", direction: "counterclockwise" },
  offset: 3
};

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

function queryId(
  source: TurningReelConfig,
  target: TurningReelConfig,
  turnDirection: BodyTurnDirection
): string {
  return `${lowReelConfigId(source)}>${lowReelConfigId(target)}:turn-${turnDirection}`;
}

function cloneDirection(direction: TurningReelDirection): TurningReelDirection {
  return direction.mode === "same"
    ? { mode: "same", direction: direction.direction }
    : { mode: "opposite", flow: direction.flow };
}

function enumerateReviewQueries(): readonly ReviewQuery[] {
  const queries: ReviewQuery[] = [];
  for (const left of LOW_REEL_ROUTE_POSITIONS) {
    for (const right of LOW_REEL_ROUTE_POSITIONS) {
      for (const direction of DIRECTION_OPTIONS) {
        for (const offset of LOW_REEL_ROUTE_OFFSETS) {
          const source: TurningReelConfig = {
            left,
            right,
            direction: cloneDirection(direction),
            offset
          };
          const sourceCycle = buildTurningReelCycle(source);
          for (const targetLeft of LOW_REEL_ROUTE_POSITIONS) {
            for (const targetRight of LOW_REEL_ROUTE_POSITIONS) {
              const targetDirection = getObserverPreservingTargetDirection(source.direction);
              const targetPositions = { left: targetLeft, right: targetRight };
              for (const targetOffset of getCompatibleTargetOffsets(source, targetPositions)) {
                const target: TurningReelConfig = {
                  ...targetPositions,
                  direction: cloneDirection(targetDirection),
                  offset: targetOffset
                };
                const targetCycle = buildTurningReelCycle(target);
                for (const turnDirection of ["left", "right"] as const) {
                  queries.push({
                    id: queryId(source, target, turnDirection),
                    source,
                    target,
                    turnDirection,
                    timing: sourceCycle.timing,
                    sourceFamily: sourceCycle.patternType,
                    targetFamily: targetCycle.patternType,
                    hasBack:
                      source.left === "low-back" ||
                      source.right === "low-back" ||
                      target.left === "low-back" ||
                      target.right === "low-back"
                  });
                }
              }
            }
          }
        }
      }
    }
  }
  return queries;
}

function queryFeatureTokens(query: ReviewQuery): readonly string[] {
  return [
    `timing:${query.timing}`,
    `turn:${query.turnDirection}`,
    `direction:${directionId(query.source.direction)}`,
    `family:${query.sourceFamily}->${query.targetFamily}`,
    `back:${query.hasBack ? "yes" : "no"}`,
    `source-offset-parity:${query.source.offset % 2}`,
    `target-offset:${query.target.offset}`
  ];
}

function selectDiverseQueries(
  queries: readonly ReviewQuery[],
  count: number,
  seed: number
): readonly ReviewQuery[] {
  const selected: ReviewQuery[] = [];
  const selectedIds = new Set<string>();
  const featureCounts = new Map<string, number>();

  while (selected.length < count) {
    let best: ReviewQuery | undefined;
    let bestScore = Number.NEGATIVE_INFINITY;
    let bestTie = Number.MAX_SAFE_INTEGER;
    for (const query of queries) {
      if (selectedIds.has(query.id)) continue;
      const tokens = queryFeatureTokens(query);
      const novelty = tokens.reduce(
        (sum, token) => sum + 1 / (1 + (featureCounts.get(token) ?? 0)),
        0
      );
      const tie = fnv1a(`${seed}:${query.id}`);
      if (novelty > bestScore || (novelty === bestScore && tie < bestTie)) {
        best = query;
        bestScore = novelty;
        bestTie = tie;
      }
    }
    if (!best) break;
    selected.push(best);
    selectedIds.add(best.id);
    for (const token of queryFeatureTokens(best)) {
      featureCounts.set(token, (featureCounts.get(token) ?? 0) + 1);
    }
  }
  return selected;
}

function solveReviewQuery(query: ReviewQuery): LowReelRouteSolverResult {
  return solveLowReelTurningRoutes({
    source: query.source,
    target: query.target,
    turnDirection: query.turnDirection,
    options: {
      maxRoutes: 160,
      maxExtraHalfbeats: 2,
      includeUnresolved: true
    }
  });
}

function routeShape(route: LowReelTurningRoute): string {
  if (route.preparationHalfbeats === 0 && route.recoveryHalfbeats === 0) return "turn";
  if (route.preparationHalfbeats > 0 && route.recoveryHalfbeats === 0) {
    return "prepare-turn";
  }
  if (route.preparationHalfbeats === 0 && route.recoveryHalfbeats > 0) {
    return "turn-recover";
  }
  return "prepare-turn-recover";
}

function routeFeatureTokens(query: ReviewQuery, route: LowReelTurningRoute): readonly string[] {
  const turn = route.edges[route.turnEdgeIndex];
  return [
    ...queryFeatureTokens(query),
    `shape:${routeShape(route)}`,
    `model:${route.modelStatus}`,
    `shortest:${route.isShortest ? "yes" : "no"}`,
    `length:${route.bridgeHalfbeats}`,
    `mechanism:${turn?.kind === "body-turn" ? `${turn.leftAction}-${turn.rightAction}` : "missing"}`
  ];
}

function routeTie(seed: number, query: ReviewQuery, route: LowReelTurningRoute): number {
  return fnv1a(`${seed}:${query.id}:${route.id}`);
}

interface SolvedQuery {
  readonly query: ReviewQuery;
  readonly result: LowReelRouteSolverResult;
}

function chooseCandidatePairs(
  solved: readonly SolvedQuery[],
  pairCount: number,
  seed: number
): readonly { readonly solved: SolvedQuery; readonly routes: readonly LowReelTurningRoute[] }[] {
  const chosen: {
    solved: SolvedQuery;
    routes: readonly LowReelTurningRoute[];
  }[] = [];
  const featureCounts = new Map<string, number>();
  const available = solved.filter(({ result }) =>
    result.routes.some((route) => route.evidenceStatus === "unreviewed")
  );

  while (chosen.length < pairCount) {
    let best:
      | {
          solved: SolvedQuery;
          routes: readonly LowReelTurningRoute[];
          score: number;
          tie: number;
        }
      | undefined;
    for (const item of available) {
      if (chosen.some((entry) => entry.solved.query.id === item.query.id)) continue;
      const routes = item.result.routes
        .filter((route) => route.evidenceStatus === "unreviewed")
        .sort((left, right) => {
          const leftInterest =
            (left.bridgeHalfbeats > (item.result.shortestBridgeHalfbeats ?? 0) ? 4 : 0) +
            (left.preparationHalfbeats > 0 ? 2 : 0) +
            (left.recoveryHalfbeats > 0 ? 2 : 0) +
            (left.modelStatus === "unresolved" ? 1 : 0);
          const rightInterest =
            (right.bridgeHalfbeats > (item.result.shortestBridgeHalfbeats ?? 0) ? 4 : 0) +
            (right.preparationHalfbeats > 0 ? 2 : 0) +
            (right.recoveryHalfbeats > 0 ? 2 : 0) +
            (right.modelStatus === "unresolved" ? 1 : 0);
          return (
            rightInterest - leftInterest ||
            routeTie(seed, item.query, left) - routeTie(seed, item.query, right)
          );
        });
      const first = routes[0];
      if (!first) continue;
      const second =
        routes.find(
          (candidate) =>
            candidate.id !== first.id &&
            (routeShape(candidate) !== routeShape(first) ||
              candidate.edges[candidate.turnEdgeIndex]?.id !== first.edges[first.turnEdgeIndex]?.id)
        ) ?? routes[1];
      if (!second) continue;
      const pair = [first, second];
      const tokens = [...new Set(pair.flatMap((route) => routeFeatureTokens(item.query, route)))];
      const score = tokens.reduce(
        (sum, token) => sum + 1 / (1 + (featureCounts.get(token) ?? 0)),
        0
      );
      const tie = fnv1a(`${seed}:pair:${item.query.id}`);
      if (!best || score > best.score || (score === best.score && tie < best.tie)) {
        best = { solved: item, routes: pair, score, tie };
      }
    }
    if (!best) break;
    chosen.push({ solved: best.solved, routes: best.routes });
    for (const route of best.routes) {
      for (const token of routeFeatureTokens(best.solved.query, route)) {
        featureCounts.set(token, (featureCounts.get(token) ?? 0) + 1);
      }
    }
  }
  return chosen;
}

function findVerifiedControls(): readonly {
  readonly result: LowReelRouteSolverResult;
  readonly route: LowReelTurningRoute;
  readonly reason: string;
}[] {
  const weaveLeft = solveLowReelTurningRoutes({
    source: VERIFIED_WEAVE_SOURCE,
    target: VERIFIED_WEAVE_TARGET,
    turnDirection: "left",
    options: { maxRoutes: 20 }
  });
  const weaveRight = solveLowReelTurningRoutes({
    source: VERIFIED_WEAVE_SOURCE,
    target: VERIFIED_WEAVE_TARGET,
    turnDirection: "right",
    options: { maxRoutes: 20 }
  });
  const preparation = solveLowReelTurningRoutes({
    source: VERIFIED_PREPARATION_SOURCE,
    target: VERIFIED_PREPARATION_TARGET,
    turnDirection: "right",
    options: { maxRoutes: 160, maxExtraHalfbeats: 2 }
  });
  const weaveLeftVerified = weaveLeft.routes.filter(
    (route) => route.evidenceStatus === "exact-route-verified"
  );
  const weaveRightVerified = weaveRight.routes.filter(
    (route) => route.evidenceStatus === "exact-route-verified"
  );
  const preparationVerified = preparation.routes.find(
    (route) => route.evidenceStatus === "exact-route-verified" && route.preparationHalfbeats === 1
  );
  const controls = [
    ...(weaveLeftVerified[0]
      ? [
          {
            result: weaveLeft,
            route: weaveLeftVerified[0],
            reason: "verified direct control · turn left"
          }
        ]
      : []),
    ...(weaveLeftVerified[1]
      ? [
          {
            result: weaveLeft,
            route: weaveLeftVerified[1],
            reason: "verified adjacent-phase direct control · turn left"
          }
        ]
      : []),
    ...(weaveRightVerified[0]
      ? [
          {
            result: weaveRight,
            route: weaveRightVerified[0],
            reason: "verified direct control · turn right"
          }
        ]
      : []),
    ...(preparationVerified
      ? [
          {
            result: preparation,
            route: preparationVerified,
            reason: "verified same-anchor preparation control"
          }
        ]
      : [])
  ];
  if (controls.length !== 4) {
    throw new Error(`Expected four verified controls, received ${controls.length}.`);
  }
  return controls;
}

function cycleStepForState(cycle: readonly LowReelRouteCycleEntry[], stateId: string): number {
  const entry = cycle.find((candidate) => candidate.state.id === stateId);
  if (!entry) throw new Error(`Route state ${stateId} is not in the selected endpoint cycle.`);
  return entry.cycleStep;
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

interface ReviewStepDraft {
  readonly state: LowReelRouteState;
  readonly region: MelTurningReviewStep["region"];
  edge?: LowReelRouteEdge | null;
  cycleEdgeLabel?: string;
}

function buildReviewStepDrafts(
  result: LowReelRouteSolverResult,
  route: LowReelTurningRoute
): readonly ReviewStepDraft[] {
  const sourceStep = cycleStepForState(result.sourceCycle, route.states[0]!.id);
  const targetStep = cycleStepForState(
    result.targetCycle,
    route.states[route.states.length - 1]!.id
  );
  const drafts: ReviewStepDraft[] = [];

  for (let offset = 0; offset <= 4; offset += 1) {
    const cycleEntry = result.sourceCycle[(sourceStep + offset) % 4];
    if (!cycleEntry) throw new Error("Source review cycle is incomplete.");
    drafts.push({
      state: cycleEntry.state,
      region: "source",
      ...(offset < 4 ? { cycleEdgeLabel: "source-cycle" } : {})
    });
  }

  for (const [edgeIndex, edge] of route.edges.entries()) {
    const previous = drafts[drafts.length - 1];
    if (!previous) throw new Error("Review route has no source boundary.");
    previous.edge = edge;
    const nextState = route.states[edgeIndex + 1];
    if (!nextState) throw new Error(`Review route has no state after bridge edge ${edgeIndex}.`);
    const afterTurn = edgeIndex >= route.turnEdgeIndex;
    const isGoal = edgeIndex === route.edges.length - 1;
    const region: MelTurningReviewStep["region"] =
      edge.kind === "body-turn" && !isGoal
        ? "turn-target"
        : isGoal
          ? "target"
          : afterTurn
            ? "recovery"
            : "preparation";
    drafts.push({ state: nextState, region });
  }

  for (let offset = 1; offset <= 4; offset += 1) {
    const previous = drafts[drafts.length - 1];
    if (!previous) throw new Error("Review route has no target boundary.");
    previous.cycleEdgeLabel = "target-cycle";
    const cycleEntry = result.targetCycle[(targetStep + offset) % 4];
    if (!cycleEntry) throw new Error("Target review cycle is incomplete.");
    drafts.push({ state: cycleEntry.state, region: "target" });
  }
  return drafts;
}

function reviewStepsForCase(reviewCase: MelTurningReviewCase): readonly MelTurningReviewStep[] {
  return buildReviewStepDrafts(reviewCase.result, reviewCase.route).map((draft, step) => {
    const edge = draft.edge;
    const leftObserver = projectTurningHandPoint(
      draft.state.left.handPoint,
      draft.state.facing,
      "observer-relative"
    );
    const rightObserver = projectTurningHandPoint(
      draft.state.right.handPoint,
      draft.state.facing,
      "observer-relative"
    );
    return {
      batchId: MEL_TURNING_REVIEW_BATCH_ID,
      caseId: reviewCase.caseId,
      routeId: reviewCase.route.id,
      step,
      facing: draft.state.facing,
      region: draft.region,
      leftNode: nodeLabel(draft.state, "left"),
      rightNode: nodeLabel(draft.state, "right"),
      leftAnchorBody: pointLabel(draft.state.left.handPoint),
      rightAnchorBody: pointLabel(draft.state.right.handPoint),
      leftAnchorObserver: pointLabel(leftObserver),
      rightAnchorObserver: pointLabel(rightObserver),
      edgeKind: edge?.kind ?? draft.cycleEdgeLabel ?? "",
      leftAction: edge?.leftAction ?? (draft.cycleEdgeLabel ? "reel-continuation" : ""),
      rightAction: edge?.rightAction ?? (draft.cycleEdgeLabel ? "reel-continuation" : ""),
      edgeModelStatus: edge?.modelStatus ?? (draft.cycleEdgeLabel ? "valid" : ""),
      provenance: edge?.provenance.join("; ") ?? draft.cycleEdgeLabel ?? ""
    };
  });
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
    "evidence_references",
    "review_verdict",
    "naturalness",
    "review_notes"
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
      route.evidenceReferences.join("; "),
      "",
      "",
      ""
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
    "provenance",
    "physical_correction",
    "review_notes"
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
      step.provenance,
      "",
      ""
    ])
  );
  return `${[csvRow(header), ...rows].join("\n")}\n`;
}

export function buildMelTurningReviewBatch(): MelTurningReviewBatch {
  const controls = findVerifiedControls();
  const queryPool = selectDiverseQueries(enumerateReviewQueries(), 56, MEL_TURNING_REVIEW_SEED);
  const solved = queryPool.map((query) => ({ query, result: solveReviewQuery(query) }));
  const pairs = chooseCandidatePairs(solved, 6, MEL_TURNING_REVIEW_SEED);
  const selected = [
    ...controls.map((control) => ({
      result: control.result,
      route: control.route,
      selectionReason: control.reason
    })),
    ...pairs.flatMap(({ solved: pair, routes }, pairIndex) =>
      routes.map((route, routeIndex) => ({
        result: pair.result,
        route,
        selectionReason: `diverse candidate pair ${pairIndex + 1} · alternative ${routeIndex + 1}`
      }))
    )
  ];
  if (selected.length !== MEL_TURNING_REVIEW_CASE_COUNT) {
    throw new Error(
      `Expected ${MEL_TURNING_REVIEW_CASE_COUNT} review routes, received ${selected.length}.`
    );
  }
  const cases: MelTurningReviewCase[] = selected.map((entry, index) => ({
    caseId: `${MEL_TURNING_REVIEW_BATCH_ID}-${String(index + 1).padStart(2, "0")}`,
    ...entry
  }));
  const steps = cases.flatMap(reviewStepsForCase);
  return {
    batchId: MEL_TURNING_REVIEW_BATCH_ID,
    seed: MEL_TURNING_REVIEW_SEED,
    cases,
    steps,
    casesCsv: casesCsv(cases),
    stepsCsv: stepsCsv(steps)
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

  if (!options.overwrite) {
    const existing = (
      await Promise.all(
        [casesPath, stepsPath].map(async (path) => {
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
        `Refusing to replace existing physical-review CSVs: ${existing.join(
          ", "
        )}. Pass overwrite: true or --force only after preserving any annotations.`
      );
    }
  }

  const batch = buildMelTurningReviewBatch();
  const flag = options.overwrite ? "w" : "wx";
  await Promise.all([
    writeFile(casesPath, batch.casesCsv, { encoding: "utf8", flag }),
    writeFile(stepsPath, batch.stepsCsv, { encoding: "utf8", flag })
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
