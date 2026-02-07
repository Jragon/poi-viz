import { getAngles } from "@/engine/angles";
import { addVectors, subtractVectors, vectorFromPolar } from "@/engine/math";
import type { EngineParams, HandPositions, PositionsByHand } from "@/engine/types";
import type { HandState } from "@/types/state";

/**
 * H_i(t) = R_arm_i * [cos(theta_arm_i), sin(theta_arm_i)]
 */
function getHandPosition(hand: HandState, armAngle: number) {
  return vectorFromPolar(hand.armRadius, armAngle);
}

/**
 * Poi offset from hand:
 * R_poi_i * [cos(theta_head_i), sin(theta_head_i)]
 */
function getHeadPosition(hand: HandState, headAngle: number) {
  return vectorFromPolar(hand.poiRadius, headAngle);
}

function getSingleHandPositions(hand: HandState, armAngle: number, headAngle: number): HandPositions {
  const handPosition = getHandPosition(hand, armAngle);
  const headOffset = getHeadPosition(hand, headAngle);
  const headPosition = addVectors(handPosition, headOffset);

  return {
    hand: handPosition,
    head: headPosition,
    tether: subtractVectors(headPosition, handPosition)
  };
}

/**
 * Computes wall-plane positions for both hands at beat time t.
 * The tether vector is always head - hand.
 *
 * @param params Engine inputs containing per-hand radii and angular channels.
 * @param tBeats Beat-domain sample time.
 * @returns Per-hand positions for hand point, head point, and tether vector.
 */
export function getPositions(params: EngineParams, tBeats: number): PositionsByHand {
  const angles = getAngles(params, tBeats);

  return {
    L: getSingleHandPositions(params.hands.L, angles.L.arm, angles.L.head),
    R: getSingleHandPositions(params.hands.R, angles.R.arm, angles.R.head)
  };
}
