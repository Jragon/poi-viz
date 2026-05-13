import type { PlaneSide } from "@/engine/types";
import type {
  CosmoBackPosition,
  CosmoConfig,
  CosmoFrontPosition,
  CosmoOffset,
  CosmoPositionPair
} from "@/lab/experiments/cosmo-explorer/types";
import { POI_BEAT_LANES } from "@/lab/experiments/poi-beat-graph/graphHelpers";
import type {
  PoiBeatDirection,
  PoiBeatGraph,
  PoiBeatHand,
  PoiBeatPhaseLabel,
  PoiBeatRow
} from "@/lab/experiments/poi-beat-graph/types";
import {
  deriveInitialPhase,
  mapPositionToBodySide,
  mapPositionToLane,
  resolveDirections
} from "@/lab/experiments/reel-explorer/reelRules";
import type { ReelBodySide } from "@/lab/experiments/reel-explorer/types";

type CosmoTemplateTag = "A" | "B" | "CF" | "CB";

export const DEFAULT_COSMO_CONFIG: CosmoConfig = {
  left: { a: "low-non-native", b: "low-back" },
  right: { a: "low-non-native", b: "low-back" },
  direction: { mode: "opposite", flow: "inwards" },
  offset: 0
};

export const COSMO_FRONT_POSITION_OPTIONS = [
  "high-native",
  "low-native",
  "high-non-native",
  "low-non-native"
] as const satisfies readonly CosmoFrontPosition[];

export const COSMO_BACK_POSITION_OPTIONS = [
  "high-back",
  "low-back"
] as const satisfies readonly CosmoBackPosition[];

export const COSMO_OFFSET_OPTIONS = [
  0, 1, 2, 3, 4, 5, 6, 7
] as const satisfies readonly CosmoOffset[];

export const VALID_COSMO_PAIRS = [
  ["high-non-native", "high-back"],
  ["low-non-native", "low-back"],
  ["low-non-native", "high-back"],
  ["high-non-native", "low-back"],
  ["high-native", "low-back"],
  ["low-native", "high-back"]
] as const satisfies readonly (readonly [CosmoFrontPosition, CosmoBackPosition])[];

export function isValidCosmoPair(
  positionA: CosmoFrontPosition,
  positionB: CosmoBackPosition
): boolean {
  return VALID_COSMO_PAIRS.some(([validA, validB]) => validA === positionA && validB === positionB);
}

export function getValidCosmoPartners(positionA: CosmoFrontPosition): readonly CosmoBackPosition[] {
  return COSMO_BACK_POSITION_OPTIONS.filter((positionB) => isValidCosmoPair(positionA, positionB));
}

export function isVerticalPair(pair: CosmoPositionPair): boolean {
  return pair.a === "high-native" || pair.a === "low-native";
}

function isHighNative(position: CosmoFrontPosition): boolean {
  return position === "high-native";
}

function isOutwards(hand: PoiBeatHand, handDirection: PoiBeatDirection): boolean {
  return (hand === "right") === (handDirection === "clockwise");
}

export function buildCosmoTemplate(
  pair: CosmoPositionPair,
  hand: PoiBeatHand,
  handDirection: PoiBeatDirection
): readonly CosmoTemplateTag[] {
  if (!isVerticalPair(pair)) {
    return ["A", "A", "CF", "CB", "B", "B", "CB", "CF"];
  }

  const aFirst = isHighNative(pair.a) === isOutwards(hand, handDirection);
  return aFirst
    ? ["CF", "CF", "A", "A", "CB", "B", "B", "CB"]
    : ["CF", "CF", "CB", "B", "B", "CB", "A", "A"];
}

export function cosmoPositionPlaneSide(tag: CosmoTemplateTag): PlaneSide {
  if (tag === "A" || tag === "CB") return "b";
  return "a";
}

export function buildCosmoHandRows(
  pair: CosmoPositionPair,
  hand: PoiBeatHand,
  handDirection: PoiBeatDirection
): readonly PoiBeatRow[] {
  return buildCosmoTemplate(pair, hand, handDirection).map((tag, step) => ({
    step,
    laneId:
      tag === "A"
        ? mapPositionToLane(pair.a, hand)
        : tag === "B"
          ? mapPositionToLane(pair.b, hand)
          : "center",
    planeSide: cosmoPositionPlaneSide(tag)
  }));
}

export function rotateCosmoRows(
  rows: readonly PoiBeatRow[],
  offset: CosmoOffset
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

export function deriveCosmoInitialPhase(
  positionSide: ReelBodySide,
  direction: PoiBeatDirection,
  isOffsetHand: boolean,
  offset: CosmoOffset
): PoiBeatPhaseLabel {
  return deriveInitialPhase(positionSide, direction, isOffsetHand, offset);
}

export function buildCosmoBeatGraph(config: CosmoConfig): PoiBeatGraph {
  const directions = resolveDirections(config.direction);
  const leftSide = mapPositionToBodySide(config.left.a, "left");
  const rightSide = mapPositionToBodySide(config.right.a, "right");

  return {
    cycleSteps: 8,
    lanes: POI_BEAT_LANES,
    tracks: [
      {
        id: "left",
        hand: "left",
        poiDirection: directions.left,
        initialPhase: deriveCosmoInitialPhase(leftSide, directions.left, false, config.offset),
        rows: buildCosmoHandRows(config.left, "left", directions.left)
      },
      {
        id: "right",
        hand: "right",
        poiDirection: directions.right,
        initialPhase: deriveCosmoInitialPhase(rightSide, directions.right, true, config.offset),
        rows: rotateCosmoRows(
          buildCosmoHandRows(config.right, "right", directions.right),
          config.offset
        )
      }
    ]
  };
}
