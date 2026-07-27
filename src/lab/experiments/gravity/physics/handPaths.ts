import type { HandPath } from "./types";
import type { Vec2 } from "./vector2";

const TAU = Math.PI * 2;

export interface CircularHandPathConfig {
  readonly amplitude: number;
  readonly angularVelocity: number;
  readonly phase: number;
}

/**
 * A small circular wrist path whose origin is the hand's exact starting point.
 * The offset circle keeps the authored initial hand position at (0, 0), which
 * makes it easy to compare against the fixed-hand trace.
 */
export function createCircularHandPath(config: CircularHandPathConfig): HandPath {
  const initialPhase = config.phase;
  const initialCosine = Math.cos(initialPhase);
  const initialSine = Math.sin(initialPhase);
  return {
    sample: (time) => {
      const phase = initialPhase + config.angularVelocity * time;
      const cosine = Math.cos(phase);
      const sine = Math.sin(phase);
      const velocityScale = config.amplitude * config.angularVelocity;
      const accelerationScale = config.amplitude * config.angularVelocity ** 2;
      const position: Vec2 = {
        x: config.amplitude * (cosine - initialCosine),
        y: config.amplitude * (sine - initialSine)
      };
      const velocity: Vec2 = {
        x: -velocityScale * sine,
        y: velocityScale * cosine
      };
      const acceleration: Vec2 = {
        x: -accelerationScale * cosine,
        y: -accelerationScale * sine
      };
      return { position, velocity, acceleration };
    }
  };
}

export function circularHandPeriod(angularVelocity: number): number {
  return TAU / Math.abs(angularVelocity);
}
