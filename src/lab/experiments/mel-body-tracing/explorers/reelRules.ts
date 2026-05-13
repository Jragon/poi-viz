import { POI_BEAT_LANES } from "@/lab/experiments/mel-body-tracing/beat-graph/graphHelpers";
import type {
  PoiBeatDirection,
  PoiBeatGraph,
  PoiBeatHand,
  PoiBeatLaneId,
  PoiBeatPhaseLabel,
  PoiBeatRow
} from "@/lab/experiments/mel-body-tracing/beat-graph/types";
import type {
  ReelBodySide,
  ReelConfig,
  ReelDirection,
  ReelOffset,
  ReelPatternType,
  ReelPosition,
  ReelResolvedState,
  ReelTimingLabel
} from "@/lab/experiments/mel-body-tracing/explorers/reelTypes";

export const DEFAULT_REEL_CONFIG: ReelConfig = {
  left: "low-native",
  right: "low-native",
  direction: { mode: "opposite", flow: "inwards" },
  offset: 0
};

export const REEL_POSITION_LABELS: Record<ReelPosition, string> = {
  "high-native": "High native",
  "low-native": "Low native",
  "high-non-native": "High non-native",
  "low-non-native": "Low non-native",
  "high-back": "High back",
  "low-back": "Low back"
};

export const REEL_POSITION_OPTIONS: readonly ReelPosition[] = [
  "high-native",
  "low-native",
  "high-non-native",
  "low-non-native",
  "high-back",
  "low-back"
] as const;

export const REEL_OFFSET_LABELS: Record<ReelOffset, string> = {
  0: "Unison",
  1: "Chasing",
  2: "Counter",
  3: "Chasing"
};

function isHighPosition(position: ReelPosition): boolean {
  return position.startsWith("high-");
}

function nativeBodySide(hand: PoiBeatHand): ReelBodySide {
  return hand === "left" ? "left" : "right";
}

function oppositeBodySide(side: ReelBodySide): ReelBodySide {
  return side === "left" ? "right" : "left";
}

export function isBackPosition(position: ReelPosition): boolean {
  return position.endsWith("-back");
}

export function mapPositionToBodySide(position: ReelPosition, hand: PoiBeatHand): ReelBodySide {
  if (position.endsWith("-native") && !position.includes("non-native")) {
    return nativeBodySide(hand);
  }

  return oppositeBodySide(nativeBodySide(hand));
}

export function mapPositionToLane(position: ReelPosition, hand: PoiBeatHand): PoiBeatLaneId {
  const side = mapPositionToBodySide(position, hand);
  const vertical = isHighPosition(position) ? "high" : "low";
  return `${side}-${vertical}` as PoiBeatLaneId;
}

export function buildHandRows(position: ReelPosition, hand: PoiBeatHand): readonly PoiBeatRow[] {
  const laneId = mapPositionToLane(position, hand);
  const isBack = isBackPosition(position);
  const positionSide = isBack ? "a" : "b";
  const centerSide = isBack ? "b" : "a";

  return [
    { step: 0, laneId, planeSide: positionSide },
    { step: 1, laneId, planeSide: positionSide },
    { step: 2, laneId: "center", planeSide: centerSide },
    { step: 3, laneId: "center", planeSide: centerSide }
  ];
}

export function rotateRows(rows: readonly PoiBeatRow[], offset: ReelOffset): readonly PoiBeatRow[] {
  if (rows.length === 0 || offset === 0) {
    return rows.map((row, step) => ({ ...row, step }));
  }

  const normalizedOffset = offset % rows.length;
  const splitIndex = rows.length - normalizedOffset;
  return [...rows.slice(splitIndex), ...rows.slice(0, splitIndex)].map((row, step) => ({
    ...row,
    step
  }));
}

export function resolveDirections(
  reelDirection: ReelDirection
): Readonly<Record<PoiBeatHand, PoiBeatDirection>> {
  if (reelDirection.mode === "same") {
    return {
      left: reelDirection.direction,
      right: reelDirection.direction
    };
  }

  if (reelDirection.flow === "inwards") {
    return {
      left: "clockwise",
      right: "counterclockwise"
    };
  }

  return {
    left: "counterclockwise",
    right: "clockwise"
  };
}

export function deriveInitialPhase(
  positionSide: ReelBodySide,
  direction: PoiBeatDirection,
  isOffsetHand: boolean,
  offset: number
): PoiBeatPhaseLabel {
  let startsUp = (positionSide === "right") !== (direction === "clockwise");
  if (isOffsetHand && offset % 2 === 1) {
    startsUp = !startsUp;
  }

  return startsUp ? "up" : "down";
}

export function deriveTimingLabel(
  leftPhase: PoiBeatPhaseLabel,
  rightPhase: PoiBeatPhaseLabel,
  directionMode: ReelDirection["mode"]
): ReelTimingLabel {
  const samePhase = leftPhase === rightPhase;

  if (directionMode === "same") return samePhase ? "TS" : "SS";
  return samePhase ? "TO" : "SO";
}

export function derivePatternType(
  leftPositionSide: ReelBodySide,
  rightPositionSide: ReelBodySide
): ReelPatternType {
  return leftPositionSide === rightPositionSide ? "weave" : "mill";
}

export function deriveReelState(config: ReelConfig): ReelResolvedState {
  const directions = resolveDirections(config.direction);
  const leftSide = mapPositionToBodySide(config.left, "left");
  const rightSide = mapPositionToBodySide(config.right, "right");
  const leftPhase = deriveInitialPhase(leftSide, directions.left, false, config.offset);
  const rightPhase = deriveInitialPhase(rightSide, directions.right, true, config.offset);

  return {
    left: {
      hand: "left",
      position: config.left,
      laneId: mapPositionToLane(config.left, "left"),
      bodySide: leftSide,
      direction: directions.left,
      initialPhase: leftPhase,
      isBack: isBackPosition(config.left)
    },
    right: {
      hand: "right",
      position: config.right,
      laneId: mapPositionToLane(config.right, "right"),
      bodySide: rightSide,
      direction: directions.right,
      initialPhase: rightPhase,
      isBack: isBackPosition(config.right)
    },
    timing: deriveTimingLabel(leftPhase, rightPhase, config.direction.mode),
    patternType: derivePatternType(leftSide, rightSide)
  };
}

export function buildReelBeatGraph(config: ReelConfig): PoiBeatGraph {
  const state = deriveReelState(config);

  return {
    cycleSteps: 4,
    lanes: POI_BEAT_LANES,
    tracks: [
      {
        id: "left",
        hand: "left",
        poiDirection: state.left.direction,
        initialPhase: state.left.initialPhase,
        rows: buildHandRows(config.left, "left")
      },
      {
        id: "right",
        hand: "right",
        poiDirection: state.right.direction,
        initialPhase: state.right.initialPhase,
        rows: rotateRows(buildHandRows(config.right, "right"), config.offset)
      }
    ]
  };
}
