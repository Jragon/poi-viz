import {
  defineVerifiedTurningFixture,
  type TurningPattern,
  type TurningReelPosition,
  type VerifiedTurningFixture
} from "@/lab/experiments/mel-turning/fixtures/verifiedTurningFixture";
import type {
  BodyTurnDirection,
  TurningDirection,
  TurningTiming
} from "@/lab/experiments/mel-turning/model/turningTypes";

interface TwoHandDraft {
  readonly id: string;
  readonly label: string;
  readonly timing: Exclude<TurningTiming, "ONE">;
  readonly summary: string;
  readonly reelPosition: TurningReelPosition;
  readonly turnDirection: BodyTurnDirection;
  readonly patternBefore: TurningPattern;
  readonly patternAfter: TurningPattern;
  readonly sourceFile: string;
  readonly sourceCase: string;
  readonly turnAfterStep: number;
  readonly leftDirection: TurningDirection;
  readonly rightDirection: TurningDirection;
  readonly leftPath: string;
  readonly rightPath: string;
}

function twoHand(draft: TwoHandDraft): VerifiedTurningFixture {
  return defineVerifiedTurningFixture({
    id: draft.id,
    label: draft.label,
    timing: draft.timing,
    summary: draft.summary,
    reelPosition: draft.reelPosition,
    flowBefore: "inwards",
    turnDirection: draft.turnDirection,
    patternBefore: draft.patternBefore,
    patternAfter: draft.patternAfter,
    source: {
      file: draft.sourceFile,
      caseLabel: draft.sourceCase,
      firstStep: 0,
      turnAfterStep: draft.turnAfterStep
    },
    tracks: [
      {
        hand: "left",
        poiDirection: draft.leftDirection,
        path: draft.leftPath
      },
      {
        hand: "right",
        poiDirection: draft.rightDirection,
        path: draft.rightPath
      }
    ]
  });
}

const TO_SOURCE =
  "research/mel-turning/verified/low-reels-one-hand-and-together-opposite.csv";
const SO_SOURCE = "research/mel-turning/verified/low-reels-split-opposite.csv";
const SO_NON_NATIVE_SOURCE =
  "research/mel-turning/verified/low-reels-two-hand-split-opposite-non-native-turn-left.csv";
const TS_LEFT_SOURCE =
  "research/mel-turning/verified/low-reels-two-hand-together-same-turn-left.csv";
const TS_RIGHT_SOURCE =
  "research/mel-turning/verified/low-reels-two-hand-together-same-turn-right.csv";
const SS_LEFT_SOURCE =
  "research/mel-turning/verified/low-reels-two-hand-split-same-turn-left.csv";
const SS_RIGHT_SOURCE =
  "research/mel-turning/verified/low-reels-two-hand-split-same-turn-right.csv";

const oppositeDirections = {
  leftDirection: "clockwise",
  rightDirection: "counterclockwise"
} as const;

const sameClockwiseDirections = {
  leftDirection: "clockwise",
  rightDirection: "clockwise"
} as const;

const togetherOpposite: readonly VerifiedTurningFixture[] = [
  twoHand({
    id: "to-left-unison-to-unison",
    label: "TO unison → unison · turn left",
    timing: "TO",
    summary: "Left holds B while right crosses A→B.",
    reelPosition: "low-native",
    turnDirection: "left",
    patternBefore: "unison",
    patternAfter: "unison",
    sourceFile: TO_SOURCE,
    sourceCase: "TO unison → unison, turn left",
    turnAfterStep: 4,
    ...oppositeDirections,
    leftPath:
      "C a up | C a down | L b up | L b down | C b up | C b down | C b up | L a down | L a up",
    rightPath:
      "C a up | C a down | R b up | R b down | C a up | C b down | C b up | R a down | R a up"
  }),
  twoHand({
    id: "to-left-unison-to-counter",
    label: "TO unison → counter · turn left",
    timing: "TO",
    summary: "Left holds B while right holds A.",
    reelPosition: "low-native",
    turnDirection: "left",
    patternBefore: "unison",
    patternAfter: "counter",
    sourceFile: TO_SOURCE,
    sourceCase: "TO unison → counter, turn left",
    turnAfterStep: 4,
    ...oppositeDirections,
    leftPath:
      "C a up | C a down | L b up | L b down | C b up | C b down | C b up | L a down | L a up",
    rightPath:
      "C a up | C a down | R b up | R b down | C a up | R a down | R a up | C b down | C b up"
  }),
  twoHand({
    id: "to-left-counter-to-unison",
    label: "TO counter → unison · turn left",
    timing: "TO",
    summary: "Left crosses B→A while right holds A.",
    reelPosition: "low-native",
    turnDirection: "left",
    patternBefore: "counter",
    patternAfter: "unison",
    sourceFile: TO_SOURCE,
    sourceCase: "TO counter → unison, turn left",
    turnAfterStep: 4,
    ...oppositeDirections,
    leftPath:
      "L b up | L b down | C a up | C a down | L b up | L a down | L a up | C b down | C b up",
    rightPath:
      "C a up | C a down | R b up | R b down | C a up | R a down | R a up | C b down | C b up"
  }),
  twoHand({
    id: "to-left-counter-to-counter",
    label: "TO counter → counter · turn left",
    timing: "TO",
    summary: "Left holds B while right holds A and the pair passes through wheel plane.",
    reelPosition: "low-native",
    turnDirection: "left",
    patternBefore: "counter",
    patternAfter: "counter",
    sourceFile: TO_SOURCE,
    sourceCase: "TO counter → counter, turn left",
    turnAfterStep: 4,
    ...oppositeDirections,
    leftPath:
      "L b up | L b down | C a up | C a down | L b up | C b down | C b up | L a down | L a up",
    rightPath:
      "C a up | C a down | R b up | R b down | C a up | R a down | R a up | C b down | C b up"
  })
] as const;

const splitOppositeNative: readonly VerifiedTurningFixture[] = [
  twoHand({
    id: "so-left-chasing-1-to-1",
    label: "SO chasing 1 → chasing 1 · turn left",
    timing: "SO",
    summary: "Open BA configuration: left holds B and right holds A.",
    reelPosition: "low-native",
    turnDirection: "left",
    patternBefore: "chasing-1",
    patternAfter: "chasing-1",
    sourceFile: SO_SOURCE,
    sourceCase:
      "SO chasing-1 → chasing-1, turn left — left holds B / right holds A",
    turnAfterStep: 7,
    ...oppositeDirections,
    leftPath:
      "C a up | C a down | L b up | L b down | C a up | C a down | L b up | L b down | C b up | L a down | L a up | C b down | C b up",
    rightPath:
      "C a down | R b up | R b down | C a up | C a down | R b up | R b down | C a up | R a down | R a up | C b down | C b up | R a down"
  }),
  twoHand({
    id: "so-left-chasing-1-to-2",
    label: "SO chasing 1 → chasing 2 · turn left",
    timing: "SO",
    summary: "Left holds B while right crosses A→B.",
    reelPosition: "low-native",
    turnDirection: "left",
    patternBefore: "chasing-1",
    patternAfter: "chasing-2",
    sourceFile: SO_SOURCE,
    sourceCase:
      "SO chasing-1 → chasing-2, turn left — left holds B / right crosses A→B",
    turnAfterStep: 7,
    ...oppositeDirections,
    leftPath:
      "C a up | C a down | L b up | L b down | C a up | C a down | L b up | L b down | C b up | L a down | L a up | C b down | C b up",
    rightPath:
      "C a down | R b up | R b down | C a up | C a down | R b up | R b down | C a up | C b down | C b up | R a down | R a up | C b down"
  }),
  twoHand({
    id: "so-left-chasing-2-to-1",
    label: "SO chasing 2 → chasing 1 · turn left",
    timing: "SO",
    summary: "Left crosses A→B while right holds A.",
    reelPosition: "low-native",
    turnDirection: "left",
    patternBefore: "chasing-2",
    patternAfter: "chasing-1",
    sourceFile: SO_SOURCE,
    sourceCase:
      "SO chasing-2 → chasing-1, turn left — left crosses A→B / right holds A",
    turnAfterStep: 5,
    ...oppositeDirections,
    leftPath:
      "C a up | C a down | L b up | L b down | C a up | C a down | C b up | L a down | L a up | C b down | C b up",
    rightPath:
      "R b down | C a up | C a down | R b up | R b down | C a up | R a down | R a up | C b down | C b up | R a down"
  }),
  twoHand({
    id: "so-left-chasing-2-to-2",
    label: "SO chasing 2 → chasing 2 · turn left",
    timing: "SO",
    summary: "Both hands cross A→B through the same left gate at the shared midpoint.",
    reelPosition: "low-native",
    turnDirection: "left",
    patternBefore: "chasing-2",
    patternAfter: "chasing-2",
    sourceFile: SO_SOURCE,
    sourceCase: "SO chasing-2 → chasing-2, turn left — both cross A→B",
    turnAfterStep: 5,
    ...oppositeDirections,
    leftPath:
      "C a up | C a down | L b up | L b down | C a up | C a down | C b up | L a down | L a up | C b down | C b up",
    rightPath:
      "R b down | C a up | C a down | R b up | R b down | C a up | C b down | C b up | R a down | R a up | C b down"
  })
] as const;

const splitOppositeNonNative: readonly VerifiedTurningFixture[] = [
  twoHand({
    id: "so-non-native-left-chasing-1-to-1",
    label: "SO non-native chasing 1 → chasing 1 · turn left",
    timing: "SO",
    summary: "Both crossed-hand reels cross A→B through the left gate.",
    reelPosition: "low-non-native",
    turnDirection: "left",
    patternBefore: "chasing-1",
    patternAfter: "chasing-1",
    sourceFile: SO_NON_NATIVE_SOURCE,
    sourceCase:
      "SO non-native chasing-1 → chasing-1, turn left — both cross A→B",
    turnAfterStep: 7,
    ...oppositeDirections,
    leftPath:
      "C a up | R b down | R b up | C a down | C a up | R b down | R b up | C a down | C b up | C b down | R a up | R a down | C b up",
    rightPath:
      "L b down | L b up | C a down | C a up | L b down | L b up | C a down | C a up | C b down | L a up | L a down | C b up | C b down"
  }),
  twoHand({
    id: "so-non-native-left-chasing-1-to-2",
    label: "SO non-native chasing 1 → chasing 2 · turn left",
    timing: "SO",
    summary: "Left holds A while right crosses A→B.",
    reelPosition: "low-non-native",
    turnDirection: "left",
    patternBefore: "chasing-1",
    patternAfter: "chasing-2",
    sourceFile: SO_NON_NATIVE_SOURCE,
    sourceCase:
      "SO non-native chasing-1 → chasing-2, turn left — left holds A / right crosses A→B",
    turnAfterStep: 7,
    ...oppositeDirections,
    leftPath:
      "C a up | R b down | R b up | C a down | C a up | R b down | R b up | C a down | R a up | R a down | C b up | C b down | R a up",
    rightPath:
      "L b down | L b up | C a down | C a up | L b down | L b up | C a down | C a up | C b down | L a up | L a down | C b up | C b down"
  }),
  twoHand({
    id: "so-non-native-left-chasing-2-to-1",
    label: "SO non-native chasing 2 → chasing 1 · turn left",
    timing: "SO",
    summary: "Right prepares on B; both hands then hold the open A/B configuration.",
    reelPosition: "low-non-native",
    turnDirection: "left",
    patternBefore: "chasing-2",
    patternAfter: "chasing-1",
    sourceFile: SO_NON_NATIVE_SOURCE,
    sourceCase:
      "SO non-native chasing-2 → chasing-1, turn left — left holds A / right prepares and holds B",
    turnAfterStep: 7,
    ...oppositeDirections,
    leftPath:
      "R b down | R b up | C a down | C a up | R b down | R b up | C a down | C a up | R a down | C b up | C b down | R a up | R a down",
    rightPath:
      "C a up | L b down | L b up | C a down | C a up | L b down | L b up | L b down | C b up | C b down | L a up | L a down | C b up"
  }),
  twoHand({
    id: "so-non-native-left-chasing-2-to-2",
    label: "SO non-native chasing 2 → chasing 2 · turn left",
    timing: "SO",
    summary: "Right prepares and holds B while left crosses A→B.",
    reelPosition: "low-non-native",
    turnDirection: "left",
    patternBefore: "chasing-2",
    patternAfter: "chasing-2",
    sourceFile: SO_NON_NATIVE_SOURCE,
    sourceCase:
      "SO non-native chasing-2 → chasing-2, turn left — left crosses A→B / right prepares and holds B",
    turnAfterStep: 7,
    ...oppositeDirections,
    leftPath:
      "R b down | R b up | C a down | C a up | R b down | R b up | C a down | C a up | C b down | R a up | R a down | C b up | C b down",
    rightPath:
      "C a up | L b down | L b up | C a down | C a up | L b down | L b up | L b down | C b up | C b down | L a up | L a down | C b up"
  })
] as const;

const togetherSameLeft: readonly VerifiedTurningFixture[] = [
  twoHand({
    id: "ts-left-chasing-1-to-1",
    label: "TS chasing 1 → chasing 1 · turn left",
    timing: "TS",
    summary: "Open BA configuration: left holds B and right holds A.",
    reelPosition: "low-native",
    turnDirection: "left",
    patternBefore: "chasing-1",
    patternAfter: "chasing-1",
    sourceFile: TS_LEFT_SOURCE,
    sourceCase:
      "TS chasing-1 → chasing-1, turn left — left holds B / right holds A",
    turnAfterStep: 7,
    ...sameClockwiseDirections,
    leftPath:
      "C a up | C a down | L b up | L b down | C a up | C a down | L b up | L b down | C b up | L a down | L a up | C b down | C b up",
    rightPath:
      "C a up | R b down | R b up | C a down | C a up | R b down | R b up | C a down | R a up | R a down | C b up | C b down | R a up"
  }),
  twoHand({
    id: "ts-left-chasing-1-to-2",
    label: "TS chasing 1 → chasing 2 · turn left",
    timing: "TS",
    summary: "Left holds B while right crosses A→B.",
    reelPosition: "low-native",
    turnDirection: "left",
    patternBefore: "chasing-1",
    patternAfter: "chasing-2",
    sourceFile: TS_LEFT_SOURCE,
    sourceCase:
      "TS chasing-1 → chasing-2, turn left — left holds B / right crosses A→B",
    turnAfterStep: 7,
    ...sameClockwiseDirections,
    leftPath:
      "C a up | C a down | L b up | L b down | C a up | C a down | L b up | L b down | C b up | L a down | L a up | C b down | C b up",
    rightPath:
      "C a up | R b down | R b up | C a down | C a up | R b down | R b up | C a down | C b up | C b down | R a up | R a down | C b up"
  }),
  twoHand({
    id: "ts-left-chasing-2-to-1",
    label: "TS chasing 2 → chasing 1 · turn left",
    timing: "TS",
    summary: "Left crosses A→B while right holds A.",
    reelPosition: "low-native",
    turnDirection: "left",
    patternBefore: "chasing-2",
    patternAfter: "chasing-1",
    sourceFile: TS_LEFT_SOURCE,
    sourceCase:
      "TS chasing-2 → chasing-1, turn left — left crosses A→B / right holds A",
    turnAfterStep: 7,
    ...sameClockwiseDirections,
    leftPath:
      "L b up | L b down | C a up | C a down | L b up | L b down | C a up | C a down | C b up | L a down | L a up | C b down | C b up",
    rightPath:
      "C a up | R b down | R b up | C a down | C a up | R b down | R b up | C a down | R a up | R a down | C b up | C b down | R a up"
  }),
  twoHand({
    id: "ts-left-chasing-2-to-2",
    label: "TS chasing 2 → chasing 2 · turn left",
    timing: "TS",
    summary: "Both hands cross A→B through the same left gate.",
    reelPosition: "low-native",
    turnDirection: "left",
    patternBefore: "chasing-2",
    patternAfter: "chasing-2",
    sourceFile: TS_LEFT_SOURCE,
    sourceCase: "TS chasing-2 → chasing-2, turn left — both cross A→B",
    turnAfterStep: 7,
    ...sameClockwiseDirections,
    leftPath:
      "L b up | L b down | C a up | C a down | L b up | L b down | C a up | C a down | C b up | L a down | L a up | C b down | C b up",
    rightPath:
      "C a up | R b down | R b up | C a down | C a up | R b down | R b up | C a down | C b up | C b down | R a up | R a down | C b up"
  })
] as const;

const togetherSameRight: readonly VerifiedTurningFixture[] = [
  twoHand({
    id: "ts-right-chasing-1-to-1",
    label: "TS chasing 1 → chasing 1 · turn right",
    timing: "TS",
    summary: "Both hands cross A→B through the same right gate.",
    reelPosition: "low-native",
    turnDirection: "right",
    patternBefore: "chasing-1",
    patternAfter: "chasing-1",
    sourceFile: TS_RIGHT_SOURCE,
    sourceCase: "TS chasing-1 → chasing-1, turn right — both cross A→B",
    turnAfterStep: 7,
    ...sameClockwiseDirections,
    leftPath:
      "C a down | L b up | L b down | C a up | C a down | L b up | L b down | C a up | C b down | C b up | L a down | L a up | C b down",
    rightPath:
      "R b down | R b up | C a down | C a up | R b down | R b up | C a down | C a up | C b down | R a up | R a down | C b up | C b down"
  }),
  twoHand({
    id: "ts-right-chasing-1-to-2",
    label: "TS chasing 1 → chasing 2 · turn right",
    timing: "TS",
    summary: "Left holds A while right crosses A→B.",
    reelPosition: "low-native",
    turnDirection: "right",
    patternBefore: "chasing-1",
    patternAfter: "chasing-2",
    sourceFile: TS_RIGHT_SOURCE,
    sourceCase:
      "TS chasing-1 → chasing-2, turn right — left holds A / right crosses A→B",
    turnAfterStep: 7,
    ...sameClockwiseDirections,
    leftPath:
      "C a down | L b up | L b down | C a up | C a down | L b up | L b down | C a up | L a down | L a up | C b down | C b up | L a down",
    rightPath:
      "R b down | R b up | C a down | C a up | R b down | R b up | C a down | C a up | C b down | R a up | R a down | C b up | C b down"
  }),
  twoHand({
    id: "ts-right-chasing-2-to-1",
    label: "TS chasing 2 → chasing 1 · turn right",
    timing: "TS",
    summary: "Left prepares on A; both hands then cross A→B.",
    reelPosition: "low-native",
    turnDirection: "right",
    patternBefore: "chasing-2",
    patternAfter: "chasing-1",
    sourceFile: TS_RIGHT_SOURCE,
    sourceCase:
      "TS chasing-2 → chasing-1, turn right — left prepares on A / both cross A→B",
    turnAfterStep: 7,
    ...sameClockwiseDirections,
    leftPath:
      "L b down | C a up | C a down | L b up | L b down | C a up | C a down | C a up | C b down | C b up | L a down | L a up | C b down",
    rightPath:
      "R b down | R b up | C a down | C a up | R b down | R b up | C a down | C a up | C b down | R a up | R a down | C b up | C b down"
  }),
  twoHand({
    id: "ts-right-chasing-2-to-2",
    label: "TS chasing 2 → chasing 2 · turn right",
    timing: "TS",
    summary: "Left prepares and holds A while right crosses A→B.",
    reelPosition: "low-native",
    turnDirection: "right",
    patternBefore: "chasing-2",
    patternAfter: "chasing-2",
    sourceFile: TS_RIGHT_SOURCE,
    sourceCase:
      "TS chasing-2 → chasing-2, turn right — left prepares and holds A / right crosses A→B",
    turnAfterStep: 7,
    ...sameClockwiseDirections,
    leftPath:
      "L b down | C a up | C a down | L b up | L b down | C a up | C a down | C a up | L a down | L a up | C b down | C b up | L a down",
    rightPath:
      "R b down | R b up | C a down | C a up | R b down | R b up | C a down | C a up | C b down | R a up | R a down | C b up | C b down"
  })
] as const;

const splitSameLeft: readonly VerifiedTurningFixture[] = [
  twoHand({
    id: "ss-left-unison-to-unison",
    label: "SS unison → unison · turn left",
    timing: "SS",
    summary: "Left prepares and holds B while right crosses A→B.",
    reelPosition: "low-native",
    turnDirection: "left",
    patternBefore: "unison",
    patternAfter: "unison",
    sourceFile: SS_LEFT_SOURCE,
    sourceCase:
      "SS unison → unison, turn left — left prepares and holds B / right crosses A→B",
    turnAfterStep: 7,
    ...sameClockwiseDirections,
    leftPath:
      "C a down | L b up | L b down | C a up | C a down | L b up | L b down | L b up | C b down | C b up | L a down | L a up | C b down",
    rightPath:
      "C a up | R b down | R b up | C a down | C a up | R b down | R b up | C a down | C b up | C b down | R a up | R a down | C b up"
  }),
  twoHand({
    id: "ss-left-unison-to-counter",
    label: "SS unison → counter · turn left",
    timing: "SS",
    summary: "Left prepares and holds B while right holds A.",
    reelPosition: "low-native",
    turnDirection: "left",
    patternBefore: "unison",
    patternAfter: "counter",
    sourceFile: SS_LEFT_SOURCE,
    sourceCase:
      "SS unison → counter, turn left — left prepares and holds B / right holds A",
    turnAfterStep: 7,
    ...sameClockwiseDirections,
    leftPath:
      "C a down | L b up | L b down | C a up | C a down | L b up | L b down | L b up | C b down | C b up | L a down | L a up | C b down",
    rightPath:
      "C a up | R b down | R b up | C a down | C a up | R b down | R b up | C a down | R a up | R a down | C b up | C b down | R a up"
  }),
  twoHand({
    id: "ss-left-counter-to-unison",
    label: "SS counter → unison · turn left",
    timing: "SS",
    summary: "Left crosses B→A while right holds A.",
    reelPosition: "low-native",
    turnDirection: "left",
    patternBefore: "counter",
    patternAfter: "unison",
    sourceFile: SS_LEFT_SOURCE,
    sourceCase:
      "SS counter → unison, turn left — left crosses B→A / right holds A",
    turnAfterStep: 7,
    ...sameClockwiseDirections,
    leftPath:
      "L b down | C a up | C a down | L b up | L b down | C a up | C a down | L b up | L a down | L a up | C b down | C b up | L a down",
    rightPath:
      "C a up | R b down | R b up | C a down | C a up | R b down | R b up | C a down | R a up | R a down | C b up | C b down | R a up"
  }),
  twoHand({
    id: "ss-left-counter-to-counter",
    label: "SS counter → counter · turn left",
    timing: "SS",
    summary: "Open BA configuration: left holds B and right holds A.",
    reelPosition: "low-native",
    turnDirection: "left",
    patternBefore: "counter",
    patternAfter: "counter",
    sourceFile: SS_LEFT_SOURCE,
    sourceCase:
      "SS counter → counter, turn left — left holds B / right holds A",
    turnAfterStep: 7,
    ...sameClockwiseDirections,
    leftPath:
      "L b down | C a up | C a down | L b up | L b down | C a up | C a down | L b up | C b down | C b up | L a down | L a up | C b down",
    rightPath:
      "C a up | R b down | R b up | C a down | C a up | R b down | R b up | C a down | R a up | R a down | C b up | C b down | R a up"
  })
] as const;

const splitSameRight: readonly VerifiedTurningFixture[] = [
  twoHand({
    id: "ss-right-unison-to-unison",
    label: "SS unison → unison · turn right",
    timing: "SS",
    summary: "Left crosses A→B while right prepares and holds B.",
    reelPosition: "low-native",
    turnDirection: "right",
    patternBefore: "unison",
    patternAfter: "unison",
    sourceFile: SS_RIGHT_SOURCE,
    sourceCase:
      "SS unison → unison, turn right — left crosses A→B / right prepares and holds B",
    turnAfterStep: 7,
    ...sameClockwiseDirections,
    leftPath:
      "C a down | L b up | L b down | C a up | C a down | L b up | L b down | C a up | C b down | C b up | L a down | L a up | C b down",
    rightPath:
      "C a up | R b down | R b up | C a down | C a up | R b down | R b up | R b down | C b up | C b down | R a up | R a down | C b up"
  }),
  twoHand({
    id: "ss-right-unison-to-counter",
    label: "SS unison → counter · turn right",
    timing: "SS",
    summary: "Left holds A while right prepares and holds B.",
    reelPosition: "low-native",
    turnDirection: "right",
    patternBefore: "unison",
    patternAfter: "counter",
    sourceFile: SS_RIGHT_SOURCE,
    sourceCase:
      "SS unison → counter, turn right — left holds A / right prepares and holds B",
    turnAfterStep: 7,
    ...sameClockwiseDirections,
    leftPath:
      "C a down | L b up | L b down | C a up | C a down | L b up | L b down | C a up | L a down | L a up | C b down | C b up | L a down",
    rightPath:
      "C a up | R b down | R b up | C a down | C a up | R b down | R b up | R b down | C b up | C b down | R a up | R a down | C b up"
  }),
  twoHand({
    id: "ss-right-counter-to-unison",
    label: "SS counter → unison · turn right",
    timing: "SS",
    summary: "Left crosses A→B while right holds B.",
    reelPosition: "low-native",
    turnDirection: "right",
    patternBefore: "counter",
    patternAfter: "unison",
    sourceFile: SS_RIGHT_SOURCE,
    sourceCase:
      "SS counter → unison, turn right — left crosses A→B / right holds B",
    turnAfterStep: 7,
    ...sameClockwiseDirections,
    leftPath:
      "C a down | L b up | L b down | C a up | C a down | L b up | L b down | C a up | C b down | C b up | L a down | L a up | C b down",
    rightPath:
      "R b up | C a down | C a up | R b down | R b up | C a down | C a up | R b down | C b up | C b down | R a up | R a down | C b up"
  }),
  twoHand({
    id: "ss-right-counter-to-counter",
    label: "SS counter → counter · turn right",
    timing: "SS",
    summary: "Open AB configuration: left holds A and right holds B.",
    reelPosition: "low-native",
    turnDirection: "right",
    patternBefore: "counter",
    patternAfter: "counter",
    sourceFile: SS_RIGHT_SOURCE,
    sourceCase:
      "SS counter → counter, turn right — left holds A / right holds B",
    turnAfterStep: 7,
    ...sameClockwiseDirections,
    leftPath:
      "C a down | L b up | L b down | C a up | C a down | L b up | L b down | C a up | L a down | L a up | C b down | C b up | L a down",
    rightPath:
      "R b up | C a down | C a up | R b down | R b up | C a down | C a up | R b down | C b up | C b down | R a up | R a down | C b up"
  })
] as const;

export const VERIFIED_TWO_HAND_TURNS: readonly VerifiedTurningFixture[] = [
  ...togetherOpposite,
  ...splitOppositeNative,
  ...splitOppositeNonNative,
  ...togetherSameLeft,
  ...togetherSameRight,
  ...splitSameLeft,
  ...splitSameRight
] as const;
