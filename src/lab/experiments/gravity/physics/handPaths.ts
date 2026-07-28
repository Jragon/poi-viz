import type { HandController, HandPath } from "./types";
import type { Vec2 } from "./vector2";

const TAU = Math.PI * 2;

export interface CircularHandPathConfig {
  readonly amplitude: number;
  readonly angularVelocity: number;
  readonly phase: number;
}

export type LineHandPathAxis = "horizontal" | "vertical";

export interface LineHandPathConfig {
  readonly amplitude: number;
  readonly angularVelocity: number;
  readonly phase: number;
  readonly axis: LineHandPathAxis;
}

export interface EllipseHandPathConfig {
  readonly radiusX: number;
  readonly radiusY: number;
  readonly angularVelocity: number;
  readonly angularAcceleration?: number;
  readonly phase: number;
  /** The phase at which the path's local origin is anchored. */
  readonly originPhase?: number;
  /** Global time corresponding to `phase`. Defaults to zero. */
  readonly timeOrigin?: number;
}

export interface PhaseLockedEllipseControllerConfig {
  readonly radiusX: number;
  readonly radiusY: number;
  readonly baseAngularVelocity: number;
  readonly initialPhase: number;
  readonly phaseOffset: number;
  readonly phaseGain: number;
  readonly maxRateCorrection: number;
  readonly maxRateAcceleration: number;
}

export interface ConstantSpeedEllipseControllerConfig {
  readonly radiusX: number;
  readonly radiusY: number;
  readonly gravity: number;
  readonly tetherLength: number;
  readonly targetAngularVelocity: number;
  readonly baseAngularVelocity: number;
  readonly initialPhase: number;
  readonly speedGain: number;
  readonly integralGain: number;
  readonly integralLimit: number;
  readonly maxRateCorrection: number;
  readonly maxPhaseAcceleration: number;
}

/**
 * A small circular wrist path whose origin is the hand's exact starting point.
 * The offset circle keeps the authored initial hand position at (0, 0), which
 * makes it easy to compare against the fixed-hand trace.
 */
export function createCircularHandPath(config: CircularHandPathConfig): HandPath {
  return createEllipseHandPath({
    radiusX: config.amplitude,
    radiusY: config.amplitude,
    angularVelocity: config.angularVelocity,
    phase: config.phase
  });
}

export function createEllipseHandPath(config: EllipseHandPathConfig): HandPath {
  const initialPhase = config.phase;
  const originPhase = config.originPhase ?? initialPhase;
  const timeOrigin = config.timeOrigin ?? 0;
  const originCosine = Math.cos(originPhase);
  const originSine = Math.sin(originPhase);
  return {
    sample: (time) => {
      const elapsed = time - timeOrigin;
      const angularAcceleration = config.angularAcceleration ?? 0;
      const phase = initialPhase +
        config.angularVelocity * elapsed +
        0.5 * angularAcceleration * elapsed * elapsed;
      const cosine = Math.cos(phase);
      const sine = Math.sin(phase);
      const phaseRate = config.angularVelocity + angularAcceleration * elapsed;
      const position: Vec2 = {
        x: config.radiusX * (cosine - originCosine),
        y: config.radiusY * (sine - originSine)
      };
      const velocity: Vec2 = {
        x: -config.radiusX * phaseRate * sine,
        y: config.radiusY * phaseRate * cosine
      };
      const acceleration: Vec2 = {
        x: -config.radiusX * (phaseRate * phaseRate * cosine + angularAcceleration * sine),
        y: config.radiusY * (-(phaseRate * phaseRate) * sine + angularAcceleration * cosine)
      };
      return { position, velocity, acceleration };
    }
  };
}

function wrapPhase(value: number): number {
  let result = value;
  while (result > Math.PI) result -= TAU;
  while (result < -Math.PI) result += TAU;
  return result;
}

/**
 * A small phase-locked ellipse. The controller is intentionally a simple
 * proportional phase loop: it changes the carrier's angular velocity, never
 * teleports its phase, and leaves speed/energy regulation for a later
 * controller. One analytic path is produced per physics step so the existing
 * RK4 and taut/slack event machinery can remain deterministic.
 */
export function createPhaseLockedEllipseController(
  config: PhaseLockedEllipseControllerConfig
): HandController {
  const correctionLimit = Math.max(0, config.maxRateCorrection);
  const minimumRate = config.baseAngularVelocity - correctionLimit;
  const maximumRate = config.baseAngularVelocity + correctionLimit;
  return {
    initialize: () => ({
      phase: config.initialPhase,
      angularVelocity: config.baseAngularVelocity,
      angularAcceleration: 0
    }),
    pathForStep: (state, time) => createEllipseHandPath({
      radiusX: config.radiusX,
      radiusY: config.radiusY,
      angularVelocity: state.angularVelocity,
      angularAcceleration: state.angularAcceleration,
      phase: state.phase,
      originPhase: config.initialPhase,
      timeOrigin: time
    }),
    advance: (state, observation, duration) => {
      const nextPhase = state.phase +
        state.angularVelocity * duration +
        0.5 * state.angularAcceleration * duration * duration;
      const nextAngularVelocity = state.angularVelocity + state.angularAcceleration * duration;
      const phaseError = wrapPhase(
        observation.theta - nextPhase - config.phaseOffset
      );
      const requestedRate = config.baseAngularVelocity + config.phaseGain * phaseError;
      const nextRate = Math.min(maximumRate, Math.max(minimumRate, requestedRate));
      const accelerationLimit = Math.max(0, config.maxRateAcceleration);
      const requestedAcceleration = (nextRate - nextAngularVelocity) / Math.max(duration, 1e-12);
      const nextAcceleration = Math.min(
        accelerationLimit,
        Math.max(-accelerationLimit, requestedAcceleration)
      );
      return {
        phase: nextPhase,
        angularVelocity: nextAngularVelocity,
        angularAcceleration: nextAcceleration
      };
    }
  };
}

/**
 * Ellipse actuator with a constant-relative-angular-speed objective. The
 * gravity term is fed forward through the tangential equation, then a bounded
 * PI correction handles the residual speed error. The controller changes the
 * ellipse phase acceleration; it does not apply an artificial torque directly
 * to the poi.
 */
export function createConstantSpeedEllipseController(
  config: ConstantSpeedEllipseControllerConfig
): HandController {
  const integralLimit = Math.max(0, config.integralLimit);
  const accelerationLimit = Math.max(0, config.maxPhaseAcceleration);
  const rateCorrectionLimit = Math.max(0, config.maxRateCorrection);
  const minimumRate = config.baseAngularVelocity - rateCorrectionLimit;
  const maximumRate = config.baseAngularVelocity + rateCorrectionLimit;
  const clamp = (value: number, minimum: number, maximum: number) =>
    Math.min(maximum, Math.max(minimum, value));

  return {
    initialize: () => ({
      phase: config.initialPhase,
      angularVelocity: config.baseAngularVelocity,
      angularAcceleration: 0,
      integralError: 0
    }),
    pathForStep: (state, time) => createEllipseHandPath({
      radiusX: config.radiusX,
      radiusY: config.radiusY,
      angularVelocity: state.angularVelocity,
      angularAcceleration: state.angularAcceleration,
      phase: state.phase,
      originPhase: config.initialPhase,
      timeOrigin: time
    }),
    advance: (state, observation, duration) => {
      const nextPhase = state.phase +
        state.angularVelocity * duration +
        0.5 * state.angularAcceleration * duration * duration;
      const nextAngularVelocity = clamp(
        state.angularVelocity + state.angularAcceleration * duration,
        minimumRate,
        maximumRate
      );
      if (observation.mode === "slack") {
        return {
          phase: nextPhase,
          angularVelocity: nextAngularVelocity,
          angularAcceleration: 0,
          integralError: state.integralError ?? 0
        };
      }

      const speedError = config.targetAngularVelocity - observation.angularVelocity;
      const nextIntegral = clamp(
        (state.integralError ?? 0) + speedError * duration,
        -integralLimit,
        integralLimit
      );
      const desiredAngularAcceleration =
        config.speedGain * speedError + config.integralGain * nextIntegral;
      const desiredTangentialHandAcceleration =
        -config.gravity * Math.sin(observation.theta) -
        config.tetherLength * desiredAngularAcceleration;

      const phase = nextPhase;
      const cosine = Math.cos(phase);
      const sine = Math.sin(phase);
      const angularSpeedSquared = nextAngularVelocity * nextAngularVelocity;
      const tangentX = Math.cos(observation.theta);
      const tangentY = Math.sin(observation.theta);
      const baseAccelerationX = -config.radiusX * cosine * angularSpeedSquared;
      const baseAccelerationY = -config.radiusY * sine * angularSpeedSquared;
      const phaseAccelerationX = -config.radiusX * sine;
      const phaseAccelerationY = config.radiusY * cosine;
      const baseTangentialAcceleration =
        baseAccelerationX * tangentX + baseAccelerationY * tangentY;
      const phaseAccelerationProjection =
        phaseAccelerationX * tangentX + phaseAccelerationY * tangentY;
      const requestedPhaseAcceleration = Math.abs(phaseAccelerationProjection) > 1e-8
        ? (desiredTangentialHandAcceleration - baseTangentialAcceleration) /
          phaseAccelerationProjection
        : 0;

      return {
        phase: nextPhase,
        angularVelocity: nextAngularVelocity,
        angularAcceleration: clamp(
          requestedPhaseAcceleration,
          -accelerationLimit,
          accelerationLimit
        ),
        integralError: nextIntegral
      };
    }
  };
}

export function createLineHandPath(config: LineHandPathConfig): HandPath {
  const ellipse = createEllipseHandPath({
    radiusX: config.axis === "horizontal" ? config.amplitude : 0,
    radiusY: config.axis === "vertical" ? config.amplitude : 0,
    angularVelocity: config.angularVelocity,
    phase: config.phase
  });
  return ellipse;
}

export function circularHandPeriod(angularVelocity: number): number {
  return TAU / Math.abs(angularVelocity);
}
