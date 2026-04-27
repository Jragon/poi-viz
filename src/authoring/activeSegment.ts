import type { TimeUnit } from "@/engine/types";

export interface ActiveSegmentBoundary {
  readonly startUnit: TimeUnit;
  readonly endUnit: TimeUnit;
}

/**
 * Returns the index of the boundary whose half-open interval [startUnit, endUnit)
 * contains `time` (wrapped to the total track duration). Returns -1 if the track is
 * empty or has zero duration.
 */
export function findActiveSegmentIndex(
  boundaries: readonly ActiveSegmentBoundary[],
  time: TimeUnit
): number {
  if (boundaries.length === 0) {
    return -1;
  }

  const totalDuration = boundaries[boundaries.length - 1].endUnit;
  if (totalDuration <= 0) {
    return -1;
  }

  const wrappedTime = ((time % totalDuration) + totalDuration) % totalDuration;
  return boundaries.findIndex(
    (boundary) => boundary.startUnit <= wrappedTime && wrappedTime < boundary.endUnit
  );
}
