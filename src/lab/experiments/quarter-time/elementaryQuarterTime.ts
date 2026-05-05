import { PI } from "@/engine/constants";
import type { MultiRigSequence, PlaneId, SegmentPlacement } from "@/engine/types";

export type ElementaryQuarterArcId = "0-90" | "90-180" | "180-270" | "270-0";

export type ElementaryTimingMode = "same" | "quarter";
export type ElementaryEndpoint = "start" | "end";
export type ElementaryWorldAxis = "x" | "y" | "z";
export type ElementaryTimingRelation = "shares-axis" | "right-angle";

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
  leftPlaneId: PlaneId;
  leftArcId: ElementaryQuarterArcId;
  rightPlaneId: PlaneId;
  rightArcId: ElementaryQuarterArcId;
  timingMode: ElementaryTimingMode;
}

export interface ElementaryPlaneOption {
  id: PlaneId;
  label: string;
}

export interface ElementaryTimingStartEndpoints {
  leftStartsAt: ElementaryEndpoint;
  rightStartsAt: ElementaryEndpoint;
}

export interface ElementaryTimingAvailabilityOptions {
  leftPlaneId: PlaneId;
  leftArcId: ElementaryQuarterArcId;
  rightPlaneId: PlaneId;
  rightArcId: ElementaryQuarterArcId;
  timingMode: ElementaryTimingMode;
}

const TAU = 2 * PI;
const QUARTER_DURATION_UNITS = 0.25;
const HAND_RADIUS = 1;
const HEAD_RADIUS = 0.5;
const HAND_OMEGA = TAU;
const HEAD_OMEGA = -3 * TAU;
const FRONT_EPSILON = 1e-9;

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
  { id: "same", label: "Same time", relation: "shares-axis" },
  { id: "quarter", label: "Quarter time", relation: "right-angle" }
];

export const ELEMENTARY_PLANE_OPTIONS: readonly ElementaryPlaneOption[] = [
  { id: "wall", label: "Wall" },
  { id: "wheel", label: "Wheel" },
  { id: "floor", label: "Floor" }
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

function getLocalEndpointAxis(degrees: number): "x" | "y" {
  const normalizedDegrees = normalizeDegrees(degrees);
  if (normalizedDegrees === 0 || normalizedDegrees === 180) {
    return "x";
  }

  if (normalizedDegrees === 90 || normalizedDegrees === 270) {
    return "y";
  }

  throw new Error(`Elementary quarter endpoint must be cardinal, got ${degrees}`);
}

function getEndpointDepth(planeId: PlaneId, degrees: number): number {
  const phaseRad = toRadians(degrees);
  switch (planeId) {
    case "wall":
      return 0;
    case "wheel":
      return Math.cos(phaseRad);
    case "floor":
      return Math.sin(phaseRad);
  }
}

function getWorldAxisForLocalAxis(planeId: PlaneId, localAxis: "x" | "y"): ElementaryWorldAxis {
  switch (planeId) {
    case "wall":
      return localAxis === "x" ? "x" : "y";
    case "wheel":
      return localAxis === "x" ? "z" : "y";
    case "floor":
      return localAxis === "x" ? "x" : "z";
  }
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

export function getElementaryArcEndpointWorldAxis(
  planeId: PlaneId,
  arcId: ElementaryQuarterArcId,
  endpoint: ElementaryEndpoint
): ElementaryWorldAxis {
  const arc = requireArc(arcId);
  return getWorldAxisForLocalAxis(
    planeId,
    getLocalEndpointAxis(endpoint === "start" ? arc.startDeg : arc.endDeg)
  );
}

export function isElementaryArcAvailableInPlane(
  planeId: PlaneId,
  arcId: ElementaryQuarterArcId
): boolean {
  const arc = requireArc(arcId);
  return (
    getEndpointDepth(planeId, arc.startDeg) >= -FRONT_EPSILON &&
    getEndpointDepth(planeId, arc.endDeg) >= -FRONT_EPSILON
  );
}

export function getAvailableElementaryArcIds(planeId: PlaneId): ElementaryQuarterArcId[] {
  return ELEMENTARY_QUARTER_ARCS.filter((arc) =>
    isElementaryArcAvailableInPlane(planeId, arc.id)
  ).map((arc) => arc.id);
}

function getOppositeEndpoint(endpoint: ElementaryEndpoint): ElementaryEndpoint {
  return endpoint === "start" ? "end" : "start";
}

function endpointsShareAxis(
  leftPlaneId: PlaneId,
  leftArcId: ElementaryQuarterArcId,
  leftEndpoint: ElementaryEndpoint,
  rightPlaneId: PlaneId,
  rightArcId: ElementaryQuarterArcId,
  rightEndpoint: ElementaryEndpoint
): boolean {
  const leftAxis = getElementaryArcEndpointWorldAxis(leftPlaneId, leftArcId, leftEndpoint);
  const rightAxis = getElementaryArcEndpointWorldAxis(rightPlaneId, rightArcId, rightEndpoint);

  return leftAxis === rightAxis;
}

export function getStartEndpointsForTiming(
  leftPlaneId: PlaneId,
  leftArcId: ElementaryQuarterArcId,
  rightPlaneId: PlaneId,
  rightArcId: ElementaryQuarterArcId,
  timingMode: ElementaryTimingMode
): ElementaryTimingStartEndpoints {
  const timingOption = getElementaryTimingOption(timingMode);
  const endpointPairs: readonly ElementaryTimingStartEndpoints[] = [
    { leftStartsAt: "start", rightStartsAt: "start" },
    { leftStartsAt: "start", rightStartsAt: "end" },
    { leftStartsAt: "end", rightStartsAt: "start" },
    { leftStartsAt: "end", rightStartsAt: "end" }
  ];

  const match = endpointPairs.find(({ leftStartsAt, rightStartsAt }) => {
    const startsShareAxis = endpointsShareAxis(
      leftPlaneId,
      leftArcId,
      leftStartsAt,
      rightPlaneId,
      rightArcId,
      rightStartsAt
    );
    const endsShareAxis = endpointsShareAxis(
      leftPlaneId,
      leftArcId,
      getOppositeEndpoint(leftStartsAt),
      rightPlaneId,
      rightArcId,
      getOppositeEndpoint(rightStartsAt)
    );

    return timingOption.relation === "shares-axis"
      ? startsShareAxis || endsShareAxis
      : !startsShareAxis && !endsShareAxis;
  });

  if (!match) {
    throw new Error(
      `No ${timingMode} endpoint pairing exists for ${leftPlaneId}:${leftArcId} and ${rightPlaneId}:${rightArcId}`
    );
  }

  return match;
}

export function isElementaryTimingAvailable({
  leftPlaneId,
  leftArcId,
  rightPlaneId,
  rightArcId,
  timingMode
}: ElementaryTimingAvailabilityOptions): boolean {
  try {
    getStartEndpointsForTiming(leftPlaneId, leftArcId, rightPlaneId, rightArcId, timingMode);
    return true;
  } catch {
    return false;
  }
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
  leftPlaneId,
  leftArcId,
  rightPlaneId,
  rightArcId,
  timingMode
}: BuildElementaryQuarterTimeSequenceOptions): MultiRigSequence {
  const { leftStartsAt, rightStartsAt } = getStartEndpointsForTiming(
    leftPlaneId,
    leftArcId,
    rightPlaneId,
    rightArcId,
    timingMode
  );

  return {
    rigs: [
      {
        rigId: "left",
        sequence: {
          segments: makeBackAndForthPlacements(leftArcId, leftPlaneId, leftStartsAt)
        }
      },
      {
        rigId: "right",
        sequence: {
          segments: makeBackAndForthPlacements(rightArcId, rightPlaneId, rightStartsAt)
        }
      }
    ]
  };
}
