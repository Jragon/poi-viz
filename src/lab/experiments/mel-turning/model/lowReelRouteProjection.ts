import { getMelTurningLanes } from "@/lab/experiments/mel-turning/adapter/melBeatGraphAdapter";
import type {
  LowReelRouteCycleEntry,
  LowReelRouteEdge,
  LowReelRouteHandAction,
  LowReelRouteModelStatus,
  LowReelRouteSolverResult,
  LowReelRouteState,
  LowReelTurningRoute
} from "@/lab/experiments/mel-turning/model/lowReelRouteSolver";
import { getLowReelLocation } from "@/lab/experiments/mel-turning/model/turnTopology";
import type {
  LowReelLocation,
  TurningHand,
  TurningNode,
  TurningTrace,
  TurningTrack
} from "@/lab/experiments/mel-turning/model/turningTypes";

export type LowReelRouteProjectionRegion =
  | "source"
  | "preparation"
  | "turn-target"
  | "recovery"
  | "target";

export type LowReelRouteProjectionIntervalKind =
  | "source-cycle"
  | "target-cycle"
  | LowReelRouteEdge["kind"];

export interface LowReelRouteProjectionInterval {
  readonly kind: LowReelRouteProjectionIntervalKind;
  readonly leftAction: LowReelRouteHandAction;
  readonly rightAction: LowReelRouteHandAction;
  readonly modelStatus: LowReelRouteModelStatus;
  readonly provenance: readonly string[];
}

export interface LowReelRouteProjectionStep {
  readonly step: number;
  readonly state: LowReelRouteState;
  readonly region: LowReelRouteProjectionRegion;
  readonly outgoingInterval: LowReelRouteProjectionInterval | null;
}

export interface LowReelRouteProjection {
  readonly trace: TurningTrace;
  readonly steps: readonly LowReelRouteProjectionStep[];
}

interface ProjectionStepDraft {
  readonly state: LowReelRouteState;
  readonly region: LowReelRouteProjectionRegion;
  outgoingInterval: LowReelRouteProjectionInterval | null;
}

function cycleStepForState(cycle: readonly LowReelRouteCycleEntry[], stateId: string): number {
  const entry = cycle.find((candidate) => candidate.state.id === stateId);
  if (!entry) throw new Error(`Route state ${stateId} is not in the selected endpoint cycle.`);
  return entry.cycleStep;
}

function cycleInterval(kind: "source-cycle" | "target-cycle"): LowReelRouteProjectionInterval {
  return {
    kind,
    leftAction: "reel-continuation",
    rightAction: "reel-continuation",
    modelStatus: "valid",
    provenance: [kind]
  };
}

function routeInterval(edge: LowReelRouteEdge): LowReelRouteProjectionInterval {
  return {
    kind: edge.kind,
    leftAction: edge.leftAction,
    rightAction: edge.rightAction,
    modelStatus: edge.modelStatus,
    provenance: [...edge.provenance]
  };
}

function assertRouteBelongsToResult(
  result: LowReelRouteSolverResult,
  route: LowReelTurningRoute
): void {
  const canonicalRoute = result.routes.find((candidate) => candidate.id === route.id);
  if (!canonicalRoute) {
    throw new Error(`Route ${route.id} does not belong to this low-reel solver result.`);
  }
  if (!route.isShortest) {
    throw new Error(`Explorer projection requires a shortest route; received ${route.id}.`);
  }
}

export function buildLowReelRouteProjectionSteps(
  result: LowReelRouteSolverResult,
  route: LowReelTurningRoute
): readonly LowReelRouteProjectionStep[] {
  assertRouteBelongsToResult(result, route);
  const firstRouteState = route.states[0];
  const lastRouteState = route.states.at(-1);
  if (!firstRouteState || !lastRouteState) {
    throw new Error(`Low-reel route ${route.id} has no boundary states.`);
  }
  const sourceStep = cycleStepForState(result.sourceCycle, firstRouteState.id);
  const targetStep = cycleStepForState(result.targetCycle, lastRouteState.id);
  const drafts: ProjectionStepDraft[] = [];

  for (let offset = 0; offset <= 4; offset += 1) {
    const cycleEntry = result.sourceCycle[(sourceStep + offset) % 4];
    if (!cycleEntry) throw new Error("Source projection cycle is incomplete.");
    drafts.push({
      state: cycleEntry.state,
      region: "source",
      outgoingInterval: offset < 4 ? cycleInterval("source-cycle") : null
    });
  }

  for (const [edgeIndex, edge] of route.edges.entries()) {
    const previous = drafts.at(-1);
    if (!previous) throw new Error("Route projection has no source boundary.");
    previous.outgoingInterval = routeInterval(edge);
    const nextState = route.states[edgeIndex + 1];
    if (!nextState) throw new Error(`Route ${route.id} has no state after edge ${edgeIndex}.`);
    const afterTurn = edgeIndex >= route.turnEdgeIndex;
    const isGoal = edgeIndex === route.edges.length - 1;
    const region: LowReelRouteProjectionRegion =
      edge.kind === "body-turn" && !isGoal
        ? "turn-target"
        : isGoal
          ? "target"
          : afterTurn
            ? "recovery"
            : "preparation";
    drafts.push({ state: nextState, region, outgoingInterval: null });
  }

  for (let offset = 1; offset <= 4; offset += 1) {
    const previous = drafts.at(-1);
    if (!previous) throw new Error("Route projection has no target boundary.");
    previous.outgoingInterval = cycleInterval("target-cycle");
    const cycleEntry = result.targetCycle[(targetStep + offset) % 4];
    if (!cycleEntry) throw new Error("Target projection cycle is incomplete.");
    drafts.push({ state: cycleEntry.state, region: "target", outgoingInterval: null });
  }

  return drafts.map((draft, step) => ({ step, ...draft }));
}

function traceNode(projectionStep: LowReelRouteProjectionStep, hand: TurningHand): TurningNode {
  const state = hand === "left" ? projectionStep.state.left : projectionStep.state.right;
  return {
    step: projectionStep.step,
    laneId: state.laneId,
    planeSide: state.planeSide,
    phase: state.phase,
    handPlacement: state.handPlacement,
    handPoint: { ...state.handPoint }
  };
}

function trackForHand(
  steps: readonly LowReelRouteProjectionStep[],
  hand: TurningHand
): TurningTrack {
  const first = steps[0];
  if (!first) throw new Error("Low-reel route projection requires at least one step.");
  const handState = hand === "left" ? first.state.left : first.state.right;
  return {
    id: hand,
    hand,
    poiDirection: handState.observerPoiDirection,
    initialPhase: handState.phase,
    nodes: steps.map((step) => traceNode(step, hand))
  };
}

export function lowReelRouteStateLocation(
  state: LowReelRouteState,
  hand: TurningHand
): LowReelLocation {
  const handState = hand === "left" ? state.left : state.right;
  const location = getLowReelLocation(handState);
  if (!location) throw new Error(`Route state ${state.id} contains an unsupported high lane.`);
  return location;
}

export function buildLowReelRouteProjection(
  result: LowReelRouteSolverResult,
  route: LowReelTurningRoute
): LowReelRouteProjection {
  const steps = buildLowReelRouteProjectionSteps(result, route);
  const turnStep = steps.find((step) => step.outgoingInterval?.kind === "body-turn")?.step;
  if (turnStep === undefined) {
    throw new Error(`Low-reel route ${route.id} has no projected body turn.`);
  }

  return {
    steps,
    trace: {
      id: `solver-${route.id}`,
      label: `${result.compatibility.sourceTiming} ${result.compatibility.sourcePatternType} → ${result.compatibility.targetPatternType}`,
      timing: result.compatibility.sourceTiming,
      summary: `${route.bridgeHalfbeats} halfbeat shortest bridge: ${route.preparationHalfbeats} preparation, 1 turn, ${route.recoveryHalfbeats} recovery.`,
      source:
        "Generated by the low-reel preparation/turn/recovery solver with one full source cycle and one full target cycle.",
      verificationStatus:
        route.evidenceStatus === "exact-route-verified" ? "physically-verified" : "unverified",
      lanes: getMelTurningLanes(),
      tracks: [trackForHand(steps, "left"), trackForHand(steps, "right")],
      events: [
        {
          kind: "body-turn",
          afterStep: turnStep,
          direction: result.turnDirection,
          degrees: 180,
          fromFacing: 0,
          toFacing: 180,
          note: `Shortest solver route ${route.id}; ${route.preparationHalfbeats} preparation and ${route.recoveryHalfbeats} recovery halfbeats.`
        }
      ]
    }
  };
}
