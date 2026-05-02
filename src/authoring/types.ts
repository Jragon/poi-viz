import type { MultiRigSequence, PlaneId, RelativeRigPose, Segment, TimeUnit } from "@/engine/types";

export type AuthoredTrackId = "left" | "right";

export type AuthoredOmegaUnit = "circles-per-unit" | "radians-per-unit";

export interface AuthoredNodeStartPose {
  phaseDeg: number;
  radius: number;
}

export interface AuthoredCircleDriverInput {
  kind: "circle";
  omega: number;
  omegaUnit: AuthoredOmegaUnit;
}

export interface AuthoredRadiusProfileKey {
  t: TimeUnit;
  radius: number;
}

export interface AuthoredRadiusProfileInput {
  kind: "time-keyed";
  keys: AuthoredRadiusProfileKey[];
}

export interface AuthoredFirstSegment {
  kind: "first";
  durationUnits: TimeUnit;
  planeId?: PlaneId;
  hand: {
    startPose: AuthoredNodeStartPose;
    driver: AuthoredCircleDriverInput;
    radiusProfile?: AuthoredRadiusProfileInput;
  };
  head: {
    startPose: AuthoredNodeStartPose;
    driver: AuthoredCircleDriverInput;
    radiusProfile?: AuthoredRadiusProfileInput;
  };
}

export interface AuthoredContinuationSegment {
  kind: "continuation";
  durationUnits: TimeUnit;
  planeId?: PlaneId;
  hand: {
    driver: AuthoredCircleDriverInput;
    radiusProfile?: AuthoredRadiusProfileInput;
  };
  head: {
    driver: AuthoredCircleDriverInput;
    radiusProfile?: AuthoredRadiusProfileInput;
  };
}

export type AuthoredSegment = AuthoredFirstSegment | AuthoredContinuationSegment;

export interface AuthoredTrack {
  segments: AuthoredSegment[];
}

export interface AuthoredSequenceDocument {
  name: string;
  description: string | null;
  tracks: Partial<Record<AuthoredTrackId, AuthoredTrack>>;
}

export interface AuthoredDocumentEntry {
  id: string;
  document: AuthoredSequenceDocument;
}

export interface AuthoredDocumentLibrarySnapshot {
  documents: AuthoredDocumentEntry[];
  selectedDocumentId: string | null;
}

export type AuthoredDocumentValidationErrorCode =
  | "EMPTY_DOCUMENT"
  | "EMPTY_TRACK"
  | "INVALID_SEGMENT_KIND"
  | "INVALID_DURATION_UNITS"
  | "NON_POSITIVE_DURATION"
  | "INVALID_PHASE_DEGREES"
  | "INVALID_RADIUS"
  | "INVALID_RADIUS_PROFILE"
  | "INVALID_PLANE_ID"
  | "UNSUPPORTED_PLANE_BREAK"
  | "PLANE_BREAK_INVALID_HAND_ALIGNMENT"
  | "PLANE_BREAK_INVALID_HEAD_ALIGNMENT"
  | "INVALID_OMEGA";

export interface AuthoredDocumentValidationError {
  code: AuthoredDocumentValidationErrorCode;
  trackId?: AuthoredTrackId;
  segmentIndex?: number;
  node?: "hand" | "head";
}

export type AuthoredDocumentValidationResult =
  | { ok: true }
  | { ok: false; errors: AuthoredDocumentValidationError[] };

export interface DerivedAuthoredSegmentBoundary {
  trackId: AuthoredTrackId;
  segmentIndex: number;
  startUnit: TimeUnit;
  endUnit: TimeUnit;
  startPose: RelativeRigPose;
  endPose: RelativeRigPose;
  planeId: PlaneId;
  segment: Segment;
}

export type DerivedBoundaryMap = Partial<Record<AuthoredTrackId, DerivedAuthoredSegmentBoundary[]>>;

export type CompileAuthoredDocumentResult =
  | {
      ok: true;
      sequence: MultiRigSequence;
      boundariesByTrack: DerivedBoundaryMap;
    }
  | {
      ok: false;
      errors: AuthoredDocumentValidationError[];
    };
