import { evalSegment } from "@/engine/engine";
import { isPlaneSide } from "@/engine/planeSide";
import type {
  PlaneId,
  PlaneSide,
  RelativeRigPose,
  Segment,
  SequenceSpec,
  TimeUnit
} from "@/engine/types";

const DEFAULT_PLANE_ID: PlaneId = "wall";
const PLANE_IDS = new Set<PlaneId>(["wall", "wheel", "floor"]);

type UnknownDriver = { kind?: unknown };

export type SequenceValidationErrorCode =
  | "EMPTY_SEQUENCE"
  | "INVALID_DURATION_UNITS"
  | "NON_POSITIVE_DURATION"
  | "INVALID_PLANE_ID"
  | "INVALID_PLANE_SIDE"
  | "INVALID_DRIVER"
  | "DRIVER_UNSUPPORTED_FOR_NODE";

export type SequenceValidationError = {
  code: SequenceValidationErrorCode;
  index?: number;
  node?: "hand" | "head";
};
export type SequenceValidationResult =
  | { ok: true }
  | { ok: false; errors: SequenceValidationError[] };

export type PreparedSegment = Omit<Segment, "planeId"> & {
  readonly planeId: PlaneId;
  readonly startUnit: TimeUnit;
  readonly endUnit: TimeUnit;
};

export type PreparedSequence = {
  readonly segments: readonly PreparedSegment[];
  readonly totalDuration: TimeUnit;
};

export type PrepareSequenceResult =
  | { ok: true; prepared: PreparedSequence }
  | { ok: false; errors: SequenceValidationError[] };

export type EvalPreparedAtResult =
  | {
      ok: true;
      pose: RelativeRigPose;
      planeId: PlaneId;
      planeSide?: PlaneSide;
      behindBody?: boolean;
      segmentIndex: number;
      tLocal: TimeUnit;
    }
  | { ok: false; reason: "INVALID_TIME" | "NEGATIVE_TIME" };

function wrapSequenceTime(totalDuration: TimeUnit, tGlobal: TimeUnit): TimeUnit {
  return tGlobal % totalDuration;
}

function validateDriverShape(
  driver: UnknownDriver,
  node: "hand" | "head",
  index: number,
  errors: SequenceValidationError[]
): void {
  switch (driver.kind) {
    case "circle":
      return;
    case "point-to-point":
      if (node === "head") {
        errors.push({ code: "DRIVER_UNSUPPORTED_FOR_NODE", index, node });
      }
      return;
    case "runtime": {
      const runtimeDriver = driver as UnknownDriver & { label?: unknown; evalPose?: unknown };
      if (typeof runtimeDriver.label !== "string" || runtimeDriver.label.trim() === "") {
        errors.push({ code: "INVALID_DRIVER", index, node });
        return;
      }

      if (typeof runtimeDriver.evalPose !== "function") {
        errors.push({ code: "INVALID_DRIVER", index, node });
      }
      return;
    }
    default:
      errors.push({ code: "INVALID_DRIVER", index, node });
  }
}

export function validateSequenceStructure(sequence: SequenceSpec): SequenceValidationResult {
  const errors: SequenceValidationError[] = [];
  if (sequence.segments.length === 0) {
    errors.push({ code: "EMPTY_SEQUENCE" });
  }

  sequence.segments.forEach((segment, index) => {
    const duration = segment.durationUnits;

    if (!Number.isFinite(duration)) {
      errors.push({ code: "INVALID_DURATION_UNITS", index });
      return;
    }

    if (duration <= 0) {
      errors.push({ code: "NON_POSITIVE_DURATION", index });
    }

    if (segment.planeId !== undefined && !PLANE_IDS.has(segment.planeId)) {
      errors.push({ code: "INVALID_PLANE_ID", index });
    }

    if (segment.planeSide !== undefined && !isPlaneSide(segment.planeSide)) {
      errors.push({ code: "INVALID_PLANE_SIDE", index });
    }

    validateDriverShape(segment.hand.driver as UnknownDriver, "hand", index, errors);
    validateDriverShape(segment.head.driver as UnknownDriver, "head", index, errors);
  });

  return errors.length > 0 ? { ok: false, errors } : { ok: true };
}

export function prepareSequence(sequence: SequenceSpec): PrepareSequenceResult {
  const validateResult = validateSequenceStructure(sequence);
  if (!validateResult.ok) return validateResult;

  const segments: PreparedSegment[] = [];
  let cursor: TimeUnit = 0;
  for (const segment of sequence.segments) {
    const startUnit = cursor;
    const endUnit = startUnit + segment.durationUnits;
    const { planeId, planeSide, behindBody, ...segmentMotion } = segment;

    segments.push({
      ...segmentMotion,
      planeId: planeId ?? DEFAULT_PLANE_ID,
      ...(planeSide !== undefined ? { planeSide } : {}),
      ...(behindBody !== undefined ? { behindBody } : {}),
      startUnit,
      endUnit
    });
    cursor = endUnit;
  }

  return {
    ok: true,
    prepared: {
      segments,
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

  for (const [index, segment] of sequence.segments.entries()) {
    if (!(segment.startUnit <= wrappedTime && wrappedTime < segment.endUnit)) continue;
    const tLocal = wrappedTime - segment.startUnit;
    const pose = evalSegment(segment, tLocal);

    return {
      ok: true,
      pose,
      planeId: segment.planeId,
      ...(segment.planeSide !== undefined ? { planeSide: segment.planeSide } : {}),
      ...(segment.behindBody !== undefined ? { behindBody: segment.behindBody } : {}),
      tLocal,
      segmentIndex: index
    };
  }

  throw new Error("Invariant violated: no segment found for wrapped global time");
}

export function samplePreparedSequence(
  sequence: PreparedSequence,
  times: readonly TimeUnit[]
): EvalPreparedAtResult[] {
  return times.map((t) => evalPreparedSequenceAt(sequence, t));
}
