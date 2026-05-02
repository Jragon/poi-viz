import {
  evalPreparedSequenceAt,
  prepareSequence,
  type EvalPreparedAtResult,
  type PreparedSequence,
  type SequenceValidationError
} from "@/engine/sequence";
import type { MultiRigPose, MultiRigSequence, PlaneId, RigId, TimeUnit } from "@/engine/types";

export type MultiRigSequenceValidationErrorCode =
  | "EMPTY_MULTI_RIG_SEQUENCE"
  | "DUPLICATE_RIG_ID"
  | "INVALID_RIG_SEQUENCE";

export type MultiRigSequenceValidationError = {
  code: MultiRigSequenceValidationErrorCode;
  index?: number;
  rigId?: RigId;
  errors?: SequenceValidationError[];
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
  { pose: MultiRigPose[RigId]; planeId: PlaneId; segmentIndex: number; tLocal: TimeUnit }
>;

export interface PreparedRigSequenceEntry {
  rigId: RigId;
  prepared: PreparedSequence;
}

export interface PreparedMultiRigSequence {
  rigs: PreparedRigSequenceEntry[];
  maxSequenceDuration: TimeUnit;
}

export function prepareMultiRigSequence(input: MultiRigSequence): PrepareMultiRigSequenceResult {
  const errors: MultiRigSequenceValidationError[] = [];

  if (input.rigs.length === 0) {
    errors.push({ code: "EMPTY_MULTI_RIG_SEQUENCE" });
  }

  const seenRigIds = new Set<RigId>();
  const preparedRigs: PreparedRigSequenceEntry[] = [];

  input.rigs.forEach((rig, index) => {
    if (seenRigIds.has(rig.rigId)) {
      errors.push({ code: "DUPLICATE_RIG_ID", index, rigId: rig.rigId });
      return;
    }

    seenRigIds.add(rig.rigId);

    const preparedResult = prepareSequence(rig.sequence);
    if (!preparedResult.ok) {
      errors.push({
        code: "INVALID_RIG_SEQUENCE",
        index,
        rigId: rig.rigId,
        errors: preparedResult.errors
      });
      return;
    }

    preparedRigs.push({ rigId: rig.rigId, prepared: preparedResult.prepared });
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
    prepared: {
      rigs: preparedRigs,
      maxSequenceDuration
    }
  };
}

export function evalPreparedMultiRigSequenceAt(
  prepared: PreparedMultiRigSequence,
  t: TimeUnit
): EvalMultiRigAtResult {
  if (!Number.isFinite(t)) return { ok: false, reason: "INVALID_TIME" };
  if (t < 0) return { ok: false, reason: "NEGATIVE_TIME" };

  const poses: EvaluatedMultiRigPose = {};

  for (const rig of prepared.rigs) {
    const result: EvalPreparedAtResult = evalPreparedSequenceAt(rig.prepared, t);
    if (!result.ok) {
      return result;
    }

    poses[rig.rigId] = {
      pose: result.pose,
      planeId: result.planeId,
      segmentIndex: result.segmentIndex,
      tLocal: result.tLocal
    };
  }

  return { ok: true, poses };
}

export function samplePreparedMultiRigSequence(
  sequence: PreparedMultiRigSequence,
  times: readonly TimeUnit[]
): EvalMultiRigAtResult[] {
  return times.map((t) => evalPreparedMultiRigSequenceAt(sequence, t));
}
