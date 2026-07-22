import type { PlaneSide, TimeUnit } from "@/engine/types";

export type PoiBeatLaneId = "left-high" | "left-low" | "center" | "right-low" | "right-high";

export type PoiBeatHand = "left" | "right";

export type PoiBeatDirection = "clockwise" | "counterclockwise";

export type PoiBeatPhaseLabel = "up" | "down";

export type PoiBeatLaneMotion = "same-lane" | "lane-switch";

export type PoiBeatBodySide = "left" | "right";

export type PoiBeatCrosspointLevel = "low" | "mid" | "high";

export type PoiBeatHorizontalDirection = "left" | "right";

export type PoiBeatCrosspointViolation = "CENTERLINE_CROSSPOINT" | "POI_POINTS_THROUGH_BODY";

export interface PoiBeatResolvedCrosspoint {
  readonly progress: 0.5;
  readonly timeOffsetUnits: TimeUnit;
  readonly handPoint: Readonly<{ x: number; y: number }>;
  readonly phaseAbs: number;
  readonly bodySide: PoiBeatBodySide | null;
  readonly level: PoiBeatCrosspointLevel;
  readonly poiDirection: PoiBeatHorizontalDirection;
  readonly legal: boolean;
  readonly violation?: PoiBeatCrosspointViolation;
}

export type PoiBeatSideMotion =
  | { readonly kind: "hold"; readonly side: PlaneSide }
  | {
      readonly kind: "transition";
      readonly fromSide: PlaneSide;
      readonly toSide: PlaneSide;
      readonly crosspoint: PoiBeatResolvedCrosspoint;
    };

export interface PoiBeatLane {
  readonly id: PoiBeatLaneId;
  readonly label: string;
  readonly lateral: "left" | "center" | "right";
  readonly vertical: "high" | "center" | "low";
}

export interface PoiBeatRow {
  readonly step: number;
  readonly laneId: PoiBeatLaneId;
  readonly planeSide?: PlaneSide;
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
  readonly isBTB: boolean;
}

export interface PoiBeatInterval {
  readonly index: number;
  readonly trackId: string;
  readonly fromRow: PoiBeatRow;
  readonly toRow: PoiBeatRow;
  readonly laneMotion: PoiBeatLaneMotion;
  readonly fromSide: PlaneSide;
  readonly toSide: PlaneSide;
  readonly durationUnits: TimeUnit;
}

export interface PoiBeatResolvedInterval extends PoiBeatInterval {
  readonly sideMotion: PoiBeatSideMotion;
}

export interface PoiBeatResolvedTrack {
  readonly trackId: string;
  readonly intervals: readonly PoiBeatResolvedInterval[];
}

export interface PoiBeatResolvedPlan {
  readonly tracks: readonly PoiBeatResolvedTrack[];
}

export interface PoiBeatCompilerOptions {
  readonly halfBeatDuration: TimeUnit;
  readonly headRadius: number;
  readonly handHorizontalOffset: number;
  readonly handVerticalOffset: number;
}
