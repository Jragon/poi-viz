import type { VerifiedTurningFixture } from "@/lab/experiments/mel-turning/fixtures/verifiedTurningFixture";
import {
  derivePoiMidpointHorizontalDirection,
  type PoiMidpointHorizontalDirection
} from "@/lab/experiments/mel-turning/model/turnEdgeAnalysis";
import type {
  BodyTurnDirection,
  TurningHand,
  TurningHandPlacement,
  TurningLaneId,
  TurningPlaneSide,
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
  readonly mechanism: TurnLegalityMechanism;
  readonly gate: BodyTurnDirection | null;
  readonly midpointPoiDirection: PoiMidpointHorizontalDirection;
  readonly preparedBeforeTurn: boolean;
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
      const mechanism = from.planeSide === to.planeSide ? "hold" : "cross";

      return {
        hand: track.hand,
        fromLane: from.laneId,
        toLane: to.laneId,
        fromPlaneSide: from.planeSide,
        toPlaneSide: to.planeSide,
        fromHandPlacement: from.handPlacement ?? "wall",
        toHandPlacement: to.handPlacement ?? "wall",
        mechanism,
        gate: mechanism === "cross" ? event.direction : null,
        midpointPoiDirection: derivePoiMidpointHorizontalDirection(
          from.phase,
          track.poiDirection
        ),
        preparedBeforeTurn: cycleReference ? !sameGraphPosition(from, cycleReference) : false
      };
    });

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
