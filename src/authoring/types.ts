import type {
  MultiRigSequence,
  PlaneId,
  PlaneSide,
  RelativeRigPose,
  Segment,
  TimeUnit
} from "@/engine/types";

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
  radiusProfile?: AuthoredRadiusProfileInput;
}

export interface AuthoredPendulumDriverInput {
  kind: "pendulum";
  amplitudeDeg: number;
  cyclesPerUnit: number;
  swingPhaseDeg: number;
}

export type AuthoredDriverInput = AuthoredCircleDriverInput | AuthoredPendulumDriverInput;
export type AuthoredDriverKind = AuthoredDriverInput["kind"];

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
  planeSide?: PlaneSide;
  hand: {
    startPose: AuthoredNodeStartPose;
    driver: AuthoredDriverInput;
  };
  head: {
    startPose: AuthoredNodeStartPose;
    driver: AuthoredDriverInput;
  };
}

export interface AuthoredContinuationSegment {
  kind: "continuation";
  durationUnits: TimeUnit;
  planeId?: PlaneId;
  planeSide?: PlaneSide;
  hand: {
    driver: AuthoredDriverInput;
  };
  head: {
    driver: AuthoredDriverInput;
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
  | "INVALID_PLANE_SIDE"
  | "UNSUPPORTED_PLANE_BREAK"
  | "PLANE_BREAK_INVALID_HAND_ALIGNMENT"
  | "PLANE_BREAK_INVALID_HEAD_ALIGNMENT"
  | "INVALID_DRIVER_KIND"
  | "INVALID_OMEGA"
  | "INVALID_PENDULUM_AMPLITUDE"
  | "INVALID_PENDULUM_CYCLES"
  | "INVALID_PENDULUM_SWING_PHASE"
  | "PENDULUM_UNSUPPORTED_PLANE"
  | "PENDULUM_HEAD_CENTER_NOT_DOWN";

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
