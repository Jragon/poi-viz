import type { ReelDirection, ReelPosition } from "@/lab/experiments/mel-body-tracing/explorers/reelTypes";

export type CosmoFrontPosition = Extract<
  ReelPosition,
  "high-native" | "low-native" | "high-non-native" | "low-non-native"
>;

export type CosmoBackPosition = Extract<ReelPosition, "high-back" | "low-back">;

export type CosmoOffset = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface CosmoPositionPair {
  readonly a: CosmoFrontPosition;
  readonly b: CosmoBackPosition;
}

export interface CosmoConfig {
  readonly left: CosmoPositionPair;
  readonly right: CosmoPositionPair;
  readonly direction: ReelDirection;
  readonly offset: CosmoOffset;
}
