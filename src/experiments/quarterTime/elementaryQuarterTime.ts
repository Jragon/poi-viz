import { PI } from "@/engine/constants";
import type { MultiRigSequence, PlaneId, SegmentPlacement } from "@/engine/types";

export type ElementaryQuarterArcId = "0-90" | "90-180" | "180-270" | "270-0";

export type ElementaryTimingMode = "together" | "quarter";
export type ElementaryEndpoint = "start" | "end";
export type ElementaryEndpointAxis = "horizontal" | "vertical";
export type ElementaryTimingRelation = "same-axis" | "right-angle";

export interface ElementaryQuarterArc {
  id: ElementaryQuarterArcId;
  label: string;
  startDeg: number;
  endDeg: number;
  pathD: string;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  arrowRotationDeg: number;
}

export interface ElementaryTimingOption {
  id: ElementaryTimingMode;
  label: string;
  relation: ElementaryTimingRelation;
}

export interface BuildElementaryQuarterTimeSequenceOptions {
  leftArcId: ElementaryQuarterArcId;
  rightArcId: ElementaryQuarterArcId;
  timingMode: ElementaryTimingMode;
  planeId?: PlaneId;
}

const TAU = 2 * PI;
const QUARTER_DURATION_UNITS = 0.25;
const HAND_RADIUS = 1;
const HEAD_RADIUS = 0.5;
const HAND_OMEGA = TAU;
const HEAD_OMEGA = -3 * TAU;

export const ELEMENTARY_QUARTER_ARCS: readonly ElementaryQuarterArc[] = [
  {
    id: "0-90",
    label: "0 to 90",
    startDeg: 0,
    endDeg: 90,
    pathD: "M 39 24 A 15 15 0 0 0 24 9",
    startPoint: { x: 39, y: 24 },
    endPoint: { x: 24, y: 9 },
    arrowRotationDeg: 180
  },
  {
    id: "90-180",
    label: "90 to 180",
    startDeg: 90,
    endDeg: 180,
    pathD: "M 24 9 A 15 15 0 0 0 9 24",
    startPoint: { x: 24, y: 9 },
    endPoint: { x: 9, y: 24 },
    arrowRotationDeg: 90
  },
  {
    id: "180-270",
    label: "180 to 270",
    startDeg: 180,
    endDeg: 270,
    pathD: "M 9 24 A 15 15 0 0 0 24 39",
    startPoint: { x: 9, y: 24 },
    endPoint: { x: 24, y: 39 },
    arrowRotationDeg: 0
  },
  {
    id: "270-0",
    label: "270 to 0",
    startDeg: 270,
    endDeg: 360,
    pathD: "M 24 39 A 15 15 0 0 0 39 24",
    startPoint: { x: 24, y: 39 },
    endPoint: { x: 39, y: 24 },
    arrowRotationDeg: -90
  }
];

export const ELEMENTARY_TIMING_OPTIONS: readonly ElementaryTimingOption[] = [
  { id: "together", label: "Together time", relation: "same-axis" },
  { id: "quarter", label: "Quarter time", relation: "right-angle" }
];

const ARCS_BY_ID: ReadonlyMap<ElementaryQuarterArcId, ElementaryQuarterArc> = new Map(
  ELEMENTARY_QUARTER_ARCS.map((arc) => [arc.id, arc])
);

function toRadians(degrees: number): number {
  return (degrees * PI) / 180;
}

function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

function getEndpointAxis(degrees: number): ElementaryEndpointAxis {
  const normalizedDegrees = normalizeDegrees(degrees);
  if (normalizedDegrees === 0 || normalizedDegrees === 180) {
    return "horizontal";
  }

  if (normalizedDegrees === 90 || normalizedDegrees === 270) {
    return "vertical";
  }

  throw new Error(`Elementary quarter endpoint must be cardinal, got ${degrees}`);
}

function requireArc(arcId: ElementaryQuarterArcId): ElementaryQuarterArc {
  const arc = ARCS_BY_ID.get(arcId);
  if (!arc) {
    throw new Error(`Unknown elementary quarter arc: ${arcId}`);
  }

  return arc;
}

export function getElementaryTimingOption(mode: ElementaryTimingMode): ElementaryTimingOption {
  const option = ELEMENTARY_TIMING_OPTIONS.find((timingOption) => timingOption.id === mode);
  if (!option) {
    throw new Error(`Unknown elementary timing mode: ${mode}`);
  }

  return option;
}

export function getElementaryArcEndpointAxis(
  arcId: ElementaryQuarterArcId,
  endpoint: ElementaryEndpoint
): ElementaryEndpointAxis {
  const arc = requireArc(arcId);
  return getEndpointAxis(endpoint === "start" ? arc.startDeg : arc.endDeg);
}

export function getRightStartEndpointForTiming(
  leftArcId: ElementaryQuarterArcId,
  rightArcId: ElementaryQuarterArcId,
  timingMode: ElementaryTimingMode
): ElementaryEndpoint {
  const timingOption = getElementaryTimingOption(timingMode);
  const leftStartAxis = getElementaryArcEndpointAxis(leftArcId, "start");
  const rightStartAxis = getElementaryArcEndpointAxis(rightArcId, "start");
  const rightStartMatchesRelation =
    timingOption.relation === "same-axis"
      ? rightStartAxis === leftStartAxis
      : rightStartAxis !== leftStartAxis;

  return rightStartMatchesRelation ? "start" : "end";
}

function makeBackAndForthPlacements(
  arcId: ElementaryQuarterArcId,
  planeId: PlaneId,
  startsAt: ElementaryEndpoint
): SegmentPlacement[] {
  const arc = requireArc(arcId);
  const startPhase = toRadians(arc.startDeg);
  const endPhase = toRadians(arc.endDeg);

  const forward: SegmentPlacement = {
    durationUnits: QUARTER_DURATION_UNITS,
    planeId,
    segment: {
      hand: {
        startPose: { phaseAbs: startPhase, radius: HAND_RADIUS },
        driver: { kind: "circle", omega: HAND_OMEGA }
      },
      head: {
        startPose: { phaseAbs: startPhase, radius: HEAD_RADIUS },
        driver: { kind: "circle", omega: HEAD_OMEGA }
      }
    }
  };
  const returnPlacement: SegmentPlacement = {
    durationUnits: QUARTER_DURATION_UNITS,
    planeId,
    segment: {
      hand: {
        startPose: { phaseAbs: endPhase, radius: HAND_RADIUS },
        driver: { kind: "circle", omega: -HAND_OMEGA }
      },
      head: {
        startPose: { phaseAbs: endPhase, radius: HEAD_RADIUS },
        driver: { kind: "circle", omega: -HEAD_OMEGA }
      }
    }
  };

  return startsAt === "start" ? [forward, returnPlacement] : [returnPlacement, forward];
}

export function buildElementaryQuarterTimeSequence({
  leftArcId,
  rightArcId,
  timingMode,
  planeId = "wall"
}: BuildElementaryQuarterTimeSequenceOptions): MultiRigSequence {
  const rightStartsAt = getRightStartEndpointForTiming(leftArcId, rightArcId, timingMode);

  return {
    rigs: [
      {
        rigId: "left",
        sequence: {
          segments: makeBackAndForthPlacements(leftArcId, planeId, "start")
        }
      },
      {
        rigId: "right",
        sequence: {
          segments: makeBackAndForthPlacements(rightArcId, planeId, rightStartsAt)
        }
      }
    ]
  };
}
