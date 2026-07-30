import {
  buildTurningReelCycle,
  type TurningReelConfig,
  type TurningReelCycle,
  type TurningReelDirection,
  type TurningReelOffset,
  type TurningReelPosition,
  type TurningResolvedReelNode
} from "@/lab/experiments/mel-turning/adapter/melBeatGraphAdapter";
import { validateHandTurnTopology } from "@/lab/experiments/mel-turning/model/turnTopology";
import {
  getObserverPreservingTargetDirection,
  getTurningEndpointCompatibility,
  type TurningEndpointCompatibility,
  type TurningEndpointCompatibilityDiagnostic
} from "@/lab/experiments/mel-turning/model/turningEndpointCompatibility";
import type {
  BodyFacing,
  BodyTurnDirection,
  TurnTopologyStatus,
  TurningDirection,
  TurningHand,
  TurningHandPlacement,
  TurningHandPoint,
  TurningLaneId,
  TurningPhase,
  TurningPlaneSide
} from "@/lab/experiments/mel-turning/model/turningTypes";

export const LOW_REEL_ROUTE_POSITIONS = [
  "low-native",
  "low-non-native",
  "low-back"
] as const satisfies readonly TurningReelPosition[];

export const LOW_REEL_ROUTE_OFFSETS = [0, 1, 2, 3] as const satisfies readonly TurningReelOffset[];

export type LowReelRouteModelStatus = Exclude<TurnTopologyStatus, "invalid">;

export type LowReelRouteEvidenceStatus = "exact-route-verified" | "unreviewed";

export type LowReelRouteHandAction = "reel-continuation" | "circle-extension" | "hold" | "cross";

export interface LowReelRouteOccurrence {
  readonly configId: string;
  readonly config: TurningReelConfig;
  readonly cycleStep: number;
}

export interface LowReelRouteHandState {
  readonly laneId: TurningLaneId;
  readonly planeSide: TurningPlaneSide;
  readonly phase: TurningPhase;
  readonly handPlacement: TurningHandPlacement;
  /**
   * Mel-compiled hand point in the performer's body-relative wall plane.
   * Facing is kept separately on the synchronized route state.
   */
  readonly handPoint: TurningHandPoint;
  readonly observerPoiDirection: TurningDirection;
}

export interface LowReelRouteState {
  readonly id: string;
  readonly facing: BodyFacing;
  readonly timing: TurningEndpointCompatibility["sourceTiming"];
  readonly left: LowReelRouteHandState;
  readonly right: LowReelRouteHandState;
  readonly occurrences: readonly LowReelRouteOccurrence[];
}

interface LowReelRouteEdgeBase {
  readonly id: string;
  readonly fromStateId: string;
  readonly toStateId: string;
  readonly modelStatus: LowReelRouteModelStatus;
  readonly provenance: readonly string[];
}

export interface LowReelContinuationEdge extends LowReelRouteEdgeBase {
  readonly kind: "reel-continuation";
  readonly leftAction: "reel-continuation";
  readonly rightAction: "reel-continuation";
  readonly modelStatus: "valid";
}

export interface LowReelCircleExtensionEdge extends LowReelRouteEdgeBase {
  readonly kind: "circle-extension";
  readonly leftAction: "reel-continuation" | "circle-extension";
  readonly rightAction: "reel-continuation" | "circle-extension";
  readonly modelStatus: "unresolved";
}

export interface LowReelBodyTurnEdge extends LowReelRouteEdgeBase {
  readonly kind: "body-turn";
  readonly leftAction: "hold" | "cross";
  readonly rightAction: "hold" | "cross";
  readonly turnDirection: BodyTurnDirection;
}

export type LowReelRouteEdge =
  | LowReelContinuationEdge
  | LowReelCircleExtensionEdge
  | LowReelBodyTurnEdge;

export interface LowReelTurningRoute {
  readonly id: string;
  readonly states: readonly LowReelRouteState[];
  readonly edges: readonly LowReelRouteEdge[];
  readonly bridgeHalfbeats: number;
  readonly preparationHalfbeats: number;
  readonly recoveryHalfbeats: number;
  readonly turnEdgeIndex: number;
  readonly isShortest: boolean;
  readonly modelStatus: LowReelRouteModelStatus;
  readonly evidenceStatus: LowReelRouteEvidenceStatus;
  readonly evidenceReferences: readonly string[];
}

export interface LowReelRouteCycleEntry {
  readonly cycleStep: number;
  readonly state: LowReelRouteState;
}

export type LowReelRouteSolverDiagnostic =
  | TurningEndpointCompatibilityDiagnostic
  | {
      readonly code: "NO_ROUTE";
      readonly message: string;
    };

export interface LowReelRouteSolverOptions {
  /**
   * Maximum materialized routes. The solver still counts every shortest route.
   */
  readonly maxRoutes?: number;
  /**
   * Research-only alternatives beyond the shortest bridge. These are simple
   * paths and stop on first target-cycle entry.
   */
  readonly maxExtraHalfbeats?: number;
  /**
   * Include turn edges whose current hold topology is incomplete.
   */
  readonly includeUnresolved?: boolean;
}

export interface LowReelRouteSolverInput {
  readonly source: TurningReelConfig;
  readonly target: TurningReelConfig;
  readonly turnDirection: BodyTurnDirection;
  readonly options?: LowReelRouteSolverOptions;
}

export interface LowReelRouteSolverResult {
  readonly source: TurningReelConfig;
  readonly target: TurningReelConfig;
  readonly turnDirection: BodyTurnDirection;
  readonly compatibility: TurningEndpointCompatibility;
  readonly diagnostics: readonly LowReelRouteSolverDiagnostic[];
  readonly sourceCycle: readonly LowReelRouteCycleEntry[];
  readonly targetCycle: readonly LowReelRouteCycleEntry[];
  readonly shortestBridgeHalfbeats: number | null;
  readonly shortestRouteCount: number;
  readonly routes: readonly LowReelTurningRoute[];
}

interface MutableRouteState extends Omit<LowReelRouteState, "occurrences"> {
  readonly occurrenceById: Map<string, LowReelRouteOccurrence>;
}

interface MutableEdgeBase {
  readonly fromStateId: string;
  readonly toStateId: string;
  readonly provenance: Set<string>;
}

interface MutableContinuationEdge extends MutableEdgeBase {
  readonly kind: "reel-continuation";
}

interface MutableCircleExtensionEdge extends MutableEdgeBase {
  readonly kind: "circle-extension";
  readonly leftAction: "reel-continuation" | "circle-extension";
  readonly rightAction: "reel-continuation" | "circle-extension";
}

interface MutableBodyTurnEdge extends MutableEdgeBase {
  readonly kind: "body-turn";
  readonly leftAction: "hold" | "cross";
  readonly rightAction: "hold" | "cross";
  readonly turnDirection: BodyTurnDirection;
  readonly modelStatus: LowReelRouteModelStatus;
}

type MutableRouteEdge = MutableContinuationEdge | MutableCircleExtensionEdge | MutableBodyTurnEdge;

interface HandSuccessor {
  readonly state: LowReelRouteHandState;
  readonly kind: "reel-continuation" | "circle-extension";
  readonly provenance: readonly string[];
}

interface FacingCatalog {
  readonly facing: BodyFacing;
  readonly states: Map<string, MutableRouteState>;
  readonly stateIdByConfigStep: Map<string, string>;
  readonly handStateByKey: Readonly<Record<TurningHand, Map<string, LowReelRouteHandState>>>;
  readonly exactHandSuccessors: Readonly<
    Record<TurningHand, Map<string, Map<string, Set<string>>>>
  >;
  readonly exactJointEdges: Map<string, MutableContinuationEdge>;
  readonly jointStateIdByHandPair: Map<string, string>;
}

interface SearchGraph {
  readonly states: Map<string, LowReelRouteState>;
  readonly adjacency: Map<string, readonly LowReelRouteEdge[]>;
}

interface PreparedRouteGraph {
  readonly sourceCatalog: FacingCatalog;
  readonly targetCatalog: FacingCatalog;
  readonly graph: SearchGraph;
}

interface PathDraft {
  readonly stateIds: readonly string[];
  readonly edges: readonly LowReelRouteEdge[];
}

const DEFAULT_MAX_ROUTES = 40;
const MAX_EXTRA_HALFBEATS = 2;
const cycleCache = new Map<string, TurningReelCycle>();
const routeGraphCache = new Map<string, PreparedRouteGraph>();

function cloneDirection(direction: TurningReelDirection): TurningReelDirection {
  return direction.mode === "same"
    ? { mode: "same", direction: direction.direction }
    : { mode: "opposite", flow: direction.flow };
}

function cloneConfig(config: TurningReelConfig): TurningReelConfig {
  return {
    left: config.left,
    right: config.right,
    direction: cloneDirection(config.direction),
    offset: config.offset
  };
}

function directionId(direction: TurningReelDirection): string {
  if (direction.mode === "same") {
    return direction.direction === "clockwise" ? "same-cw" : "same-ccw";
  }
  return direction.flow === "inwards" ? "opposite-in" : "opposite-out";
}

export function lowReelConfigId(config: TurningReelConfig): string {
  return [config.left, config.right, directionId(config.direction), config.offset].join(":");
}

function getCycle(config: TurningReelConfig): TurningReelCycle {
  const id = lowReelConfigId(config);
  const cached = cycleCache.get(id);
  if (cached) return cached;
  const cycle = buildTurningReelCycle(config);
  cycleCache.set(id, cycle);
  return cycle;
}

function getTrack(cycle: TurningReelCycle, hand: TurningHand) {
  const track = cycle.tracks.find((candidate) => candidate.hand === hand);
  if (!track) throw new Error(`Expected ${hand} track in low-reel cycle.`);
  return track;
}

function swapPlaneSide(side: TurningPlaneSide): TurningPlaneSide {
  return side === "a" ? "b" : "a";
}

function oppositePhase(phase: TurningPhase): TurningPhase {
  return phase === "up" ? "down" : "up";
}

function stableNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error("Low-reel route state contains a non-finite hand point.");
  }
  return Math.abs(value) <= 1e-9 ? "0" : value.toFixed(6);
}

function handStateKey(state: LowReelRouteHandState): string {
  return [
    state.laneId,
    state.planeSide,
    state.phase,
    state.handPlacement,
    stableNumber(state.handPoint.x),
    stableNumber(state.handPoint.y),
    state.observerPoiDirection
  ].join(":");
}

function handPairKey(left: LowReelRouteHandState, right: LowReelRouteHandState): string {
  return `${handStateKey(left)}|${handStateKey(right)}`;
}

function stateId(
  facing: BodyFacing,
  timing: TurningEndpointCompatibility["sourceTiming"],
  left: LowReelRouteHandState,
  right: LowReelRouteHandState
): string {
  return `f${facing}:${timing}:${handPairKey(left, right)}`;
}

function occurrenceId(configId: string, cycleStep: number): string {
  return `${configId}@${cycleStep}`;
}

function compactHandState(
  node: TurningResolvedReelNode,
  facing: BodyFacing,
  observerPoiDirection: TurningDirection
): LowReelRouteHandState {
  return {
    laneId: node.laneId,
    planeSide: facing === 180 ? swapPlaneSide(node.planeSide) : node.planeSide,
    phase: node.phase,
    handPlacement: node.handPlacement ?? "wall",
    handPoint: { ...node.handPoint },
    observerPoiDirection
  };
}

function immutableState(state: MutableRouteState): LowReelRouteState {
  return {
    id: state.id,
    facing: state.facing,
    timing: state.timing,
    left: state.left,
    right: state.right,
    occurrences: [...state.occurrenceById.values()].sort((left, right) =>
      occurrenceId(left.configId, left.cycleStep).localeCompare(
        occurrenceId(right.configId, right.cycleStep)
      )
    )
  };
}

function addHandSuccessor(
  map: Map<string, Map<string, Set<string>>>,
  from: LowReelRouteHandState,
  to: LowReelRouteHandState,
  provenance: string
): void {
  const fromKey = handStateKey(from);
  const toKey = handStateKey(to);
  const targets = map.get(fromKey) ?? new Map<string, Set<string>>();
  const provenanceSet = targets.get(toKey) ?? new Set<string>();
  provenanceSet.add(provenance);
  targets.set(toKey, provenanceSet);
  map.set(fromKey, targets);
}

function jointEdgeKey(fromStateId: string, toStateId: string): string {
  return `${fromStateId}>${toStateId}`;
}

function addJointEdge(
  map: Map<string, MutableContinuationEdge>,
  fromStateId: string,
  toStateId: string,
  provenance: string
): void {
  const key = jointEdgeKey(fromStateId, toStateId);
  const existing = map.get(key);
  if (existing) {
    existing.provenance.add(provenance);
    return;
  }
  map.set(key, {
    kind: "reel-continuation",
    fromStateId,
    toStateId,
    provenance: new Set([provenance])
  });
}

function buildFacingCatalog(
  configs: readonly TurningReelConfig[],
  facing: BodyFacing,
  timing: TurningEndpointCompatibility["sourceTiming"],
  observerDirections: Readonly<Record<TurningHand, TurningDirection>>
): FacingCatalog {
  const states = new Map<string, MutableRouteState>();
  const stateIdByConfigStep = new Map<string, string>();
  const handStateByKey = {
    left: new Map<string, LowReelRouteHandState>(),
    right: new Map<string, LowReelRouteHandState>()
  };
  const exactHandSuccessors = {
    left: new Map<string, Map<string, Set<string>>>(),
    right: new Map<string, Map<string, Set<string>>>()
  };
  const exactJointEdges = new Map<string, MutableContinuationEdge>();
  const jointStateIdByHandPair = new Map<string, string>();

  for (const config of [...configs].sort((left, right) =>
    lowReelConfigId(left).localeCompare(lowReelConfigId(right))
  )) {
    const cycle = getCycle(config);
    const configId = lowReelConfigId(config);
    const leftTrack = getTrack(cycle, "left");
    const rightTrack = getTrack(cycle, "right");
    const stateIds: string[] = [];
    const handStatesByStep = {
      left: [] as LowReelRouteHandState[],
      right: [] as LowReelRouteHandState[]
    };

    for (let cycleStep = 0; cycleStep < cycle.cycleSteps; cycleStep += 1) {
      const leftNode = leftTrack.nodes[cycleStep];
      const rightNode = rightTrack.nodes[cycleStep];
      if (!leftNode || !rightNode) {
        throw new Error(`${configId} has no synchronized state at t${cycleStep}.`);
      }
      const left = compactHandState(leftNode, facing, observerDirections.left);
      const right = compactHandState(rightNode, facing, observerDirections.right);
      const id = stateId(facing, timing, left, right);
      const occurrence: LowReelRouteOccurrence = {
        configId,
        config: cloneConfig(config),
        cycleStep
      };
      const existing = states.get(id);
      if (existing) {
        existing.occurrenceById.set(occurrenceId(configId, cycleStep), occurrence);
      } else {
        states.set(id, {
          id,
          facing,
          timing,
          left,
          right,
          occurrenceById: new Map([[occurrenceId(configId, cycleStep), occurrence]])
        });
      }
      handStateByKey.left.set(handStateKey(left), left);
      handStateByKey.right.set(handStateKey(right), right);
      jointStateIdByHandPair.set(handPairKey(left, right), id);
      stateIdByConfigStep.set(occurrenceId(configId, cycleStep), id);
      stateIds.push(id);
      handStatesByStep.left.push(left);
      handStatesByStep.right.push(right);
    }

    for (let cycleStep = 0; cycleStep < cycle.cycleSteps; cycleStep += 1) {
      const nextStep = (cycleStep + 1) % cycle.cycleSteps;
      const fromStateId = stateIds[cycleStep];
      const toStateId = stateIds[nextStep];
      const leftFrom = handStatesByStep.left[cycleStep];
      const leftTo = handStatesByStep.left[nextStep];
      const rightFrom = handStatesByStep.right[cycleStep];
      const rightTo = handStatesByStep.right[nextStep];
      if (!fromStateId || !toStateId || !leftFrom || !leftTo || !rightFrom || !rightTo) {
        throw new Error(`${configId} has an incomplete edge at t${cycleStep}.`);
      }
      const provenance = `${configId}@${cycleStep}->${nextStep}`;
      addJointEdge(exactJointEdges, fromStateId, toStateId, provenance);
      addHandSuccessor(exactHandSuccessors.left, leftFrom, leftTo, provenance);
      addHandSuccessor(exactHandSuccessors.right, rightFrom, rightTo, provenance);
    }
  }

  return {
    facing,
    states,
    stateIdByConfigStep,
    handStateByKey,
    exactHandSuccessors,
    exactJointEdges,
    jointStateIdByHandPair
  };
}

function enumerateCompatibleConfigs(
  direction: TurningReelDirection,
  timing: TurningEndpointCompatibility["sourceTiming"]
): readonly TurningReelConfig[] {
  const result: TurningReelConfig[] = [];
  for (const left of LOW_REEL_ROUTE_POSITIONS) {
    for (const right of LOW_REEL_ROUTE_POSITIONS) {
      for (const offset of LOW_REEL_ROUTE_OFFSETS) {
        const config: TurningReelConfig = {
          left,
          right,
          direction: cloneDirection(direction),
          offset
        };
        if (getCycle(config).timing === timing) result.push(config);
      }
    }
  }
  return result;
}

function exactSuccessorsForHand(
  catalog: FacingCatalog,
  hand: TurningHand,
  from: LowReelRouteHandState
): readonly HandSuccessor[] {
  const result: HandSuccessor[] = [];
  const targets = catalog.exactHandSuccessors[hand].get(handStateKey(from));
  if (!targets) return result;
  for (const [targetKey, provenance] of [...targets.entries()].sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    const state = catalog.handStateByKey[hand].get(targetKey);
    if (!state) continue;
    result.push({
      state,
      kind: "reel-continuation",
      provenance: [...provenance].sort()
    });
  }
  return result;
}

function circleExtensionForHand(
  catalog: FacingCatalog,
  hand: TurningHand,
  from: LowReelRouteHandState
): HandSuccessor | null {
  const targetKey = handStateKey({ ...from, phase: oppositePhase(from.phase) });
  const target = catalog.handStateByKey[hand].get(targetKey);
  if (!target) return null;
  return {
    state: target,
    kind: "circle-extension",
    provenance: [`generated:${hand}:same-anchor-circle-extension`]
  };
}

function dedupeHandSuccessors(successors: readonly HandSuccessor[]): readonly HandSuccessor[] {
  const byTargetAndKind = new Map<string, HandSuccessor>();
  for (const successor of successors) {
    const key = `${successor.kind}:${handStateKey(successor.state)}`;
    const existing = byTargetAndKind.get(key);
    if (!existing) {
      byTargetAndKind.set(key, successor);
      continue;
    }
    byTargetAndKind.set(key, {
      ...successor,
      provenance: [...new Set([...existing.provenance, ...successor.provenance])].sort()
    });
  }
  return [...byTargetAndKind.values()].sort((left, right) =>
    `${left.kind}:${handStateKey(left.state)}`.localeCompare(
      `${right.kind}:${handStateKey(right.state)}`
    )
  );
}

function buildNormalEdges(catalog: FacingCatalog): readonly MutableRouteEdge[] {
  const edges = new Map<string, MutableRouteEdge>();
  for (const exact of catalog.exactJointEdges.values()) {
    edges.set(`reel:${jointEdgeKey(exact.fromStateId, exact.toStateId)}`, exact);
  }

  for (const state of catalog.states.values()) {
    const leftSuccessors = dedupeHandSuccessors([
      ...exactSuccessorsForHand(catalog, "left", state.left),
      ...(circleExtensionForHand(catalog, "left", state.left)
        ? [circleExtensionForHand(catalog, "left", state.left)!]
        : [])
    ]);
    const rightSuccessors = dedupeHandSuccessors([
      ...exactSuccessorsForHand(catalog, "right", state.right),
      ...(circleExtensionForHand(catalog, "right", state.right)
        ? [circleExtensionForHand(catalog, "right", state.right)!]
        : [])
    ]);

    for (const left of leftSuccessors) {
      for (const right of rightSuccessors) {
        if (left.kind !== "circle-extension" && right.kind !== "circle-extension") continue;
        const toStateId = catalog.jointStateIdByHandPair.get(handPairKey(left.state, right.state));
        if (!toStateId) continue;
        const exactKey = `reel:${jointEdgeKey(state.id, toStateId)}`;
        if (edges.has(exactKey)) continue;
        const key = `extension:${jointEdgeKey(state.id, toStateId)}`;
        const provenance = new Set([...left.provenance, ...right.provenance]);
        const existing = edges.get(key);
        if (existing?.kind === "circle-extension") {
          const existingRank = [
            Number(existing.leftAction === "circle-extension") +
              Number(existing.rightAction === "circle-extension"),
            existing.leftAction,
            existing.rightAction
          ].join(":");
          const candidateRank = [
            Number(left.kind === "circle-extension") + Number(right.kind === "circle-extension"),
            left.kind,
            right.kind
          ].join(":");
          const mergedProvenance = new Set([...existing.provenance, ...provenance]);
          if (candidateRank < existingRank) {
            edges.set(key, {
              kind: "circle-extension",
              fromStateId: state.id,
              toStateId,
              leftAction: left.kind,
              rightAction: right.kind,
              provenance: mergedProvenance
            });
          } else {
            for (const entry of provenance) existing.provenance.add(entry);
          }
          continue;
        }
        edges.set(key, {
          kind: "circle-extension",
          fromStateId: state.id,
          toStateId,
          leftAction: left.kind,
          rightAction: right.kind,
          provenance
        });
      }
    }
  }

  return [...edges.values()];
}

function asTurningNode(state: LowReelRouteHandState) {
  return {
    step: 0,
    laneId: state.laneId,
    planeSide: state.planeSide,
    phase: state.phase,
    handPlacement: state.handPlacement,
    handPoint: state.handPoint
  };
}

function aggregateTopologyStatus(
  left: TurnTopologyStatus,
  right: TurnTopologyStatus
): TurnTopologyStatus {
  if (left === "invalid" || right === "invalid") return "invalid";
  if (left === "unresolved" || right === "unresolved") return "unresolved";
  return "valid";
}

function buildTurnEdges(
  source: FacingCatalog,
  target: FacingCatalog,
  turnDirection: BodyTurnDirection,
  includeUnresolved: boolean
): readonly MutableBodyTurnEdge[] {
  const edges: MutableBodyTurnEdge[] = [];
  for (const from of [...source.states.values()].sort((left, right) =>
    left.id.localeCompare(right.id)
  )) {
    for (const to of [...target.states.values()].sort((left, right) =>
      left.id.localeCompare(right.id)
    )) {
      if (
        to.left.phase !== oppositePhase(from.left.phase) ||
        to.right.phase !== oppositePhase(from.right.phase)
      ) {
        continue;
      }
      const left = validateHandTurnTopology({
        hand: "left",
        poiDirection: from.left.observerPoiDirection,
        from: asTurningNode(from.left),
        to: asTurningNode(to.left),
        turnDirection,
        fromFacing: 0,
        toFacing: 180
      });
      const right = validateHandTurnTopology({
        hand: "right",
        poiDirection: from.right.observerPoiDirection,
        from: asTurningNode(from.right),
        to: asTurningNode(to.right),
        turnDirection,
        fromFacing: 0,
        toFacing: 180
      });
      const status = aggregateTopologyStatus(left.status, right.status);
      if (status === "invalid" || (status === "unresolved" && !includeUnresolved)) continue;
      edges.push({
        kind: "body-turn",
        fromStateId: from.id,
        toStateId: to.id,
        leftAction: left.mechanism,
        rightAction: right.mechanism,
        turnDirection,
        modelStatus: status,
        provenance: new Set([
          `turn-topology:${turnDirection}:left-${left.mechanism}:right-${right.mechanism}`
        ])
      });
    }
  }
  return edges;
}

function edgeId(edge: MutableRouteEdge): string {
  if (edge.kind === "body-turn") {
    return [
      edge.kind,
      edge.fromStateId,
      edge.toStateId,
      edge.turnDirection,
      edge.leftAction,
      edge.rightAction
    ].join(">");
  }
  if (edge.kind === "circle-extension") {
    return [edge.kind, edge.fromStateId, edge.toStateId, edge.leftAction, edge.rightAction].join(
      ">"
    );
  }
  return [edge.kind, edge.fromStateId, edge.toStateId].join(">");
}

function immutableEdge(edge: MutableRouteEdge): LowReelRouteEdge {
  const common = {
    id: edgeId(edge),
    fromStateId: edge.fromStateId,
    toStateId: edge.toStateId,
    provenance: [...edge.provenance].sort()
  };
  if (edge.kind === "reel-continuation") {
    return {
      ...common,
      kind: edge.kind,
      leftAction: "reel-continuation",
      rightAction: "reel-continuation",
      modelStatus: "valid"
    };
  }
  if (edge.kind === "circle-extension") {
    return {
      ...common,
      kind: edge.kind,
      leftAction: edge.leftAction,
      rightAction: edge.rightAction,
      modelStatus: "unresolved"
    };
  }
  return {
    ...common,
    kind: edge.kind,
    leftAction: edge.leftAction,
    rightAction: edge.rightAction,
    turnDirection: edge.turnDirection,
    modelStatus: edge.modelStatus
  };
}

function buildSearchGraph(
  source: FacingCatalog,
  target: FacingCatalog,
  turnDirection: BodyTurnDirection,
  includeUnresolved: boolean
): SearchGraph {
  const states = new Map<string, LowReelRouteState>();
  for (const state of [...source.states.values(), ...target.states.values()]) {
    states.set(state.id, immutableState(state));
  }
  const mutableEdges = [
    ...buildNormalEdges(source),
    ...buildNormalEdges(target),
    ...buildTurnEdges(source, target, turnDirection, includeUnresolved)
  ];
  const edgeById = new Map<string, MutableRouteEdge>();
  for (const edge of mutableEdges) {
    const id = edgeId(edge);
    const existing = edgeById.get(id);
    if (existing) {
      for (const provenance of edge.provenance) existing.provenance.add(provenance);
    } else {
      edgeById.set(id, edge);
    }
  }
  const adjacencyDraft = new Map<string, LowReelRouteEdge[]>();
  for (const mutable of edgeById.values()) {
    const edge = immutableEdge(mutable);
    const outgoing = adjacencyDraft.get(edge.fromStateId) ?? [];
    outgoing.push(edge);
    adjacencyDraft.set(edge.fromStateId, outgoing);
  }
  const adjacency = new Map<string, readonly LowReelRouteEdge[]>();
  for (const [id, outgoing] of adjacencyDraft) {
    adjacency.set(
      id,
      [...outgoing].sort((left, right) => left.id.localeCompare(right.id))
    );
  }
  return { states, adjacency };
}

function validateOptions(options: LowReelRouteSolverOptions | undefined): {
  readonly maxRoutes: number;
  readonly maxExtraHalfbeats: number;
  readonly includeUnresolved: boolean;
} {
  const maxRoutes = options?.maxRoutes ?? DEFAULT_MAX_ROUTES;
  const maxExtraHalfbeats = options?.maxExtraHalfbeats ?? 0;
  if (!Number.isInteger(maxRoutes) || maxRoutes <= 0 || maxRoutes > 500) {
    throw new Error("Low-reel route maxRoutes must be an integer from 1 to 500.");
  }
  if (
    !Number.isInteger(maxExtraHalfbeats) ||
    maxExtraHalfbeats < 0 ||
    maxExtraHalfbeats > MAX_EXTRA_HALFBEATS
  ) {
    throw new Error(
      `Low-reel route maxExtraHalfbeats must be an integer from 0 to ${MAX_EXTRA_HALFBEATS}.`
    );
  }
  return {
    maxRoutes,
    maxExtraHalfbeats,
    includeUnresolved: options?.includeUnresolved ?? true
  };
}

function breadthFirstDistances(
  graph: SearchGraph,
  starts: ReadonlySet<string>
): Map<string, number> {
  const distances = new Map<string, number>();
  const queue: string[] = [...starts].sort();
  for (const start of queue) distances.set(start, 0);
  for (let index = 0; index < queue.length; index += 1) {
    const stateId = queue[index];
    if (!stateId) continue;
    const depth = distances.get(stateId);
    if (depth === undefined) continue;
    for (const edge of graph.adjacency.get(stateId) ?? []) {
      if (distances.has(edge.toStateId)) continue;
      distances.set(edge.toStateId, depth + 1);
      queue.push(edge.toStateId);
    }
  }
  return distances;
}

function reverseDistances(graph: SearchGraph, goals: ReadonlySet<string>): Map<string, number> {
  const reverse = new Map<string, string[]>();
  for (const outgoing of graph.adjacency.values()) {
    for (const edge of outgoing) {
      const predecessors = reverse.get(edge.toStateId) ?? [];
      predecessors.push(edge.fromStateId);
      reverse.set(edge.toStateId, predecessors);
    }
  }
  const distances = new Map<string, number>();
  const queue = [...goals].sort();
  for (const goal of queue) distances.set(goal, 0);
  for (let index = 0; index < queue.length; index += 1) {
    const stateId = queue[index];
    if (!stateId) continue;
    const depth = distances.get(stateId);
    if (depth === undefined) continue;
    for (const predecessor of [...(reverse.get(stateId) ?? [])].sort()) {
      if (distances.has(predecessor)) continue;
      distances.set(predecessor, depth + 1);
      queue.push(predecessor);
    }
  }
  return distances;
}

function saturatingAdd(left: number, right: number): number {
  const sum = left + right;
  return Number.isSafeInteger(sum) ? sum : Number.MAX_SAFE_INTEGER;
}

function countShortestRoutes(
  graph: SearchGraph,
  starts: ReadonlySet<string>,
  goals: ReadonlySet<string>,
  distances: ReadonlyMap<string, number>,
  shortestDepth: number
): number {
  const countByState = new Map<string, number>();
  for (const start of starts) countByState.set(start, 1);
  const ordered = [...distances.entries()]
    .filter(([, depth]) => depth <= shortestDepth)
    .sort(([leftId, leftDepth], [rightId, rightDepth]) =>
      leftDepth === rightDepth ? leftId.localeCompare(rightId) : leftDepth - rightDepth
    );
  for (const [stateId, depth] of ordered) {
    const count = countByState.get(stateId) ?? 0;
    if (count === 0 || depth >= shortestDepth) continue;
    for (const edge of graph.adjacency.get(stateId) ?? []) {
      if (distances.get(edge.toStateId) !== depth + 1) continue;
      countByState.set(edge.toStateId, saturatingAdd(countByState.get(edge.toStateId) ?? 0, count));
    }
  }
  let total = 0;
  for (const goal of goals) {
    if (distances.get(goal) !== shortestDepth) continue;
    total = saturatingAdd(total, countByState.get(goal) ?? 0);
  }
  return total;
}

function enumerateBoundedPaths(
  graph: SearchGraph,
  starts: ReadonlySet<string>,
  goals: ReadonlySet<string>,
  shortestDepth: number,
  maxDepth: number,
  maxRoutes: number
): readonly PathDraft[] {
  const reverse = reverseDistances(graph, goals);
  const result: PathDraft[] = [];

  function visit(
    stateId: string,
    stateIds: readonly string[],
    edges: readonly LowReelRouteEdge[],
    visited: ReadonlySet<string>
  ): void {
    if (result.length >= maxRoutes) return;
    if (goals.has(stateId)) {
      if (edges.length >= shortestDepth) result.push({ stateIds, edges });
      return;
    }
    if (edges.length >= maxDepth) return;
    const remaining = reverse.get(stateId);
    if (remaining === undefined || edges.length + remaining > maxDepth) return;

    for (const edge of graph.adjacency.get(stateId) ?? []) {
      if (visited.has(edge.toStateId)) continue;
      // A source-cycle continuation is display context, not bridge preparation.
      if (edges.length === 0 && starts.has(edge.toStateId) && edge.kind !== "body-turn") {
        continue;
      }
      const nextVisited = new Set(visited);
      nextVisited.add(edge.toStateId);
      visit(edge.toStateId, [...stateIds, edge.toStateId], [...edges, edge], nextVisited);
      if (result.length >= maxRoutes) return;
    }
  }

  for (const start of [...starts].sort()) {
    visit(start, [start], [], new Set([start]));
    if (result.length >= maxRoutes) break;
  }

  return result.sort((left, right) => {
    if (left.edges.length !== right.edges.length) return left.edges.length - right.edges.length;
    return left.edges
      .map((edge) => edge.id)
      .join("|")
      .localeCompare(right.edges.map((edge) => edge.id).join("|"));
  });
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function modelStatusForEdges(edges: readonly LowReelRouteEdge[]): LowReelRouteModelStatus {
  return edges.some((edge) => edge.modelStatus === "unresolved") ? "unresolved" : "valid";
}

interface RouteEvidence {
  readonly status: LowReelRouteEvidenceStatus;
  readonly references: readonly string[];
}

const VERIFIED_WEAVE_REFERENCE =
  "research/mel-turning/verified/low-weaves-left-ss-cw-3-to-ccw-1.csv";
const VERIFIED_TS_PREPARATION_REFERENCE =
  "research/mel-turning/verified/low-reels-two-hand-together-same-turn-right.csv";

function evidenceForRoute(
  input: LowReelRouteSolverInput,
  sourceCycle: readonly LowReelRouteCycleEntry[],
  targetCycle: readonly LowReelRouteCycleEntry[],
  path: PathDraft
): RouteEvidence {
  const sourceId = lowReelConfigId(input.source);
  const targetId = lowReelConfigId(input.target);
  const firstStateId = path.stateIds[0];
  const lastStateId = path.stateIds[path.stateIds.length - 1];
  const sourceStep = sourceCycle.find((entry) => entry.state.id === firstStateId)?.cycleStep;
  const targetStep = targetCycle.find((entry) => entry.state.id === lastStateId)?.cycleStep;

  if (
    sourceId === "low-native:low-non-native:same-cw:3" &&
    targetId === "low-native:low-non-native:same-ccw:1" &&
    path.edges.length === 1 &&
    path.edges[0]?.kind === "body-turn" &&
    ((input.turnDirection === "left" && (sourceStep === 0 || sourceStep === 3)) ||
      (input.turnDirection === "right" && (sourceStep === 1 || sourceStep === 2))) &&
    targetStep === sourceStep
  ) {
    return {
      status: "exact-route-verified",
      references: [VERIFIED_WEAVE_REFERENCE]
    };
  }

  if (
    sourceId === "low-native:low-native:same-cw:1" &&
    targetId === "low-native:low-native:same-ccw:3" &&
    input.turnDirection === "right" &&
    sourceStep === 3 &&
    targetStep === 2 &&
    path.edges.length === 2 &&
    path.edges[0]?.kind === "circle-extension" &&
    path.edges[1]?.kind === "body-turn"
  ) {
    return {
      status: "exact-route-verified",
      references: [VERIFIED_TS_PREPARATION_REFERENCE]
    };
  }

  return { status: "unreviewed", references: [] };
}

function routeFromPath(
  input: LowReelRouteSolverInput,
  sourceCycle: readonly LowReelRouteCycleEntry[],
  targetCycle: readonly LowReelRouteCycleEntry[],
  graph: SearchGraph,
  path: PathDraft,
  shortestDepth: number
): LowReelTurningRoute {
  const turnEdgeIndex = path.edges.findIndex((edge) => edge.kind === "body-turn");
  if (turnEdgeIndex < 0) {
    throw new Error("Low-reel turning route has no body-turn edge.");
  }
  if (path.edges.slice(turnEdgeIndex + 1).some((edge) => edge.kind === "body-turn")) {
    throw new Error("Low-reel turning route has more than one body-turn edge.");
  }
  const states = path.stateIds.map((id) => {
    const state = graph.states.get(id);
    if (!state) throw new Error(`Low-reel route lost state ${id}.`);
    return state;
  });
  const evidence = evidenceForRoute(input, sourceCycle, targetCycle, path);
  const signature = [
    lowReelConfigId(input.source),
    lowReelConfigId(input.target),
    input.turnDirection,
    ...path.edges.map((edge) => edge.id)
  ].join("|");
  return {
    id: `low-reel-route-${fnv1a(signature)}`,
    states,
    edges: path.edges,
    bridgeHalfbeats: path.edges.length,
    preparationHalfbeats: turnEdgeIndex,
    recoveryHalfbeats: path.edges.length - turnEdgeIndex - 1,
    turnEdgeIndex,
    isShortest: path.edges.length === shortestDepth,
    modelStatus:
      evidence.status === "exact-route-verified" ? "valid" : modelStatusForEdges(path.edges),
    evidenceStatus: evidence.status,
    evidenceReferences: evidence.references
  };
}

function cycleEntries(
  catalog: FacingCatalog,
  config: TurningReelConfig,
  graphStates: ReadonlyMap<string, LowReelRouteState>
): readonly LowReelRouteCycleEntry[] {
  const cycle = getCycle(config);
  const configId = lowReelConfigId(config);
  return Array.from({ length: cycle.cycleSteps }, (_, cycleStep) => {
    const id = catalog.stateIdByConfigStep.get(occurrenceId(configId, cycleStep));
    const state = id ? graphStates.get(id) : undefined;
    if (!state) {
      throw new Error(`${configId} cycle state t${cycleStep} is absent from route graph.`);
    }
    return { cycleStep, state };
  });
}

function cycleDirections(
  config: TurningReelConfig
): Readonly<Record<TurningHand, TurningDirection>> {
  const cycle = getCycle(config);
  return {
    left: getTrack(cycle, "left").poiDirection,
    right: getTrack(cycle, "right").poiDirection
  };
}

function preparedGraphKey(
  sourceDirection: TurningReelDirection,
  timing: TurningEndpointCompatibility["sourceTiming"],
  turnDirection: BodyTurnDirection,
  includeUnresolved: boolean
): string {
  return [
    directionId(sourceDirection),
    timing,
    turnDirection,
    includeUnresolved ? "with-unresolved" : "known-only"
  ].join(":");
}

function getPreparedRouteGraph(
  sourceConfig: TurningReelConfig,
  timing: TurningEndpointCompatibility["sourceTiming"],
  turnDirection: BodyTurnDirection,
  includeUnresolved: boolean
): PreparedRouteGraph {
  const key = preparedGraphKey(sourceConfig.direction, timing, turnDirection, includeUnresolved);
  const cached = routeGraphCache.get(key);
  if (cached) return cached;

  const targetDirection = getObserverPreservingTargetDirection(sourceConfig.direction);
  const observerDirections = cycleDirections(sourceConfig);
  const sourceCatalog = buildFacingCatalog(
    enumerateCompatibleConfigs(sourceConfig.direction, timing),
    0,
    timing,
    observerDirections
  );
  const targetCatalog = buildFacingCatalog(
    enumerateCompatibleConfigs(targetDirection, timing),
    180,
    timing,
    observerDirections
  );
  const graph = buildSearchGraph(sourceCatalog, targetCatalog, turnDirection, includeUnresolved);
  const prepared = { sourceCatalog, targetCatalog, graph };
  routeGraphCache.set(key, prepared);
  return prepared;
}

export function solveLowReelTurningRoutes(
  input: LowReelRouteSolverInput
): LowReelRouteSolverResult {
  const options = validateOptions(input.options);
  const source = cloneConfig(input.source);
  const target = cloneConfig(input.target);
  const compatibility = getTurningEndpointCompatibility(source, target);
  if (!compatibility.compatible) {
    return {
      source,
      target,
      turnDirection: input.turnDirection,
      compatibility,
      diagnostics: compatibility.diagnostics,
      sourceCycle: [],
      targetCycle: [],
      shortestBridgeHalfbeats: null,
      shortestRouteCount: 0,
      routes: []
    };
  }

  const { sourceCatalog, targetCatalog, graph } = getPreparedRouteGraph(
    source,
    compatibility.sourceTiming,
    input.turnDirection,
    options.includeUnresolved
  );
  const sourceCycle = cycleEntries(sourceCatalog, source, graph.states);
  const targetCycle = cycleEntries(targetCatalog, target, graph.states);
  const starts = new Set(sourceCycle.map((entry) => entry.state.id));
  const goals = new Set(targetCycle.map((entry) => entry.state.id));
  const distances = breadthFirstDistances(graph, starts);
  const reachableGoalDepths = [...goals]
    .map((goal) => distances.get(goal))
    .filter((depth): depth is number => depth !== undefined);
  const shortestDepth = reachableGoalDepths.length > 0 ? Math.min(...reachableGoalDepths) : null;

  if (shortestDepth === null) {
    return {
      source,
      target,
      turnDirection: input.turnDirection,
      compatibility,
      diagnostics: [
        {
          code: "NO_ROUTE",
          message:
            "No preparation/turn/recovery route exists in the current exact-continuation, same-anchor circle-extension, and partial turn-topology model."
        }
      ],
      sourceCycle,
      targetCycle,
      shortestBridgeHalfbeats: null,
      shortestRouteCount: 0,
      routes: []
    };
  }

  const shortestRouteCount = countShortestRoutes(graph, starts, goals, distances, shortestDepth);
  const paths = enumerateBoundedPaths(
    graph,
    starts,
    goals,
    shortestDepth,
    shortestDepth + options.maxExtraHalfbeats,
    options.maxRoutes
  );
  const routes = paths.map((path) =>
    routeFromPath(input, sourceCycle, targetCycle, graph, path, shortestDepth)
  );

  return {
    source,
    target,
    turnDirection: input.turnDirection,
    compatibility,
    diagnostics: [],
    sourceCycle,
    targetCycle,
    shortestBridgeHalfbeats: shortestDepth,
    shortestRouteCount,
    routes
  };
}
