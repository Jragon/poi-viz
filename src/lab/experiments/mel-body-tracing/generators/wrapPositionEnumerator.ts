import { POI_BEAT_LANES } from "@/lab/experiments/mel-body-tracing/beat-graph/graphHelpers";
import type {
  PoiBeatDirection,
  PoiBeatGraph,
  PoiBeatHand,
  PoiBeatRow
} from "@/lab/experiments/mel-body-tracing/beat-graph/types";
import type { ReelPosition } from "@/lab/experiments/mel-body-tracing/explorers/reelTypes";
import { mapPositionToLane } from "@/lab/experiments/mel-body-tracing/explorers/reelRules";
import { isValidWrapPair } from "@/lab/experiments/mel-body-tracing/explorers/wrapRules";

type NativeWrapPosition = Extract<ReelPosition, "low-native" | "high-native">;

interface WrapPositionVisit {
  readonly position: ReelPosition;
  readonly hand: PoiBeatHand;
  readonly rows: readonly PoiBeatRow[];
}

export interface WrapPositionEnumeratorOptions {
  readonly seed: number;
  readonly directions: readonly PoiBeatDirection[];
}

export interface WrapPositionEnumeratorResult {
  readonly graph: PoiBeatGraph;
  readonly visits: readonly WrapPositionVisit[];
}

const SPLIT_TIME_DIRECTIONS: readonly PoiBeatDirection[] = ["clockwise", "counterclockwise"];

export const DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS: WrapPositionEnumeratorOptions = {
  seed: 1,
  directions: SPLIT_TIME_DIRECTIONS
};

export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function isNative(position: ReelPosition): position is NativeWrapPosition {
  return position === "low-native" || position === "high-native";
}

function matchingNonNative(position: NativeWrapPosition): ReelPosition {
  return position === "high-native" ? "high-non-native" : "low-non-native";
}

function choose<T>(values: readonly T[], random: () => number): T {
  const index = Math.min(values.length - 1, Math.floor(clamp01(random()) * values.length));
  const selected = values[index];
  if (selected === undefined) {
    throw new Error("Cannot choose from an empty list");
  }

  return selected;
}

function withSteps(rows: readonly Omit<PoiBeatRow, "step">[], startStep: number): readonly PoiBeatRow[] {
  return rows.map((row, offset) => ({ ...row, step: startStep + offset }));
}

export function buildNormalVisitRows(
  position: ReelPosition,
  hand: PoiBeatHand,
  startStep: number
): readonly PoiBeatRow[] {
  return withSteps(
    [
      { laneId: mapPositionToLane(position, hand), planeSide: "b" },
      { laneId: mapPositionToLane(position, hand), planeSide: "b" },
      { laneId: "center", planeSide: "a" }
    ],
    startStep
  );
}

export function buildBtbVisitRows(
  position: NativeWrapPosition,
  hand: PoiBeatHand,
  startStep: number
): readonly PoiBeatRow[] {
  const nativeLane = mapPositionToLane(position, hand);
  const nonNativeLane = mapPositionToLane(matchingNonNative(position), hand);

  return withSteps(
    [
      { laneId: nativeLane, planeSide: "b" },
      { laneId: nativeLane, planeSide: "b" },
      { laneId: nativeLane, planeSide: "a" },
      { laneId: nativeLane, planeSide: "a" },
      { laneId: "center", planeSide: "b" },
      { laneId: nonNativeLane, planeSide: "a" },
      { laneId: nonNativeLane, planeSide: "a" },
      { laneId: "center", planeSide: "b" },
      { laneId: nativeLane, planeSide: "a" },
      { laneId: nativeLane, planeSide: "a" },
      { laneId: nativeLane, planeSide: "b" },
      { laneId: nativeLane, planeSide: "b" },
      { laneId: "center", planeSide: "a" }
    ],
    startStep
  );
}

export function generateWrapPositionGraph(
  options: WrapPositionEnumeratorOptions = DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS
): WrapPositionEnumeratorResult {
  void options;
  void POI_BEAT_LANES;
  void isNative;
  void choose;
  void isValidWrapPair;

  throw new Error("generateWrapPositionGraph is not implemented yet");
}
