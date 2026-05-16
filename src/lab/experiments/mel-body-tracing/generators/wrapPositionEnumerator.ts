import type {
  PoiBeatDirection,
  PoiBeatGraph,
  PoiBeatHand,
  PoiBeatRow
} from "@/lab/experiments/mel-body-tracing/beat-graph/types";
import type { ReelPosition } from "@/lab/experiments/mel-body-tracing/explorers/reelTypes";
import { mapPositionToLane } from "@/lab/experiments/mel-body-tracing/explorers/reelRules";

export type WrapFrontPosition = Extract<
  ReelPosition,
  "high-native" | "low-native" | "high-non-native" | "low-non-native"
>;

type NativeWrapPosition = Extract<WrapFrontPosition, "low-native" | "high-native">;

export interface WrapPositionVisit {
  readonly position: WrapFrontPosition;
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
  if (!Number.isFinite(seed) || !Number.isInteger(seed)) {
    throw new Error("Seed must be a finite integer");
  }

  let state = seed >>> 0;

  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function matchingNonNative(position: NativeWrapPosition): WrapFrontPosition {
  return position === "high-native" ? "high-non-native" : "low-non-native";
}

function withSteps(rows: readonly Omit<PoiBeatRow, "step">[], startStep: number): readonly PoiBeatRow[] {
  return rows.map((row, offset) => ({ ...row, step: startStep + offset }));
}

export function buildNormalVisitRows(
  position: WrapFrontPosition,
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

  throw new Error("generateWrapPositionGraph is not implemented yet");
}
