import { evalSegment } from "@/engine/engine";
import { deepFreeze } from "@/engine/immutable";
import { isPlaneSide } from "@/engine/planeSide";
import type {
  CircleDriver,
  Driver,
  HandSegmentNodeMotion,
  HeadSegmentNodeMotion,
  PlaneId,
  PlaneSide,
  RadiusProfile,
  RelativeNodePose,
  RelativeRigPose,
  RuntimeDriver,
  Segment,
  SequenceSpec,
  TimeUnit
} from "@/engine/types";

const DEFAULT_PLANE_ID: PlaneId = "wall";
const PLANE_IDS = new Set<PlaneId>(["wall", "wheel", "floor"]);

type ErrorPath = readonly (string | number)[];
type RigNode = "hand" | "head";

export type SequenceValidationErrorCode =
  | "EXPECTED_SEQUENCE"
  | "EXPECTED_SEGMENTS_ARRAY"
  | "EXPECTED_SEGMENT"
  | "EXPECTED_NODE_MOTION"
  | "EXPECTED_POSE"
  | "EMPTY_SEQUENCE"
  | "INVALID_DURATION_UNITS"
  | "NON_POSITIVE_DURATION"
  | "NON_FINITE_PHASE"
  | "NON_FINITE_RADIUS"
  | "NEGATIVE_RADIUS"
  | "NON_FINITE_OMEGA"
  | "CIRCLE_PHASE_RANGE_OVERFLOW"
  | "INVALID_RADIUS_PROFILE"
  | "NON_FINITE_PROFILE_TIME"
  | "PROFILE_TIME_OUT_OF_RANGE"
  | "NON_INCREASING_PROFILE_TIME"
  | "NON_FINITE_PROFILE_RADIUS"
  | "NEGATIVE_PROFILE_RADIUS"
  | "NON_FINITE_TOTAL_DURATION"
  | "NON_ADVANCING_INTERVAL"
  | "INVALID_PLANE_ID"
  | "INVALID_PLANE_SIDE"
  | "INVALID_BEHIND_BODY"
  | "INVALID_DRIVER"
  | "DRIVER_UNSUPPORTED_FOR_NODE";

export type SequenceValidationError = {
  code: SequenceValidationErrorCode;
  index?: number;
  node?: RigNode;
  keyIndex?: number;
  path?: ErrorPath;
};

export type SequenceValidationResult =
  | { ok: true }
  | { ok: false; errors: SequenceValidationError[] };

export type PreparedSegment = Readonly<Omit<Segment, "planeId">> & {
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

type DecodeSequenceResult =
  | { ok: true; sequence: SequenceSpec }
  | { ok: false; errors: SequenceValidationError[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function decodePose(
  value: unknown,
  index: number,
  node: RigNode,
  path: ErrorPath,
  errors: SequenceValidationError[]
): RelativeNodePose | null {
  if (!isRecord(value)) {
    errors.push({ code: "EXPECTED_POSE", index, node, path });
    return null;
  }

  const phaseAbs = value.phaseAbs;
  const radius = value.radius;
  let valid = true;

  if (typeof phaseAbs !== "number" || !Number.isFinite(phaseAbs)) {
    errors.push({ code: "NON_FINITE_PHASE", index, node });
    valid = false;
  }

  if (typeof radius !== "number" || !Number.isFinite(radius)) {
    errors.push({ code: "NON_FINITE_RADIUS", index, node });
    valid = false;
  } else if (radius < 0) {
    errors.push({ code: "NEGATIVE_RADIUS", index, node });
    valid = false;
  }

  if (!valid) return null;
  return { phaseAbs: phaseAbs as number, radius: radius as number };
}

function decodeRadiusProfile(
  value: unknown,
  durationUnits: number | null,
  index: number,
  node: RigNode,
  path: ErrorPath,
  errors: SequenceValidationError[]
): RadiusProfile | null {
  if (!isRecord(value) || value.kind !== "time-keyed" || !Array.isArray(value.keys)) {
    errors.push({ code: "INVALID_RADIUS_PROFILE", index, node, path });
    return null;
  }

  const keys: RadiusProfile["keys"] = [];
  let previousT = 0;
  let valid = true;

  value.keys.forEach((key, keyIndex) => {
    if (!isRecord(key)) {
      errors.push({
        code: "INVALID_RADIUS_PROFILE",
        index,
        node,
        keyIndex,
        path: [...path, "keys", keyIndex]
      });
      valid = false;
      return;
    }

    const t = key.t;
    const radius = key.radius;
    let keyValid = true;

    if (typeof t !== "number" || !Number.isFinite(t)) {
      errors.push({ code: "NON_FINITE_PROFILE_TIME", index, node, keyIndex });
      keyValid = false;
    } else {
      if (durationUnits !== null && (t <= 0 || t > durationUnits)) {
        errors.push({ code: "PROFILE_TIME_OUT_OF_RANGE", index, node, keyIndex });
        keyValid = false;
      }
      if (t <= previousT) {
        errors.push({ code: "NON_INCREASING_PROFILE_TIME", index, node, keyIndex });
        keyValid = false;
      }
      previousT = t;
    }

    if (typeof radius !== "number" || !Number.isFinite(radius)) {
      errors.push({ code: "NON_FINITE_PROFILE_RADIUS", index, node, keyIndex });
      keyValid = false;
    } else if (radius < 0) {
      errors.push({ code: "NEGATIVE_PROFILE_RADIUS", index, node, keyIndex });
      keyValid = false;
    }

    if (keyValid) {
      keys.push({ t: t as number, radius: radius as number });
    } else {
      valid = false;
    }
  });

  return valid ? { kind: "time-keyed", keys } : null;
}

function decodeDriver(
  value: unknown,
  startPose: RelativeNodePose | null,
  durationUnits: number | null,
  index: number,
  node: RigNode,
  path: ErrorPath,
  errors: SequenceValidationError[]
): Driver | null {
  if (!isRecord(value)) {
    errors.push({ code: "INVALID_DRIVER", index, node, path });
    return null;
  }

  switch (value.kind) {
    case "circle": {
      const omega = value.omega;
      if (typeof omega !== "number" || !Number.isFinite(omega)) {
        errors.push({ code: "NON_FINITE_OMEGA", index, node });
        return null;
      }

      let radiusProfile: RadiusProfile | null | undefined;
      if (value.radiusProfile !== undefined) {
        radiusProfile = decodeRadiusProfile(
          value.radiusProfile,
          durationUnits,
          index,
          node,
          [...path, "radiusProfile"],
          errors
        );
      }

      if (
        startPose !== null &&
        durationUnits !== null &&
        !Number.isFinite(startPose.phaseAbs + omega * durationUnits)
      ) {
        errors.push({ code: "CIRCLE_PHASE_RANGE_OVERFLOW", index, node });
      }

      const driver: CircleDriver = {
        kind: "circle",
        omega,
        ...(radiusProfile ? { radiusProfile } : {})
      };
      return radiusProfile === null ? null : driver;
    }
    case "point-to-point": {
      if (node === "head") {
        errors.push({ code: "DRIVER_UNSUPPORTED_FOR_NODE", index, node });
      }

      const endPose = decodePose(value.endPose, index, node, [...path, "endPose"], errors);
      return endPose === null ? null : { kind: "point-to-point", endPose };
    }
    case "runtime": {
      if (
        typeof value.label !== "string" ||
        value.label.trim() === "" ||
        typeof value.evalPose !== "function"
      ) {
        errors.push({ code: "INVALID_DRIVER", index, node });
        return null;
      }

      return {
        kind: "runtime",
        label: value.label,
        evalPose: value.evalPose as RuntimeDriver["evalPose"]
      };
    }
    default:
      errors.push({ code: "INVALID_DRIVER", index, node });
      return null;
  }
}

function decodeNodeMotion(
  value: unknown,
  durationUnits: number | null,
  index: number,
  node: RigNode,
  errors: SequenceValidationError[]
): HandSegmentNodeMotion | HeadSegmentNodeMotion | null {
  const nodePath: ErrorPath = ["segments", index, node];
  if (!isRecord(value)) {
    errors.push({ code: "EXPECTED_NODE_MOTION", index, node, path: nodePath });
    return null;
  }

  const startPose = decodePose(value.startPose, index, node, [...nodePath, "startPose"], errors);
  const driver = decodeDriver(
    value.driver,
    startPose,
    durationUnits,
    index,
    node,
    [...nodePath, "driver"],
    errors
  );

  if (startPose === null || driver === null) return null;
  if (node === "head" && driver.kind === "point-to-point") return null;
  return { startPose, driver } as HandSegmentNodeMotion | HeadSegmentNodeMotion;
}

function decodeSequence(input: unknown): DecodeSequenceResult {
  const errors: SequenceValidationError[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: [{ code: "EXPECTED_SEQUENCE", path: [] }] };
  }

  if (!Array.isArray(input.segments)) {
    return {
      ok: false,
      errors: [{ code: "EXPECTED_SEGMENTS_ARRAY", path: ["segments"] }]
    };
  }

  if (input.segments.length === 0) {
    errors.push({ code: "EMPTY_SEQUENCE" });
  }

  const segments: Segment[] = [];
  const durations: Array<number | null> = [];

  input.segments.forEach((value, index) => {
    if (!isRecord(value)) {
      errors.push({ code: "EXPECTED_SEGMENT", index, path: ["segments", index] });
      durations.push(null);
      return;
    }

    const duration = value.durationUnits;
    let durationUnits: number | null = null;
    if (typeof duration !== "number" || !Number.isFinite(duration)) {
      errors.push({ code: "INVALID_DURATION_UNITS", index });
    } else if (duration <= 0) {
      errors.push({ code: "NON_POSITIVE_DURATION", index });
    } else {
      durationUnits = duration;
    }
    durations.push(durationUnits);

    let planeId: PlaneId | undefined;
    if (value.planeId !== undefined) {
      if (typeof value.planeId !== "string" || !PLANE_IDS.has(value.planeId as PlaneId)) {
        errors.push({ code: "INVALID_PLANE_ID", index });
      } else {
        planeId = value.planeId as PlaneId;
      }
    }

    let planeSide: PlaneSide | undefined;
    if (value.planeSide !== undefined) {
      if (!isPlaneSide(value.planeSide)) {
        errors.push({ code: "INVALID_PLANE_SIDE", index });
      } else {
        planeSide = value.planeSide;
      }
    }

    let behindBody: boolean | undefined;
    if (value.behindBody !== undefined) {
      if (typeof value.behindBody !== "boolean") {
        errors.push({ code: "INVALID_BEHIND_BODY", index });
      } else {
        behindBody = value.behindBody;
      }
    }

    const hand = decodeNodeMotion(value.hand, durationUnits, index, "hand", errors);
    const head = decodeNodeMotion(value.head, durationUnits, index, "head", errors);

    if (durationUnits !== null && hand !== null && head !== null) {
      segments.push({
        durationUnits,
        ...(planeId !== undefined ? { planeId } : {}),
        ...(planeSide !== undefined ? { planeSide } : {}),
        ...(behindBody !== undefined ? { behindBody } : {}),
        hand: hand as HandSegmentNodeMotion,
        head: head as HeadSegmentNodeMotion
      });
    }
  });

  let cursor = 0;
  for (const [index, duration] of durations.entries()) {
    if (duration === null) break;
    const endUnit = cursor + duration;
    if (!Number.isFinite(endUnit)) {
      errors.push({ code: "NON_FINITE_TOTAL_DURATION", index });
      break;
    }
    if (endUnit <= cursor) {
      errors.push({ code: "NON_ADVANCING_INTERVAL", index });
      break;
    }
    cursor = endUnit;
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, sequence: { segments } };
}

function wrapSequenceTime(totalDuration: TimeUnit, tGlobal: TimeUnit): TimeUnit {
  return tGlobal === 0 ? 0 : tGlobal % totalDuration;
}

export function validateSequenceStructure(sequence: unknown): SequenceValidationResult {
  const result = decodeSequence(sequence);
  return result.ok ? { ok: true } : result;
}

export function prepareSequence(input: unknown): PrepareSequenceResult {
  const decoded = decodeSequence(input);
  if (!decoded.ok) return decoded;

  const segments: PreparedSegment[] = [];
  let cursor: TimeUnit = 0;
  for (const segment of decoded.sequence.segments) {
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
    prepared: deepFreeze({
      segments,
      totalDuration: cursor
    })
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
