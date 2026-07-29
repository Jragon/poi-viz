export type TurningLaneId = "left-high" | "left-low" | "center" | "right-low" | "right-high";

export type TurningPlaneSide = "a" | "b";

export type TurningHand = "left" | "right";

export type TurningDirection = "clockwise" | "counterclockwise";

export type TurningPhase = "up" | "down";

export type BodyTurnDirection = "left" | "right";

export type BodyFacing = 0 | 180;

export type TurningGateSide = "left" | "right";

export type TurningRelativeCircle = "front" | "back";

export type LowReelLocation = "C" | "L" | "R" | "Cb" | "Lb" | "Rb";

export type TurnTopologyStatus = "valid" | "invalid" | "unresolved";

export type TurningVerificationStatus = "physically-verified" | "unverified";

export type TurningHandPlacement = "wall" | "behind-body";

export type TurningTiming = "ONE" | "TO" | "SO" | "TS" | "SS";

export interface TurningLane {
  readonly id: TurningLaneId;
  readonly label: string;
}

export interface TurningTrackRowDraft {
  readonly step: number;
  readonly laneId: TurningLaneId;
  readonly planeSide: TurningPlaneSide;
  readonly handPlacement?: TurningHandPlacement;
}

export interface TurningTrackDraft {
  readonly id: string;
  readonly hand: TurningHand;
  readonly poiDirection: TurningDirection;
  readonly initialPhase: TurningPhase;
  readonly rows: readonly TurningTrackRowDraft[];
}

export interface TurningNode extends TurningTrackRowDraft {
  readonly phase: TurningPhase;
}

export interface TurningTrack {
  readonly id: string;
  readonly hand: TurningHand;
  readonly poiDirection: TurningDirection;
  readonly initialPhase: TurningPhase;
  readonly nodes: readonly TurningNode[];
}

export interface BodyTurnEvent {
  readonly kind: "body-turn";
  readonly afterStep: number;
  readonly direction: BodyTurnDirection;
  readonly degrees: 180;
  readonly fromFacing: BodyFacing;
  readonly toFacing: BodyFacing;
  readonly note: string;
}

export interface TurningTrace {
  readonly id: string;
  readonly label: string;
  readonly timing: TurningTiming;
  readonly summary: string;
  readonly source: string;
  readonly verificationStatus: TurningVerificationStatus;
  readonly lanes: readonly TurningLane[];
  readonly tracks: readonly TurningTrack[];
  readonly events: readonly BodyTurnEvent[];
}
