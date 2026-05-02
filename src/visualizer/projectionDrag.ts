import {
  PROJECTION_PITCH_MAX,
  PROJECTION_PITCH_MIN,
  PROJECTION_YAW_MAX,
  PROJECTION_YAW_MIN
} from "@/visualizer/useVisualizerSession";

export const PROJECTION_DRAG_SENSITIVITY_DEG_PER_PX = 0.4;

export interface ProjectionDragResult {
  readonly yawDeg: number;
  readonly pitchDeg: number;
}

export interface ProjectionDragMove {
  readonly startYawDeg: number;
  readonly startPitchDeg: number;
  readonly dx: number;
  readonly dy: number;
}

export interface ProjectionDragState {
  start: (x: number, y: number, yawDeg: number, pitchDeg: number) => void;
  move: (x: number, y: number) => ProjectionDragMove | null;
  end: () => void;
  isActive: () => boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function computeDragProjection(
  startYawDeg: number,
  startPitchDeg: number,
  dx: number,
  dy: number,
  sensitivityDegPerPx = PROJECTION_DRAG_SENSITIVITY_DEG_PER_PX
): ProjectionDragResult {
  return {
    yawDeg: clamp(startYawDeg + dx * sensitivityDegPerPx, PROJECTION_YAW_MIN, PROJECTION_YAW_MAX),
    pitchDeg: clamp(
      startPitchDeg - dy * sensitivityDegPerPx,
      PROJECTION_PITCH_MIN,
      PROJECTION_PITCH_MAX
    )
  };
}

export function createProjectionDragState(): ProjectionDragState {
  let anchor: {
    x: number;
    y: number;
    yawDeg: number;
    pitchDeg: number;
  } | null = null;

  return {
    start(x, y, yawDeg, pitchDeg) {
      anchor = { x, y, yawDeg, pitchDeg };
    },
    move(x, y) {
      if (!anchor) {
        return null;
      }

      return {
        startYawDeg: anchor.yawDeg,
        startPitchDeg: anchor.pitchDeg,
        dx: x - anchor.x,
        dy: y - anchor.y
      };
    },
    end() {
      anchor = null;
    },
    isActive() {
      return anchor !== null;
    }
  };
}
