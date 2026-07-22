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

export interface WorldRigPose {
  handPosition: Vec3;
  headPosition: Vec3;
  planeId: PlaneId;
  planeSide?: PlaneSide;
  behindBody?: boolean;
  segmentIndex?: number;
  tLocal?: TimeUnit;
}

export type MultiRigPose = Record<RigId, RelativeRigPose>;

export type CartesianMultiRigPose = Record<RigId, CartesianRigPose>;

export type WorldMultiRigPose = Record<RigId, WorldRigPose>;

export interface CircleDriver {
  kind: "circle";
  omega: AngularVelocityRadPerUnit;
  radiusProfile?: RadiusProfile;
}

export interface PendulumDriver {
  kind: "pendulum";
  amplitudeRad: AngleRad;
  cyclesPerUnit: number;
  swingPhaseRad: AngleRad;
}

export interface DriverEvalContext {
  tLocal: TimeUnit;
  durationUnits: TimeUnit;
}

export interface PointToPointDriver {
  kind: "point-to-point";
  endPose: RelativeNodePose;
}

export interface RuntimeDriver {
  kind: "runtime";
  label: string;
  evalPose: (startPose: RelativeNodePose, context: DriverEvalContext) => RelativeNodePose;
}

export type HandDriver = CircleDriver | PendulumDriver | PointToPointDriver | RuntimeDriver;

export type HeadDriver = CircleDriver | PendulumDriver | RuntimeDriver;

export type Driver = HandDriver;

interface SegmentNodeMotionBase {
  startPose: RelativeNodePose;
}

export interface HandSegmentNodeMotion extends SegmentNodeMotionBase {
  driver: HandDriver;
}

export interface HeadSegmentNodeMotion extends SegmentNodeMotionBase {
  driver: HeadDriver;
}

export interface Segment {
  durationUnits: TimeUnit;
  planeId?: PlaneId;
  planeSide?: PlaneSide;
  behindBody?: boolean;
  hand: HandSegmentNodeMotion;
  head: HeadSegmentNodeMotion;
}

export interface SequenceSpec {
  segments: Segment[];
}

export interface RigSequenceEntry {
  rigId: RigId;
  sequence: SequenceSpec;
}

export interface MultiRigSequence {
  rigs: RigSequenceEntry[];
}
