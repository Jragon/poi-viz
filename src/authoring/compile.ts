import { PI } from "@/engine/constants";
import { evalSegment } from "@/engine/engine";
import { isPlaneSide } from "@/engine/planeSide";
import type {
  CircleDriver,
  Driver,
  MultiRigSequence,
  PlaneId,
  RadiusProfile,
  RelativeNodePose,
  RelativeRigPose,
  Segment
} from "@/engine/types";

import type {
  AuthoredCircleDriverInput,
  AuthoredDocumentValidationError,
  AuthoredDocumentValidationResult,
  AuthoredFirstSegment,
  AuthoredRadiusProfileInput,
  AuthoredSegment,
  AuthoredSequenceDocument,
  AuthoredTrack,
  AuthoredTrackId,
  CompileAuthoredDocumentResult,
  DerivedAuthoredSegmentBoundary,
  DerivedBoundaryMap
} from "@/authoring/types";

const TRACK_ORDER: readonly AuthoredTrackId[] = ["left", "right"];
const PLANE_IDS = new Set<PlaneId>(["wall", "wheel", "floor"]);
const DEFAULT_PLANE_ID: PlaneId = "wall";
const TAU = 2 * PI;
const PLANE_BREAK_EPSILON = 1e-9;

type SegmentMotion = Omit<Segment, "durationUnits" | "planeId" | "planeSide">;

type PlaneBreakRule = {
  allowedSourceHandPhases: readonly number[];
  targetPhaseOffset: number;
};

type DeriveTrackBoundariesResult = {
  boundaries: DerivedAuthoredSegmentBoundary[];
  errors: AuthoredDocumentValidationError[];
};

function toRadians(phaseDeg: number): number {
  return (phaseDeg * PI) / 180;
}

function toDegrees(phaseRad: number): number {
  return (phaseRad * 180) / PI;
}

function toOmegaRadiansPerUnit(driver: AuthoredCircleDriverInput): number {
  return driver.omegaUnit === "circles-per-unit" ? driver.omega * TAU : driver.omega;
}

function toRelativeNodePose(
  startPose: AuthoredFirstSegment["hand"]["startPose"]
): RelativeNodePose {
  return {
    phaseAbs: toRadians(startPose.phaseDeg),
    radius: startPose.radius
  };
}

function toDriver(driver: AuthoredCircleDriverInput): CircleDriver {
  const radiusProfile = toRadiusProfile(driver.radiusProfile);
  return {
    kind: "circle",
    omega: toOmegaRadiansPerUnit(driver),
    ...(radiusProfile ? { radiusProfile } : {})
  };
}

function toRadiusProfile(radiusProfile?: AuthoredRadiusProfileInput): RadiusProfile | undefined {
  if (!radiusProfile || radiusProfile.keys.length === 0) {
    return undefined;
  }

  return {
    kind: "time-keyed",
    keys: radiusProfile.keys.map((key) => ({ t: key.t, radius: key.radius }))
  };
}

function toAuthoredRadiusProfile(
  radiusProfile?: RadiusProfile
): AuthoredRadiusProfileInput | undefined {
  if (!radiusProfile || radiusProfile.keys.length === 0) {
    return undefined;
  }

  return {
    kind: "time-keyed",
    keys: radiusProfile.keys.map((key) => ({ t: key.t, radius: key.radius }))
  };
}

function assertAuthoredCircleDriver(
  driver: Driver,
  rigId: string,
  segmentIndex: number,
  node: "hand" | "head"
): CircleDriver {
  if (driver.kind !== "circle") {
    throw new Error(
      `Rig ${rigId} segment ${segmentIndex} ${node} driver cannot be represented as an authored circle driver`
    );
  }

  return driver;
}

function isPlaneId(value: unknown): value is PlaneId {
  return typeof value === "string" && PLANE_IDS.has(value as PlaneId);
}

function resolveAuthoredPlaneId(segment: AuthoredSegment): PlaneId {
  return segment.planeId ?? DEFAULT_PLANE_ID;
}

function planeBreakKey(sourcePlaneId: PlaneId, targetPlaneId: PlaneId): string {
  return `${sourcePlaneId}->${targetPlaneId}`;
}

function getPlaneBreakRule(sourcePlaneId: PlaneId, targetPlaneId: PlaneId): PlaneBreakRule | null {
  switch (planeBreakKey(sourcePlaneId, targetPlaneId)) {
    case "wall->floor":
    case "floor->wall":
      return { allowedSourceHandPhases: [0, PI], targetPhaseOffset: 0 };
    case "wall->wheel":
    case "wheel->wall":
      return { allowedSourceHandPhases: [PI / 2, (3 * PI) / 2], targetPhaseOffset: 0 };
    case "wheel->floor":
      return { allowedSourceHandPhases: [0, PI], targetPhaseOffset: PI / 2 };
    case "floor->wheel":
      return { allowedSourceHandPhases: [PI / 2, (3 * PI) / 2], targetPhaseOffset: -PI / 2 };
    default:
      return null;
  }
}

function wrapAngleDelta(delta: number): number {
  return ((((delta + PI) % TAU) + TAU) % TAU) - PI;
}

function angleMatchesAny(angle: number, targets: readonly number[]): boolean {
  return targets.some((target) => Math.abs(wrapAngleDelta(angle - target)) <= PLANE_BREAK_EPSILON);
}

function remapPoseByPhaseOffset(pose: RelativeRigPose, phaseOffset: number): RelativeRigPose {
  return {
    handPose: {
      phaseAbs: pose.handPose.phaseAbs + phaseOffset,
      radius: pose.handPose.radius
    },
    headPose: {
      phaseAbs: pose.headPose.phaseAbs + phaseOffset,
      radius: pose.headPose.radius
    }
  };
}

function planeBreakPoseMatchesRule(pose: RelativeRigPose, rule: PlaneBreakRule): boolean {
  const headRelativePhase = pose.headPose.phaseAbs - pose.handPose.phaseAbs;
  return (
    angleMatchesAny(pose.handPose.phaseAbs, rule.allowedSourceHandPhases) &&
    angleMatchesAny(headRelativePhase, [0, PI])
  );
}

function remapPoseForPlaneTransition(
  sourcePose: RelativeRigPose,
  sourcePlaneId: PlaneId,
  targetPlaneId: PlaneId
): RelativeRigPose | null {
  if (sourcePlaneId === targetPlaneId) {
    return sourcePose;
  }

  const rule = getPlaneBreakRule(sourcePlaneId, targetPlaneId);
  if (!rule || !planeBreakPoseMatchesRule(sourcePose, rule)) {
    return null;
  }

  return remapPoseByPhaseOffset(sourcePose, rule.targetPhaseOffset);
}

function posesMatchModuloTurns(a: RelativeNodePose, b: RelativeNodePose, epsilon = 1e-9): boolean {
  return (
    Math.abs(wrapAngleDelta(a.phaseAbs - b.phaseAbs)) <= epsilon &&
    Math.abs(a.radius - b.radius) <= epsilon
  );
}

function makeFirstSegment(segment: AuthoredFirstSegment): SegmentMotion {
  const nextSegment: SegmentMotion = {
    hand: {
      startPose: toRelativeNodePose(segment.hand.startPose),
      driver: toDriver(segment.hand.driver)
    },
    head: {
      startPose: toRelativeNodePose(segment.head.startPose),
      driver: toDriver(segment.head.driver)
    }
  };
  return nextSegment;
}

function makeContinuationSegment(
  segment: AuthoredSegment,
  startPose: RelativeRigPose
): SegmentMotion {
  if (segment.kind !== "continuation") {
    return makeFirstSegment(segment);
  }

  const nextSegment: SegmentMotion = {
    hand: {
      startPose: startPose.handPose,
      driver: toDriver(segment.hand.driver)
    },
    head: {
      startPose: startPose.headPose,
      driver: toDriver(segment.head.driver)
    }
  };
  return nextSegment;
}

function getTrackEntries(document: AuthoredSequenceDocument) {
  return TRACK_ORDER.map((trackId) => [trackId, document.tracks[trackId]] as const).filter(
    (entry): entry is readonly [AuthoredTrackId, AuthoredTrack] => entry[1] !== undefined
  );
}

function validateTrackSegmentKind(
  trackId: AuthoredTrackId,
  segment: AuthoredSegment,
  segmentIndex: number,
  errors: AuthoredDocumentValidationError[]
) {
  const expectedKind = segmentIndex === 0 ? "first" : "continuation";
  if (segment.kind !== expectedKind) {
    errors.push({ code: "INVALID_SEGMENT_KIND", trackId, segmentIndex });
  }
}

function validateFiniteNodeValues(
  trackId: AuthoredTrackId,
  segmentIndex: number,
  node: "hand" | "head",
  segment: AuthoredFirstSegment,
  errors: AuthoredDocumentValidationError[]
) {
  if (!Number.isFinite(segment[node].startPose.phaseDeg)) {
    errors.push({ code: "INVALID_PHASE_DEGREES", trackId, segmentIndex, node });
  }

  if (!Number.isFinite(segment[node].startPose.radius) || segment[node].startPose.radius < 0) {
    errors.push({ code: "INVALID_RADIUS", trackId, segmentIndex, node });
  }
}

function validateFiniteDriverValues(
  trackId: AuthoredTrackId,
  segmentIndex: number,
  node: "hand" | "head",
  segment: AuthoredSegment,
  errors: AuthoredDocumentValidationError[]
) {
  if (!Number.isFinite(segment[node].driver.omega)) {
    errors.push({ code: "INVALID_OMEGA", trackId, segmentIndex, node });
  }
}

function validateRadiusProfileValues(
  trackId: AuthoredTrackId,
  segmentIndex: number,
  node: "hand" | "head",
  segment: AuthoredSegment,
  errors: AuthoredDocumentValidationError[]
) {
  const radiusProfile = segment[node].driver.radiusProfile;
  if (!radiusProfile) {
    return;
  }

  if (radiusProfile.kind !== "time-keyed" || !Array.isArray(radiusProfile.keys)) {
    errors.push({ code: "INVALID_RADIUS_PROFILE", trackId, segmentIndex, node });
    return;
  }

  let previousT = 0;
  for (const key of radiusProfile.keys) {
    if (
      !Number.isFinite(key.t) ||
      key.t <= 0 ||
      key.t > segment.durationUnits ||
      key.t <= previousT ||
      !Number.isFinite(key.radius) ||
      key.radius < 0
    ) {
      errors.push({ code: "INVALID_RADIUS_PROFILE", trackId, segmentIndex, node });
    }

    previousT = key.t;
  }
}

function validatePlaneIdValue(
  trackId: AuthoredTrackId,
  segmentIndex: number,
  segment: AuthoredSegment,
  errors: AuthoredDocumentValidationError[]
) {
  if (segment.planeId !== undefined && !isPlaneId(segment.planeId)) {
    errors.push({ code: "INVALID_PLANE_ID", trackId, segmentIndex });
  }
}

function validatePlaneSideValue(
  trackId: AuthoredTrackId,
  segmentIndex: number,
  segment: AuthoredSegment,
  errors: AuthoredDocumentValidationError[]
) {
  if (segment.planeSide !== undefined && !isPlaneSide(segment.planeSide)) {
    errors.push({ code: "INVALID_PLANE_SIDE", trackId, segmentIndex });
  }
}

function validateAndRemapPlaneBreakStartPose(
  trackId: AuthoredTrackId,
  targetSegmentIndex: number,
  previousBoundary: DerivedAuthoredSegmentBoundary,
  targetPlaneId: PlaneId,
  errors: AuthoredDocumentValidationError[]
): RelativeRigPose {
  if (previousBoundary.planeId === targetPlaneId) {
    return previousBoundary.endPose;
  }

  const rule = getPlaneBreakRule(previousBoundary.planeId, targetPlaneId);
  if (!rule) {
    errors.push({ code: "UNSUPPORTED_PLANE_BREAK", trackId, segmentIndex: targetSegmentIndex });
    return previousBoundary.endPose;
  }

  const pose = previousBoundary.endPose;
  if (!angleMatchesAny(pose.handPose.phaseAbs, rule.allowedSourceHandPhases)) {
    errors.push({
      code: "PLANE_BREAK_INVALID_HAND_ALIGNMENT",
      trackId,
      segmentIndex: targetSegmentIndex,
      node: "hand"
    });
  }

  const headRelativePhase = pose.headPose.phaseAbs - pose.handPose.phaseAbs;
  if (!angleMatchesAny(headRelativePhase, [0, PI])) {
    errors.push({
      code: "PLANE_BREAK_INVALID_HEAD_ALIGNMENT",
      trackId,
      segmentIndex: targetSegmentIndex,
      node: "head"
    });
  }

  return remapPoseByPhaseOffset(previousBoundary.endPose, rule.targetPhaseOffset);
}

export function validateAuthoredDocument(
  document: AuthoredSequenceDocument
): AuthoredDocumentValidationResult {
  const errors: AuthoredDocumentValidationError[] = [];
  const tracks = getTrackEntries(document);

  if (tracks.length === 0) {
    errors.push({ code: "EMPTY_DOCUMENT" });
  }

  for (const [trackId, track] of tracks) {
    if (track.segments.length === 0) {
      errors.push({ code: "EMPTY_TRACK", trackId });
      continue;
    }

    track.segments.forEach((segment, segmentIndex) => {
      validateTrackSegmentKind(trackId, segment, segmentIndex, errors);

      if (!Number.isFinite(segment.durationUnits)) {
        errors.push({ code: "INVALID_DURATION_UNITS", trackId, segmentIndex });
      } else if (segment.durationUnits <= 0) {
        errors.push({ code: "NON_POSITIVE_DURATION", trackId, segmentIndex });
      }

      validateFiniteDriverValues(trackId, segmentIndex, "hand", segment, errors);
      validateFiniteDriverValues(trackId, segmentIndex, "head", segment, errors);
      validateRadiusProfileValues(trackId, segmentIndex, "hand", segment, errors);
      validateRadiusProfileValues(trackId, segmentIndex, "head", segment, errors);
      validatePlaneIdValue(trackId, segmentIndex, segment, errors);
      validatePlaneSideValue(trackId, segmentIndex, segment, errors);

      if (segment.kind === "first") {
        validateFiniteNodeValues(trackId, segmentIndex, "hand", segment, errors);
        validateFiniteNodeValues(trackId, segmentIndex, "head", segment, errors);
      }
    });
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true };
}

export function deriveTrackBoundaries(
  trackId: AuthoredTrackId,
  track: AuthoredTrack
): DerivedAuthoredSegmentBoundary[] {
  return deriveTrackBoundariesWithValidation(trackId, track).boundaries;
}

function deriveTrackBoundariesWithValidation(
  trackId: AuthoredTrackId,
  track: AuthoredTrack
): DeriveTrackBoundariesResult {
  const boundaries: DerivedAuthoredSegmentBoundary[] = [];
  const errors: AuthoredDocumentValidationError[] = [];

  let cursor = 0;
  let startPose: RelativeRigPose | null = null;

  track.segments.forEach((authoredSegment, segmentIndex) => {
    const planeId = resolveAuthoredPlaneId(authoredSegment);
    const remappedStartPose =
      segmentIndex === 0
        ? null
        : validateAndRemapPlaneBreakStartPose(
            trackId,
            segmentIndex,
            boundaries[boundaries.length - 1],
            planeId,
            errors
          );
    startPose = remappedStartPose ?? startPose;

    const segmentMotion =
      segmentIndex === 0
        ? makeFirstSegment(authoredSegment as AuthoredFirstSegment)
        : makeContinuationSegment(authoredSegment, startPose as RelativeRigPose);
    const segment: Segment = {
      ...segmentMotion,
      durationUnits: authoredSegment.durationUnits,
      planeId,
      ...(authoredSegment.planeSide === undefined ? {} : { planeSide: authoredSegment.planeSide })
    };

    const resolvedStartPose: RelativeRigPose = {
      handPose: { ...segment.hand.startPose },
      headPose: { ...segment.head.startPose }
    };
    const endPose = evalSegment(segment, segment.durationUnits);
    const startUnit = cursor;
    const endUnit = startUnit + segment.durationUnits;

    boundaries.push({
      trackId,
      segmentIndex,
      startUnit,
      endUnit,
      startPose: resolvedStartPose,
      endPose,
      planeId,
      segment
    });

    cursor = endUnit;
    startPose = endPose;
  });

  return { boundaries, errors };
}

export function compileAuthoredDocument(
  document: AuthoredSequenceDocument
): CompileAuthoredDocumentResult {
  const validation = validateAuthoredDocument(document);
  if (!validation.ok) {
    return validation;
  }

  const boundariesByTrack: DerivedBoundaryMap = {};
  const transitionErrors: AuthoredDocumentValidationError[] = [];
  const entries = getTrackEntries(document).map(([trackId, track]) => {
    const result = deriveTrackBoundariesWithValidation(trackId, track);
    transitionErrors.push(...result.errors);
    return [trackId, result.boundaries] as const;
  });

  if (transitionErrors.length > 0) {
    return { ok: false, errors: transitionErrors };
  }

  const rigs = entries.map(([trackId, boundaries]) => {
    boundariesByTrack[trackId] = boundaries;

    return {
      rigId: trackId,
      sequence: {
        segments: boundaries.map((boundary) => boundary.segment)
      }
    };
  });

  return {
    ok: true,
    sequence: { rigs },
    boundariesByTrack
  };
}

export function authoredDocumentFromMultiRigSequence(
  sequence: MultiRigSequence,
  metadata: Pick<AuthoredSequenceDocument, "name" | "description">
): AuthoredSequenceDocument {
  const tracks: AuthoredSequenceDocument["tracks"] = {};

  for (const rig of sequence.rigs) {
    if (!TRACK_ORDER.includes(rig.rigId as AuthoredTrackId)) {
      throw new Error(`Unsupported rig id for authored document: ${rig.rigId}`);
    }

    let previousEndPose: RelativeRigPose | null = null;
    let previousPlaneId: PlaneId | null = null;
    tracks[rig.rigId as AuthoredTrackId] = {
      segments: rig.sequence.segments.map((segment, segmentIndex) => {
        const planeId = segment.planeId ?? DEFAULT_PLANE_ID;
        const handDriver = assertAuthoredCircleDriver(
          segment.hand.driver,
          rig.rigId,
          segmentIndex,
          "hand"
        );
        const headDriver = assertAuthoredCircleDriver(
          segment.head.driver,
          rig.rigId,
          segmentIndex,
          "head"
        );

        if (segmentIndex === 0) {
          const handRadiusProfile = toAuthoredRadiusProfile(handDriver.radiusProfile);
          const headRadiusProfile = toAuthoredRadiusProfile(headDriver.radiusProfile);
          const firstSegment: AuthoredFirstSegment = {
            kind: "first",
            durationUnits: segment.durationUnits,
            planeId,
            ...(segment.planeSide === undefined ? {} : { planeSide: segment.planeSide }),
            hand: {
              startPose: {
                phaseDeg: toDegrees(segment.hand.startPose.phaseAbs),
                radius: segment.hand.startPose.radius
              },
              driver: {
                kind: "circle",
                omega: handDriver.omega,
                omegaUnit: "radians-per-unit",
                ...(handRadiusProfile ? { radiusProfile: handRadiusProfile } : {})
              }
            },
            head: {
              startPose: {
                phaseDeg: toDegrees(segment.head.startPose.phaseAbs),
                radius: segment.head.startPose.radius
              },
              driver: {
                kind: "circle",
                omega: headDriver.omega,
                omegaUnit: "radians-per-unit",
                ...(headRadiusProfile ? { radiusProfile: headRadiusProfile } : {})
              }
            }
          };
          previousEndPose = evalSegment(segment, segment.durationUnits);
          previousPlaneId = planeId;
          return firstSegment;
        }

        const expectedStartPose =
          previousEndPose && previousPlaneId
            ? remapPoseForPlaneTransition(previousEndPose, previousPlaneId, planeId)
            : null;

        if (
          !expectedStartPose ||
          !posesMatchModuloTurns(expectedStartPose.handPose, segment.hand.startPose) ||
          !posesMatchModuloTurns(expectedStartPose.headPose, segment.head.startPose)
        ) {
          throw new Error(
            `Rig ${rig.rigId} segment ${segmentIndex} cannot be represented as a continuity-first authored segment`
          );
        }

        previousEndPose = evalSegment(segment, segment.durationUnits);
        previousPlaneId = planeId;
        const handRadiusProfile = toAuthoredRadiusProfile(handDriver.radiusProfile);
        const headRadiusProfile = toAuthoredRadiusProfile(headDriver.radiusProfile);
        return {
          kind: "continuation",
          durationUnits: segment.durationUnits,
          planeId,
          ...(segment.planeSide === undefined ? {} : { planeSide: segment.planeSide }),
          hand: {
            driver: {
              kind: "circle",
              omega: handDriver.omega,
              omegaUnit: "radians-per-unit",
              ...(handRadiusProfile ? { radiusProfile: handRadiusProfile } : {})
            }
          },
          head: {
            driver: {
              kind: "circle",
              omega: headDriver.omega,
              omegaUnit: "radians-per-unit",
              ...(headRadiusProfile ? { radiusProfile: headRadiusProfile } : {})
            }
          }
        };
      })
    };
  }

  return {
    name: metadata.name,
    description: metadata.description,
    tracks
  };
}
