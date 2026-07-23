import type {
  DriverEvalContext,
  MultiRigSequence,
  RelativeNodePose,
  RuntimeDriver
} from "@/engine/types";

const TAU = Math.PI * 2;
const DOWN_PHASE = -Math.PI / 2;
const GRAVITY_TABLE_SIZE = 4096;

export type PendulumCurveKind = "gravity" | "sine" | "constant";
export type MotionDirection = -1 | 1;

export interface CirclePendulumExperimentConfig {
  readonly amplitudeRad: number;
  readonly circleCyclesPerUnit: number;
  readonly pendulumCyclesPerUnit: number;
  readonly circleDirection: MotionDirection;
  readonly pendulumDirection: MotionDirection;
  readonly curve: PendulumCurveKind;
}

export interface CirclePendulumMotionSample {
  readonly time: number;
  readonly circlePhaseAbs: number;
  readonly pendulumPhaseAbs: number;
  readonly circleAngularVelocity: number;
  readonly pendulumAngularVelocity: number;
}

interface NormalizedCurve {
  readonly position: (phase: number) => number;
  readonly velocity: (phase: number) => number;
}

const curveCache = new Map<string, NormalizedCurve>();

function wrapUnit(value: number): number {
  return ((value % 1) + 1) % 1;
}

function createSineCurve(amplitudeRad: number): NormalizedCurve {
  return {
    position: (phase) => amplitudeRad * Math.sin(TAU * phase),
    velocity: (phase) => amplitudeRad * TAU * Math.cos(TAU * phase)
  };
}

function createConstantCurve(amplitudeRad: number): NormalizedCurve {
  return {
    position: (phase) => {
      const wrapped = wrapUnit(phase);
      if (wrapped < 0.25) return amplitudeRad * wrapped * 4;
      if (wrapped < 0.75) return amplitudeRad * (2 - wrapped * 4);
      return amplitudeRad * (wrapped * 4 - 4);
    },
    velocity: (phase) => {
      const wrapped = wrapUnit(phase);
      return amplitudeRad * (wrapped < 0.25 || wrapped >= 0.75 ? 4 : -4);
    }
  };
}

function ellipticK(modulus: number): number {
  let a = 1;
  let b = Math.sqrt(1 - modulus * modulus);
  for (let iteration = 0; iteration < 12; iteration += 1) {
    const nextA = (a + b) / 2;
    const nextB = Math.sqrt(a * b);
    a = nextA;
    b = nextB;
  }
  return Math.PI / (2 * a);
}

function createGravityCurve(amplitudeRad: number): NormalizedCurve {
  const modulus = Math.sin(amplitudeRad / 2);
  const lambda = 4 * ellipticK(modulus);
  const initialVelocity = 2 * lambda * modulus;
  const step = 1 / GRAVITY_TABLE_SIZE;
  const positions = new Float64Array(GRAVITY_TABLE_SIZE + 1);
  const velocities = new Float64Array(GRAVITY_TABLE_SIZE + 1);
  let position = 0;
  let velocity = initialVelocity;

  const acceleration = (angle: number) => -lambda * lambda * Math.sin(angle);
  const advance = () => {
    const k1Position = velocity;
    const k1Velocity = acceleration(position);
    const k2Position = velocity + (step * k1Velocity) / 2;
    const k2Velocity = acceleration(position + (step * k1Position) / 2);
    const k3Position = velocity + (step * k2Velocity) / 2;
    const k3Velocity = acceleration(position + (step * k2Position) / 2);
    const k4Position = velocity + step * k3Velocity;
    const k4Velocity = acceleration(position + step * k3Position);

    position += (step / 6) * (k1Position + 2 * k2Position + 2 * k3Position + k4Position);
    velocity += (step / 6) * (k1Velocity + 2 * k2Velocity + 2 * k3Velocity + k4Velocity);
  };

  for (let index = 0; index <= GRAVITY_TABLE_SIZE; index += 1) {
    positions[index] = position;
    velocities[index] = velocity;
    if (index < GRAVITY_TABLE_SIZE) advance();
  }

  const sample = (values: Float64Array, phase: number) => {
    const wrapped = wrapUnit(phase);
    const positionInTable = wrapped * GRAVITY_TABLE_SIZE;
    const lowerIndex = Math.floor(positionInTable);
    const upperIndex = Math.min(GRAVITY_TABLE_SIZE, lowerIndex + 1);
    const progress = positionInTable - lowerIndex;
    return values[lowerIndex]! + (values[upperIndex]! - values[lowerIndex]!) * progress;
  };

  return {
    position: (phase) => sample(positions, phase),
    velocity: (phase) => sample(velocities, phase)
  };
}

function curveFor(config: CirclePendulumExperimentConfig): NormalizedCurve {
  const cacheKey = `${config.curve}:${config.amplitudeRad.toPrecision(15)}`;
  const cached = curveCache.get(cacheKey);
  if (cached) return cached;

  const curve = (() => {
    switch (config.curve) {
      case "gravity":
        return createGravityCurve(config.amplitudeRad);
      case "constant":
        return createConstantCurve(config.amplitudeRad);
      case "sine":
        return createSineCurve(config.amplitudeRad);
    }
  })();

  curveCache.set(cacheKey, curve);
  return curve;
}

function createGravityRuntimeDriver(
  curve: NormalizedCurve,
  cyclesPerUnit: number,
  direction: MotionDirection
): RuntimeDriver {
  return {
    kind: "runtime",
    label: "normalized-gravity-pendulum",
    evalPose: (startPose: RelativeNodePose, context: DriverEvalContext) => {
      const phase = cyclesPerUnit * context.tLocal;
      return {
        phaseAbs: startPose.phaseAbs + direction * curve.position(phase),
        radius: startPose.radius
      };
    }
  };
}

function createRuntimeCurveDriver(
  curve: NormalizedCurve,
  cyclesPerUnit: number,
  direction: MotionDirection
): RuntimeDriver {
  return {
    kind: "runtime",
    label: "experimental-pendulum-curve",
    evalPose: (startPose: RelativeNodePose, context: DriverEvalContext) => {
      const phase = cyclesPerUnit * context.tLocal;
      return {
        phaseAbs: startPose.phaseAbs + direction * curve.position(phase),
        radius: startPose.radius
      };
    }
  };
}

export function buildCirclePendulumExperiment(
  config: CirclePendulumExperimentConfig
): MultiRigSequence {
  const pendulumDriver = (() => {
    if (config.curve === "sine") {
      return {
        kind: "pendulum" as const,
        amplitudeRad: config.amplitudeRad,
        cyclesPerUnit: config.pendulumCyclesPerUnit,
        swingPhaseRad: config.pendulumDirection === 1 ? 0 : Math.PI
      };
    }

    if (config.curve === "gravity") {
      return createGravityRuntimeDriver(
        curveFor(config),
        config.pendulumCyclesPerUnit,
        config.pendulumDirection
      );
    }

    return createRuntimeCurveDriver(
      curveFor(config),
      config.pendulumCyclesPerUnit,
      config.pendulumDirection
    );
  })();

  return {
    rigs: [
      {
        rigId: "left",
        sequence: {
          segments: [
            {
              durationUnits: 1,
              planeId: "wall",
              hand: {
                startPose: { phaseAbs: DOWN_PHASE, radius: 0.5 },
                driver: { kind: "circle", omega: 0 }
              },
              head: {
                startPose: { phaseAbs: DOWN_PHASE, radius: 1 },
                driver: {
                  kind: "circle",
                  omega: config.circleDirection * TAU * config.circleCyclesPerUnit
                }
              }
            }
          ]
        }
      },
      {
        rigId: "right",
        sequence: {
          segments: [
            {
              durationUnits: 1,
              planeId: "wall",
              hand: {
                startPose: { phaseAbs: DOWN_PHASE, radius: 0.5 },
                driver: { kind: "circle", omega: 0 }
              },
              head: {
                startPose: { phaseAbs: DOWN_PHASE, radius: 1 },
                driver: pendulumDriver
              }
            }
          ]
        }
      }
    ]
  };
}

export function sampleCirclePendulumMotion(
  config: CirclePendulumExperimentConfig,
  time: number
): CirclePendulumMotionSample {
  const curve = curveFor(config);
  const circlePhase = config.circleDirection * TAU * config.circleCyclesPerUnit * time;
  const pendulumPhase = config.pendulumCyclesPerUnit * time;
  return {
    time,
    circlePhaseAbs: DOWN_PHASE + circlePhase,
    pendulumPhaseAbs: DOWN_PHASE + config.pendulumDirection * curve.position(pendulumPhase),
    circleAngularVelocity: config.circleDirection * TAU * config.circleCyclesPerUnit,
    pendulumAngularVelocity:
      config.pendulumDirection * config.pendulumCyclesPerUnit * curve.velocity(pendulumPhase)
  };
}

export function createDefaultCirclePendulumExperiment(): CirclePendulumExperimentConfig {
  return {
    amplitudeRad: Math.PI / 2,
    circleCyclesPerUnit: 1,
    pendulumCyclesPerUnit: 1,
    circleDirection: -1,
    pendulumDirection: 1,
    curve: "gravity"
  };
}
