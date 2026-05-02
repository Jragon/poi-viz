import { evalSegment } from "@/engine/engine";
import type {
  PlaneId,
  RelativeRigPose,
  SegmentPlacement,
  SequenceSpec,
  TimeUnit
} from "@/engine/types";

const DEFAULT_PLANE_ID: PlaneId = "wall";
const PLANE_IDS = new Set<PlaneId>(["wall", "wheel", "floor"]);

export type SequenceValidationErrorCode =
  | "EMPTY_SEQUENCE"
  | "INVALID_DURATION_UNITS"
  | "NON_POSITIVE_DURATION"
  | "INVALID_PLANE_ID";

export type SequenceValidationError = {
  code: SequenceValidationErrorCode;
  index?: number;
};
export type SequenceValidationResult =
  | { ok: true }
  | { ok: false; errors: SequenceValidationError[] };

export type PreparedPlacement = SegmentPlacement & {
  readonly planeId: PlaneId;
  readonly startUnit: TimeUnit;
  readonly endUnit: TimeUnit;
};

export type PreparedSequence = {
  readonly placements: readonly PreparedPlacement[];
  readonly totalDuration: TimeUnit;
};

export type PrepareSequenceResult =
  | { ok: true; prepared: PreparedSequence }
  | { ok: false; errors: SequenceValidationError[] };

export type EvalPreparedAtResult =
  | { ok: true; pose: RelativeRigPose; planeId: PlaneId; segmentIndex: number; tLocal: TimeUnit }
  | { ok: false; reason: "INVALID_TIME" | "NEGATIVE_TIME" };

function wrapSequenceTime(totalDuration: TimeUnit, tGlobal: TimeUnit): TimeUnit {
  return tGlobal % totalDuration;
}

export function validateSequenceStructure(sequence: SequenceSpec): SequenceValidationResult {
  const errors: SequenceValidationError[] = [];
  if (sequence.segments.length === 0) {
    errors.push({ code: "EMPTY_SEQUENCE" });
  }

  sequence.segments.forEach((placement, index) => {
    const duration = placement.durationUnits;

    if (!Number.isFinite(duration)) {
      errors.push({ code: "INVALID_DURATION_UNITS", index });
      return;
    }

    if (duration <= 0) {
      errors.push({ code: "NON_POSITIVE_DURATION", index });
    }

    if (placement.planeId !== undefined && !PLANE_IDS.has(placement.planeId)) {
      errors.push({ code: "INVALID_PLANE_ID", index });
    }
  });

  return errors.length > 0 ? { ok: false, errors } : { ok: true };
}

export function prepareSequence(sequence: SequenceSpec): PrepareSequenceResult {
  const validateResult = validateSequenceStructure(sequence);
  if (!validateResult.ok) return validateResult;

  const placements: PreparedPlacement[] = [];
  let cursor: TimeUnit = 0;
  for (const placement of sequence.segments) {
    const startUnit = cursor;
    const endUnit = startUnit + placement.durationUnits;

    placements.push({
      ...placement,
      planeId: placement.planeId ?? DEFAULT_PLANE_ID,
      startUnit,
      endUnit
    });
    cursor = endUnit;
  }

  return {
    ok: true,
    prepared: {
      placements,
      totalDuration: cursor
    }
  };
}

export function evalPreparedSequenceAt(
  sequence: PreparedSequence,
  tGlobal: TimeUnit
): EvalPreparedAtResult {
  if (!Number.isFinite(tGlobal)) return { ok: false, reason: "INVALID_TIME" };
  if (tGlobal < 0) return { ok: false, reason: "NEGATIVE_TIME" };

  const wrappedTime = wrapSequenceTime(sequence.totalDuration, tGlobal);

  for (const [index, placement] of sequence.placements.entries()) {
    if (!(placement.startUnit <= wrappedTime && wrappedTime < placement.endUnit)) continue;
    const tLocal = wrappedTime - placement.startUnit;
    const pose = evalSegment(placement.segment, tLocal);

    return { ok: true, pose, planeId: placement.planeId, tLocal, segmentIndex: index };
  }

  throw new Error("Invariant violated: no placement found for wrapped global time");
}

export function samplePreparedSequence(
  sequence: PreparedSequence,
  times: readonly TimeUnit[]
): EvalPreparedAtResult[] {
  return times.map((t) => evalPreparedSequenceAt(sequence, t));
}
