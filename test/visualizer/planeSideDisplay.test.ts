import { describe, expect, it } from "vitest";

import type { WorldRigPose } from "@/engine/types";
import {
  applyPlaneSideDisplayOffset,
  applyPlaneSideDisplayOffsets,
  projectWorldMultiRigPose
} from "@/visualizer/planeSideDisplay";

function worldPose(planeSide?: "a" | "b"): WorldRigPose {
  return {
    handPosition: { x: 1, y: 0, z: 0 },
    headPosition: { x: 1.5, y: 0, z: 0 },
    planeId: "wall",
    ...(planeSide ? { planeSide } : {})
  };
}

describe("planeSideDisplay", () => {
  it("leaves poses unchanged without authored side or separation", () => {
    expect(applyPlaneSideDisplayOffset(worldPose("a"))).toEqual(worldPose("a"));
    expect(applyPlaneSideDisplayOffset(worldPose(), { separationWorld: 0.2 })).toEqual(worldPose());
  });

  it("offsets wall side a and side b in opposite depth directions", () => {
    const front = applyPlaneSideDisplayOffset(worldPose("a"), { separationWorld: 0.2 });
    const back = applyPlaneSideDisplayOffset(worldPose("b"), { separationWorld: 0.2 });

    expect(front.handPosition).toEqual({ x: 1, y: 0, z: 0.2 });
    expect(front.headPosition).toEqual({ x: 1.5, y: 0, z: 0.2 });
    expect(back.handPosition).toEqual({ x: 1, y: 0, z: -0.2 });
    expect(back.headPosition).toEqual({ x: 1.5, y: 0, z: -0.2 });
  });

  it("projects side-offset world poses through tilted projection", () => {
    const poses = applyPlaneSideDisplayOffsets(
      {
        front: worldPose("a"),
        back: worldPose("b")
      },
      { separationWorld: 0.2 }
    );
    const projected = projectWorldMultiRigPose(poses, {
      mode: "tilted",
      yawDeg: -25,
      pitchDeg: 18
    });

    expect(projected.front?.handPosition.x).not.toBeCloseTo(projected.back!.handPosition.x, 6);
    expect(projected.front?.handPosition.y).not.toBeCloseTo(projected.back!.handPosition.y, 6);
  });
});
