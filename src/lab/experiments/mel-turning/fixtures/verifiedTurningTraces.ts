import { VERIFIED_TWO_HAND_TURNS } from "@/lab/experiments/mel-turning/fixtures/verifiedTwoHandTurns";
import type { TurningTrace } from "@/lab/experiments/mel-turning/model/turningTypes";

export const VERIFIED_TURNING_TRACES: readonly TurningTrace[] = VERIFIED_TWO_HAND_TURNS.map(
  (fixture) => fixture.trace
);

export function getVerifiedTurningTrace(id: string): TurningTrace {
  const found = VERIFIED_TURNING_TRACES.find((candidate) => candidate.id === id);
  if (!found) {
    throw new Error(`Unknown verified turning trace: ${id}`);
  }
  return found;
}
