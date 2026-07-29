import {
  buildTurningReelCycle,
  type TurningReelConfig,
  type TurningReelDirection,
  type TurningReelOffset
} from "@/lab/experiments/mel-turning/adapter/melBeatGraphAdapter";
import {
  enumerateHandTurnTargets,
  getLowReelLocation
} from "@/lab/experiments/mel-turning/model/turnTopology";
import type {
  BodyFacing,
  BodyTurnDirection,
  TurningDirection,
  TurningHand,
  TurningNode,
  TurningPhase,
  TurningPlaneSide
} from "@/lab/experiments/mel-turning/model/turningTypes";

export interface LowWeaveEndpoint {
  readonly direction: TurningReelDirection;
  readonly offset: TurningReelOffset;
}

export interface LowWeaveTurnSearchInput {
  readonly source: LowWeaveEndpoint;
  readonly target: LowWeaveEndpoint;
  readonly turnDirection: BodyTurnDirection;
}

export interface LowWeaveSearchNode {
  readonly laneId: TurningNode["laneId"];
  readonly planeSide: TurningPlaneSide;
  readonly phase: TurningPhase;
  readonly handPlacement: "wall";
}

export interface LowWeavePairState {
  readonly left: LowWeaveSearchNode;
  readonly right: LowWeaveSearchNode;
  readonly facing: BodyFacing;
  readonly turned: boolean;
}

export type LowWeaveSearchEdge =
  | { readonly kind: "normal" }
  | {
      readonly kind: "turn";
      readonly turnDirection: BodyTurnDirection;
      readonly leftMechanism: "hold" | "cross";
      readonly rightMechanism: "hold" | "cross";
    };

export interface LowWeaveSearchPath {
  readonly states: readonly LowWeavePairState[];
  readonly edges: readonly LowWeaveSearchEdge[];
}

export interface LowWeaveTurnSearchResult {
  readonly source: LowWeaveEndpoint;
  readonly target: LowWeaveEndpoint;
  readonly sourceTiming: "TO" | "SO" | "TS" | "SS";
  readonly targetTiming: "TO" | "SO" | "TS" | "SS";
  readonly turnDirection: BodyTurnDirection;
  readonly sourceCycle: readonly LowWeavePairState[];
  readonly targetCycle: readonly LowWeavePairState[];
  readonly shortestBridgeHalfbeats: number | null;
  readonly paths: readonly LowWeaveSearchPath[];
}

const LEFT_LOW_WEAVE_POSITIONS = {
  left: "low-native",
  right: "low-non-native"
} as const;

function swapPlaneSide(side: TurningPlaneSide): TurningPlaneSide {
  return side === "a" ? "b" : "a";
}

function oppositePoiDirection(direction: TurningDirection): TurningDirection {
  return direction === "clockwise" ? "counterclockwise" : "clockwise";
}

function compactNode(node: TurningNode, facing: BodyFacing): LowWeaveSearchNode {
  return {
    laneId: node.laneId,
    planeSide: facing === 180 ? swapPlaneSide(node.planeSide) : node.planeSide,
    phase: node.phase,
    handPlacement: "wall"
  };
}

function reelConfig(endpoint: LowWeaveEndpoint): TurningReelConfig {
  return {
    ...LEFT_LOW_WEAVE_POSITIONS,
    direction: endpoint.direction,
    offset: endpoint.offset
  };
}

function getTrack(
  cycle: ReturnType<typeof buildTurningReelCycle>,
  hand: TurningHand
) {
  const track = cycle.tracks.find((candidate) => candidate.hand === hand);
  if (!track) throw new Error(`Expected ${hand} track in Mel reel cycle.`);
  return track;
}

function buildEndpointCycle(
  endpoint: LowWeaveEndpoint,
  facing: BodyFacing
): {
  readonly states: readonly LowWeavePairState[];
  readonly timing: LowWeaveTurnSearchResult["sourceTiming"];
  readonly directions: Readonly<Record<TurningHand, TurningDirection>>;
} {
  const cycle = buildTurningReelCycle(reelConfig(endpoint));
  if (cycle.patternType !== "weave") {
    throw new Error("Low-weave search endpoints must compile to a Mel weave.");
  }
  const left = getTrack(cycle, "left");
  const right = getTrack(cycle, "right");

  return {
    states: Array.from({ length: cycle.cycleSteps }, (_, step) => ({
      left: compactNode(left.nodes[step]!, facing),
      right: compactNode(right.nodes[step]!, facing),
      facing,
      turned: facing === 180
    })),
    timing: cycle.timing,
    directions: {
      left: left.poiDirection,
      right: right.poiDirection
    }
  };
}

function nodeKey(node: LowWeaveSearchNode): string {
  return `${node.laneId}:${node.planeSide}:${node.phase}`;
}

function stateKey(state: LowWeavePairState): string {
  return `${state.facing}:${state.turned ? 1 : 0}:${nodeKey(state.left)}|${nodeKey(state.right)}`;
}

function buildNormalEdgeMap(
  hand: TurningHand,
  endpointDirection: TurningReelDirection,
  facing: BodyFacing
): Map<string, LowWeaveSearchNode[]> {
  const result = new Map<string, LowWeaveSearchNode[]>();

  for (const position of ["low-native", "low-non-native"] as const) {
    const cycle = buildTurningReelCycle({
      left: hand === "left" ? position : "low-native",
      right: hand === "right" ? position : "low-native",
      direction: endpointDirection,
      offset: 0
    });
    const track = getTrack(cycle, hand);
    const nodes = track.nodes.map((node) => compactNode(node, facing));

    for (let step = 0; step < nodes.length; step += 1) {
      const from = nodes[step]!;
      const to = nodes[(step + 1) % nodes.length]!;
      const successors = result.get(nodeKey(from)) ?? [];
      if (!successors.some((candidate) => nodeKey(candidate) === nodeKey(to))) {
        successors.push(to);
      }
      result.set(nodeKey(from), successors);
    }
  }

  return result;
}

function normalSuccessors(
  state: LowWeavePairState,
  normalEdges: Readonly<
    Record<
      BodyFacing,
      Readonly<Record<TurningHand, Map<string, LowWeaveSearchNode[]>>>
    >
  >
): readonly [LowWeavePairState, LowWeaveSearchEdge][] {
  const leftTargets = normalEdges[state.facing].left.get(nodeKey(state.left)) ?? [];
  const rightTargets = normalEdges[state.facing].right.get(nodeKey(state.right)) ?? [];
  const result: [LowWeavePairState, LowWeaveSearchEdge][] = [];

  for (const left of leftTargets) {
    for (const right of rightTargets) {
      result.push([{ ...state, left, right }, { kind: "normal" }]);
    }
  }

  return result;
}

function turnSuccessors(
  state: LowWeavePairState,
  turnDirection: BodyTurnDirection,
  worldDirections: Readonly<Record<TurningHand, TurningDirection>>
): readonly [LowWeavePairState, LowWeaveSearchEdge][] {
  if (state.turned || state.facing !== 0) return [];

  const leftTargets = enumerateHandTurnTargets({
    hand: "left",
    poiDirection: worldDirections.left,
    from: { step: 0, ...state.left },
    turnDirection,
    fromFacing: 0,
    toFacing: 180
  }).targets;
  const rightTargets = enumerateHandTurnTargets({
    hand: "right",
    poiDirection: worldDirections.right,
    from: { step: 0, ...state.right },
    turnDirection,
    fromFacing: 0,
    toFacing: 180
  }).targets;
  const result: [LowWeavePairState, LowWeaveSearchEdge][] = [];

  for (const leftTarget of leftTargets) {
    for (const rightTarget of rightTargets) {
      result.push([
        {
          left: {
            laneId: leftTarget.node.laneId,
            planeSide: leftTarget.node.planeSide,
            phase: leftTarget.node.phase,
            handPlacement: "wall"
          },
          right: {
            laneId: rightTarget.node.laneId,
            planeSide: rightTarget.node.planeSide,
            phase: rightTarget.node.phase,
            handPlacement: "wall"
          },
          facing: 180,
          turned: true
        },
        {
          kind: "turn",
          turnDirection,
          leftMechanism: leftTarget.topology.mechanism,
          rightMechanism: rightTarget.topology.mechanism
        }
      ]);
    }
  }

  return result;
}

function search(
  sourceCycle: readonly LowWeavePairState[],
  targetCycle: readonly LowWeavePairState[],
  turnDirection: BodyTurnDirection,
  worldDirections: Readonly<Record<TurningHand, TurningDirection>>,
  normalEdges: Readonly<
    Record<
      BodyFacing,
      Readonly<Record<TurningHand, Map<string, LowWeaveSearchNode[]>>>
    >
  >
): readonly LowWeaveSearchPath[] {
  const goals = new Set(targetCycle.map(stateKey));
  const queue: LowWeaveSearchPath[] = sourceCycle.map((state) => ({
    states: [state],
    edges: []
  }));
  const bestDepth = new Map<string, number>();
  for (const state of sourceCycle) bestDepth.set(stateKey(state), 0);
  let foundDepth: number | null = null;
  const found: LowWeaveSearchPath[] = [];

  while (queue.length > 0) {
    const path = queue.shift();
    if (!path) break;
    const state = path.states[path.states.length - 1]!;
    const depth = path.edges.length;
    if (foundDepth !== null && depth > foundDepth) break;

    if (state.turned && goals.has(stateKey(state))) {
      foundDepth = depth;
      found.push(path);
      continue;
    }

    const successors = [
      ...normalSuccessors(state, normalEdges),
      ...turnSuccessors(state, turnDirection, worldDirections)
    ];
    for (const [next, edge] of successors) {
      const nextDepth = depth + 1;
      if (foundDepth !== null && nextDepth > foundDepth) continue;
      const key = stateKey(next);
      const previousDepth = bestDepth.get(key);
      if (previousDepth !== undefined && previousDepth < nextDepth) continue;
      bestDepth.set(key, nextDepth);
      queue.push({
        states: [...path.states, next],
        edges: [...path.edges, edge]
      });
    }
  }

  const unique = new Map<string, LowWeaveSearchPath>();
  for (const path of found) {
    unique.set(path.states.map(stateKey).join(">"), path);
  }
  return [...unique.values()];
}

function assertWorldDirectionPreserved(
  sourceDirections: Readonly<Record<TurningHand, TurningDirection>>,
  targetDirections: Readonly<Record<TurningHand, TurningDirection>>
): void {
  for (const hand of ["left", "right"] as const) {
    if (targetDirections[hand] !== oppositePoiDirection(sourceDirections[hand])) {
      throw new Error(
        `${hand} target direction must reverse in the performer frame to preserve observer-fixed poi direction through a 180-degree turn.`
      );
    }
  }
}

export function searchLowWeaveTurns(
  input: LowWeaveTurnSearchInput
): LowWeaveTurnSearchResult {
  const source = buildEndpointCycle(input.source, 0);
  const target = buildEndpointCycle(input.target, 180);
  assertWorldDirectionPreserved(source.directions, target.directions);

  const normalEdges = {
    0: {
      left: buildNormalEdgeMap("left", input.source.direction, 0),
      right: buildNormalEdgeMap("right", input.source.direction, 0)
    },
    180: {
      left: buildNormalEdgeMap("left", input.target.direction, 180),
      right: buildNormalEdgeMap("right", input.target.direction, 180)
    }
  } as const;
  const paths = search(
    source.states,
    target.states,
    input.turnDirection,
    source.directions,
    normalEdges
  );

  return {
    source: input.source,
    target: input.target,
    sourceTiming: source.timing,
    targetTiming: target.timing,
    turnDirection: input.turnDirection,
    sourceCycle: source.states,
    targetCycle: target.states,
    shortestBridgeHalfbeats: paths[0]?.edges.length ?? null,
    paths
  };
}

export function formatLowWeaveSearchNode(node: LowWeaveSearchNode): string {
  const location = getLowReelLocation(node);
  if (!location) {
    throw new Error(
      `Unsupported low-weave node ${node.laneId}:${node.planeSide}:${node.phase}.`
    );
  }
  return `${location} ${node.planeSide} ${node.phase}`;
}
