import { describe, it } from "vitest";
import { vectorMagnitude } from "@/engine/math";
import { getPositions } from "@/engine/positions";
import type { EngineParams } from "@/engine/types";
import type { HandId } from "@/types/state";
import { DEFAULT_SAMPLE_BEATS, MATH_TOLERANCE, expectWithinTolerance } from "./helpers";

const HAND_IDS: HandId[] = ["L", "R"];

const BPM = 120;
const ARM_SPEED = Math.PI * 2;
const ARM_RADIUS = 90;
const POI_RADIUS = 45;
const ZERO = 0;
const LEFT_ARM_PHASE = ZERO;
const RIGHT_ARM_PHASE = Math.PI;

function createBaseParams(): EngineParams {
  return {
    bpm: BPM,
    hands: {
      L: {
        armSpeed: ARM_SPEED,
        armPhase: LEFT_ARM_PHASE,
        armRadius: ARM_RADIUS,
        poiSpeed: ZERO,
        poiPhase: ZERO,
        poiRadius: POI_RADIUS
      },
      R: {
        armSpeed: ARM_SPEED,
        armPhase: RIGHT_ARM_PHASE,
        armRadius: ARM_RADIUS,
        poiSpeed: ZERO,
        poiPhase: ZERO,
        poiRadius: POI_RADIUS
      }
    }
  };
}

describe("engine special cases", () => {
  it("if poi relative speed is zero, head path radius is armRadius + poiRadius", () => {
    const params = createBaseParams();
    const expectedHeadRadius = ARM_RADIUS + POI_RADIUS;

    for (const tBeats of DEFAULT_SAMPLE_BEATS) {
      const positions = getPositions(params, tBeats);

      for (const handId of HAND_IDS) {
        const headMagnitude = vectorMagnitude(positions[handId].head);
        expectWithinTolerance(
          headMagnitude,
          expectedHeadRadius,
          MATH_TOLERANCE,
          `${handId} head radius at t=${tBeats}`
        );
      }
    }
  });

  it("if arm radius is zero, head path radius is poiRadius", () => {
    const params = createBaseParams();
    params.hands.L.armRadius = ZERO;
    params.hands.R.armRadius = ZERO;
    const expectedHeadRadius = POI_RADIUS;

    for (const tBeats of DEFAULT_SAMPLE_BEATS) {
      const positions = getPositions(params, tBeats);

      for (const handId of HAND_IDS) {
        const headMagnitude = vectorMagnitude(positions[handId].head);
        expectWithinTolerance(
          headMagnitude,
          expectedHeadRadius,
          MATH_TOLERANCE,
          `${handId} head radius with zero arm radius at t=${tBeats}`
        );
      }
    }
  });
});
