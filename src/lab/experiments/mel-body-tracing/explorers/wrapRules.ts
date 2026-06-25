import { POI_BEAT_LANES } from "@/lab/experiments/mel-body-tracing/beat-graph/graphHelpers";
import type {
  PoiBeatDirection,
  PoiBeatGraph,
  PoiBeatHand,
  PoiBeatLaneId,
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
import type {
  ReelBodySide,
  ReelPosition
} from "@/lab/experiments/mel-body-tracing/explorers/reelTypes";
import type {
  WrapConfig,
  WrapOffset,
  WrapPositionPair
} from "@/lab/experiments/mel-body-tracing/explorers/wrapTypes";

type VerticalWrapKind = "native" | "non-native";
type VerticalWrapLaneOrder = "low-high" | "high-low";

interface VerticalWrapHandTrackParts {
  readonly initialPhase: PoiBeatPhaseLabel;
  readonly rows: readonly PoiBeatRow[];
}

const VERTICAL_WRAP_HAND_TEMPLATES = {
  native: {
    left: {
      clockwise: { initialPhase: "up", laneOrder: "low-high" },
      counterclockwise: { initialPhase: "down", laneOrder: "high-low" }
    },
    right: {
      clockwise: { initialPhase: "down", laneOrder: "high-low" },
      counterclockwise: { initialPhase: "up", laneOrder: "low-high" }
    }
  },
  "non-native": {
    left: {
      clockwise: { initialPhase: "down", laneOrder: "high-low" },
      counterclockwise: { initialPhase: "up", laneOrder: "low-high" }
    },
    right: {
      clockwise: { initialPhase: "up", laneOrder: "low-high" },
      counterclockwise: { initialPhase: "down", laneOrder: "high-low" }
    }
  }
} as const satisfies Record<
  VerticalWrapKind,
  Record<
    PoiBeatHand,
    Record<
      PoiBeatDirection,
      { readonly initialPhase: PoiBeatPhaseLabel; readonly laneOrder: VerticalWrapLaneOrder }
    >
  >
>;

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

function getVerticalWrapKind(pair: WrapPositionPair): VerticalWrapKind | null {
  const positions = new Set([pair.a, pair.b]);

  if (positions.has("high-native") && positions.has("low-native")) return "native";
  if (positions.has("high-non-native") && positions.has("low-non-native")) return "non-native";

  return null;
}

function verticalWrapLane(
  positionKind: VerticalWrapKind,
  hand: PoiBeatHand,
  vertical: "low" | "high"
) {
  const position = `${vertical}-${positionKind}` as ReelPosition;
  return mapPositionToLane(position, hand);
}

function resolveWrapHandDirection(
  pair: WrapPositionPair,
  hand: PoiBeatHand,
  config: WrapConfig,
  fallbackDirection: PoiBeatDirection
): PoiBeatDirection {
  const kind = getVerticalWrapKind(pair);
  if (kind !== "non-native" || config.direction.mode !== "opposite") return fallbackDirection;

  return hand === "left" ? "clockwise" : "counterclockwise";
}

export function buildVerticalWrapHandTrackParts(
  pair: WrapPositionPair,
  hand: PoiBeatHand,
  handDirection: PoiBeatDirection,
  oppositeFlow?: "inwards" | "outwards"
): VerticalWrapHandTrackParts | null {
  const kind = getVerticalWrapKind(pair);
  if (!kind) return null;

  const template =
    kind === "non-native" && oppositeFlow === "outwards"
      ? VERTICAL_WRAP_HAND_TEMPLATES[kind][hand][
          handDirection === "clockwise" ? "counterclockwise" : "clockwise"
        ]
      : VERTICAL_WRAP_HAND_TEMPLATES[kind][hand][handDirection];
  const lanes: readonly PoiBeatLaneId[] =
    template.laneOrder === "low-high"
      ? [verticalWrapLane(kind, hand, "low"), verticalWrapLane(kind, hand, "high")]
      : [verticalWrapLane(kind, hand, "high"), verticalWrapLane(kind, hand, "low")];

  return {
    initialPhase: template.initialPhase,
    rows: [
      { step: 0, laneId: "center" },
      { step: 1, laneId: "center" },
      { step: 2, laneId: lanes[0] },
      { step: 3, laneId: lanes[0] },
      { step: 4, laneId: lanes[1] },
      { step: 5, laneId: lanes[1] }
    ]
  };
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
  const leftDirection = resolveWrapHandDirection(config.left, "left", config, directions.left);
  const rightDirection = resolveWrapHandDirection(config.right, "right", config, directions.right);
  const leftSide = mapPositionToBodySide(config.left.a, "left");
  const rightSide = mapPositionToBodySide(config.right.a, "right");
  const oppositeFlow = config.direction.mode === "opposite" ? config.direction.flow : undefined;
  const leftVertical = buildVerticalWrapHandTrackParts(
    config.left,
    "left",
    leftDirection,
    oppositeFlow
  );
  const rightVertical = buildVerticalWrapHandTrackParts(
    config.right,
    "right",
    rightDirection,
    oppositeFlow
  );

  return {
    cycleSteps: 6,
    lanes: POI_BEAT_LANES,
    tracks: [
      {
        id: "left",
        hand: "left",
        poiDirection: leftDirection,
        initialPhase:
          leftVertical?.initialPhase ??
          deriveWrapInitialPhase(leftSide, leftDirection, false, config.offset),
        rows: leftVertical?.rows ?? buildWrapHandRows(config.left, "left")
      },
      {
        id: "right",
        hand: "right",
        poiDirection: rightDirection,
        initialPhase:
          rightVertical?.initialPhase ??
          deriveWrapInitialPhase(rightSide, rightDirection, true, config.offset),
        rows: rotateWrapRows(
          rightVertical?.rows ?? buildWrapHandRows(config.right, "right"),
          config.offset
        )
      }
    ]
  };
}
