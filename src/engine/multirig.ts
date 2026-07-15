import { deepFreeze } from "@/engine/immutable";
import {
  evalPreparedSequenceAt,
  prepareSequence,
  type EvalPreparedAtResult,
  type PreparedSequence,
  type SequenceValidationError
} from "@/engine/sequence";
import type { MultiRigPose, PlaneId, PlaneSide, RigId, TimeUnit } from "@/engine/types";

export type MultiRigSequenceValidationErrorCode =
  | "EXPECTED_MULTI_RIG_SEQUENCE"
  | "EXPECTED_RIGS_ARRAY"
  | "EXPECTED_RIG_ENTRY"
  | "INVALID_RIG_ID_TYPE"
  | "EMPTY_MULTI_RIG_SEQUENCE"
  | "DUPLICATE_RIG_ID"
  | "INVALID_RIG_SEQUENCE";

export type MultiRigSequenceValidationError = {
  code: MultiRigSequenceValidationErrorCode;
  index?: number;
  rigId?: RigId;
  errors?: SequenceValidationError[];
  path?: readonly (string | number)[];
};

export type PrepareMultiRigSequenceResult =
  | { ok: true; prepared: PreparedMultiRigSequence }
  | { ok: false; errors: MultiRigSequenceValidationError[] };

export type EvalMultiRigAtResult =
  | {
      ok: true;
      poses: EvaluatedMultiRigPose;
    }
  | { ok: false; reason: "INVALID_TIME" | "NEGATIVE_TIME" };

export type EvaluatedMultiRigPose = Record<
  RigId,
  {
    pose: MultiRigPose[RigId];
    planeId: PlaneId;
    planeSide?: PlaneSide;
    behindBody?: boolean;
    segmentIndex: number;
    tLocal: TimeUnit;
  }
>;

export interface PreparedRigSequenceEntry {
  readonly rigId: RigId;
  readonly prepared: PreparedSequence;
}

export interface PreparedMultiRigSequence {
  readonly rigs: readonly PreparedRigSequenceEntry[];
  readonly maxSequenceDuration: TimeUnit;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

export function prepareMultiRigSequence(input: unknown): PrepareMultiRigSequenceResult {
  const errors: MultiRigSequenceValidationError[] = [];

  if (!isRecord(input)) {
    return {
      ok: false,
      errors: [{ code: "EXPECTED_MULTI_RIG_SEQUENCE", path: [] }]
    };
  }

  if (!Array.isArray(input.rigs)) {
    return {
      ok: false,
      errors: [{ code: "EXPECTED_RIGS_ARRAY", path: ["rigs"] }]
    };
  }

  if (input.rigs.length === 0) {
    errors.push({ code: "EMPTY_MULTI_RIG_SEQUENCE" });
  }

  const seenRigIds = new Set<RigId>();
  const preparedRigs: PreparedRigSequenceEntry[] = [];

  input.rigs.forEach((value, index) => {
    if (!isRecord(value)) {
      errors.push({ code: "EXPECTED_RIG_ENTRY", index, path: ["rigs", index] });
      return;
    }

    if (typeof value.rigId !== "string") {
      errors.push({ code: "INVALID_RIG_ID_TYPE", index, path: ["rigs", index, "rigId"] });
      return;
    }

    const rigId = value.rigId;
    if (seenRigIds.has(rigId)) {
      errors.push({ code: "DUPLICATE_RIG_ID", index, rigId });
      return;
    }

    seenRigIds.add(rigId);

    const preparedResult = prepareSequence(value.sequence);
    if (!preparedResult.ok) {
      errors.push({
        code: "INVALID_RIG_SEQUENCE",
        index,
        rigId,
        errors: preparedResult.errors
      });
      return;
    }

    preparedRigs.push({ rigId, prepared: preparedResult.prepared });
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const maxSequenceDuration = preparedRigs.reduce(
    (maxDuration, rig) => Math.max(maxDuration, rig.prepared.totalDuration),
    0
  );

  return {
    ok: true,
    prepared: deepFreeze({
      rigs: preparedRigs,
      maxSequenceDuration
    })
  };
}

export function evalPreparedMultiRigSequenceAt(
  prepared: PreparedMultiRigSequence,
  t: TimeUnit
): EvalMultiRigAtResult {
  if (!Number.isFinite(t)) return { ok: false, reason: "INVALID_TIME" };
  if (t < 0) return { ok: false, reason: "NEGATIVE_TIME" };

  const entries: Array<[RigId, EvaluatedMultiRigPose[RigId]]> = [];

  for (const rig of prepared.rigs) {
    const result: EvalPreparedAtResult = evalPreparedSequenceAt(rig.prepared, t);
    if (!result.ok) {
      return result;
    }

    entries.push([
      rig.rigId,
      {
        pose: result.pose,
        planeId: result.planeId,
        ...(result.planeSide !== undefined ? { planeSide: result.planeSide } : {}),
        ...(result.behindBody !== undefined ? { behindBody: result.behindBody } : {}),
        segmentIndex: result.segmentIndex,
        tLocal: result.tLocal
      }
    ]);
  }

  return { ok: true, poses: Object.fromEntries(entries) };
}

export function samplePreparedMultiRigSequence(
  sequence: PreparedMultiRigSequence,
  times: readonly TimeUnit[]
): EvalMultiRigAtResult[] {
  return times.map((t) => evalPreparedMultiRigSequenceAt(sequence, t));
}
