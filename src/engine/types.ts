export type AngleRad = number;

export type TimeUnit = number;

export type RigId = string;

export type AngularVelocityRadPerUnit = number;

export type Radius = number;

export type Vec2 = { x: number; y: number };

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

export interface Segment {
  hand: {
    startPose: RelativeNodePose;
    driver: Driver;
  };
  head: {
    startPose: RelativeNodePose;
    driver: Driver;
  };
}

export interface SegmentPlacement {
  segment: Segment;
  durationUnits: TimeUnit;
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
