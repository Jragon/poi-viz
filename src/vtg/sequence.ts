import { normalizeLoopBeat } from "@/state/beatMath";
import { PI } from "@/state/constants";
import {
  getRelationForElement,
  VTG_CANONICAL_ARM_SPEED_RADIANS_PER_BEAT,
  type VTGDescriptor,
  type VTGElement,
  type VTGPhaseDeg
} from "@/vtg/types";

export const VTG_SEQUENCE_DEFAULT_NAME = "Untitled Sequence";
export const VTG_SEQUENCE_DEFAULT_LOOP = true;
export const VTG_SEQUENCE_DEFAULT_ALLOW_POI_DIRECTION_FLIP = false;
export const VTG_SEQUENCE_DEFAULT_START_PHASE_DEG: VTGPhaseDeg = 0;
export const VTG_SEQUENCE_DEFAULT_DURATION_BEATS = 1;
export const VTG_SEQUENCE_MIN_DURATION_BEATS = 1e-6;
export const VTG_SEQUENCE_DEFAULT_SNAP_SETTING = "event" as const;
export const VTG_SEQUENCE_DEFAULT_POI_HEAD_CYCLES_PER_ARM_CYCLE = -3;
export const VTG_SEQUENCE_DEFAULT_RIGHT_ARM_SIGN: VTGArmSign = 1;

const CARDINAL_EVENT_PHASE_SPAN_RADIANS = PI / 2;
const SNAP_ALIGNMENT_TOLERANCE = 1e-9;
const PHASE_DEGREES_TO_RADIANS = PI / 180;
const SAME_TIME_PHASE_OFFSET_RADIANS = 0;
const SPLIT_TIME_PHASE_OFFSET_RADIANS = PI;
const RIGHT_HEAD_ANCHOR_OFFSET_RADIANS = 0;
const SEGMENT_ID_PREFIX = "seg";

export type VTGSequenceSnapSetting = "event" | "none";
export type VTGArmSign = 1 | -1;

export interface VTGSequenceDescriptor {
  armElement: VTGElement;
  poiElement: VTGElement;
  poiHeadCyclesPerArmCycle: number;
  rightArmSign: VTGArmSign;
}

export interface VTGSequenceSegment {
  id: string;
  durationBeats: number;
  descriptor: VTGSequenceDescriptor;
}

export interface VTGSequence {
  name: string;
  loop: boolean;
  snapSetting: VTGSequenceSnapSetting;
  startPhaseDeg: VTGPhaseDeg;
  allowPoiDirectionFlip: boolean;
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

export interface VTGSequenceSpeedProfile {
  rightArmSpeedRadiansPerBeat: number;
  leftArmSpeedRadiansPerBeat: number;
  rightHeadSpeedRadiansPerBeat: number;
  leftHeadSpeedRadiansPerBeat: number;
}

export interface VTGSequenceChannelAngles {
  rightArmRadians: number;
  leftArmRadians: number;
  rightHeadRadians: number;
  leftHeadRadians: number;
}

export interface VTGSequenceDirectionBadges {
  L: VTGArmSign;
  R: VTGArmSign;
}

export interface VTGSequencePoiDirectionViolation {
  previousSegmentId: string;
  segmentId: string;
  previousRightHeadSign: VTGArmSign;
  authoredRightHeadSign: VTGArmSign;
}

export interface VTGSequenceContinuitySegment {
  segmentIndex: number;
  segmentId: string;
  durationBeats: number;
  descriptor: VTGSequenceDescriptor;
  authoredDescriptor: VTGSequenceDescriptor;
  speedProfile: VTGSequenceSpeedProfile;
  startAngles: VTGSequenceChannelAngles;
  poiDirectionFlipBlocked: boolean;
}

export interface VTGSequenceContinuity {
  sequence: VTGSequence;
  boundaries: VTGSequenceBoundaries;
  totalBeats: number;
  segments: VTGSequenceContinuitySegment[];
  anchoredStartAngles: VTGSequenceChannelAngles | null;
  authoredPoiDirectionViolations: VTGSequencePoiDirectionViolation[];
}

export interface VTGSequenceContinuityResolution extends VTGSequencePlayheadResolution {
  segment: VTGSequenceContinuitySegment;
}

export interface VTGSequenceDeserializeResult {
  sequence: VTGSequence | null;
  error: string | null;
}

interface PoiDirectionResolution {
  descriptor: VTGSequenceDescriptor;
  speedProfile: VTGSequenceSpeedProfile;
  flipBlocked: boolean;
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

function isSnapSetting(value: unknown): value is VTGSequenceSnapSetting {
  return value === "event" || value === "none";
}

function isVTGArmSign(value: unknown): value is VTGArmSign {
  return value === 1 || value === -1;
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

function sanitizePoiHeadCyclesPerArmCycle(value: unknown): number {
  if (!isFiniteNumber(value) || Math.abs(value) <= SNAP_ALIGNMENT_TOLERANCE) {
    return VTG_SEQUENCE_DEFAULT_POI_HEAD_CYCLES_PER_ARM_CYCLE;
  }
  return value;
}

function sanitizeDescriptor(value: unknown): VTGSequenceDescriptor {
  const candidate = isRecord(value) ? value : {};
  const armElement = isVTGElement(candidate.armElement) ? candidate.armElement : "Earth";
  const poiElement = isVTGElement(candidate.poiElement) ? candidate.poiElement : "Earth";

  return {
    armElement,
    poiElement,
    poiHeadCyclesPerArmCycle: sanitizePoiHeadCyclesPerArmCycle(candidate.poiHeadCyclesPerArmCycle),
    rightArmSign: isVTGArmSign(candidate.rightArmSign) ? candidate.rightArmSign : VTG_SEQUENCE_DEFAULT_RIGHT_ARM_SIGN
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

function cloneDescriptor(descriptor: VTGSequenceDescriptor): VTGSequenceDescriptor {
  return {
    armElement: descriptor.armElement,
    poiElement: descriptor.poiElement,
    poiHeadCyclesPerArmCycle: descriptor.poiHeadCyclesPerArmCycle,
    rightArmSign: descriptor.rightArmSign
  };
}

function cloneSegment(segment: VTGSequenceSegment): VTGSequenceSegment {
  return {
    id: segment.id,
    durationBeats: segment.durationBeats,
    descriptor: cloneDescriptor(segment.descriptor)
  };
}

function timingOffsetForElement(element: VTGElement): number {
  return getRelationForElement(element).timing === "split-time"
    ? SPLIT_TIME_PHASE_OFFSET_RADIANS
    : SAME_TIME_PHASE_OFFSET_RADIANS;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function phaseDegToRadians(phaseDeg: VTGPhaseDeg): number {
  return phaseDeg * PHASE_DEGREES_TO_RADIANS;
}

function advanceAnglesByDuration(
  startAngles: VTGSequenceChannelAngles,
  speedProfile: VTGSequenceSpeedProfile,
  durationBeats: number
): VTGSequenceChannelAngles {
  return {
    rightArmRadians: startAngles.rightArmRadians + speedProfile.rightArmSpeedRadiansPerBeat * durationBeats,
    leftArmRadians: startAngles.leftArmRadians + speedProfile.leftArmSpeedRadiansPerBeat * durationBeats,
    rightHeadRadians: startAngles.rightHeadRadians + speedProfile.rightHeadSpeedRadiansPerBeat * durationBeats,
    leftHeadRadians: startAngles.leftHeadRadians + speedProfile.leftHeadSpeedRadiansPerBeat * durationBeats
  };
}

function signFromDirection(value: number): VTGArmSign {
  return value < 0 ? -1 : 1;
}

function invertSign(sign: VTGArmSign): VTGArmSign {
  return sign === 1 ? -1 : 1;
}

/**
 * Creates a deterministic default VTG sequence value.
 *
 * @returns Default empty sequence shape.
 */
export function createDefaultVTGSequence(): VTGSequence {
  return {
    name: VTG_SEQUENCE_DEFAULT_NAME,
    loop: VTG_SEQUENCE_DEFAULT_LOOP,
    snapSetting: VTG_SEQUENCE_DEFAULT_SNAP_SETTING,
    startPhaseDeg: VTG_SEQUENCE_DEFAULT_START_PHASE_DEG,
    allowPoiDirectionFlip: VTG_SEQUENCE_DEFAULT_ALLOW_POI_DIRECTION_FLIP,
    segments: []
  };
}

/**
 * Sanitizes unknown input into a valid sequence object with defaults.
 *
 * @param input Unknown candidate value.
 * @returns Sanitized sequence object.
 */
export function sanitizeVTGSequence(input: unknown): VTGSequence {
  const candidate = isRecord(input) ? input : {};

  return {
    name: sanitizeSequenceName(candidate.name),
    loop: isBoolean(candidate.loop) ? candidate.loop : VTG_SEQUENCE_DEFAULT_LOOP,
    snapSetting: isSnapSetting(candidate.snapSetting) ? candidate.snapSetting : VTG_SEQUENCE_DEFAULT_SNAP_SETTING,
    startPhaseDeg: isVTGPhaseDeg(candidate.startPhaseDeg) ? candidate.startPhaseDeg : VTG_SEQUENCE_DEFAULT_START_PHASE_DEG,
    allowPoiDirectionFlip: isBoolean(candidate.allowPoiDirectionFlip)
      ? candidate.allowPoiDirectionFlip
      : VTG_SEQUENCE_DEFAULT_ALLOW_POI_DIRECTION_FLIP,
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

  if (sequence.name.trim().length === 0) {
    errors.push("Sequence name must be non-empty.");
  }
  if (!isVTGPhaseDeg(sequence.startPhaseDeg)) {
    errors.push(`Unsupported startPhaseDeg: ${String(sequence.startPhaseDeg)}`);
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

    if (!isVTGArmSign(segment.descriptor.rightArmSign)) {
      errors.push(`Segment ${segment.id} descriptor.rightArmSign must be 1 or -1.`);
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
 * Maps sequence descriptor shape to VTG panel descriptor shape using one phase bucket.
 *
 * @param descriptor Sequence descriptor input.
 * @param phaseDeg Phase bucket to expose in VTG panel.
 * @returns VTG descriptor compatible with `VtgPanel` apply event contract.
 */
export function toVTGDescriptor(descriptor: VTGSequenceDescriptor, phaseDeg: VTGPhaseDeg): VTGDescriptor {
  return {
    armElement: descriptor.armElement,
    poiElement: descriptor.poiElement,
    phaseDeg,
    poiHeadCyclesPerArmCycle: descriptor.poiHeadCyclesPerArmCycle
  };
}

/**
 * Computes beats between arm-phase cardinal events from arm angular speed.
 *
 * @param armSpeedRadiansPerBeat Arm angular speed in radians per beat.
 * @returns Beat interval between consecutive arm-phase cardinal events.
 */
export function getArmPhaseEventSpacingBeats(
  armSpeedRadiansPerBeat = VTG_CANONICAL_ARM_SPEED_RADIANS_PER_BEAT
): number {
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
export function snapDurationToArmPhaseEvents(
  durationBeats: number,
  armSpeedRadiansPerBeat = VTG_CANONICAL_ARM_SPEED_RADIANS_PER_BEAT
): number {
  const spacing = getArmPhaseEventSpacingBeats(armSpeedRadiansPerBeat);
  const snappedSteps = Math.max(1, Math.round(durationBeats / spacing));
  return snappedSteps * spacing;
}

/**
 * Applies optional event-snap normalization to segment durations.
 *
 * @param sequence Sequence candidate.
 * @returns Sequence clone with duration snapping applied when snap is enabled.
 */
export function normalizeSequenceEventSnap(sequence: VTGSequence): VTGSequence {
  return {
    name: sequence.name,
    loop: sequence.loop,
    snapSetting: sequence.snapSetting,
    startPhaseDeg: sequence.startPhaseDeg,
    allowPoiDirectionFlip: sequence.allowPoiDirectionFlip,
    segments: sequence.segments.map((segment) => ({
      id: segment.id,
      durationBeats: sequence.snapSetting === "event" ? snapDurationToArmPhaseEvents(segment.durationBeats) : segment.durationBeats,
      descriptor: cloneDescriptor(segment.descriptor)
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

/**
 * Derives deterministic arm direction badges from one descriptor.
 *
 * @param descriptor Segment descriptor.
 * @returns Left/right arm direction signs.
 */
export function deriveSequenceArmDirectionBadges(descriptor: VTGSequenceDescriptor): VTGSequenceDirectionBadges {
  const armRelation = getRelationForElement(descriptor.armElement);
  const leftArmSign = armRelation.direction === "same-direction" ? descriptor.rightArmSign : invertSign(descriptor.rightArmSign);

  return {
    L: leftArmSign,
    R: descriptor.rightArmSign
  };
}

/**
 * Derives one segment's speed profile from relation descriptors.
 *
 * Contract:
 * - right arm speed sign is explicit via `rightArmSign`,
 * - left arm direction comes from `armElement` relation,
 * - right head speed comes from signed `poiHeadCyclesPerArmCycle * rightArmSpeed`,
 * - left head direction comes from `poiElement` relation.
 *
 * @param descriptor Sequence segment descriptor.
 * @returns Deterministic speed profile for both arm/head channels.
 */
export function deriveSequenceSegmentSpeedProfile(descriptor: VTGSequenceDescriptor): VTGSequenceSpeedProfile {
  const armRelation = getRelationForElement(descriptor.armElement);
  const poiRelation = getRelationForElement(descriptor.poiElement);
  const rightArmSpeed = descriptor.rightArmSign * VTG_CANONICAL_ARM_SPEED_RADIANS_PER_BEAT;
  const leftArmSpeed =
    armRelation.direction === "same-direction"
      ? rightArmSpeed
      : -rightArmSpeed;
  const rightHeadSpeed = descriptor.poiHeadCyclesPerArmCycle * rightArmSpeed;
  const leftHeadSpeed = poiRelation.direction === "same-direction" ? rightHeadSpeed : -rightHeadSpeed;

  return {
    rightArmSpeedRadiansPerBeat: rightArmSpeed,
    leftArmSpeedRadiansPerBeat: leftArmSpeed,
    rightHeadSpeedRadiansPerBeat: rightHeadSpeed,
    leftHeadSpeedRadiansPerBeat: leftHeadSpeed
  };
}

/**
 * Detects authored right-head direction flips across adjacent segments when flips are disallowed.
 *
 * @param sequence Sequence candidate.
 * @returns Ordered list of violations.
 */
export function detectPoiDirectionViolations(sequence: VTGSequence): VTGSequencePoiDirectionViolation[] {
  if (sequence.allowPoiDirectionFlip) {
    return [];
  }

  const normalized = normalizeSequenceEventSnap(sequence);
  const violations: VTGSequencePoiDirectionViolation[] = [];
  let previousSegmentId: string | null = null;
  let previousRightHeadSign: VTGArmSign | null = null;

  for (const segment of normalized.segments) {
    const speedProfile = deriveSequenceSegmentSpeedProfile(segment.descriptor);
    const authoredRightHeadSign = signFromDirection(speedProfile.rightHeadSpeedRadiansPerBeat);

    if (
      previousSegmentId &&
      previousRightHeadSign !== null &&
      authoredRightHeadSign !== previousRightHeadSign
    ) {
      violations.push({
        previousSegmentId,
        segmentId: segment.id,
        previousRightHeadSign,
        authoredRightHeadSign
      });
    }

    previousSegmentId = segment.id;
    previousRightHeadSign = authoredRightHeadSign;
  }

  return violations;
}

function resolvePoiDirectionConstraint(
  descriptor: VTGSequenceDescriptor,
  previousRightHeadSign: VTGArmSign | null,
  allowPoiDirectionFlip: boolean
): PoiDirectionResolution {
  const authoredProfile = deriveSequenceSegmentSpeedProfile(descriptor);
  if (allowPoiDirectionFlip || previousRightHeadSign === null) {
    return {
      descriptor: cloneDescriptor(descriptor),
      speedProfile: authoredProfile,
      flipBlocked: false
    };
  }

  const authoredRightHeadSign = signFromDirection(authoredProfile.rightHeadSpeedRadiansPerBeat);
  if (authoredRightHeadSign === previousRightHeadSign) {
    return {
      descriptor: cloneDescriptor(descriptor),
      speedProfile: authoredProfile,
      flipBlocked: false
    };
  }

  const constrainedDescriptor: VTGSequenceDescriptor = {
    ...cloneDescriptor(descriptor),
    poiHeadCyclesPerArmCycle: -descriptor.poiHeadCyclesPerArmCycle
  };

  return {
    descriptor: constrainedDescriptor,
    speedProfile: deriveSequenceSegmentSpeedProfile(constrainedDescriptor),
    flipBlocked: true
  };
}

function createAnchoredStartAngles(sequence: VTGSequence): VTGSequenceChannelAngles | null {
  const first = sequence.segments[0];
  if (!first) {
    return null;
  }

  const rightArmStart = phaseDegToRadians(sequence.startPhaseDeg);
  const leftArmStart = rightArmStart + timingOffsetForElement(first.descriptor.armElement);
  const rightHeadStart = rightArmStart + RIGHT_HEAD_ANCHOR_OFFSET_RADIANS;
  const leftHeadStart = rightHeadStart + timingOffsetForElement(first.descriptor.poiElement);

  return {
    rightArmRadians: rightArmStart,
    leftArmRadians: leftArmStart,
    rightHeadRadians: rightHeadStart,
    leftHeadRadians: leftHeadStart
  };
}

/**
 * Resolves sequence continuity starts by propagating channel angles across segment boundaries.
 *
 * Propagation contract:
 * - segment 0 starts from `startPhaseDeg` + first-segment timing relations,
 * - segment N>0 starts exactly at segment N-1 end pose,
 * - segment switches update speed profile only (no boundary pose jump),
 * - loop seam wraps to anchored start because playhead wraps in beat-space.
 * - when `allowPoiDirectionFlip=false`, right-head authored sign flips are blocked by
 *   deterministic per-segment fallback (`poiHeadCyclesPerArmCycle *= -1`) in runtime resolution.
 *
 * @param sequence Sequence candidate.
 * @returns Normalized sequence plus per-segment propagated start angles and speeds.
 */
export function resolveSequenceContinuity(sequence: VTGSequence): VTGSequenceContinuity {
  const effectiveSequence = normalizeSequenceEventSnap(sequence);
  const boundaries = computeSequenceBoundariesBeats(effectiveSequence);
  const anchoredStartAngles = createAnchoredStartAngles(effectiveSequence);
  const authoredPoiDirectionViolations = detectPoiDirectionViolations(effectiveSequence);

  if (!anchoredStartAngles) {
    return {
      sequence: effectiveSequence,
      boundaries,
      totalBeats: boundaries.totalBeats,
      segments: [],
      anchoredStartAngles: null,
      authoredPoiDirectionViolations
    };
  }

  const continuitySegments: VTGSequenceContinuitySegment[] = [];
  let currentStart = anchoredStartAngles;
  let previousRightHeadSign: VTGArmSign | null = null;

  for (let index = 0; index < effectiveSequence.segments.length; index += 1) {
    const segment = effectiveSequence.segments[index];
    if (!segment) {
      continue;
    }

    const resolved = resolvePoiDirectionConstraint(
      segment.descriptor,
      previousRightHeadSign,
      effectiveSequence.allowPoiDirectionFlip
    );

    continuitySegments.push({
      segmentIndex: index,
      segmentId: segment.id,
      durationBeats: segment.durationBeats,
      descriptor: cloneDescriptor(resolved.descriptor),
      authoredDescriptor: cloneDescriptor(segment.descriptor),
      speedProfile: resolved.speedProfile,
      startAngles: {
        rightArmRadians: currentStart.rightArmRadians,
        leftArmRadians: currentStart.leftArmRadians,
        rightHeadRadians: currentStart.rightHeadRadians,
        leftHeadRadians: currentStart.leftHeadRadians
      },
      poiDirectionFlipBlocked: resolved.flipBlocked
    });

    previousRightHeadSign = signFromDirection(resolved.speedProfile.rightHeadSpeedRadiansPerBeat);
    currentStart = advanceAnglesByDuration(currentStart, resolved.speedProfile, segment.durationBeats);
  }

  return {
    sequence: effectiveSequence,
    boundaries,
    totalBeats: boundaries.totalBeats,
    segments: continuitySegments,
    anchoredStartAngles: {
      rightArmRadians: anchoredStartAngles.rightArmRadians,
      leftArmRadians: anchoredStartAngles.leftArmRadians,
      rightHeadRadians: anchoredStartAngles.rightHeadRadians,
      leftHeadRadians: anchoredStartAngles.leftHeadRadians
    },
    authoredPoiDirectionViolations
  };
}

/**
 * Resolves active segment continuity data at a global beat.
 *
 * @param sequence Sequence candidate.
 * @param playheadBeat Global playhead beat.
 * @returns Active continuity resolution with local beat, or `null` when unresolved.
 */
export function resolveSequenceContinuityAtBeat(sequence: VTGSequence, playheadBeat: number): VTGSequenceContinuityResolution | null {
  const continuity = resolveSequenceContinuity(sequence);
  const playhead = resolveSequencePlayheadBeats(continuity.sequence, playheadBeat);
  if (!playhead) {
    return null;
  }

  const segment = continuity.segments[playhead.segmentIndex];
  if (!segment) {
    return null;
  }

  return {
    ...playhead,
    segment
  };
}

/**
 * Serializes sequence payload for export.
 *
 * @param sequence Sequence candidate.
 * @returns JSON payload string.
 */
export function serializeVTGSequence(sequence: VTGSequence): string {
  return JSON.stringify({
    name: sequence.name,
    loop: sequence.loop,
    snapSetting: sequence.snapSetting,
    startPhaseDeg: sequence.startPhaseDeg,
    allowPoiDirectionFlip: sequence.allowPoiDirectionFlip,
    segments: sequence.segments.map((segment) => cloneSegment(segment))
  });
}

/**
 * Parses and validates sequence JSON with the current no-version schema.
 *
 * Note: legacy schema/version payloads are intentionally rejected.
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

    if ("schema" in parsed || "version" in parsed || "guidanceMode" in parsed) {
      return {
        sequence: null,
        error: "Legacy sequence payload is unsupported."
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
