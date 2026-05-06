export type AngleRad = number;

export type TimeUnit = number;

export type RigId = string;

export type PlaneId = "wall" | "wheel" | "floor";

export type PlaneSide = "a" | "b";

export type AngularVelocityRadPerUnit = number;

export type Radius = number;

export interface RadiusProfileKey {
  t: TimeUnit;
  radius: Radius;
}

export interface RadiusProfile {
  kind: "time-keyed";
  keys: RadiusProfileKey[];
}

export type Vec2 = { x: number; y: number };

export type Vec3 = { x: number; y: number; z: number };

export interface RelativeNodePose {
  // absolute world phase
  phaseAbs: AngleRad;
  radius: Radius;
}

// used internally
export interface RelativeRigPose {
  handPose: RelativeNodePose;
  headPose: RelativeNodePose;
}

// used to draw on canvas.
export interface CartesianRigPose {
  handPosition: Vec2;
  headPosition: Vec2;
}

export type MultiRigPose = Record<RigId, RelativeRigPose>;

export type CartesianMultiRigPose = Record<RigId, CartesianRigPose>;

export type Driver = {
  kind: "circle";
  omega: AngularVelocityRadPerUnit;
};

export interface SegmentNodeMotion {
  startPose: RelativeNodePose;
  driver: Driver;
  radiusProfile?: RadiusProfile;
}

export interface Segment {
  hand: SegmentNodeMotion;
  head: SegmentNodeMotion;
}

export interface SegmentPlacement {
  segment: Segment;
  durationUnits: TimeUnit;
  planeId?: PlaneId;
  planeSide?: PlaneSide;
}

export interface SequenceSpec {
  segments: SegmentPlacement[];
}

export interface RigSequenceEntry {
  rigId: RigId;
  sequence: SequenceSpec;
}

export interface MultiRigSequence {
  rigs: RigSequenceEntry[];
}
