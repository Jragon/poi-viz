import { evalDriver } from "@/engine/drivers";
import type { RelativeRigPose, Segment, TimeUnit } from "@/engine/types";

export function evalSegment(segment: Segment, tLocal: TimeUnit): RelativeRigPose {
  return {
    handPose: evalDriver(
      segment.hand.driver,
      segment.hand.startPose,
      tLocal,
      segment.hand.radiusProfile
    ),
    headPose: evalDriver(
      segment.head.driver,
      segment.head.startPose,
      tLocal,
      segment.head.radiusProfile
    )
  };
}
