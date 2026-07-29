import {
  defineVerifiedTurningFixture,
  defineVerifiedTurningReference,
  type VerifiedTurningFixture,
  type VerifiedTurningReference
} from "@/lab/experiments/mel-turning/fixtures/verifiedTurningFixture";

const SOURCE =
  "research/mel-turning/verified/low-reels-one-hand-and-together-opposite.csv";
const TURN_EDGE_CORRECTIONS_SOURCE =
  "research/mel-turning/candidates/low-reels-turn-edge-corrections.csv";

const rightInwardReference = defineVerifiedTurningReference({
  id: "one-right-inward-reference",
  label: "Right hand · inward reference",
  facing: 0,
  flow: "inwards",
  reelPosition: "low-native",
  sourceFile: SOURCE,
  sourceCase: "Right hand, inwards",
  hand: "right",
  poiDirection: "counterclockwise",
  path: "C a up | C a down | R b up | R b down"
});

const rightOutwardAwayReference = defineVerifiedTurningReference({
  id: "one-right-outward-away-reference",
  label: "Right hand · outward reference · facing away",
  facing: 180,
  flow: "outwards",
  reelPosition: "low-native",
  sourceFile: SOURCE,
  sourceCase: "Right hand, outwards, facing away",
  hand: "right",
  poiDirection: "counterclockwise",
  path: "C b down | C b up | R a down | R a up"
});

export const VERIFIED_ONE_HAND_REFERENCES: readonly VerifiedTurningReference[] = [
  rightInwardReference,
  rightOutwardAwayReference
] as const;

function oneHand(
  input: Omit<
    Parameters<typeof defineVerifiedTurningFixture>[0],
    "timing" | "flowBefore" | "patternBefore" | "patternAfter" | "tracks"
  > & {
    readonly flowBefore: "inwards" | "outwards";
    readonly path: string;
  }
): VerifiedTurningFixture {
  return defineVerifiedTurningFixture({
    ...input,
    timing: "ONE",
    patternBefore: "single-reel",
    patternAfter: "single-reel",
    tracks: [
      {
        hand: "right",
        poiDirection: input.flowBefore === "inwards" ? "counterclockwise" : "clockwise",
        path: input.path
      }
    ]
  });
}

const ALL_ONE_HAND_TURNS: readonly VerifiedTurningFixture[] = [
  oneHand({
    id: "one-native-in-left-cross",
    label: "Right low native · inward · turn left · cross",
    summary: "Turns with the poi and crosses A→B.",
    reelPosition: "low-native",
    flowBefore: "inwards",
    turnDirection: "left",
    relationToPoi: "with",
    source: {
      file: SOURCE,
      caseLabel: "Right hand, low native, inwards, turning left, with poi, crosses",
      firstStep: 0,
      turnAfterStep: 4
    },
    path: "C a up | C a down | R b up | R b down | C a up | C b down | C b up | R a down | R a up"
  }),
  oneHand({
    id: "one-native-in-left-hold-a",
    label: "Right low native · inward · turn left · hold A",
    summary: "Turns with the poi while holding plane side A.",
    reelPosition: "low-native",
    flowBefore: "inwards",
    turnDirection: "left",
    relationToPoi: "with",
    source: {
      file: SOURCE,
      caseLabel:
        "Right hand, low native, inwards, turning left, with poi, holds plane side a",
      firstStep: 0,
      turnAfterStep: 4
    },
    path: "C a up | C a down | R b up | R b down | C a up | R a down | R a up | C b down | C b up"
  }),
  oneHand({
    id: "one-native-in-right-hold-b",
    label: "Right low native · inward · turn right · hold B",
    summary: "Turns against the poi while holding plane side B.",
    reelPosition: "low-native",
    flowBefore: "inwards",
    turnDirection: "right",
    relationToPoi: "against",
    source: {
      file: SOURCE,
      caseLabel:
        "Right hand, low native, inwards, turning right, against poi, holds plane side b",
      firstStep: 0,
      turnAfterStep: 3
    },
    path: "C a up | C a down | R b up | R b down | C b up | R a down | R a up | C b down"
  }),
  oneHand({
    id: "one-native-in-right-cross",
    label: "Right low native · inward · turn right · cross",
    summary: "Turns against the poi and crosses A→B.",
    reelPosition: "low-native",
    flowBefore: "inwards",
    turnDirection: "right",
    relationToPoi: "against",
    source: {
      file: SOURCE,
      caseLabel: "Right hand, low native, inwards, turning right, against poi, crosses",
      firstStep: 1,
      turnAfterStep: 6
    },
    path: "C a up | C a down | R b up | R b down | C a up | C a down | C b up | R a down | R a up | C b down"
  }),
  oneHand({
    id: "one-non-native-in-left-cross",
    label: "Right low non-native · inward · turn left · cross",
    summary: "Turns with the poi and crosses A→B.",
    reelPosition: "low-non-native",
    flowBefore: "inwards",
    turnDirection: "left",
    relationToPoi: "with",
    source: {
      file: SOURCE,
      caseLabel: "Right hand, low non-native, inwards, turning left, with poi, crosses",
      firstStep: 1,
      turnAfterStep: 6
    },
    path: "C a down | C a up | L b down | L b up | C a down | C a up | C b down | L a up | L a down | C b up"
  }),
  oneHand({
    id: "one-non-native-in-left-hold-b",
    label: "Right low non-native · inward · turn left · hold B",
    summary: "Turns with the poi while holding plane side B.",
    reelPosition: "low-non-native",
    flowBefore: "inwards",
    turnDirection: "left",
    relationToPoi: "with",
    source: {
      file: SOURCE,
      caseLabel:
        "Right hand, low non-native, inwards, turning left, with poi, holds plane side b",
      firstStep: 1,
      turnAfterStep: 7
    },
    path: "C a down | C a up | L b down | L b up | C a down | C a up | L b down | C b up | C b down | L a up | L a down"
  }),
  oneHand({
    id: "one-non-native-in-right-cross",
    label: "Right low non-native · inward · turn right · cross",
    summary: "Turns against the poi and crosses A→B.",
    reelPosition: "low-non-native",
    flowBefore: "inwards",
    turnDirection: "right",
    relationToPoi: "against",
    source: {
      file: SOURCE,
      caseLabel:
        "Right hand, low non-native, inwards, turning right, against poi, crosses",
      firstStep: 1,
      turnAfterStep: 5
    },
    path: "C a down | C a up | L b down | L b up | C a down | C b up | C b down | L a up | L a down"
  }),
  oneHand({
    id: "one-non-native-in-right-hold-a",
    label: "Right low non-native · inward · turn right · hold A",
    summary: "Turns against the poi while holding plane side A.",
    reelPosition: "low-non-native",
    flowBefore: "inwards",
    turnDirection: "right",
    relationToPoi: "against",
    source: {
      file: SOURCE,
      caseLabel:
        "Right hand, low non-native, inwards, turning right, against poi, holds plane side a",
      firstStep: 1,
      turnAfterStep: 5
    },
    path: "C a down | C a up | L b down | L b up | C a down | L a up | L a down | C b up | C b down"
  }),
  oneHand({
    id: "one-back-in-right-cross",
    label: "Right low back · inward · turn right · cross",
    summary: "Turns against the poi and crosses B→A with the hand behind the body.",
    reelPosition: "low-back",
    flowBefore: "inwards",
    turnDirection: "right",
    relationToPoi: "against",
    verificationStatus: "unverified",
    source: {
      file: SOURCE,
      caseLabel: "Right hand, low back, inwards, turning right, against poi, crosses",
      firstStep: 1,
      turnAfterStep: 5
    },
    path: "Cb b down | Cb b up | Lb a down | Lb a up | Cb b down | Cb a up | Cb a down | Lb b up | Lb b down"
  }),
  oneHand({
    id: "one-back-in-right-hold-b",
    label: "Right low back · inward · turn right · hold B",
    summary: "Turns against the poi while holding B with the hand behind the body.",
    reelPosition: "low-back",
    flowBefore: "inwards",
    turnDirection: "right",
    relationToPoi: "against",
    source: {
      file: SOURCE,
      caseLabel:
        "Right hand, low back, inwards, turning right, against poi, holds plane side b",
      firstStep: 1,
      turnAfterStep: 5
    },
    path: "Cb b down | Cb b up | Lb a down | Lb a up | Cb b down | Lb b up | Lb b down | Cb a up | Cb a down"
  }),
  oneHand({
    id: "one-back-in-left-hold-a",
    label: "Right low back · inward · turn left · hold A",
    summary: "Turns with the poi while holding A with the hand behind the body.",
    reelPosition: "low-back",
    flowBefore: "inwards",
    turnDirection: "left",
    relationToPoi: "with",
    source: {
      file: SOURCE,
      caseLabel:
        "Right hand, low back, inwards, turning left, with poi, holds plane side a",
      firstStep: 1,
      turnAfterStep: 4
    },
    path: "Cb b down | Cb b up | Lb a down | Lb a up | Cb a down | Lb b up | Lb b down | Cb a up | Cb a down"
  }),
  oneHand({
    id: "one-back-in-left-cross",
    label: "Right low back · inward · turn left · cross",
    summary: "Turns with the poi and crosses A→B with the hand behind the body.",
    reelPosition: "low-back",
    flowBefore: "inwards",
    turnDirection: "left",
    relationToPoi: "with",
    source: {
      file: TURN_EDGE_CORRECTIONS_SOURCE,
      caseLabel:
        "CASE 1A — RIGHT LOW-BACK INWARD TURN LEFT — USER CORRECTION; CONTINUE ON Lb B",
      firstStep: 0,
      turnAfterStep: 3
    },
    path: "Cb b down | Cb b up | Lb a down | Lb a up | Lb b down | Lb b up | Cb a down | Cb a up | Lb b down"
  }),
  oneHand({
    id: "one-native-out-right-cross",
    label: "Right low native · outward · turn right · cross",
    summary: "Turns with the poi and crosses A→B while the crossing moves down.",
    reelPosition: "low-native",
    flowBefore: "outwards",
    turnDirection: "right",
    relationToPoi: "with",
    source: {
      file: SOURCE,
      caseLabel: "Right hand, low native, outwards, turning right, with poi, crosses",
      firstStep: 0,
      turnAfterStep: 5
    },
    path: "C a down | C a up | R b down | R b up | C a down | C a up | C b down | R a up | R a down"
  }),
  oneHand({
    id: "one-native-out-right-hold-b",
    label: "Right low native · outward · turn right · hold B",
    summary: "Turns with the poi while holding plane side B.",
    reelPosition: "low-native",
    flowBefore: "outwards",
    turnDirection: "right",
    relationToPoi: "with",
    source: {
      file: SOURCE,
      caseLabel:
        "Right hand, low native, outwards, turning right, with poi, holds plane side b",
      firstStep: 0,
      turnAfterStep: 6
    },
    path: "C a down | C a up | R b down | R b up | C a down | C a up | R b down | C b up | C b down | R a up | R a down"
  }),
  oneHand({
    id: "one-native-out-left-hold-a",
    label: "Right low native · outward · turn left · hold A",
    summary: "Turns against the poi while holding plane side A.",
    reelPosition: "low-native",
    flowBefore: "outwards",
    turnDirection: "left",
    relationToPoi: "against",
    source: {
      file: SOURCE,
      caseLabel:
        "Right hand, low native, outwards, turning left, against poi, holds plane side a",
      firstStep: 0,
      turnAfterStep: 5
    },
    path: "C a down | C a up | R b down | R b up | C a down | C a up | R a down | C b up | C b down | R a up | R a down"
  }),
  oneHand({
    id: "one-native-out-left-cross",
    label: "Right low native · outward · turn left · cross",
    summary: "Turns against the poi and crosses A→B while the crossing moves toward world left.",
    reelPosition: "low-native",
    flowBefore: "outwards",
    turnDirection: "left",
    relationToPoi: "against",
    source: {
      file: SOURCE,
      caseLabel: "Right hand, low native, outwards, turning left, against poi, crosses",
      firstStep: 0,
      turnAfterStep: 4
    },
    path: "C a down | C a up | R b down | R b up | C a down | C b up | C b down | R a up | R a down | C b up | C b down"
  }),
  oneHand({
    id: "one-non-native-out-right-cross",
    label: "Right low non-native · outward · turn right · cross",
    summary: "Turns with the poi and crosses A→B while the crossing moves down.",
    reelPosition: "low-non-native",
    flowBefore: "outwards",
    turnDirection: "right",
    relationToPoi: "with",
    source: {
      file: SOURCE,
      caseLabel: "Right hand, low non-native, outwards, turning right, with poi, crosses",
      firstStep: 0,
      turnAfterStep: 3
    },
    path: "C a down | L b up | L b down | C a up | C b down | C b up | L a down | L a up | C b down | C b up"
  }),
  oneHand({
    id: "one-non-native-out-right-hold-a",
    label: "Right low non-native · outward · turn right · hold A",
    summary: "Turns with the poi while holding plane side A.",
    reelPosition: "low-non-native",
    flowBefore: "outwards",
    turnDirection: "right",
    relationToPoi: "with",
    source: {
      file: SOURCE,
      caseLabel:
        "Right hand, low non-native, outwards, turning right, with poi, holds plane side a",
      firstStep: 0,
      turnAfterStep: 7
    },
    path: "C a down | L b up | L b down | C a up | C a down | L b up | L b down | C a up | L a down | L a up | C b down | C b up | L a down"
  }),
  oneHand({
    id: "one-non-native-out-left-cross",
    label: "Right low non-native · outward · turn left · cross",
    summary: "Turns against the poi and crosses A→B while the crossing moves up.",
    reelPosition: "low-non-native",
    flowBefore: "outwards",
    turnDirection: "left",
    relationToPoi: "against",
    source: {
      file: SOURCE,
      caseLabel:
        "Right hand, low non-native, outwards, turning left, against poi, crosses",
      firstStep: 0,
      turnAfterStep: 8
    },
    path: "C a down | L b up | L b down | C a up | C a down | L b up | L b down | C a up | C a down | C b up | L a down | L a up | C b down"
  }),
  oneHand({
    id: "one-non-native-out-left-hold-b",
    label: "Right low non-native · outward · turn left · hold B",
    summary: "Turns against the poi while holding plane side B.",
    reelPosition: "low-non-native",
    flowBefore: "outwards",
    turnDirection: "left",
    relationToPoi: "against",
    source: {
      file: SOURCE,
      caseLabel:
        "Right hand, low non-native, outwards, turning left, against poi, holds plane side b",
      firstStep: 0,
      turnAfterStep: 5
    },
    path: "C a down | L b up | L b down | C a up | C a down | L b up | C b down | C b up | L a down | L a up | C b down"
  }),
  oneHand({
    id: "one-back-out-left-cross-first-left",
    label: "Right low back · outward · turn left · cross at first left gate",
    summary: "Turns against the poi and crosses A→B through the front-circle left gate.",
    reelPosition: "low-back",
    flowBefore: "outwards",
    turnDirection: "left",
    relationToPoi: "against",
    source: {
      file: TURN_EDGE_CORRECTIONS_SOURCE,
      caseLabel:
        "CASE 2A — RIGHT LOW-BACK OUTWARD TURN LEFT — TURN ON FIRST LEFT CROSS",
      firstStep: 0,
      turnAfterStep: 3
    },
    path: "Cb b up | Cb b down | Lb a up | Lb a down | Lb b up | Lb b down | Cb a up | Cb a down | Lb b up"
  }),
  oneHand({
    id: "one-back-out-left-cross",
    label: "Right low back · outward · turn left · cross at rear right gate",
    summary: "Prepares through the left gate, then turns and crosses B→A through the rear-circle right gate.",
    reelPosition: "low-back",
    flowBefore: "outwards",
    turnDirection: "left",
    relationToPoi: "against",
    source: {
      file: TURN_EDGE_CORRECTIONS_SOURCE,
      caseLabel:
        "CASE 2B — RIGHT LOW-BACK OUTWARD TURN LEFT — NORMAL LEFT CROSS THEN TURN ON RIGHT-BACK CROSS",
      firstStep: 0,
      turnAfterStep: 4
    },
    path: "Cb b up | Cb b down | Lb a up | Lb a down | Cb b up | Cb a down | Cb a up | Lb b down | Lb b up | Cb a down"
  }),
  oneHand({
    id: "one-back-out-left-hold-b",
    label: "Right low back · outward · turn left · hold B",
    summary: "Turns against the poi while holding B with the hand behind the body.",
    reelPosition: "low-back",
    flowBefore: "outwards",
    turnDirection: "left",
    relationToPoi: "against",
    source: {
      file: SOURCE,
      caseLabel:
        "Right hand, low back, outwards, turning left, against poi, holds plane side b",
      firstStep: 0,
      turnAfterStep: 4
    },
    path: "Cb b up | Cb b down | Lb a up | Lb a down | Cb b up | Lb b down | Lb b up | Cb a down | Cb a up"
  }),
  oneHand({
    id: "one-back-out-right-hold-a",
    label: "Right low back · outward · turn right · hold A",
    summary: "Turns with the poi while holding A with the hand behind the body.",
    reelPosition: "low-back",
    flowBefore: "outwards",
    turnDirection: "right",
    relationToPoi: "with",
    source: {
      file: SOURCE,
      caseLabel:
        "Right hand, low back, outwards, turning right, with poi, holds plane side a",
      firstStep: 0,
      turnAfterStep: 6
    },
    path: "Cb b up | Cb b down | Lb a up | Lb a down | Cb b up | Cb b down | Lb a up | Cb a down | Cb a up | Lb b down | Lb b up"
  }),
  oneHand({
    id: "one-back-out-right-cross",
    label: "Right low back · outward · turn right · cross",
    summary: "Turns with the poi and crosses A→B with the hand behind the body.",
    reelPosition: "low-back",
    flowBefore: "outwards",
    turnDirection: "right",
    relationToPoi: "with",
    source: {
      file: SOURCE,
      caseLabel: "Right hand, low back, outwards, turning right, with poi, crosses",
      firstStep: 0,
      turnAfterStep: 6
    },
    path: "Cb b up | Cb b down | Lb a up | Lb a down | Cb b up | Cb b down | Lb a up | Lb b down | Lb b up | Cb a down | Cb a up | Lb b down"
  })
] as const;

export const VERIFIED_ONE_HAND_TURNS: readonly VerifiedTurningFixture[] =
  ALL_ONE_HAND_TURNS.filter(
    (fixture) => fixture.trace.verificationStatus === "physically-verified"
  );

export const UNVERIFIED_ONE_HAND_TURN_CANDIDATES: readonly VerifiedTurningFixture[] =
  ALL_ONE_HAND_TURNS.filter((fixture) => fixture.trace.verificationStatus === "unverified");
