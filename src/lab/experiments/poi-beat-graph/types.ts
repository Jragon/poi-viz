import type { PlaneSide, TimeUnit } from "@/engine/types";

export type PoiBeatLaneId = "left-high" | "left-low" | "center" | "right-low" | "right-high";

export type PoiBeatHand = "left" | "right";

export type PoiBeatDirection = "clockwise" | "counterclockwise";

export type PoiBeatPhaseLabel = "up" | "down";

export type PoiBeatIntervalKind = "same-lane" | "lane-switch";

export interface PoiBeatLane {
  readonly id: PoiBeatLaneId;
  readonly label: string;
  readonly lateral: "left" | "center" | "right";
  readonly vertical: "high" | "center" | "low";
}

export interface PoiBeatRow {
  readonly step: number;
  readonly laneId: PoiBeatLaneId;
}

export interface PoiBeatTrack {
  readonly id: string;
  readonly hand: PoiBeatHand;
  readonly poiDirection: PoiBeatDirection;
  readonly initialPhase: PoiBeatPhaseLabel;
  readonly rows: readonly PoiBeatRow[];
}

export interface PoiBeatGraph {
  readonly cycleSteps: number;
  readonly lanes: readonly PoiBeatLane[];
  readonly tracks: readonly PoiBeatTrack[];
}

export interface PoiBeatDerivedRowState {
  readonly row: PoiBeatRow;
  readonly phaseAbs: number;
  readonly phaseLabel: PoiBeatPhaseLabel;
  readonly planeSide: PlaneSide;
}

export interface PoiBeatInterval {
  readonly index: number;
  readonly trackId: string;
  readonly fromRow: PoiBeatRow;
  readonly toRow: PoiBeatRow;
  readonly kind: PoiBeatIntervalKind;
  readonly planeSide: PlaneSide;
  readonly durationUnits: TimeUnit;
}

export interface PoiBeatCompilerOptions {
  readonly halfBeatDuration: TimeUnit;
  readonly headRadius: number;
  readonly handHorizontalOffset: number;
  readonly handVerticalOffset: number;
}
