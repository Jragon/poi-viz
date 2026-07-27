import type { Vec2 } from "./vector2";

export interface HandKinematics {
  readonly position: Vec2;
  readonly velocity: Vec2;
  readonly acceleration: Vec2;
}

export interface HandPath {
  readonly sample: (time: number) => HandKinematics;
}

export interface IdealTetherConfig {
  readonly length: number;
  readonly mass: number;
  readonly gravity: number;
  readonly timestep: number;
  readonly duration: number;
  readonly initialTheta: number;
  readonly initialAngularVelocity: number;
  readonly catchRestitution: number;
  readonly handPath?: HandPath;
  readonly driveTorque?: (time: number, theta: number, omega: number) => number;
}

export type TetherMode = "taut" | "slack";

export interface GravityTracePoint {
  readonly time: number;
  readonly mode: TetherMode;
  readonly theta: number;
  readonly angularVelocity: number;
  readonly relativeSpeed: number;
  readonly normalizedRelativeSpeed: number;
  readonly worldSpeed: number;
  readonly normalizedWorldSpeed: number;
  readonly radiusRatio: number;
  readonly tension: number;
  readonly normalizedTension: number;
  readonly normalizedTorque?: number;
  readonly normalizedPower?: number;
  readonly mechanicalEnergy: number;
  readonly normalizedEnergy: number;
  readonly gravityPower: number;
  readonly normalizedGravityPower: number;
  readonly handPower: number;
  readonly normalizedHandPower: number;
  readonly drivePower: number;
  readonly normalizedDrivePower: number;
  readonly radialHandVelocity: number;
  readonly normalizedRadialHandVelocity: number;
  readonly tangentialHandAcceleration: number;
  readonly normalizedTangentialHandAcceleration: number;
  readonly radialHandAcceleration: number;
  readonly normalizedRadialHandAcceleration: number;
}

export interface IdealTetherSample extends GravityTracePoint {
  readonly handPosition: Vec2;
  readonly handVelocity: Vec2;
  readonly poiPosition: Vec2;
  readonly poiVelocity: Vec2;
  readonly relativeRadius: number;
  readonly cumulativeHandPositiveWork: number;
  readonly cumulativeHandNegativeWork: number;
  readonly cumulativeDrivePositiveWork: number;
  readonly cumulativeDriveNegativeWork: number;
}

export type IdealTetherEventKind = "release" | "catch";

export interface IdealTetherEvent {
  readonly kind: IdealTetherEventKind;
  readonly time: number;
  readonly theta: number;
  readonly energyBefore: number;
  readonly energyAfter: number;
  readonly boundaryWork: number;
  readonly dissipatedEnergy: number;
}

export type IdealTetherClassification =
  | "pendulum"
  | "slack-and-catch"
  | "slack-loop"
  | "taut-loop"
  | "rest"
  | "invalid";

export interface IdealTetherMetrics {
  readonly classification: IdealTetherClassification;
  readonly firstReleaseTime: number | null;
  readonly catchCount: number;
  readonly minimumTension: number;
  readonly maximumTension: number;
  readonly maximumRelativeSpeed: number;
  readonly maximumWorldSpeed: number;
  readonly maximumRadiusRatio: number;
  readonly maximumUnwrappedAngle: number;
  readonly positiveHandWork: number;
  readonly negativeHandWork: number;
  readonly absoluteHandWork: number;
  readonly positiveDriveWork: number;
  readonly negativeDriveWork: number;
  readonly absoluteDriveWork: number;
  readonly catchBoundaryWork: number;
  readonly catchDissipation: number;
  readonly energyStart: number;
  readonly energyEnd: number;
  readonly energyDrift: number;
  readonly energyBalanceResidual: number;
}

export interface IdealTetherTrace {
  readonly config: IdealTetherConfig;
  readonly samples: readonly IdealTetherSample[];
  readonly events: readonly IdealTetherEvent[];
  readonly metrics: IdealTetherMetrics;
}

export type SimulationResult =
  | { readonly ok: true; readonly trace: IdealTetherTrace }
  | { readonly ok: false; readonly error: string };
