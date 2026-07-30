import {
  buildTurningReelCycle,
  type TurningReelConfig
} from "@/lab/experiments/mel-turning/adapter/melBeatGraphAdapter";
import {
  getLowReelLocation,
  validateHandTurnTopology,
  type HandTurnTopology
} from "@/lab/experiments/mel-turning/model/turnTopology";
import type {
  BodyFacing,
  BodyTurnDirection,
  TurnTopologyStatus,
  TurningDirection,
  TurningHand,
  TurningHandPlacement,
  TurningNode,
  TurningPhase,
  TurningPlaneSide
} from "@/lab/experiments/mel-turning/model/turningTypes";

export interface LowReelDirectTurnSearchInput {
  readonly source: TurningReelConfig;
  readonly target: TurningReelConfig;
  readonly turnDirection: BodyTurnDirection;
}

export interface LowReelSearchNode {
  readonly laneId: TurningNode["laneId"];
  readonly planeSide: TurningPlaneSide;
  readonly phase: TurningPhase;
  readonly handPlacement: TurningHandPlacement;
}

export interface LowReelCycleState {
  readonly cycleStep: number;
  readonly left: LowReelSearchNode;
  readonly right: LowReelSearchNode;
  readonly facing: BodyFacing;
}

export type LowReelDirectTurnSearchDiagnosticCode =
  | "TARGET_POI_DIRECTION_MISMATCH"
  | "NO_PHASE_ALIGNMENT";

export interface LowReelDirectTurnSearchDiagnostic {
  readonly code: LowReelDirectTurnSearchDiagnosticCode;
  readonly message: string;
  readonly hand?: TurningHand;
}

export interface LowReelDirectTurnCandidate {
  readonly id: string;
  readonly source: LowReelCycleState;
  readonly target: LowReelCycleState;
  readonly topologyStatus: TurnTopologyStatus;
  readonly leftTopology: HandTurnTopology;
  readonly rightTopology: HandTurnTopology;
}

export interface LowReelDirectTurnSearchResult {
  readonly source: TurningReelConfig;
  readonly target: TurningReelConfig;
  readonly sourceTiming: "TO" | "SO" | "TS" | "SS";
  readonly targetTiming: "TO" | "SO" | "TS" | "SS";
  readonly sourcePatternType: "weave" | "mill";
  readonly targetPatternType: "weave" | "mill";
  readonly turnDirection: BodyTurnDirection;
  readonly status: TurnTopologyStatus;
  readonly diagnostics: readonly LowReelDirectTurnSearchDiagnostic[];
  readonly sourceCycle: readonly LowReelCycleState[];
  readonly targetCycle: readonly LowReelCycleState[];
  readonly candidates: readonly LowReelDirectTurnCandidate[];
}

function cloneReelConfig(config: TurningReelConfig): TurningReelConfig {
  return {
    left: config.left,
    right: config.right,
    direction: { ...config.direction },
    offset: config.offset
  };
}

function swapPlaneSide(side: TurningPlaneSide): TurningPlaneSide {
  return side === "a" ? "b" : "a";
}

function oppositePhase(phase: TurningPhase): TurningPhase {
  return phase === "up" ? "down" : "up";
}

function oppositePoiDirection(direction: TurningDirection): TurningDirection {
  return direction === "clockwise" ? "counterclockwise" : "clockwise";
}

function endpointSignature(config: TurningReelConfig): string {
  const direction =
    config.direction.mode === "same"
      ? `same-${config.direction.direction}`
      : `opposite-${config.direction.flow}`;

  return [config.left, config.right, direction, config.offset].join("-");
}

function compactNode(node: TurningNode, facing: BodyFacing): LowReelSearchNode {
  return {
    laneId: node.laneId,
    planeSide: facing === 180 ? swapPlaneSide(node.planeSide) : node.planeSide,
    phase: node.phase,
    handPlacement: node.handPlacement ?? "wall"
  };
}

function getTrack(cycle: ReturnType<typeof buildTurningReelCycle>, hand: TurningHand) {
  const track = cycle.tracks.find((candidate) => candidate.hand === hand);
  if (!track) throw new Error(`Expected ${hand} track in Mel reel cycle.`);
  return track;
}

function buildEndpointCycle(
  config: TurningReelConfig,
  facing: BodyFacing
): {
  readonly states: readonly LowReelCycleState[];
  readonly timing: LowReelDirectTurnSearchResult["sourceTiming"];
  readonly patternType: LowReelDirectTurnSearchResult["sourcePatternType"];
  readonly directions: Readonly<Record<TurningHand, TurningDirection>>;
} {
  const cycle = buildTurningReelCycle(config);
  const left = getTrack(cycle, "left");
  const right = getTrack(cycle, "right");

  return {
    states: Array.from({ length: cycle.cycleSteps }, (_, cycleStep) => ({
      cycleStep,
      left: compactNode(left.nodes[cycleStep]!, facing),
      right: compactNode(right.nodes[cycleStep]!, facing),
      facing
    })),
    timing: cycle.timing,
    patternType: cycle.patternType,
    directions: {
      left: left.poiDirection,
      right: right.poiDirection
    }
  };
}

function directionDiagnostics(
  source: Readonly<Record<TurningHand, TurningDirection>>,
  target: Readonly<Record<TurningHand, TurningDirection>>
): readonly LowReelDirectTurnSearchDiagnostic[] {
  const diagnostics: LowReelDirectTurnSearchDiagnostic[] = [];

  for (const hand of ["left", "right"] as const) {
    const expected = oppositePoiDirection(source[hand]);
    if (target[hand] === expected) continue;

    diagnostics.push({
      code: "TARGET_POI_DIRECTION_MISMATCH",
      hand,
      message: `${hand} target direction must be ${expected} in the performer frame to preserve observer-fixed poi direction through a 180-degree turn.`
    });
  }

  return diagnostics;
}

function phasesAlign(source: LowReelCycleState, target: LowReelCycleState): boolean {
  return (
    target.left.phase === oppositePhase(source.left.phase) &&
    target.right.phase === oppositePhase(source.right.phase)
  );
}

function topologyStatus(left: HandTurnTopology, right: HandTurnTopology): TurnTopologyStatus {
  if (left.status === "invalid" || right.status === "invalid") return "invalid";
  if (left.status === "unresolved" || right.status === "unresolved") return "unresolved";
  return "valid";
}

function summarizeCandidateStatuses(
  candidates: readonly LowReelDirectTurnCandidate[]
): TurnTopologyStatus {
  if (candidates.some((candidate) => candidate.topologyStatus === "valid")) return "valid";
  if (candidates.some((candidate) => candidate.topologyStatus === "unresolved")) {
    return "unresolved";
  }
  return "invalid";
}

function turningNode(node: LowReelSearchNode, step: number): TurningNode {
  return { step, ...node };
}

function enumerateCandidates(
  sourceCycle: readonly LowReelCycleState[],
  targetCycle: readonly LowReelCycleState[],
  turnDirection: BodyTurnDirection,
  worldDirections: Readonly<Record<TurningHand, TurningDirection>>,
  searchSignature: string
): readonly LowReelDirectTurnCandidate[] {
  const candidates = new Map<string, LowReelDirectTurnCandidate>();

  for (const source of sourceCycle) {
    for (const target of targetCycle) {
      if (!phasesAlign(source, target)) continue;

      const id = `${searchSignature}-source-${source.cycleStep}-to-target-${target.cycleStep}`;
      const leftTopology = validateHandTurnTopology({
        hand: "left",
        poiDirection: worldDirections.left,
        from: turningNode(source.left, source.cycleStep),
        to: turningNode(target.left, target.cycleStep),
        turnDirection,
        fromFacing: source.facing,
        toFacing: target.facing
      });
      const rightTopology = validateHandTurnTopology({
        hand: "right",
        poiDirection: worldDirections.right,
        from: turningNode(source.right, source.cycleStep),
        to: turningNode(target.right, target.cycleStep),
        turnDirection,
        fromFacing: source.facing,
        toFacing: target.facing
      });

      candidates.set(id, {
        id,
        source,
        target,
        topologyStatus: topologyStatus(leftTopology, rightTopology),
        leftTopology,
        rightTopology
      });
    }
  }

  return [...candidates.values()];
}

export function searchLowReelDirectTurns(
  input: LowReelDirectTurnSearchInput
): LowReelDirectTurnSearchResult {
  const sourceConfig = cloneReelConfig(input.source);
  const targetConfig = cloneReelConfig(input.target);
  const source = buildEndpointCycle(sourceConfig, 0);
  const target = buildEndpointCycle(targetConfig, 180);
  const diagnostics = [...directionDiagnostics(source.directions, target.directions)];

  if (diagnostics.length > 0) {
    return {
      source: sourceConfig,
      target: targetConfig,
      sourceTiming: source.timing,
      targetTiming: target.timing,
      sourcePatternType: source.patternType,
      targetPatternType: target.patternType,
      turnDirection: input.turnDirection,
      status: "invalid",
      diagnostics,
      sourceCycle: source.states,
      targetCycle: target.states,
      candidates: []
    };
  }

  const candidates = enumerateCandidates(
    source.states,
    target.states,
    input.turnDirection,
    source.directions,
    `${endpointSignature(sourceConfig)}-to-${endpointSignature(targetConfig)}-turn-${input.turnDirection}`
  );
  if (candidates.length === 0) {
    diagnostics.push({
      code: "NO_PHASE_ALIGNMENT",
      message: `Source timing ${source.timing} cannot enter target timing ${target.timing} over one uninterrupted halfbeat.`
    });
  }

  return {
    source: sourceConfig,
    target: targetConfig,
    sourceTiming: source.timing,
    targetTiming: target.timing,
    sourcePatternType: source.patternType,
    targetPatternType: target.patternType,
    turnDirection: input.turnDirection,
    status: candidates.length > 0 ? summarizeCandidateStatuses(candidates) : "invalid",
    diagnostics,
    sourceCycle: source.states,
    targetCycle: target.states,
    candidates
  };
}

export function formatLowReelSearchNode(node: LowReelSearchNode): string {
  const location = getLowReelLocation(node);
  if (!location) {
    throw new Error(`Unsupported low-reel node ${node.laneId}:${node.planeSide}:${node.phase}.`);
  }
  return `${location} ${node.planeSide} ${node.phase}`;
}
