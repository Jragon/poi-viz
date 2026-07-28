import type {
  BodyTurnEvent,
  TurningDirection,
  TurningHand,
  TurningNode,
  TurningPhase,
  TurningPlaneSide,
  TurningTrace,
  TurningTrack
} from "@/lab/experiments/mel-turning/model/turningTypes";

export type TurnEdgeDiagnosticCode =
  | "TURN_EVENT_MISSING"
  | "TURN_DEGREES_NOT_180"
  | "TURN_FACING_NOT_FLIPPED"
  | "TURN_HAND_TRACK_MISSING"
  | "TURN_HAND_TRACK_DUPLICATE"
  | "TURN_SOURCE_NODE_MISSING"
  | "TURN_SOURCE_NODE_DUPLICATE"
  | "TURN_TARGET_NODE_MISSING"
  | "TURN_TARGET_NODE_DUPLICATE"
  | "TURN_PHASE_DISCONTINUITY";

export type TurnEdgeContractStatus = "valid" | "invalid";

export type TurnEdgePhysicalStatus = "verified" | "unresolved" | "not-assessed";

export type PoiMidpointHorizontalDirection = "left" | "right";

export type TurnEdgeSideMotion =
  | {
      readonly kind: "hold";
      readonly side: TurningPlaneSide;
    }
  | {
      readonly kind: "cross";
      readonly fromSide: TurningPlaneSide;
      readonly toSide: TurningPlaneSide;
      readonly turnSide: BodyTurnEvent["direction"];
    };

export interface TurnEdgeDiagnostic {
  readonly code: TurnEdgeDiagnosticCode;
  readonly message: string;
  readonly hand?: TurningHand;
}

export interface TurningHandTurnEdge {
  readonly hand: TurningHand;
  readonly trackId: string;
  readonly poiDirection: TurningDirection;
  readonly from: TurningNode;
  readonly to: TurningNode;
  readonly midpointPoiDirection: PoiMidpointHorizontalDirection;
  readonly sideMotion: TurnEdgeSideMotion;
}

export interface SharedTurningEdge {
  readonly event: BodyTurnEvent;
  readonly sourceStep: number;
  readonly targetStep: number;
  readonly hands: Readonly<Record<TurningHand, TurningHandTurnEdge>>;
  readonly crossingCount: number;
}

export interface TurnEdgeAnalysis {
  readonly contractStatus: TurnEdgeContractStatus;
  readonly physicalStatus: TurnEdgePhysicalStatus;
  readonly edge: SharedTurningEdge | null;
  readonly diagnostics: readonly TurnEdgeDiagnostic[];
}

function oppositePhase(phase: TurningPhase): TurningPhase {
  return phase === "up" ? "down" : "up";
}

export function derivePoiMidpointHorizontalDirection(
  sourcePhase: TurningPhase,
  poiDirection: TurningDirection
): PoiMidpointHorizontalDirection {
  if (sourcePhase === "up") {
    return poiDirection === "clockwise" ? "right" : "left";
  }
  return poiDirection === "clockwise" ? "left" : "right";
}

function deriveSideMotion(
  from: TurningNode,
  to: TurningNode,
  event: BodyTurnEvent
): TurnEdgeSideMotion {
  if (from.planeSide === to.planeSide) {
    return { kind: "hold", side: from.planeSide };
  }

  return {
    kind: "cross",
    fromSide: from.planeSide,
    toSide: to.planeSide,
    turnSide: event.direction
  };
}

function getUniqueTrack(
  trace: TurningTrace,
  hand: TurningHand,
  diagnostics: TurnEdgeDiagnostic[]
): TurningTrack | null {
  const matches = trace.tracks.filter((track) => track.hand === hand);
  if (matches.length === 0) {
    diagnostics.push({
      code: "TURN_HAND_TRACK_MISSING",
      hand,
      message: `Turn edge requires one ${hand}-hand track.`
    });
    return null;
  }
  if (matches.length > 1) {
    diagnostics.push({
      code: "TURN_HAND_TRACK_DUPLICATE",
      hand,
      message: `Turn edge found ${matches.length} ${hand}-hand tracks.`
    });
    return null;
  }
  return matches[0] ?? null;
}

function getUniqueNode(
  track: TurningTrack,
  hand: TurningHand,
  step: number,
  role: "source" | "target",
  diagnostics: TurnEdgeDiagnostic[]
): TurningNode | null {
  const matches = track.nodes.filter((node) => node.step === step);
  if (matches.length === 0) {
    diagnostics.push({
      code: role === "source" ? "TURN_SOURCE_NODE_MISSING" : "TURN_TARGET_NODE_MISSING",
      hand,
      message: `${hand} track has no ${role} node at t${step}.`
    });
    return null;
  }
  if (matches.length > 1) {
    diagnostics.push({
      code: role === "source" ? "TURN_SOURCE_NODE_DUPLICATE" : "TURN_TARGET_NODE_DUPLICATE",
      hand,
      message: `${hand} track has ${matches.length} ${role} nodes at t${step}.`
    });
    return null;
  }
  return matches[0] ?? null;
}

function buildHandEdge(
  trace: TurningTrace,
  event: BodyTurnEvent,
  hand: TurningHand,
  diagnostics: TurnEdgeDiagnostic[]
): TurningHandTurnEdge | null {
  const track = getUniqueTrack(trace, hand, diagnostics);
  if (!track) return null;

  const sourceStep = event.afterStep;
  const targetStep = sourceStep + 1;
  const from = getUniqueNode(track, hand, sourceStep, "source", diagnostics);
  const to = getUniqueNode(track, hand, targetStep, "target", diagnostics);
  if (!from || !to) return null;

  const expectedPhase = oppositePhase(from.phase);
  if (to.phase !== expectedPhase) {
    diagnostics.push({
      code: "TURN_PHASE_DISCONTINUITY",
      hand,
      message: `${hand} phase must advance ${from.phase} → ${expectedPhase} from t${sourceStep} to t${targetStep}.`
    });
  }

  return {
    hand,
    trackId: track.id,
    poiDirection: track.poiDirection,
    from,
    to,
    midpointPoiDirection: derivePoiMidpointHorizontalDirection(from.phase, track.poiDirection),
    sideMotion: deriveSideMotion(from, to, event)
  };
}

export function analyzeTurningTraceTurn(trace: TurningTrace, eventIndex = 0): TurnEdgeAnalysis {
  const diagnostics: TurnEdgeDiagnostic[] = [];
  const event = trace.events[eventIndex];

  if (!event) {
    return {
      contractStatus: "invalid",
      physicalStatus: "not-assessed",
      edge: null,
      diagnostics: [
        {
          code: "TURN_EVENT_MISSING",
          message: `Turning trace has no body-turn event at index ${eventIndex}.`
        }
      ]
    };
  }

  if (event.degrees !== 180) {
    diagnostics.push({
      code: "TURN_DEGREES_NOT_180",
      message: `Turning edge must rotate 180 degrees; received ${String(event.degrees)}.`
    });
  }
  if (event.fromFacing === event.toFacing) {
    diagnostics.push({
      code: "TURN_FACING_NOT_FLIPPED",
      message: `Turning edge must change facing; both endpoints are ${event.fromFacing} degrees.`
    });
  }

  const left = buildHandEdge(trace, event, "left", diagnostics);
  const right = buildHandEdge(trace, event, "right", diagnostics);
  const contractStatus = diagnostics.length === 0 ? "valid" : "invalid";

  if (contractStatus === "invalid" || !left || !right) {
    return {
      contractStatus,
      physicalStatus: "not-assessed",
      edge: null,
      diagnostics
    };
  }

  const hands = { left, right } as const;
  const edge: SharedTurningEdge = {
    event,
    sourceStep: event.afterStep,
    targetStep: event.afterStep + 1,
    hands,
    crossingCount: Object.values(hands).filter((handEdge) => handEdge.sideMotion.kind === "cross")
      .length
  };

  return {
    contractStatus,
    physicalStatus: trace.verificationStatus === "physically-verified" ? "verified" : "unresolved",
    edge,
    diagnostics
  };
}
