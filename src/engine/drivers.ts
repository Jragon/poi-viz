import type { Driver, RadiusProfile, RelativeNodePose, TimeUnit } from "@/engine/types";

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
  tLocal: TimeUnit,
  radiusProfile?: RadiusProfile
): RelativeNodePose {
  switch (driver.kind) {
    case "circle":
      return {
        phaseAbs: startPose.phaseAbs + driver.omega * tLocal,
        radius: evalRadiusProfile(radiusProfile, startPose.radius, tLocal)
      };
  }
}
