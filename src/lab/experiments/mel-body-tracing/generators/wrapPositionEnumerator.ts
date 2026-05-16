import type {
  PoiBeatDirection,
  PoiBeatGraph,
  PoiBeatHand,
  PoiBeatRow
} from "@/lab/experiments/mel-body-tracing/beat-graph/types";
import { POI_BEAT_LANES } from "@/lab/experiments/mel-body-tracing/beat-graph/graphHelpers";
import type { ReelPosition } from "@/lab/experiments/mel-body-tracing/explorers/reelTypes";
import {
  deriveInitialPhase,
  mapPositionToBodySide,
  mapPositionToLane
} from "@/lab/experiments/mel-body-tracing/explorers/reelRules";
import { getValidPartners } from "@/lab/experiments/mel-body-tracing/explorers/wrapRules";

export type WrapFrontPosition = Extract<
  ReelPosition,
  "high-native" | "low-native" | "high-non-native" | "low-non-native"
>;

type NativeWrapPosition = Extract<WrapFrontPosition, "low-native" | "high-native">;

export interface WrapPositionEnumeratorOptions {
  readonly targetPositionVisits: number;
  readonly seed: number;
  readonly btbChance: number;
  readonly leftStart: WrapFrontPosition;
  readonly rightStart: WrapFrontPosition;
}

export interface WrapPositionEnumeratorResult {
  readonly graph: PoiBeatGraph;
  readonly visitedPositions: Readonly<Record<PoiBeatHand, readonly WrapFrontPosition[]>>;
  readonly btbVisits: Readonly<Record<PoiBeatHand, number>>;
}

const SPLIT_TIME_DIRECTIONS: Readonly<Record<PoiBeatHand, PoiBeatDirection>> = {
  left: "clockwise",
  right: "counterclockwise"
};

const FRONT_POSITIONS = new Set<WrapFrontPosition>([
  "high-native",
  "low-native",
  "high-non-native",
  "low-non-native"
]);

export const DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS: WrapPositionEnumeratorOptions = {
  targetPositionVisits: 16,
  seed: 1,
  btbChance: 0.25,
  leftStart: "low-native",
  rightStart: "low-native"
};

interface HandGenerationState {
  readonly hand: PoiBeatHand;
  readonly rows: PoiBeatRow[];
  readonly visitedPositions: WrapFrontPosition[];
  currentPosition: WrapFrontPosition;
  btbVisits: number;
}

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

function isFrontPosition(position: ReelPosition): position is WrapFrontPosition {
  return FRONT_POSITIONS.has(position as WrapFrontPosition);
}

function isNativePosition(position: WrapFrontPosition): position is NativeWrapPosition {
  return position === "low-native" || position === "high-native";
}

function normalizeTargetPositionVisits(targetPositionVisits: number): number {
  if (!Number.isFinite(targetPositionVisits)) {
    throw new Error("targetPositionVisits must be finite");
  }

  return Math.max(1, Math.floor(targetPositionVisits));
}

function normalizeBtbChance(btbChance: number): number {
  if (!Number.isFinite(btbChance)) {
    throw new Error("btbChance must be finite");
  }

  return Math.max(0, Math.min(1, btbChance));
}

function choose<T>(items: readonly T[], random: () => number): T {
  if (items.length === 0) {
    throw new Error("Cannot choose from an empty list");
  }

  return items[Math.min(Math.floor(random() * items.length), items.length - 1)]!;
}

function chooseNextFrontPosition(
  position: WrapFrontPosition,
  random: () => number
): WrapFrontPosition {
  const partners = getValidPartners(position).filter(isFrontPosition);
  return choose(partners, random);
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

function createHandState(hand: PoiBeatHand, startPosition: WrapFrontPosition): HandGenerationState {
  return {
    hand,
    rows: [],
    visitedPositions: [],
    currentPosition: startPosition,
    btbVisits: 0
  };
}

function appendRows(state: HandGenerationState, rows: readonly PoiBeatRow[]): void {
  state.rows.push(...rows);
}

function appendNormalVisit(state: HandGenerationState, random: () => number): void {
  appendRows(state, buildNormalVisitRows(state.currentPosition, state.hand, state.rows.length));
  state.visitedPositions.push(state.currentPosition);
  state.currentPosition = chooseNextFrontPosition(state.currentPosition, random);
}

function appendNormalVisits(
  state: HandGenerationState,
  count: number,
  random: () => number
): void {
  for (let index = 0; index < count; index += 1) {
    appendNormalVisit(state, random);
  }
}

function appendSyncCenterHoldRow(state: HandGenerationState): void {
  state.rows.push({
    step: state.rows.length,
    laneId: "center",
    planeSide: "a"
  });
}

function appendBtbVisit(state: HandGenerationState): void {
  if (!isNativePosition(state.currentPosition)) {
    throw new Error(`BTB requires a native front position: ${state.currentPosition}`);
  }

  appendRows(state, buildBtbVisitRows(state.currentPosition, state.hand, state.rows.length));
  state.visitedPositions.push(state.currentPosition);
  state.btbVisits += 1;
}

function canChooseBtb(state: HandGenerationState): boolean {
  return isNativePosition(state.currentPosition);
}

function shouldChooseBtb(
  state: HandGenerationState,
  btbChance: number,
  random: () => number
): boolean {
  return canChooseBtb(state) && random() < btbChance;
}

function deriveStartPhase(
  hand: PoiBeatHand,
  startPosition: WrapFrontPosition,
  direction: PoiBeatDirection
): ReturnType<typeof deriveInitialPhase> {
  return deriveInitialPhase(mapPositionToBodySide(startPosition, hand), direction, false, 0);
}

export function generateWrapPositionGraph(
  options: WrapPositionEnumeratorOptions = DEFAULT_WRAP_POSITION_ENUMERATOR_OPTIONS
): WrapPositionEnumeratorResult {
  const targetPositionVisits = normalizeTargetPositionVisits(options.targetPositionVisits);
  const btbChance = normalizeBtbChance(options.btbChance);
  const random = createSeededRandom(options.seed);
  const left = createHandState("left", options.leftStart);
  const right = createHandState("right", options.rightStart);

  while (
    left.visitedPositions.length < targetPositionVisits ||
    right.visitedPositions.length < targetPositionVisits
  ) {
    const leftNeedsRows = left.visitedPositions.length < targetPositionVisits;
    const rightNeedsRows = right.visitedPositions.length < targetPositionVisits;
    const leftBtb = leftNeedsRows && shouldChooseBtb(left, btbChance, random);
    const rightBtb = rightNeedsRows && !leftBtb && shouldChooseBtb(right, btbChance, random);

    if (leftBtb) {
      appendBtbVisit(left);
      appendNormalVisits(right, 4, random);
      appendSyncCenterHoldRow(right);
    } else if (rightBtb) {
      appendBtbVisit(right);
      appendNormalVisits(left, 4, random);
      appendSyncCenterHoldRow(left);
    } else {
      appendNormalVisit(left, random);
      appendNormalVisit(right, random);
    }
  }

  if (left.rows.length !== right.rows.length) {
    throw new Error(
      `Generated unsynchronized wrap tracks: left=${left.rows.length}, right=${right.rows.length}`
    );
  }

  return {
    graph: {
      cycleSteps: left.rows.length,
      lanes: POI_BEAT_LANES,
      tracks: [
        {
          id: "left",
          hand: "left",
          poiDirection: SPLIT_TIME_DIRECTIONS.left,
          initialPhase: deriveStartPhase("left", options.leftStart, SPLIT_TIME_DIRECTIONS.left),
          rows: left.rows
        },
        {
          id: "right",
          hand: "right",
          poiDirection: SPLIT_TIME_DIRECTIONS.right,
          initialPhase: deriveStartPhase(
            "right",
            options.rightStart,
            SPLIT_TIME_DIRECTIONS.right
          ),
          rows: right.rows
        }
      ]
    },
    visitedPositions: {
      left: left.visitedPositions,
      right: right.visitedPositions
    },
    btbVisits: {
      left: left.btbVisits,
      right: right.btbVisits
    }
  };
}
