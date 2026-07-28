import {
  deriveTurningTrackFromMel,
  getMelTurningLanes
} from "@/lab/experiments/mel-turning/adapter/melBeatGraphAdapter";
import type {
  BodyTurnEvent,
  TurningDirection,
  TurningHand,
  TurningLaneId,
  TurningPhase,
  TurningPlaneSide,
  TurningTrace,
  TurningTrack
} from "@/lab/experiments/mel-turning/model/turningTypes";

type CompactPosition = readonly [lane: "L" | "C" | "R", planeSide: TurningPlaneSide];

interface CompactTrack {
  readonly id: string;
  readonly hand: TurningHand;
  readonly poiDirection: TurningDirection;
  readonly initialPhase: TurningPhase;
  readonly positions: readonly CompactPosition[];
}

const TURN_LEFT_AFTER_7: BodyTurnEvent = {
  kind: "body-turn",
  afterStep: 7,
  direction: "left",
  degrees: 180,
  fromFacing: 0,
  toFacing: 180,
  note: "The shared body turn occupies one half-beat, from t7 to t8."
};

const TURN_RIGHT_AFTER_7: BodyTurnEvent = {
  kind: "body-turn",
  afterStep: 7,
  direction: "right",
  degrees: 180,
  fromFacing: 0,
  toFacing: 180,
  note: "The shared body turn occupies one half-beat, from t7 to t8."
};

const TURN_LEFT_AFTER_5: BodyTurnEvent = {
  kind: "body-turn",
  afterStep: 5,
  direction: "left",
  degrees: 180,
  fromFacing: 0,
  toFacing: 180,
  note: "The shared body turn occupies one half-beat, from t5 to t6."
};

const laneByCode: Readonly<Record<CompactPosition[0], TurningLaneId>> = {
  L: "left-low",
  C: "center",
  R: "right-low"
};

function compileTrack(track: CompactTrack): TurningTrack {
  return deriveTurningTrackFromMel({
    id: track.id,
    hand: track.hand,
    poiDirection: track.poiDirection,
    initialPhase: track.initialPhase,
    rows: track.positions.map(([lane, planeSide], step) => ({
      step,
      laneId: laneByCode[lane],
      planeSide
    }))
  });
}

function trace(
  input: Omit<TurningTrace, "lanes" | "tracks"> & {
    readonly tracks: readonly CompactTrack[];
  }
): TurningTrace {
  return {
    ...input,
    lanes: getMelTurningLanes(),
    tracks: input.tracks.map(compileTrack)
  };
}

const togetherSameLeft = trace({
  id: "ts-left-chasing-1-to-2",
  label: "TS chasing 1 → chasing 2 · turn left",
  timing: "TS",
  summary:
    "Left holds B while right crosses A→B. The poi meet at the left gate, so the shared crossing and body turn fit the same half-beat.",
  source: "research/mel-turning/verified/low-reels-two-hand-together-same-turn-left.csv",
  verificationStatus: "physically-verified",
  events: [TURN_LEFT_AFTER_7],
  tracks: [
    {
      id: "left",
      hand: "left",
      poiDirection: "clockwise",
      initialPhase: "up",
      positions: [
        ["C", "a"],
        ["C", "a"],
        ["L", "b"],
        ["L", "b"],
        ["C", "a"],
        ["C", "a"],
        ["L", "b"],
        ["L", "b"],
        ["C", "b"],
        ["L", "a"],
        ["L", "a"],
        ["C", "b"],
        ["C", "b"]
      ]
    },
    {
      id: "right",
      hand: "right",
      poiDirection: "clockwise",
      initialPhase: "up",
      positions: [
        ["C", "a"],
        ["R", "b"],
        ["R", "b"],
        ["C", "a"],
        ["C", "a"],
        ["R", "b"],
        ["R", "b"],
        ["C", "a"],
        ["C", "b"],
        ["C", "b"],
        ["R", "a"],
        ["R", "a"],
        ["C", "b"]
      ]
    }
  ]
});

const splitSameRight = trace({
  id: "ss-right-counter-to-counter",
  label: "SS counter → counter · turn right",
  timing: "SS",
  summary:
    "Left holds A and right holds B. The existing open A/B configuration makes this the normal low-native split-same right turn.",
  source: "research/mel-turning/verified/low-reels-two-hand-split-same-turn-right.csv",
  verificationStatus: "physically-verified",
  events: [TURN_RIGHT_AFTER_7],
  tracks: [
    {
      id: "left",
      hand: "left",
      poiDirection: "clockwise",
      initialPhase: "down",
      positions: [
        ["C", "a"],
        ["L", "b"],
        ["L", "b"],
        ["C", "a"],
        ["C", "a"],
        ["L", "b"],
        ["L", "b"],
        ["C", "a"],
        ["L", "a"],
        ["L", "a"],
        ["C", "b"],
        ["C", "b"],
        ["L", "a"]
      ]
    },
    {
      id: "right",
      hand: "right",
      poiDirection: "clockwise",
      initialPhase: "up",
      positions: [
        ["R", "b"],
        ["C", "a"],
        ["C", "a"],
        ["R", "b"],
        ["R", "b"],
        ["C", "a"],
        ["C", "a"],
        ["R", "b"],
        ["C", "b"],
        ["C", "b"],
        ["R", "a"],
        ["R", "a"],
        ["C", "b"]
      ]
    }
  ]
});

const splitOppositeLeft = trace({
  id: "so-left-chasing-2-to-2",
  label: "SO chasing 2 → chasing 2 · turn left",
  timing: "SO",
  summary:
    "Both hands cross A→B through the same left gate at the shared horizontal midpoint while the body turns.",
  source: "research/mel-turning/verified/low-reels-split-opposite.csv",
  verificationStatus: "physically-verified",
  events: [TURN_LEFT_AFTER_5],
  tracks: [
    {
      id: "left",
      hand: "left",
      poiDirection: "clockwise",
      initialPhase: "up",
      positions: [
        ["C", "a"],
        ["C", "a"],
        ["L", "b"],
        ["L", "b"],
        ["C", "a"],
        ["C", "a"],
        ["C", "b"],
        ["L", "a"],
        ["L", "a"],
        ["C", "b"],
        ["C", "b"]
      ]
    },
    {
      id: "right",
      hand: "right",
      poiDirection: "counterclockwise",
      initialPhase: "down",
      positions: [
        ["R", "b"],
        ["C", "a"],
        ["C", "a"],
        ["R", "b"],
        ["R", "b"],
        ["C", "a"],
        ["C", "b"],
        ["C", "b"],
        ["R", "a"],
        ["R", "a"],
        ["C", "b"]
      ]
    }
  ]
});

export const VERIFIED_TURNING_TRACES: readonly TurningTrace[] = [
  togetherSameLeft,
  splitSameRight,
  splitOppositeLeft
] as const;

export function getVerifiedTurningTrace(id: string): TurningTrace {
  const found = VERIFIED_TURNING_TRACES.find((candidate) => candidate.id === id);
  if (!found) {
    throw new Error(`Unknown verified turning trace: ${id}`);
  }
  return found;
}
