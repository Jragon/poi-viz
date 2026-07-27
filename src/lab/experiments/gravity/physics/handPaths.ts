import type { HandPath } from "./types";
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
  readonly phase: number;
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
  const initialCosine = Math.cos(initialPhase);
  const initialSine = Math.sin(initialPhase);
  return {
    sample: (time) => {
      const phase = initialPhase + config.angularVelocity * time;
      const cosine = Math.cos(phase);
      const sine = Math.sin(phase);
      const velocityScaleX = config.radiusX * config.angularVelocity;
      const velocityScaleY = config.radiusY * config.angularVelocity;
      const accelerationScaleX = config.radiusX * config.angularVelocity ** 2;
      const accelerationScaleY = config.radiusY * config.angularVelocity ** 2;
      const position: Vec2 = {
        x: config.radiusX * (cosine - initialCosine),
        y: config.radiusY * (sine - initialSine)
      };
      const velocity: Vec2 = {
        x: -velocityScaleX * sine,
        y: velocityScaleY * cosine
      };
      const acceleration: Vec2 = {
        x: -accelerationScaleX * cosine,
        y: -accelerationScaleY * sine
      };
      return { position, velocity, acceleration };
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
