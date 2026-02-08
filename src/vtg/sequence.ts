import { normalizeLoopBeat } from "@/state/beatMath";
import { PI } from "@/state/constants";
import {
  VTG_CANONICAL_ARM_SPEED_RADIANS_PER_BEAT,
  type VTGDescriptor,
  type VTGElement,
  type VTGPhaseDeg
} from "@/vtg/types";

export const VTG_SEQUENCE_SCHEMA = "poi-vtg-sequence";
export const VTG_SEQUENCE_SCHEMA_VERSION = 1;

export const VTG_SEQUENCE_DEFAULT_NAME = "Untitled Sequence";
export const VTG_SEQUENCE_DEFAULT_LOOP = true;
export const VTG_SEQUENCE_DEFAULT_DURATION_BEATS = 1;
export const VTG_SEQUENCE_MIN_DURATION_BEATS = 1e-6;
export const VTG_SEQUENCE_DEFAULT_SNAP_SETTING = "event" as const;
export const VTG_SEQUENCE_DEFAULT_GUIDANCE_MODE = "strict" as const;

const CARDINAL_EVENT_PHASE_SPAN_RADIANS = PI / 2;
const SNAP_ALIGNMENT_TOLERANCE = 1e-9;
const TRANSITION_ALIGNMENT_TOLERANCE = 1e-6;
const SEGMENT_ID_PREFIX = "seg";

export type VTGSequenceGuidanceMode = "strict" | "soft" | "freeform";

export type VTGSequenceSnapSetting = "event" | "none";

export type VTGTransitionClassification = "canonical" | "non-canonical";

export type VTGTransitionGuidanceSeverity = "ok" | "warning" | "error" | "none";

export interface VTGSequenceDescriptor {
  armElement: VTGElement;
  poiElement: VTGElement;
  phaseDeg: VTGPhaseDeg;
  poiHeadCyclesPerArmCycle: number;
}

export interface VTGSequenceSegment {
  id: string;
  durationBeats: number;
  descriptor: VTGSequenceDescriptor;
}

export interface VTGSequence {
  schema: typeof VTG_SEQUENCE_SCHEMA;
  version: typeof VTG_SEQUENCE_SCHEMA_VERSION;
  name: string;
  loop: boolean;
  snapSetting: VTGSequenceSnapSetting;
  guidanceMode: VTGSequenceGuidanceMode;
  segments: VTGSequenceSegment[];
}

export interface VTGSequenceValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface VTGSequenceBoundaries {
  startsBeats: number[];
  totalBeats: number;
}

export interface VTGSequencePlayheadResolution {
  sequenceBeat: number;
  segmentIndex: number;
  segmentId: string;
  localBeat: number;
  totalBeats: number;
}

export interface VTGSequenceTransitionGuidance {
  segmentId: string;
  nextSegmentId: string | null;
  classification: VTGTransitionClassification;
  severity: VTGTransitionGuidanceSeverity;
  message: string;
}

export interface VTGSequenceDeserializeResult {
  sequence: VTGSequence | null;
  error: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isVTGElement(value: unknown): value is VTGElement {
  return value === "Earth" || value === "Air" || value === "Water" || value === "Fire";
}

function isVTGPhaseDeg(value: unknown): value is VTGPhaseDeg {
  return value === 0 || value === 90 || value === 180 || value === 270;
}

function isGuidanceMode(value: unknown): value is VTGSequenceGuidanceMode {
  return value === "strict" || value === "soft" || value === "freeform";
}

function isSnapSetting(value: unknown): value is VTGSequenceSnapSetting {
  return value === "event" || value === "none";
}

function sanitizeSequenceName(name: unknown): string {
  if (!isString(name)) {
    return VTG_SEQUENCE_DEFAULT_NAME;
  }
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : VTG_SEQUENCE_DEFAULT_NAME;
}

function sanitizeSegmentId(value: unknown, index: number): string {
  if (isString(value) && value.trim().length > 0) {
    return value.trim();
  }
  return `${SEGMENT_ID_PREFIX}-${index + 1}`;
}

function sanitizeDescriptor(value: unknown): VTGSequenceDescriptor {
  const candidate = isRecord(value) ? value : {};
  const armElement = isVTGElement(candidate.armElement) ? candidate.armElement : "Earth";
  const poiElement = isVTGElement(candidate.poiElement) ? candidate.poiElement : "Earth";
  const phaseDeg = isVTGPhaseDeg(candidate.phaseDeg) ? candidate.phaseDeg : 0;
  const poiHeadCyclesPerArmCycle =
    isFiniteNumber(candidate.poiHeadCyclesPerArmCycle) && Math.abs(candidate.poiHeadCyclesPerArmCycle) > SNAP_ALIGNMENT_TOLERANCE
      ? candidate.poiHeadCyclesPerArmCycle
      : -3;

  return {
    armElement,
    poiElement,
    phaseDeg,
    poiHeadCyclesPerArmCycle
  };
}

function sanitizeDurationBeats(value: unknown): number {
  if (!isFiniteNumber(value)) {
    return VTG_SEQUENCE_DEFAULT_DURATION_BEATS;
  }
  return Math.max(value, VTG_SEQUENCE_MIN_DURATION_BEATS);
}

function sanitizeSegments(value: unknown): VTGSequenceSegment[] {
  const inputSegments = Array.isArray(value) ? value : [];
  const sanitized = inputSegments.map((segment, index) => {
    const candidate = isRecord(segment) ? segment : {};
    return {
      id: sanitizeSegmentId(candidate.id, index),
      durationBeats: sanitizeDurationBeats(candidate.durationBeats),
      descriptor: sanitizeDescriptor(candidate.descriptor)
    };
  });

  const dedupedIds = new Set<string>();
  return sanitized.map((segment, index) => {
    let nextId = segment.id;
    if (dedupedIds.has(nextId)) {
      nextId = `${segment.id}-${index + 1}`;
    }
    dedupedIds.add(nextId);
    return {
      ...segment,
      id: nextId
    };
  });
}

/**
 * Creates a deterministic default VTG sequence value.
 *
 * @returns Default empty sequence with current schema/version metadata.
 */
export function createDefaultVTGSequence(): VTGSequence {
  return {
    schema: VTG_SEQUENCE_SCHEMA,
    version: VTG_SEQUENCE_SCHEMA_VERSION,
    name: VTG_SEQUENCE_DEFAULT_NAME,
    loop: VTG_SEQUENCE_DEFAULT_LOOP,
    snapSetting: VTG_SEQUENCE_DEFAULT_SNAP_SETTING,
    guidanceMode: VTG_SEQUENCE_DEFAULT_GUIDANCE_MODE,
    segments: []
  };
}

/**
 * Sanitizes unknown input into a valid sequence object with schema defaults.
 *
 * @param input Unknown candidate value.
 * @returns Sanitized sequence object guaranteed to match current schema shape.
 */
export function sanitizeVTGSequence(input: unknown): VTGSequence {
  const candidate = isRecord(input) ? input : {};

  return {
    schema: VTG_SEQUENCE_SCHEMA,
    version: VTG_SEQUENCE_SCHEMA_VERSION,
    name: sanitizeSequenceName(candidate.name),
    loop: isBoolean(candidate.loop) ? candidate.loop : VTG_SEQUENCE_DEFAULT_LOOP,
    snapSetting: isSnapSetting(candidate.snapSetting) ? candidate.snapSetting : VTG_SEQUENCE_DEFAULT_SNAP_SETTING,
    guidanceMode: isGuidanceMode(candidate.guidanceMode) ? candidate.guidanceMode : VTG_SEQUENCE_DEFAULT_GUIDANCE_MODE,
    segments: sanitizeSegments(candidate.segments)
  };
}

/**
 * Validates sequence invariants without mutating the input.
 *
 * @param sequence Sequence candidate to validate.
 * @returns Validation result with `isValid` and descriptive error list.
 */
export function validateVTGSequence(sequence: VTGSequence): VTGSequenceValidationResult {
  const errors: string[] = [];

  if (sequence.schema !== VTG_SEQUENCE_SCHEMA) {
    errors.push(`Unsupported sequence schema: ${sequence.schema}`);
  }
  if (sequence.version !== VTG_SEQUENCE_SCHEMA_VERSION) {
    errors.push(`Unsupported sequence version: ${sequence.version}`);
  }
  if (sequence.name.trim().length === 0) {
    errors.push("Sequence name must be non-empty.");
  }

  const seenIds = new Set<string>();
  for (let index = 0; index < sequence.segments.length; index += 1) {
    const segment = sequence.segments[index];
    if (!segment) {
      continue;
    }

    if (segment.id.trim().length === 0) {
      errors.push(`Segment ${index + 1} must include an id.`);
    } else if (seenIds.has(segment.id)) {
      errors.push(`Segment id must be unique: ${segment.id}`);
    } else {
      seenIds.add(segment.id);
    }

    if (!Number.isFinite(segment.durationBeats) || segment.durationBeats <= VTG_SEQUENCE_MIN_DURATION_BEATS) {
      errors.push(`Segment ${segment.id} duration must be > ${VTG_SEQUENCE_MIN_DURATION_BEATS}.`);
    }

    const headCycles = segment.descriptor.poiHeadCyclesPerArmCycle;
    if (!Number.isFinite(headCycles) || Math.abs(headCycles) <= SNAP_ALIGNMENT_TOLERANCE) {
      errors.push(`Segment ${segment.id} descriptor.poiHeadCyclesPerArmCycle must be finite and non-zero.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Maps sequence descriptor shape to VTG generator descriptor shape.
 *
 * @param descriptor Sequence descriptor input.
 * @returns VTG descriptor compatible with `generateVTGState`.
 */
export function toVTGDescriptor(descriptor: VTGSequenceDescriptor): VTGDescriptor {
  return {
    armElement: descriptor.armElement,
    poiElement: descriptor.poiElement,
    phaseDeg: descriptor.phaseDeg,
    poiHeadCyclesPerArmCycle: descriptor.poiHeadCyclesPerArmCycle
  };
}

/**
 * Computes beats between arm-phase cardinal events from arm angular speed.
 *
 * @param armSpeedRadiansPerBeat Arm angular speed in radians per beat.
 * @returns Beat interval between consecutive arm-phase cardinal events.
 */
export function getArmPhaseEventSpacingBeats(armSpeedRadiansPerBeat = VTG_CANONICAL_ARM_SPEED_RADIANS_PER_BEAT): number {
  const absSpeed = Math.abs(armSpeedRadiansPerBeat);
  if (absSpeed <= SNAP_ALIGNMENT_TOLERANCE) {
    return VTG_SEQUENCE_DEFAULT_DURATION_BEATS;
  }
  return CARDINAL_EVENT_PHASE_SPAN_RADIANS / absSpeed;
}

/**
 * Snaps one duration to nearest arm-phase event spacing.
 *
 * @param durationBeats Candidate segment duration in beats.
 * @param armSpeedRadiansPerBeat Arm angular speed in radians per beat.
 * @returns Duration snapped to nearest positive arm-phase event multiple.
 */
export function snapDurationToArmPhaseEvents(durationBeats: number, armSpeedRadiansPerBeat = VTG_CANONICAL_ARM_SPEED_RADIANS_PER_BEAT): number {
  const spacing = getArmPhaseEventSpacingBeats(armSpeedRadiansPerBeat);
  const snappedSteps = Math.max(1, Math.round(durationBeats / spacing));
  return snappedSteps * spacing;
}

/**
 * Applies optional event snap normalization to segment durations.
 *
 * @param sequence Sequence candidate.
 * @returns Sequence clone with duration snapping applied when snap is enabled.
 */
export function normalizeSequenceEventSnap(sequence: VTGSequence): VTGSequence {
  if (sequence.snapSetting !== "event") {
    return {
      ...sequence,
      segments: sequence.segments.map((segment) => ({
        ...segment,
        descriptor: { ...segment.descriptor }
      }))
    };
  }

  return {
    ...sequence,
    segments: sequence.segments.map((segment) => ({
      ...segment,
      durationBeats: snapDurationToArmPhaseEvents(segment.durationBeats),
      descriptor: { ...segment.descriptor }
    }))
  };
}

/**
 * Computes segment start boundaries and total beat length in sequence order.
 *
 * @param sequence Sequence candidate.
 * @returns Segment start array and total duration in beats.
 */
export function computeSequenceBoundariesBeats(sequence: VTGSequence): VTGSequenceBoundaries {
  const startsBeats: number[] = [];
  let cursor = 0;

  for (const segment of sequence.segments) {
    startsBeats.push(cursor);
    cursor += segment.durationBeats;
  }

  return {
    startsBeats,
    totalBeats: cursor
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Resolves global playhead beat into active segment and local beat.
 *
 * @param sequence Sequence candidate.
 * @param playheadBeat Global playhead beat.
 * @returns Active-segment resolution, or `null` when no resolvable segment exists.
 */
export function resolveSequencePlayheadBeats(sequence: VTGSequence, playheadBeat: number): VTGSequencePlayheadResolution | null {
  if (sequence.segments.length === 0) {
    return null;
  }

  const normalizedSequence = normalizeSequenceEventSnap(sequence);
  const boundaries = computeSequenceBoundariesBeats(normalizedSequence);
  if (boundaries.totalBeats <= VTG_SEQUENCE_MIN_DURATION_BEATS) {
    return null;
  }

  const sequenceBeat = normalizedSequence.loop
    ? normalizeLoopBeat(playheadBeat, boundaries.totalBeats)
    : clamp(playheadBeat, 0, boundaries.totalBeats);

  for (let index = 0; index < normalizedSequence.segments.length; index += 1) {
    const segment = normalizedSequence.segments[index];
    if (!segment) {
      continue;
    }

    const start = boundaries.startsBeats[index] ?? 0;
    const end = start + segment.durationBeats;
    const isLastSegment = index === normalizedSequence.segments.length - 1;
    const isInside = sequenceBeat >= start && (sequenceBeat < end - SNAP_ALIGNMENT_TOLERANCE || isLastSegment);

    if (!isInside) {
      continue;
    }

    const localBeat = isLastSegment ? Math.min(sequenceBeat - start, segment.durationBeats) : sequenceBeat - start;

    return {
      sequenceBeat,
      segmentIndex: index,
      segmentId: segment.id,
      localBeat,
      totalBeats: boundaries.totalBeats
    };
  }

  return null;
}

function isCanonicalDuration(durationBeats: number): boolean {
  const spacing = getArmPhaseEventSpacingBeats();
  const steps = durationBeats / spacing;
  return Math.abs(steps - Math.round(steps)) <= TRANSITION_ALIGNMENT_TOLERANCE;
}

function toGuidanceSeverity(mode: VTGSequenceGuidanceMode, classification: VTGTransitionClassification): VTGTransitionGuidanceSeverity {
  if (classification === "canonical") {
    return "ok";
  }
  if (mode === "strict") {
    return "error";
  }
  if (mode === "soft") {
    return "warning";
  }
  return "none";
}

/**
 * Classifies each segment-end transition as canonical or non-canonical.
 *
 * @param sequence Sequence candidate.
 * @returns Ordered transition guidance records for each segment boundary.
 */
export function classifySequenceTransitionGuidance(sequence: VTGSequence): VTGSequenceTransitionGuidance[] {
  if (sequence.segments.length === 0) {
    return [];
  }

  const effectiveSequence = normalizeSequenceEventSnap(sequence);
  const guidance: VTGSequenceTransitionGuidance[] = [];

  for (let index = 0; index < effectiveSequence.segments.length; index += 1) {
    const segment = effectiveSequence.segments[index];
    if (!segment) {
      continue;
    }

    const nextIndex = index + 1;
    const hasNext = nextIndex < effectiveSequence.segments.length;
    const loopsToFirst = effectiveSequence.loop && effectiveSequence.segments.length > 1;
    const nextSegment = hasNext
      ? effectiveSequence.segments[nextIndex]
      : loopsToFirst
      ? effectiveSequence.segments[0]
      : null;

    if (!nextSegment) {
      guidance.push({
        segmentId: segment.id,
        nextSegmentId: null,
        classification: "canonical",
        severity: "ok",
        message: "Sequence end."
      });
      continue;
    }

    const classification: VTGTransitionClassification = isCanonicalDuration(segment.durationBeats) ? "canonical" : "non-canonical";
    const severity = toGuidanceSeverity(effectiveSequence.guidanceMode, classification);

    guidance.push({
      segmentId: segment.id,
      nextSegmentId: nextSegment.id,
      classification,
      severity,
      message:
        classification === "canonical"
          ? "Aligned to arm-phase cardinal events."
          : "Off-cardinal boundary. Consider snapping to nearest arm-phase event."
    });
  }

  return guidance;
}

/**
 * Serializes sequence with schema metadata for export.
 *
 * @param sequence Sequence candidate.
 * @returns JSON payload string.
 */
export function serializeVTGSequence(sequence: VTGSequence): string {
  return JSON.stringify({
    schema: VTG_SEQUENCE_SCHEMA,
    version: VTG_SEQUENCE_SCHEMA_VERSION,
    name: sequence.name,
    loop: sequence.loop,
    snapSetting: sequence.snapSetting,
    guidanceMode: sequence.guidanceMode,
    segments: sequence.segments.map((segment) => ({
      id: segment.id,
      durationBeats: segment.durationBeats,
      descriptor: {
        armElement: segment.descriptor.armElement,
        poiElement: segment.descriptor.poiElement,
        phaseDeg: segment.descriptor.phaseDeg,
        poiHeadCyclesPerArmCycle: segment.descriptor.poiHeadCyclesPerArmCycle
      }
    }))
  });
}

/**
 * Parses and validates sequence JSON. Unknown schema/version are rejected.
 *
 * @param serialized Raw JSON string.
 * @returns Parsed sequence or descriptive error.
 */
export function deserializeVTGSequence(serialized: string): VTGSequenceDeserializeResult {
  try {
    const parsed = JSON.parse(serialized) as unknown;
    if (!isRecord(parsed)) {
      return {
        sequence: null,
        error: "Invalid sequence payload."
      };
    }

    if (parsed.schema !== VTG_SEQUENCE_SCHEMA) {
      return {
        sequence: null,
        error: `Unsupported sequence schema: ${String(parsed.schema)}`
      };
    }

    if (parsed.version !== VTG_SEQUENCE_SCHEMA_VERSION) {
      return {
        sequence: null,
        error: `Unsupported sequence version: ${String(parsed.version)}`
      };
    }

    const sequence = sanitizeVTGSequence(parsed);
    const validation = validateVTGSequence(sequence);

    if (!validation.isValid) {
      return {
        sequence: null,
        error: validation.errors[0] ?? "Sequence validation failed."
      };
    }

    return {
      sequence,
      error: null
    };
  } catch {
    return {
      sequence: null,
      error: "Unreadable sequence JSON."
    };
  }
}
