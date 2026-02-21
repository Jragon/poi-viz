import { toCartesianRigPose } from "@/engine/cartesian";
import { PI } from "@/engine/constants";
import type { RelativeRigPose, Vec2 } from "@/engine/types";
import { describe, expect, it } from "vitest";

function expectVecClose(actual: Vec2, expected: Vec2, digits = 12) {
  expect(actual.x).toBeCloseTo(expected.x, digits);
  expect(actual.y).toBeCloseTo(expected.y, digits);
}

describe("toCartesianRigPose", () => {
  it("evaluates relative rig pointing right", () => {
    const relPose: RelativeRigPose = {
      handPose: { phaseAbs: 0, radius: 1 },
      headPose: { phaseAbs: 0, radius: 1 }
    };

    const cartPose = toCartesianRigPose(relPose);
    expect(cartPose).toEqual(toCartesianRigPose(relPose));

    expectVecClose(cartPose.handPosition, { x: 1, y: 0 });
    expectVecClose(cartPose.headPosition, { x: 2, y: 0 });
  });

  it("evaluates relative rig pointing sort of up and to side", () => {
    const relPose: RelativeRigPose = {
      handPose: { phaseAbs: PI / 2, radius: 1 },
      headPose: { phaseAbs: 0, radius: 1 }
    };

    const cartPose = toCartesianRigPose(relPose);
    expect(cartPose).toEqual(toCartesianRigPose(relPose));

    expectVecClose(cartPose.handPosition, { x: 0, y: 1 });
    expectVecClose(cartPose.headPosition, { x: 1, y: 1 });
  });
});
