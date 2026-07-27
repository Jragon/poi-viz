import type { IdealTetherSample } from "./types";
import { add, scale, type Vec2, ZERO } from "./vector2";

const TAU = Math.PI * 2;
const DEFAULT_STEPS = 480;

export interface ConstantSpeedCircleConfig {
  readonly length: number;
  readonly mass: number;
  readonly gravity: number;
  /** Tangential speed divided by sqrt(gL). */
  readonly normalizedSpeed: number;
  /** Positive follows increasing theta from the bottom; negative reverses it. */
  readonly direction: 1 | -1;
  readonly steps?: number;
}

export interface ConstantSpeedCircleTrace {
  readonly config: ConstantSpeedCircleConfig;
  readonly samples: readonly IdealTetherSample[];
  readonly period: number;
  readonly minimumTension: number;
  readonly maximumTension: number;
  readonly positiveWork: number;
  readonly negativeWork: number;
  readonly absoluteWork: number;
  readonly topTension: number;
  readonly tautThroughout: boolean;
}

function radialBasis(theta: number): { readonly er: Vec2; readonly et: Vec2 } {
  return {
    er: { x: Math.sin(theta), y: -Math.cos(theta) },
    et: { x: Math.cos(theta), y: Math.sin(theta) }
  };
}

function makeSample(
  config: ConstantSpeedCircleConfig,
  time: number,
  omega: number,
  cumulativePositiveWork: number,
  cumulativeNegativeWork: number
): IdealTetherSample {
  const theta = omega * time;
  const { er, et } = radialBasis(theta);
  const speed = Math.abs(omega) * config.length;
  const position = scale(er, config.length);
  const velocity = scale(et, config.length * omega);
  const tension = config.mass * (config.length * omega * omega + config.gravity * Math.cos(theta));
  const torque = config.mass * config.gravity * config.length * Math.sin(theta);
  const gravityPower = -torque * omega;
  const energy =
    0.5 * config.mass * speed * speed +
    config.mass * config.gravity * config.length * (1 - Math.cos(theta));

  return {
    time,
    mode: tension >= 0 ? "taut" : "slack",
    theta,
    angularVelocity: omega,
    relativeSpeed: speed,
    normalizedRelativeSpeed: config.normalizedSpeed,
    worldSpeed: speed,
    normalizedWorldSpeed: config.normalizedSpeed,
    radiusRatio: 1,
    tension,
    normalizedTension: tension / (config.mass * config.gravity),
    normalizedTorque: Math.sin(theta),
    normalizedPower: Math.sin(theta) * config.normalizedSpeed * config.direction,
    mechanicalEnergy: energy,
    normalizedEnergy: energy / (config.mass * config.gravity * config.length),
    gravityPower,
    normalizedGravityPower: gravityPower /
      (config.mass * config.gravity * Math.sqrt(config.gravity * config.length)),
    handPosition: ZERO,
    handVelocity: ZERO,
    poiPosition: position,
    poiVelocity: add(ZERO, velocity),
    relativeRadius: config.length,
    handPower: 0,
    normalizedHandPower: 0,
    drivePower: -gravityPower,
    normalizedDrivePower: (torque * omega) /
      (config.mass * config.gravity * Math.sqrt(config.gravity * config.length)),
    radialHandVelocity: 0,
    normalizedRadialHandVelocity: 0,
    tangentialHandAcceleration: 0,
    normalizedTangentialHandAcceleration: 0,
    radialHandAcceleration: 0,
    normalizedRadialHandAcceleration: 0,
    cumulativeHandPositiveWork: 0,
    cumulativeHandNegativeWork: 0,
    cumulativeDrivePositiveWork: cumulativePositiveWork,
    cumulativeDriveNegativeWork: cumulativeNegativeWork
  };
}

export function simulateConstantSpeedCircle(config: ConstantSpeedCircleConfig): ConstantSpeedCircleTrace {
  const omegaMagnitude = config.normalizedSpeed * Math.sqrt(config.gravity / config.length);
  const omega = config.direction * omegaMagnitude;
  const period = TAU / omegaMagnitude;
  const steps = Math.max(24, Math.floor(config.steps ?? DEFAULT_STEPS));
  const timestep = period / steps;
  const samples: IdealTetherSample[] = [];
  let positiveWork = 0;
  let negativeWork = 0;
  let previousSample = makeSample(config, 0, omega, 0, 0);
  samples.push(previousSample);

  for (let index = 1; index <= steps; index += 1) {
    const time = index * timestep;
    const sample = makeSample(config, time, omega, positiveWork, negativeWork);
    const averagePower = (previousSample.drivePower + sample.drivePower) * 0.5;
    if (averagePower >= 0) positiveWork += averagePower * timestep;
    else negativeWork += averagePower * timestep;
    const withWork = {
      ...sample,
      cumulativeDrivePositiveWork: positiveWork,
      cumulativeDriveNegativeWork: negativeWork
    };
    samples.push(withWork);
    previousSample = withWork;
  }

  const tensions = samples.map((sample) => sample.normalizedTension);
  const topTension = config.mass * (config.length * omega * omega - config.gravity) /
    (config.mass * config.gravity);
  return {
    config,
    samples,
    period,
    minimumTension: Math.min(...tensions),
    maximumTension: Math.max(...tensions),
    positiveWork,
    negativeWork,
    absoluteWork: positiveWork - negativeWork,
    topTension,
    tautThroughout: topTension >= 0
  };
}
