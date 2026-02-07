import { describe, it } from "vitest";
import { vectorMagnitude } from "@/engine/math";
import { getPositions } from "@/engine/positions";
import { createDefaultState } from "@/state/defaults";
import type { HandId } from "@/types/state";
import { DEFAULT_SAMPLE_BEATS, MATH_TOLERANCE, expectWithinTolerance } from "./helpers";

const HAND_IDS: HandId[] = ["L", "R"];

function createEngineParams() {
  const state = createDefaultState();
  return {
    bpm: state.global.bpm,
    hands: state.hands
  };
}

describe("engine invariants", () => {
  it("keeps each hand position on its arm-radius circle for sampled times", () => {
    const params = createEngineParams();

    for (const tBeats of DEFAULT_SAMPLE_BEATS) {
      const positions = getPositions(params, tBeats);

      for (const handId of HAND_IDS) {
        const handMagnitude = vectorMagnitude(positions[handId].hand);
        const expectedArmRadius = params.hands[handId].armRadius;
        expectWithinTolerance(handMagnitude, expectedArmRadius, MATH_TOLERANCE, `${handId} hand radius at t=${tBeats}`);
      }
    }
  });

  it("keeps each tether magnitude equal to poi radius for sampled times", () => {
    const params = createEngineParams();

    for (const tBeats of DEFAULT_SAMPLE_BEATS) {
      const positions = getPositions(params, tBeats);

      for (const handId of HAND_IDS) {
        const tetherMagnitude = vectorMagnitude(positions[handId].tether);
        const expectedPoiRadius = params.hands[handId].poiRadius;
        expectWithinTolerance(
          tetherMagnitude,
          expectedPoiRadius,
          MATH_TOLERANCE,
          `${handId} tether radius at t=${tBeats}`
        );
      }
    }
  });
});
