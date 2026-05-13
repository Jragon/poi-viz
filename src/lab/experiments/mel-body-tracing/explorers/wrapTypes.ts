import type { ReelDirection, ReelPosition } from "@/lab/experiments/mel-body-tracing/explorers/reelTypes";

export type WrapOffset = 0 | 1 | 2 | 3 | 4 | 5;

export interface WrapPositionPair {
  readonly a: ReelPosition;
  readonly b: ReelPosition;
}

export interface WrapConfig {
  readonly left: WrapPositionPair;
  readonly right: WrapPositionPair;
  readonly direction: ReelDirection;
  readonly offset: WrapOffset;
}
