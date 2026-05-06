import type { Driver, RadiusProfile, RelativeNodePose, TimeUnit, Vec2 } from "@/engine/types";

const ORIGIN_EPSILON = 1e-12;

export interface DriverEvalContext {
  tLocal: TimeUnit;
  durationUnits: TimeUnit;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function polarToCartesian(pose: RelativeNodePose): Vec2 {
  return {
    x: pose.radius * Math.cos(pose.phaseAbs),
    y: pose.radius * Math.sin(pose.phaseAbs)
  };
}

function cartesianToPolar(point: Vec2, fallbackPhaseAbs: number): RelativeNodePose {
  const radius = Math.hypot(point.x, point.y);
  if (radius <= ORIGIN_EPSILON) {
    return { phaseAbs: fallbackPhaseAbs, radius: 0 };
  }

  return {
    phaseAbs: Math.atan2(point.y, point.x),
    radius
  };
}

export function evalRadiusProfile(
  radiusProfile: RadiusProfile | undefined,
  startRadius: number,
  tLocal: TimeUnit
): number {
  const keys = radiusProfile?.keys ?? [];
  if (keys.length === 0 || tLocal <= 0) {
    return startRadius;
  }

  let previousT = 0;
  let previousRadius = startRadius;

  for (const key of keys) {
    if (tLocal <= key.t) {
      const span = key.t - previousT;
      if (span <= 0) {
        return key.radius;
      }

      const progress = (tLocal - previousT) / span;
      return previousRadius + (key.radius - previousRadius) * progress;
    }

    previousT = key.t;
    previousRadius = key.radius;
  }

  return previousRadius;
}

export function evalDriver(
  driver: Driver,
  startPose: RelativeNodePose,
  context: DriverEvalContext
): RelativeNodePose {
  switch (driver.kind) {
    case "circle":
      return {
        phaseAbs: startPose.phaseAbs + driver.omega * context.tLocal,
        radius: evalRadiusProfile(driver.radiusProfile, startPose.radius, context.tLocal)
      };
    case "point-to-point": {
      const progress = clamp01(context.tLocal / context.durationUnits);
      if (progress <= 0) return startPose;
      if (progress >= 1) return driver.endPose;

      const startPoint = polarToCartesian(startPose);
      const endPoint = polarToCartesian(driver.endPose);
      const point = {
        x: startPoint.x + (endPoint.x - startPoint.x) * progress,
        y: startPoint.y + (endPoint.y - startPoint.y) * progress
      };

      return cartesianToPolar(point, startPose.phaseAbs);
    }
  }

  const exhaustive: never = driver;
  return exhaustive;
}
