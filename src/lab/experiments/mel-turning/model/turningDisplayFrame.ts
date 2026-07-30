import type {
  BodyFacing,
  TurningHand,
  TurningHandPoint,
  TurningLaneId,
  TurningTrace
} from "@/lab/experiments/mel-turning/model/turningTypes";

export type TurningDisplayFrame = "body-relative" | "observer-relative";

export type TurningDisplaySide = "left" | "right";

const MIRRORED_LANE: Readonly<Record<TurningLaneId, TurningLaneId>> = {
  "left-high": "right-high",
  "left-low": "right-low",
  center: "center",
  "right-low": "left-low",
  "right-high": "left-high"
};

export const TURNING_DISPLAY_FRAME_LABELS: Readonly<Record<TurningDisplayFrame, string>> = {
  "body-relative": "Body-relative frame",
  "observer-relative": "Observer-relative frame"
};

export function getTurningFacingAtStep(trace: TurningTrace, step: number): BodyFacing {
  const completedTurn = [...trace.events]
    .sort((a, b) => b.afterStep - a.afterStep)
    .find((event) => step > event.afterStep);

  return completedTurn?.toFacing ?? trace.events[0]?.fromFacing ?? 0;
}

export function projectTurningLaneId(
  laneId: TurningLaneId,
  facing: BodyFacing,
  frame: TurningDisplayFrame
): TurningLaneId {
  if (frame === "body-relative" || facing === 0) return laneId;
  return MIRRORED_LANE[laneId];
}

export function projectTurningHandPoint(
  point: TurningHandPoint,
  facing: BodyFacing,
  frame: TurningDisplayFrame
): TurningHandPoint {
  if (frame === "body-relative" || facing === 0) return point;
  return { x: -point.x, y: point.y };
}

export function projectTurningHandSide(
  hand: TurningHand,
  facing: BodyFacing,
  frame: TurningDisplayFrame
): TurningDisplaySide {
  if (frame === "body-relative" || facing === 0) return hand;
  return hand === "left" ? "right" : "left";
}
