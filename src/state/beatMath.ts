/**
 * Normalizes beat time into a single loop interval `[0, loopBeats)`.
 *
 * @param tBeats Beat-domain value to wrap.
 * @param loopBeats Loop size in beats.
 * @returns Wrapped beat in loop domain, or `0` when loop is non-positive.
 */
export function normalizeLoopBeat(tBeats: number, loopBeats: number): number {
  if (loopBeats <= 0) {
    return 0;
  }
  const normalized = tBeats % loopBeats;
  return normalized < 0 ? normalized + loopBeats : normalized;
}
