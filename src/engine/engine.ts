import { evalDriver } from "./drivers";
import { RelativeRigPose, Segment, TimeUnit } from "./types";

export function evalSegment(segment: Segment, tLocal: TimeUnit): RelativeRigPose {
  return {
    handPose: evalDriver(segment.hand.driver, segment.hand.startPose, tLocal),
    headPose: evalDriver(segment.head.driver, segment.head.startPose, tLocal)
  };
}
