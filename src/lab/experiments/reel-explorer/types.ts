import type {
  PoiBeatDirection,
  PoiBeatHand,
  PoiBeatLaneId,
  PoiBeatPhaseLabel
} from "@/lab/experiments/poi-beat-graph/types";

export type ReelPosition =
  | "high-native"
  | "low-native"
  | "high-non-native"
  | "low-non-native"
  | "high-back"
  | "low-back";

export type ReelOffset = 0 | 1 | 2 | 3;

export type ReelBodySide = "left" | "right";

export type ReelTimingLabel = "TS" | "TO" | "SS" | "SO";

export type ReelPatternType = "weave" | "mill";

export type ReelDirection =
  | { readonly mode: "same"; readonly direction: PoiBeatDirection }
  | { readonly mode: "opposite"; readonly flow: "inwards" | "outwards" };

export interface ReelConfig {
  readonly left: ReelPosition;
  readonly right: ReelPosition;
  readonly direction: ReelDirection;
  readonly offset: ReelOffset;
}

export interface ReelResolvedHandState {
  readonly hand: PoiBeatHand;
  readonly position: ReelPosition;
  readonly laneId: PoiBeatLaneId;
  readonly bodySide: ReelBodySide;
  readonly direction: PoiBeatDirection;
  readonly initialPhase: PoiBeatPhaseLabel;
  readonly isBack: boolean;
}

export interface ReelResolvedState {
  readonly left: ReelResolvedHandState;
  readonly right: ReelResolvedHandState;
  readonly timing: ReelTimingLabel;
  readonly patternType: ReelPatternType;
}
