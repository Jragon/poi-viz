import {
  buildTurningReelCycle,
  type TurningReelConfig,
  type TurningReelDirection,
  type TurningReelOffset
} from "@/lab/experiments/mel-turning/adapter/melBeatGraphAdapter";

const REEL_OFFSETS = [0, 1, 2, 3] as const satisfies readonly TurningReelOffset[];

export type TurningEndpointCompatibilityDiagnosticCode =
  | "TARGET_DIRECTION_MISMATCH"
  | "TARGET_TIMING_MISMATCH";

export interface TurningEndpointCompatibilityDiagnostic {
  readonly code: TurningEndpointCompatibilityDiagnosticCode;
  readonly message: string;
}

export interface TurningEndpointCompatibility {
  readonly compatible: boolean;
  readonly sourceTiming: "TO" | "SO" | "TS" | "SS";
  readonly targetTiming: "TO" | "SO" | "TS" | "SS";
  readonly sourcePatternType: "weave" | "mill";
  readonly targetPatternType: "weave" | "mill";
  readonly expectedTargetDirection: TurningReelDirection;
  readonly compatibleTargetOffsets: readonly [TurningReelOffset, TurningReelOffset];
  readonly diagnostics: readonly TurningEndpointCompatibilityDiagnostic[];
}

export interface ConstrainedTurningTarget {
  readonly target: TurningReelConfig;
  readonly sourceTiming: TurningEndpointCompatibility["sourceTiming"];
  readonly sourcePatternType: TurningEndpointCompatibility["sourcePatternType"];
  readonly targetPatternType: TurningEndpointCompatibility["targetPatternType"];
  readonly compatibleOffsets: readonly [TurningReelOffset, TurningReelOffset];
  readonly directionAdjusted: boolean;
  readonly offsetAdjusted: boolean;
}

function directionsEqual(left: TurningReelDirection, right: TurningReelDirection): boolean {
  if (left.mode !== right.mode) return false;
  if (left.mode === "same" && right.mode === "same") {
    return left.direction === right.direction;
  }
  if (left.mode === "opposite" && right.mode === "opposite") {
    return left.flow === right.flow;
  }
  return false;
}

function flipOffsetParity(offset: TurningReelOffset): TurningReelOffset {
  return (offset % 2 === 0 ? offset + 1 : offset - 1) as TurningReelOffset;
}

export function getObserverPreservingTargetDirection(
  source: TurningReelDirection
): TurningReelDirection {
  if (source.mode === "same") {
    return {
      mode: "same",
      direction: source.direction === "clockwise" ? "counterclockwise" : "clockwise"
    };
  }

  return {
    mode: "opposite",
    flow: source.flow === "inwards" ? "outwards" : "inwards"
  };
}

export function getCompatibleTargetOffsets(
  source: TurningReelConfig,
  targetPositions: Pick<TurningReelConfig, "left" | "right">
): readonly [TurningReelOffset, TurningReelOffset] {
  const sourcePatternType = buildTurningReelCycle(source).patternType;
  const targetPatternType = buildTurningReelCycle({
    ...targetPositions,
    direction: getObserverPreservingTargetDirection(source.direction),
    offset: source.offset
  }).patternType;
  const requiredParity =
    sourcePatternType === targetPatternType ? source.offset % 2 : (source.offset + 1) % 2;
  const matching = REEL_OFFSETS.filter((offset) => offset % 2 === requiredParity);

  if (matching.length !== 2) {
    throw new Error(`Expected two compatible target offsets, received ${matching.length}.`);
  }

  return [matching[0]!, matching[1]!];
}

export function getTurningEndpointCompatibility(
  source: TurningReelConfig,
  target: TurningReelConfig
): TurningEndpointCompatibility {
  const sourceCycle = buildTurningReelCycle(source);
  const targetCycle = buildTurningReelCycle(target);
  const expectedTargetDirection = getObserverPreservingTargetDirection(source.direction);
  const compatibleTargetOffsets = getCompatibleTargetOffsets(source, target);
  const diagnostics: TurningEndpointCompatibilityDiagnostic[] = [];

  if (!directionsEqual(target.direction, expectedTargetDirection)) {
    diagnostics.push({
      code: "TARGET_DIRECTION_MISMATCH",
      message:
        "Target poi direction must be the performer-frame inverse of the source direction through a 180-degree turn."
    });
  }

  if (targetCycle.timing !== sourceCycle.timing) {
    diagnostics.push({
      code: "TARGET_TIMING_MISMATCH",
      message: `Target timing ${targetCycle.timing} must match source timing ${sourceCycle.timing}; use offset ${compatibleTargetOffsets.join(" or ")} for these target positions.`
    });
  }

  return {
    compatible: diagnostics.length === 0,
    sourceTiming: sourceCycle.timing,
    targetTiming: targetCycle.timing,
    sourcePatternType: sourceCycle.patternType,
    targetPatternType: targetCycle.patternType,
    expectedTargetDirection,
    compatibleTargetOffsets,
    diagnostics
  };
}

export function constrainTurningTarget(
  source: TurningReelConfig,
  requestedTarget: TurningReelConfig
): ConstrainedTurningTarget {
  const sourceCycle = buildTurningReelCycle(source);
  const targetPatternType = buildTurningReelCycle(requestedTarget).patternType;
  const expectedTargetDirection = getObserverPreservingTargetDirection(source.direction);
  const compatibleOffsets = getCompatibleTargetOffsets(source, requestedTarget);
  const offset = compatibleOffsets.includes(requestedTarget.offset)
    ? requestedTarget.offset
    : flipOffsetParity(requestedTarget.offset);
  const target: TurningReelConfig = {
    left: requestedTarget.left,
    right: requestedTarget.right,
    direction: { ...expectedTargetDirection },
    offset
  };

  return {
    target,
    sourceTiming: sourceCycle.timing,
    sourcePatternType: sourceCycle.patternType,
    targetPatternType,
    compatibleOffsets,
    directionAdjusted: !directionsEqual(requestedTarget.direction, expectedTargetDirection),
    offsetAdjusted: requestedTarget.offset !== offset
  };
}
