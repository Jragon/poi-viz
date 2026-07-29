import type { VerifiedTurningFixture } from "@/lab/experiments/mel-turning/fixtures/verifiedTurningFixture";
import {
  type PoiMidpointHorizontalDirection
} from "@/lab/experiments/mel-turning/model/turnEdgeAnalysis";
import {
  derivePoiMidpointHorizontalDirection,
  validateHandTurnTopology
} from "@/lab/experiments/mel-turning/model/turnTopology";
import type {
  BodyTurnDirection,
  LowReelLocation,
  TurnTopologyStatus,
  TurningGateSide,
  TurningHand,
  TurningHandPlacement,
  TurningLaneId,
  TurningPlaneSide,
  TurningRelativeCircle,
  TurningTiming,
  TurningVerificationStatus
} from "@/lab/experiments/mel-turning/model/turningTypes";

export type TurnLegalityMechanism = "hold" | "cross";

export interface TurnLegalityHandEntry {
  readonly hand: TurningHand;
  readonly fromLane: TurningLaneId;
  readonly toLane: TurningLaneId;
  readonly fromPlaneSide: TurningPlaneSide;
  readonly toPlaneSide: TurningPlaneSide;
  readonly fromHandPlacement: TurningHandPlacement;
  readonly toHandPlacement: TurningHandPlacement;
  readonly fromLocation: LowReelLocation | null;
  readonly toLocation: LowReelLocation | null;
  readonly fromRelativeCircle: TurningRelativeCircle | null;
  readonly toRelativeCircle: TurningRelativeCircle | null;
  readonly mechanism: TurnLegalityMechanism;
  readonly gate: TurningGateSide | null;
  readonly expectedGate: TurningGateSide | null;
  readonly midpointPoiDirection: PoiMidpointHorizontalDirection;
  readonly sourceDiffersFromPriorCycle: boolean;
  readonly topologyStatus: TurnTopologyStatus;
}

export interface TurnLegalityMatrixRow {
  readonly fixtureId: string;
  readonly label: string;
  readonly timing: TurningTiming;
  readonly reelPosition: VerifiedTurningFixture["reelPosition"];
  readonly flowBefore: VerifiedTurningFixture["flowBefore"];
  readonly flowAfter: VerifiedTurningFixture["flowAfter"];
  readonly patternBefore: VerifiedTurningFixture["patternBefore"];
  readonly patternAfter: VerifiedTurningFixture["patternAfter"];
  readonly turnDirection: BodyTurnDirection;
  readonly turnAfterStep: number;
  readonly planeConfigurationBefore: string;
  readonly planeConfigurationAfter: string;
  readonly crossingCount: number;
  readonly topologyStatus: TurnTopologyStatus;
  readonly hands: readonly TurnLegalityHandEntry[];
  readonly verificationStatus: TurningVerificationStatus;
}

const REEL_CYCLE_STEPS = 4;

function sameGraphPosition(
  left: {
    readonly laneId: TurningLaneId;
    readonly planeSide: TurningPlaneSide;
    readonly handPlacement?: TurningHandPlacement;
  },
  right: {
    readonly laneId: TurningLaneId;
    readonly planeSide: TurningPlaneSide;
    readonly handPlacement?: TurningHandPlacement;
  }
): boolean {
  return (
    left.laneId === right.laneId &&
    left.planeSide === right.planeSide &&
    (left.handPlacement ?? "wall") === (right.handPlacement ?? "wall")
  );
}

function handOrder(hand: TurningHand): number {
  return hand === "left" ? 0 : 1;
}

function aggregateTopologyStatus(
  hands: readonly TurnLegalityHandEntry[]
): TurnTopologyStatus {
  if (hands.some((hand) => hand.topologyStatus === "invalid")) return "invalid";
  if (hands.some((hand) => hand.topologyStatus === "unresolved")) return "unresolved";
  return "valid";
}

export function buildTurnLegalityMatrixRow(
  fixture: VerifiedTurningFixture
): TurnLegalityMatrixRow {
  const event = fixture.trace.events[0];
  if (!event) {
    throw new Error(`${fixture.trace.id} has no turn event.`);
  }

  const hands = [...fixture.trace.tracks]
    .sort((left, right) => handOrder(left.hand) - handOrder(right.hand))
    .map((track): TurnLegalityHandEntry => {
      const from = track.nodes.find((node) => node.step === event.afterStep);
      const to = track.nodes.find((node) => node.step === event.afterStep + 1);
      if (!from || !to) {
        throw new Error(`${fixture.trace.id} ${track.hand} track does not span its turn edge.`);
      }

      const cycleReference = track.nodes.find(
        (node) => node.step === event.afterStep - REEL_CYCLE_STEPS
      );
      const topology = validateHandTurnTopology({
        hand: track.hand,
        poiDirection: track.poiDirection,
        from,
        to,
        turnDirection: event.direction,
        fromFacing: event.fromFacing,
        toFacing: event.toFacing
      });

      return {
        hand: track.hand,
        fromLane: from.laneId,
        toLane: to.laneId,
        fromPlaneSide: from.planeSide,
        toPlaneSide: to.planeSide,
        fromHandPlacement: from.handPlacement ?? "wall",
        toHandPlacement: to.handPlacement ?? "wall",
        fromLocation: topology.fromLocation,
        toLocation: topology.toLocation,
        fromRelativeCircle: topology.fromRelativeCircle,
        toRelativeCircle: topology.toRelativeCircle,
        mechanism: topology.mechanism,
        gate: topology.actualGate,
        expectedGate: topology.expectedGate,
        midpointPoiDirection: derivePoiMidpointHorizontalDirection(
          from.phase,
          track.poiDirection
        ),
        sourceDiffersFromPriorCycle: cycleReference
          ? !sameGraphPosition(from, cycleReference)
          : false,
        topologyStatus: topology.status
      };
    });

  const topologyStatus = aggregateTopologyStatus(hands);

  return {
    fixtureId: fixture.trace.id,
    label: fixture.trace.label,
    timing: fixture.trace.timing,
    reelPosition: fixture.reelPosition,
    flowBefore: fixture.flowBefore,
    flowAfter: fixture.flowAfter,
    patternBefore: fixture.patternBefore,
    patternAfter: fixture.patternAfter,
    turnDirection: event.direction,
    turnAfterStep: event.afterStep,
    planeConfigurationBefore: hands
      .map((hand) => hand.fromPlaneSide.toUpperCase())
      .join(""),
    planeConfigurationAfter: hands.map((hand) => hand.toPlaneSide.toUpperCase()).join(""),
    crossingCount: hands.filter((hand) => hand.mechanism === "cross").length,
    topologyStatus,
    hands,
    verificationStatus: fixture.trace.verificationStatus
  };
}

export function buildTurnLegalityMatrix(
  fixtures: readonly VerifiedTurningFixture[]
): readonly TurnLegalityMatrixRow[] {
  const ids = new Set<string>();
  return fixtures.map((fixture) => {
    if (ids.has(fixture.trace.id)) {
      throw new Error(`Duplicate turning legality fixture id: ${fixture.trace.id}.`);
    }
    ids.add(fixture.trace.id);
    return buildTurnLegalityMatrixRow(fixture);
  });
}
