import type {
  BodyFacing,
  BodyTurnDirection,
  LowReelLocation,
  TurnTopologyStatus,
  TurningDirection,
  TurningGateSide,
  TurningHand,
  TurningNode,
  TurningPhase,
  TurningRelativeCircle
} from "@/lab/experiments/mel-turning/model/turningTypes";

export type TurnTopologyDiagnosticCode =
  | "TURN_SOURCE_NODE_FACING_INVALID"
  | "TURN_TARGET_NODE_FACING_INVALID"
  | "TURN_CROSS_LOCATION_CHANGED"
  | "TURN_CROSS_GATE_MISMATCH"
  | "TURN_HOLD_LOCATION_INVALID";

export interface TurnTopologyDiagnostic {
  readonly code: TurnTopologyDiagnosticCode;
  readonly message: string;
}

export interface HandTurnTopology {
  readonly status: TurnTopologyStatus;
  readonly mechanism: "hold" | "cross";
  readonly fromLocation: LowReelLocation | null;
  readonly toLocation: LowReelLocation | null;
  readonly fromRelativeCircle: TurningRelativeCircle | null;
  readonly toRelativeCircle: TurningRelativeCircle | null;
  readonly actualGate: TurningGateSide | null;
  readonly expectedGate: TurningGateSide | null;
  readonly diagnostics: readonly TurnTopologyDiagnostic[];
}

export interface EnumeratedHandTurnTarget {
  readonly node: TurningNode;
  readonly topology: HandTurnTopology;
}

export interface EnumeratedHandTurnTargets {
  readonly targets: readonly EnumeratedHandTurnTarget[];
  readonly holdRuleStatus: "known" | "unresolved";
}

interface ValidateHandTurnTopologyInput {
  readonly hand: TurningHand;
  readonly poiDirection: TurningDirection;
  readonly from: TurningNode;
  readonly to: TurningNode;
  readonly turnDirection: BodyTurnDirection;
  readonly fromFacing: BodyFacing;
  readonly toFacing: BodyFacing;
}

const FRONT_LOCATIONS = new Set<LowReelLocation>(["C", "Lb", "Rb"]);

const nodePartsByLocation: Readonly<
  Record<
    LowReelLocation,
    Pick<TurningNode, "laneId"> & {
      readonly handPlacement: NonNullable<TurningNode["handPlacement"]>;
    }
  >
> = {
  C: { laneId: "center", handPlacement: "wall" },
  L: { laneId: "left-low", handPlacement: "wall" },
  R: { laneId: "right-low", handPlacement: "wall" },
  Cb: { laneId: "center", handPlacement: "behind-body" },
  Lb: { laneId: "left-low", handPlacement: "behind-body" },
  Rb: { laneId: "right-low", handPlacement: "behind-body" }
};

function oppositeGate(side: TurningGateSide): TurningGateSide {
  return side === "left" ? "right" : "left";
}

function aggregateStatus(
  diagnostics: readonly TurnTopologyDiagnostic[],
  unresolved: boolean
): TurnTopologyStatus {
  if (diagnostics.length > 0) return "invalid";
  return unresolved ? "unresolved" : "valid";
}

export function derivePoiMidpointHorizontalDirection(
  sourcePhase: TurningPhase,
  poiDirection: TurningDirection
): TurningGateSide {
  if (sourcePhase === "up") {
    return poiDirection === "clockwise" ? "right" : "left";
  }
  return poiDirection === "clockwise" ? "left" : "right";
}

export function getLowReelLocation(node: {
  readonly laneId: TurningNode["laneId"];
  readonly handPlacement?: TurningNode["handPlacement"];
}): LowReelLocation | null {
  const behindBody = (node.handPlacement ?? "wall") === "behind-body";
  if (node.laneId === "center") return behindBody ? "Cb" : "C";
  if (node.laneId === "left-low") return behindBody ? "Lb" : "L";
  if (node.laneId === "right-low") return behindBody ? "Rb" : "R";
  return null;
}

export function deriveLocationRelativeCircle(
  location: LowReelLocation
): TurningRelativeCircle {
  return FRONT_LOCATIONS.has(location) ? "front" : "back";
}

export function derivePlaneRelativeCircle(
  planeSide: TurningNode["planeSide"],
  facing: BodyFacing
): TurningRelativeCircle {
  const frontSide = facing === 0 ? "a" : "b";
  return planeSide === frontSide ? "front" : "back";
}

export function isLowReelNodeFacingValid(node: TurningNode, facing: BodyFacing): boolean | null {
  const location = getLowReelLocation(node);
  if (!location) return null;
  return (
    deriveLocationRelativeCircle(location) ===
    derivePlaneRelativeCircle(node.planeSide, facing)
  );
}

export function deriveExpectedTurnGate(
  relativeCircle: TurningRelativeCircle,
  turnDirection: BodyTurnDirection
): TurningGateSide {
  return relativeCircle === "front" ? turnDirection : oppositeGate(turnDirection);
}

function knownHoldTargets(
  hand: TurningHand,
  source: LowReelLocation,
  turnDirection: BodyTurnDirection
): readonly LowReelLocation[] | null {
  if (source === "C") return turnDirection === "left" ? ["R"] : ["L"];

  if (source === "L") {
    if (turnDirection === "left") return ["C"];
    return hand === "left" ? ["Rb"] : [];
  }

  if (source === "R") {
    if (turnDirection === "right") return ["C"];
    return hand === "right" ? ["Lb"] : [];
  }

  return null;
}

function oppositePhase(phase: TurningPhase): TurningPhase {
  return phase === "up" ? "down" : "up";
}

function oppositePlaneSide(
  planeSide: TurningNode["planeSide"]
): TurningNode["planeSide"] {
  return planeSide === "a" ? "b" : "a";
}

function makeTargetNode(
  source: TurningNode,
  location: LowReelLocation,
  planeSide: TurningNode["planeSide"]
): TurningNode {
  return {
    step: source.step + 1,
    ...nodePartsByLocation[location],
    planeSide,
    phase: oppositePhase(source.phase)
  };
}

export function validateHandTurnTopology(
  input: ValidateHandTurnTopologyInput
): HandTurnTopology {
  const {
    hand,
    poiDirection,
    from,
    to,
    turnDirection,
    fromFacing,
    toFacing
  } = input;
  const diagnostics: TurnTopologyDiagnostic[] = [];
  const mechanism = from.planeSide === to.planeSide ? "hold" : "cross";
  const fromLocation = getLowReelLocation(from);
  const toLocation = getLowReelLocation(to);
  const fromRelativeCircle = fromLocation
    ? deriveLocationRelativeCircle(fromLocation)
    : null;
  const toRelativeCircle = toLocation ? deriveLocationRelativeCircle(toLocation) : null;
  let unresolved = fromLocation === null || toLocation === null;

  if (fromLocation && !isLowReelNodeFacingValid(from, fromFacing)) {
    diagnostics.push({
      code: "TURN_SOURCE_NODE_FACING_INVALID",
      message: `${fromLocation} ${from.planeSide.toUpperCase()} is not valid while facing ${fromFacing} degrees.`
    });
  }
  if (toLocation && !isLowReelNodeFacingValid(to, toFacing)) {
    diagnostics.push({
      code: "TURN_TARGET_NODE_FACING_INVALID",
      message: `${toLocation} ${to.planeSide.toUpperCase()} is not valid while facing ${toFacing} degrees.`
    });
  }

  if (mechanism === "cross") {
    const actualGate = derivePoiMidpointHorizontalDirection(from.phase, poiDirection);
    const expectedGate = fromRelativeCircle
      ? deriveExpectedTurnGate(fromRelativeCircle, turnDirection)
      : null;

    if (fromLocation && toLocation && fromLocation !== toLocation) {
      diagnostics.push({
        code: "TURN_CROSS_LOCATION_CHANGED",
        message: `Low-reel turn crossing must preserve location; received ${fromLocation} → ${toLocation}.`
      });
    }
    if (expectedGate && actualGate !== expectedGate) {
      diagnostics.push({
        code: "TURN_CROSS_GATE_MISMATCH",
        message: `${fromRelativeCircle ?? "unknown"}-circle ${turnDirection} turn opens the ${expectedGate} gate, but the poi points ${actualGate}.`
      });
    }

    return {
      status: aggregateStatus(diagnostics, unresolved),
      mechanism,
      fromLocation,
      toLocation,
      fromRelativeCircle,
      toRelativeCircle,
      actualGate,
      expectedGate,
      diagnostics
    };
  }

  const allowedTargets = fromLocation
    ? knownHoldTargets(hand, fromLocation, turnDirection)
    : null;
  if (allowedTargets === null) {
    unresolved = true;
  } else if (toLocation && !allowedTargets.includes(toLocation)) {
    diagnostics.push({
      code: "TURN_HOLD_LOCATION_INVALID",
      message: `${hand}-hand ${turnDirection} hold does not allow ${fromLocation} → ${toLocation}.`
    });
  }

  return {
    status: aggregateStatus(diagnostics, unresolved),
    mechanism,
    fromLocation,
    toLocation,
    fromRelativeCircle,
    toRelativeCircle,
    actualGate: null,
    expectedGate: null,
    diagnostics
  };
}

export function enumerateHandTurnTargets(
  input: Omit<ValidateHandTurnTopologyInput, "to">
): EnumeratedHandTurnTargets {
  const sourceLocation = getLowReelLocation(input.from);
  if (!sourceLocation) {
    return { targets: [], holdRuleStatus: "unresolved" };
  }

  const candidates: TurningNode[] = [
    makeTargetNode(input.from, sourceLocation, oppositePlaneSide(input.from.planeSide))
  ];
  const holdTargets = knownHoldTargets(input.hand, sourceLocation, input.turnDirection);
  if (holdTargets) {
    candidates.push(
      ...holdTargets.map((location) =>
        makeTargetNode(input.from, location, input.from.planeSide)
      )
    );
  }

  const targets = candidates
    .map((node) => ({
      node,
      topology: validateHandTurnTopology({ ...input, to: node })
    }))
    .filter((candidate) => candidate.topology.status === "valid");

  return {
    targets,
    holdRuleStatus: holdTargets === null ? "unresolved" : "known"
  };
}
