import {
  deriveTurningTrackFromMel,
  getMelTurningLanes
} from "@/lab/experiments/mel-turning/adapter/melBeatGraphAdapter";
import type {
  BodyTurnDirection,
  TurningDirection,
  TurningHand,
  TurningHandPlacement,
  TurningLaneId,
  TurningPhase,
  TurningPlaneSide,
  TurningTiming,
  TurningTrace,
  TurningTrack
} from "@/lab/experiments/mel-turning/model/turningTypes";

export type TurningReelPosition = "low-native" | "low-non-native" | "low-back";

export type TurningFlow = "inwards" | "outwards";

export type TurningPattern =
  | "single-reel"
  | "unison"
  | "counter"
  | "chasing-1"
  | "chasing-2";

export type TurningPoiRelation = "with" | "against";

export interface TurningFixtureSource {
  readonly file: string;
  readonly caseLabel: string;
  readonly firstStep: number;
  readonly turnAfterStep: number;
}

export interface VerifiedTurningFixture {
  readonly trace: TurningTrace;
  readonly reelPosition: TurningReelPosition;
  readonly flowBefore: TurningFlow;
  readonly flowAfter: TurningFlow;
  readonly relationToPoi?: TurningPoiRelation;
  readonly patternBefore: TurningPattern;
  readonly patternAfter: TurningPattern;
  readonly source: TurningFixtureSource;
}

export interface VerifiedTurningReference {
  readonly id: string;
  readonly label: string;
  readonly facing: 0 | 180;
  readonly flow: TurningFlow;
  readonly reelPosition: TurningReelPosition;
  readonly sourceFile: string;
  readonly sourceCase: string;
  readonly track: TurningTrack;
}

interface FixtureTrackDraft {
  readonly hand: TurningHand;
  readonly poiDirection: TurningDirection;
  readonly path: string;
}

interface VerifiedTurningFixtureDraft {
  readonly id: string;
  readonly label: string;
  readonly timing: TurningTiming;
  readonly summary: string;
  readonly reelPosition: TurningReelPosition;
  readonly flowBefore: TurningFlow;
  readonly turnDirection: BodyTurnDirection;
  readonly relationToPoi?: TurningPoiRelation;
  readonly patternBefore: TurningPattern;
  readonly patternAfter: TurningPattern;
  readonly source: TurningFixtureSource;
  readonly tracks: readonly FixtureTrackDraft[];
}

interface VerifiedTurningReferenceDraft {
  readonly id: string;
  readonly label: string;
  readonly facing: 0 | 180;
  readonly flow: TurningFlow;
  readonly reelPosition: TurningReelPosition;
  readonly sourceFile: string;
  readonly sourceCase: string;
  readonly hand: TurningHand;
  readonly poiDirection: TurningDirection;
  readonly path: string;
}

interface ParsedNode {
  readonly laneId: TurningLaneId;
  readonly planeSide: TurningPlaneSide;
  readonly phase: TurningPhase;
  readonly handPlacement: TurningHandPlacement;
}

const LOCATION_PATTERN = /^(C|L|R|Cb|Lb|Rb) ([ab]) (up|down)$/;

const laneByLocation: Readonly<Record<string, TurningLaneId>> = {
  C: "center",
  Cb: "center",
  L: "left-low",
  Lb: "left-low",
  R: "right-low",
  Rb: "right-low"
};

function parsePath(path: string): readonly ParsedNode[] {
  return path.split("|").map((rawToken) => {
    const token = rawToken.trim();
    const match = LOCATION_PATTERN.exec(token);
    if (!match) {
      throw new Error(`Invalid verified turning path token: "${token}".`);
    }

    const [, location, planeSide, phase] = match;
    const laneId = location ? laneByLocation[location] : undefined;
    if (!laneId || (planeSide !== "a" && planeSide !== "b")) {
      throw new Error(`Unsupported verified turning path token: "${token}".`);
    }

    return {
      laneId,
      planeSide,
      phase: phase as TurningPhase,
      handPlacement: location.endsWith("b") ? "behind-body" : "wall"
    };
  });
}

function compileTrack(draft: FixtureTrackDraft): TurningTrack {
  const nodes = parsePath(draft.path);
  const first = nodes[0];
  if (!first) {
    throw new Error(`Verified turning track for ${draft.hand} is empty.`);
  }

  const track = deriveTurningTrackFromMel({
    id: draft.hand,
    hand: draft.hand,
    poiDirection: draft.poiDirection,
    initialPhase: first.phase,
    rows: nodes.map((node, step) => ({
      step,
      laneId: node.laneId,
      planeSide: node.planeSide,
      handPlacement: node.handPlacement
    }))
  });

  for (const [step, expected] of nodes.entries()) {
    const actual = track.nodes[step];
    if (actual?.phase !== expected.phase) {
      throw new Error(
        `${draft.hand} fixture phase disagrees with uninterrupted timing at normalized t${step}.`
      );
    }
  }

  return track;
}

export function defineVerifiedTurningFixture(
  draft: VerifiedTurningFixtureDraft
): VerifiedTurningFixture {
  const normalizedTurnAfterStep = draft.source.turnAfterStep - draft.source.firstStep;
  const tracks = draft.tracks.map(compileTrack);
  const nodeCounts = new Set(tracks.map((track) => track.nodes.length));

  if (nodeCounts.size !== 1) {
    throw new Error(`${draft.id} has unsynchronized track lengths.`);
  }
  if (tracks.some((track) => !track.nodes[normalizedTurnAfterStep + 1])) {
    throw new Error(`${draft.id} has no complete half-beat turn edge.`);
  }

  return {
    reelPosition: draft.reelPosition,
    flowBefore: draft.flowBefore,
    flowAfter: draft.flowBefore === "inwards" ? "outwards" : "inwards",
    ...(draft.relationToPoi ? { relationToPoi: draft.relationToPoi } : {}),
    patternBefore: draft.patternBefore,
    patternAfter: draft.patternAfter,
    source: draft.source,
    trace: {
      id: draft.id,
      label: draft.label,
      timing: draft.timing,
      summary: draft.summary,
      source: `${draft.source.file} — ${draft.source.caseLabel}`,
      verificationStatus: "physically-verified",
      lanes: getMelTurningLanes(),
      tracks,
      events: [
        {
          kind: "body-turn",
          afterStep: normalizedTurnAfterStep,
          direction: draft.turnDirection,
          degrees: 180,
          fromFacing: 0,
          toFacing: 180,
          note: `Source t${draft.source.turnAfterStep} → t${draft.source.turnAfterStep + 1}; normalized t${normalizedTurnAfterStep} → t${normalizedTurnAfterStep + 1}.`
        }
      ]
    }
  };
}

export function defineVerifiedTurningReference(
  draft: VerifiedTurningReferenceDraft
): VerifiedTurningReference {
  return {
    id: draft.id,
    label: draft.label,
    facing: draft.facing,
    flow: draft.flow,
    reelPosition: draft.reelPosition,
    sourceFile: draft.sourceFile,
    sourceCase: draft.sourceCase,
    track: compileTrack({
      hand: draft.hand,
      poiDirection: draft.poiDirection,
      path: draft.path
    })
  };
}
