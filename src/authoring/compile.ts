import { PI } from "@/engine/constants";
import { evalSegment } from "@/engine/engine";
import type {
  Driver,
  MultiRigSequence,
  RelativeNodePose,
  RelativeRigPose,
  Segment
} from "@/engine/types";

import type {
  AuthoredCircleDriverInput,
  AuthoredDocumentValidationError,
  AuthoredDocumentValidationResult,
  AuthoredFirstSegment,
  AuthoredSegment,
  AuthoredSequenceDocument,
  AuthoredTrack,
  AuthoredTrackId,
  CompileAuthoredDocumentResult,
  DerivedAuthoredSegmentBoundary,
  DerivedBoundaryMap
} from "@/authoring/types";

const TRACK_ORDER: readonly AuthoredTrackId[] = ["left", "right"];
const TAU = 2 * PI;

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

function toDriver(driver: AuthoredCircleDriverInput): Driver {
  return {
    kind: "circle",
    omega: toOmegaRadiansPerUnit(driver)
  };
}

function wrapAngleDelta(delta: number): number {
  return ((delta + PI) % TAU) - PI;
}

function posesMatchModuloTurns(a: RelativeNodePose, b: RelativeNodePose, epsilon = 1e-9): boolean {
  return (
    Math.abs(wrapAngleDelta(a.phaseAbs - b.phaseAbs)) <= epsilon &&
    Math.abs(a.radius - b.radius) <= epsilon
  );
}

function makeFirstSegment(segment: AuthoredFirstSegment): Segment {
  return {
    hand: {
      startPose: toRelativeNodePose(segment.hand.startPose),
      driver: toDriver(segment.hand.driver)
    },
    head: {
      startPose: toRelativeNodePose(segment.head.startPose),
      driver: toDriver(segment.head.driver)
    }
  };
}

function makeContinuationSegment(segment: AuthoredSegment, startPose: RelativeRigPose): Segment {
  if (segment.kind !== "continuation") {
    return makeFirstSegment(segment);
  }

  return {
    hand: {
      startPose: startPose.handPose,
      driver: toDriver(segment.hand.driver)
    },
    head: {
      startPose: startPose.headPose,
      driver: toDriver(segment.head.driver)
    }
  };
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

  if (!Number.isFinite(segment[node].startPose.radius)) {
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
  const boundaries: DerivedAuthoredSegmentBoundary[] = [];

  let cursor = 0;
  let startPose: RelativeRigPose | null = null;

  track.segments.forEach((authoredSegment, segmentIndex) => {
    const segment =
      segmentIndex === 0
        ? makeFirstSegment(authoredSegment as AuthoredFirstSegment)
        : makeContinuationSegment(authoredSegment, startPose as RelativeRigPose);

    const resolvedStartPose: RelativeRigPose = {
      handPose: { ...segment.hand.startPose },
      headPose: { ...segment.head.startPose }
    };
    const endPose = evalSegment(segment, authoredSegment.durationUnits);
    const startUnit = cursor;
    const endUnit = startUnit + authoredSegment.durationUnits;

    boundaries.push({
      trackId,
      segmentIndex,
      startUnit,
      endUnit,
      startPose: resolvedStartPose,
      endPose,
      segment
    });

    cursor = endUnit;
    startPose = endPose;
  });

  return boundaries;
}

export function compileAuthoredDocument(
  document: AuthoredSequenceDocument
): CompileAuthoredDocumentResult {
  const validation = validateAuthoredDocument(document);
  if (!validation.ok) {
    return validation;
  }

  const boundariesByTrack: DerivedBoundaryMap = {};
  const rigs = getTrackEntries(document).map(([trackId, track]) => {
    const boundaries = deriveTrackBoundaries(trackId, track);
    boundariesByTrack[trackId] = boundaries;

    return {
      rigId: trackId,
      sequence: {
        segments: boundaries.map((boundary) => ({
          segment: boundary.segment,
          durationUnits: boundary.endUnit - boundary.startUnit
        }))
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
    tracks[rig.rigId as AuthoredTrackId] = {
      segments: rig.sequence.segments.map((placement, segmentIndex) => {
        if (segmentIndex === 0) {
          const firstSegment: AuthoredFirstSegment = {
            kind: "first",
            durationUnits: placement.durationUnits,
            hand: {
              startPose: {
                phaseDeg: toDegrees(placement.segment.hand.startPose.phaseAbs),
                radius: placement.segment.hand.startPose.radius
              },
              driver: {
                kind: "circle",
                omega: placement.segment.hand.driver.omega,
                omegaUnit: "radians-per-unit"
              }
            },
            head: {
              startPose: {
                phaseDeg: toDegrees(placement.segment.head.startPose.phaseAbs),
                radius: placement.segment.head.startPose.radius
              },
              driver: {
                kind: "circle",
                omega: placement.segment.head.driver.omega,
                omegaUnit: "radians-per-unit"
              }
            }
          };
          previousEndPose = evalSegment(placement.segment, placement.durationUnits);
          return firstSegment;
        }

        if (
          !previousEndPose ||
          !posesMatchModuloTurns(previousEndPose.handPose, placement.segment.hand.startPose) ||
          !posesMatchModuloTurns(previousEndPose.headPose, placement.segment.head.startPose)
        ) {
          throw new Error(
            `Rig ${rig.rigId} segment ${segmentIndex} cannot be represented as a continuity-first authored segment`
          );
        }

        previousEndPose = evalSegment(placement.segment, placement.durationUnits);
        return {
          kind: "continuation",
          durationUnits: placement.durationUnits,
          hand: {
            driver: {
              kind: "circle",
              omega: placement.segment.hand.driver.omega,
              omegaUnit: "radians-per-unit"
            }
          },
          head: {
            driver: {
              kind: "circle",
              omega: placement.segment.head.driver.omega,
              omegaUnit: "radians-per-unit"
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
