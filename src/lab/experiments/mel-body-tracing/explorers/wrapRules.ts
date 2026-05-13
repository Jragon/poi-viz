import { POI_BEAT_LANES } from "@/lab/experiments/mel-body-tracing/beat-graph/graphHelpers";
import type {
  PoiBeatDirection,
  PoiBeatGraph,
  PoiBeatHand,
  PoiBeatPhaseLabel,
  PoiBeatRow
} from "@/lab/experiments/mel-body-tracing/beat-graph/types";
import {
  deriveInitialPhase,
  isBackPosition,
  mapPositionToBodySide,
  mapPositionToLane,
  REEL_POSITION_OPTIONS,
  resolveDirections
} from "@/lab/experiments/mel-body-tracing/explorers/reelRules";
import type { ReelBodySide, ReelPosition } from "@/lab/experiments/mel-body-tracing/explorers/reelTypes";
import type {
  WrapConfig,
  WrapOffset,
  WrapPositionPair
} from "@/lab/experiments/mel-body-tracing/explorers/wrapTypes";

export const DEFAULT_WRAP_CONFIG: WrapConfig = {
  left: { a: "low-native", b: "low-non-native" },
  right: { a: "low-native", b: "low-non-native" },
  direction: { mode: "opposite", flow: "inwards" },
  offset: 0
};

export const VALID_WRAP_PAIRS = [
  ["high-native", "low-native"],
  ["high-non-native", "low-non-native"],
  ["high-native", "high-non-native"],
  ["low-native", "low-non-native"],
  ["high-native", "low-non-native"],
  ["low-native", "high-non-native"],
  ["high-native", "high-back"],
  ["low-native", "low-back"]
] as const satisfies readonly (readonly [ReelPosition, ReelPosition])[];

export function isValidWrapPair(positionA: ReelPosition, positionB: ReelPosition): boolean {
  return VALID_WRAP_PAIRS.some(
    ([validA, validB]) =>
      (validA === positionA && validB === positionB) ||
      (validA === positionB && validB === positionA)
  );
}

export function getValidPartners(positionA: ReelPosition): readonly ReelPosition[] {
  return REEL_POSITION_OPTIONS.filter((positionB) => isValidWrapPair(positionA, positionB));
}

export function hasBTBPosition(pair: WrapPositionPair): boolean {
  return isBackPosition(pair.a) || isBackPosition(pair.b);
}

export function buildWrapHandRows(
  pair: WrapPositionPair,
  hand: PoiBeatHand
): readonly PoiBeatRow[] {
  const hasBTB = hasBTBPosition(pair);
  const positionSide = hasBTB ? "a" : "b";
  const centerSide = hasBTB ? "b" : "a";

  return [
    { step: 0, laneId: mapPositionToLane(pair.a, hand), planeSide: positionSide },
    { step: 1, laneId: mapPositionToLane(pair.a, hand), planeSide: positionSide },
    { step: 2, laneId: "center", planeSide: centerSide },
    { step: 3, laneId: mapPositionToLane(pair.b, hand), planeSide: positionSide },
    { step: 4, laneId: mapPositionToLane(pair.b, hand), planeSide: positionSide },
    { step: 5, laneId: "center", planeSide: centerSide }
  ];
}

export function rotateWrapRows(
  rows: readonly PoiBeatRow[],
  offset: WrapOffset
): readonly PoiBeatRow[] {
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

export function deriveWrapInitialPhase(
  positionSide: ReelBodySide,
  direction: PoiBeatDirection,
  isOffsetHand: boolean,
  offset: WrapOffset
): PoiBeatPhaseLabel {
  return deriveInitialPhase(positionSide, direction, isOffsetHand, offset);
}

export function buildWrapBeatGraph(config: WrapConfig): PoiBeatGraph {
  const directions = resolveDirections(config.direction);
  const leftSide = mapPositionToBodySide(config.left.a, "left");
  const rightSide = mapPositionToBodySide(config.right.a, "right");

  return {
    cycleSteps: 6,
    lanes: POI_BEAT_LANES,
    tracks: [
      {
        id: "left",
        hand: "left",
        poiDirection: directions.left,
        initialPhase: deriveWrapInitialPhase(leftSide, directions.left, false, config.offset),
        rows: buildWrapHandRows(config.left, "left")
      },
      {
        id: "right",
        hand: "right",
        poiDirection: directions.right,
        initialPhase: deriveWrapInitialPhase(rightSide, directions.right, true, config.offset),
        rows: rotateWrapRows(buildWrapHandRows(config.right, "right"), config.offset)
      }
    ]
  };
}
