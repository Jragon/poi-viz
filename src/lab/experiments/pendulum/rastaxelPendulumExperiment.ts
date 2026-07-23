import type {
  DriverEvalContext,
  MultiRigSequence,
  RelativeNodePose,
  RuntimeDriver
} from "@/engine/types";

import {
  createDefaultCirclePendulumExperiment,
  sampleCirclePendulumMotion,
  type MotionDirection,
  type PendulumCurveKind
} from "./circlePendulumExperiment";

const TAU = Math.PI * 2;
const DOWN_PHASE = -Math.PI / 2;

export const RASTAXEL_DURATION_UNITS = 2;
export const RASTAXEL_STEP_COUNT = 8;
export const RASTAXEL_STEP_DURATION = RASTAXEL_DURATION_UNITS / RASTAXEL_STEP_COUNT;

export type RastaxelHand = "left" | "right";
export type RastaxelFlow = "inwards" | "outwards";

export interface RastaxelPendulumExperimentConfig {
  readonly amplitudeRad: number;
  /** Anatomical flow for each hand; each flow resolves to a handed phase direction. */
  readonly leftFlow: RastaxelFlow;
  readonly rightFlow: RastaxelFlow;
  readonly curve: PendulumCurveKind;
  readonly rightOffsetSteps: number;
}

export type RastaxelMotionSegment = "pendulum" | "circle";

export interface RastaxelMotionSample {
  readonly time: number;
  readonly motifTime: number;
  readonly phaseAbs: number;
  readonly angularVelocity: number;
  readonly speedInExtensions: number;
  readonly segment: RastaxelMotionSegment;
}

function wrapMotifTime(value: number): number {
  return ((value % RASTAXEL_DURATION_UNITS) + RASTAXEL_DURATION_UNITS) % RASTAXEL_DURATION_UNITS;
}

export function resolveRastaxelDirection(hand: RastaxelHand, flow: RastaxelFlow): MotionDirection {
  const inwardDirection: MotionDirection = hand === "left" ? -1 : 1;
  if (flow === "inwards") return inwardDirection;
  return inwardDirection === 1 ? -1 : 1;
}

function normalizedConfig(config: RastaxelPendulumExperimentConfig, hand: RastaxelHand) {
  const flow = hand === "left" ? config.leftFlow : config.rightFlow;
  const direction = resolveRastaxelDirection(hand, flow);
  return {
    amplitudeRad: config.amplitudeRad,
    circleCyclesPerUnit: 1,
    pendulumCyclesPerUnit: 1,
    circleDirection: direction,
    pendulumDirection: direction,
    curve: config.curve
  };
}

export function sampleRastaxelPendulumMotion(
  config: RastaxelPendulumExperimentConfig,
  time: number,
  offsetSteps = 0,
  hand: RastaxelHand = "left"
): RastaxelMotionSample {
  const motifTime = wrapMotifTime(time + offsetSteps * RASTAXEL_STEP_DURATION);
  const direction = resolveRastaxelDirection(
    hand,
    hand === "left" ? config.leftFlow : config.rightFlow
  );

  if (motifTime < 1) {
    const sample = sampleCirclePendulumMotion(normalizedConfig(config, hand), motifTime);
    const angularVelocity = sample.pendulumAngularVelocity;
    return {
      time,
      motifTime,
      phaseAbs: sample.pendulumPhaseAbs,
      angularVelocity,
      speedInExtensions: Math.abs(angularVelocity) / TAU,
      segment: "pendulum"
    };
  }

  const circleTime = motifTime - 1;
  const angularVelocity = direction * TAU;
  return {
    time,
    motifTime,
    phaseAbs: DOWN_PHASE + angularVelocity * circleTime,
    angularVelocity,
    speedInExtensions: Math.abs(angularVelocity) / TAU,
    segment: "circle"
  };
}

function createRastaxelRuntimeDriver(
  config: RastaxelPendulumExperimentConfig,
  offsetSteps: number,
  segmentStartTime: number,
  hand: RastaxelHand
): RuntimeDriver {
  const segmentStart = sampleRastaxelPendulumMotion(config, segmentStartTime, offsetSteps, hand);

  return {
    kind: "runtime",
    label: `rastaxel-pendulum-step-${Math.round(segmentStart.motifTime / RASTAXEL_STEP_DURATION) % RASTAXEL_STEP_COUNT}`,
    evalPose: (startPose: RelativeNodePose, context: DriverEvalContext) => {
      const sample = sampleRastaxelPendulumMotion(
        config,
        segmentStartTime + context.tLocal,
        offsetSteps,
        hand
      );
      return {
        phaseAbs: startPose.phaseAbs + sample.phaseAbs - segmentStart.phaseAbs,
        radius: startPose.radius
      };
    }
  };
}

export function buildRastaxelPendulumExperiment(
  config: RastaxelPendulumExperimentConfig
): MultiRigSequence {
  const makeRig = (rigId: RastaxelHand, offsetSteps: number) => ({
    rigId,
    sequence: {
      segments: Array.from({ length: RASTAXEL_STEP_COUNT }, (_, index) => {
        const segmentStartTime = index * RASTAXEL_STEP_DURATION;
        const startSample = sampleRastaxelPendulumMotion(
          config,
          segmentStartTime,
          offsetSteps,
          rigId
        );

        return {
          durationUnits: RASTAXEL_STEP_DURATION,
          planeId: "wall" as const,
          hand: {
            startPose: { phaseAbs: DOWN_PHASE, radius: 0.5 },
            driver: { kind: "circle" as const, omega: 0 }
          },
          head: {
            startPose: { phaseAbs: startSample.phaseAbs, radius: 1 },
            driver: createRastaxelRuntimeDriver(config, offsetSteps, segmentStartTime, rigId)
          }
        };
      })
    }
  });

  return {
    rigs: [makeRig("left", 0), makeRig("right", config.rightOffsetSteps)]
  };
}

export function createDefaultRastaxelPendulumExperiment(): RastaxelPendulumExperimentConfig {
  const defaults = createDefaultCirclePendulumExperiment();
  return {
    amplitudeRad: defaults.amplitudeRad,
    leftFlow: "inwards",
    rightFlow: "inwards",
    curve: defaults.curve,
    rightOffsetSteps: 4
  };
}
