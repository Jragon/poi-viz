import { evalDriver } from "@/engine/drivers";
import type { RelativeRigPose, Segment, TimeUnit } from "@/engine/types";

export function evalSegment(segment: Segment, tLocal: TimeUnit): RelativeRigPose {
  const context = { tLocal, durationUnits: segment.durationUnits };

  return {
    handPose: evalDriver(segment.hand.driver, segment.hand.startPose, context),
    headPose: evalDriver(segment.head.driver, segment.head.startPose, context)
  };
}
