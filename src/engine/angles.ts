import type { AnglesByHand, EngineParams, HandAngles } from "@/engine/types";

/**
 * Shared linear oscillator equation:
 * theta(t) = omega * t + phi
 */
function getLinearAngle(speed: number, phase: number, tBeats: number): number {
  return speed * tBeats + phase;
}

function getHandAnglesForTime(
  armSpeed: number,
  armPhase: number,
  poiSpeed: number,
  poiPhase: number,
  tBeats: number
): HandAngles {
  const arm = getLinearAngle(armSpeed, armPhase, tBeats);
  const rel = getLinearAngle(poiSpeed, poiPhase, tBeats);

  return {
    arm,
    rel,
    head: arm + rel
  };
}

/**
 * Computes arm, relative, and absolute head angles for both hands at beat time t.
 * This is the canonical angle entrypoint used by rendering/sampling layers.
 */
export function getAngles(params: EngineParams, tBeats: number): AnglesByHand {
  return {
    L: getHandAnglesForTime(
      params.hands.L.armSpeed,
      params.hands.L.armPhase,
      params.hands.L.poiSpeed,
      params.hands.L.poiPhase,
      tBeats
    ),
    R: getHandAnglesForTime(
      params.hands.R.armSpeed,
      params.hands.R.armPhase,
      params.hands.R.poiSpeed,
      params.hands.R.poiPhase,
      tBeats
    )
  };
}
