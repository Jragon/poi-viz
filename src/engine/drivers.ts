import type { Driver, RelativeNodePose, TimeUnit } from "@/engine/types";

export function evalDriver(
  driver: Driver,
  startPose: RelativeNodePose,
  tLocal: TimeUnit
): RelativeNodePose {
  switch (driver.kind) {
    case "circle":
      return {
        phaseAbs: startPose.phaseAbs + driver.omega * tLocal,
        radius: startPose.radius
      };
  }
}
