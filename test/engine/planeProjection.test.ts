import { describe, expect, it } from "vitest";

import { toCartesianRigPose } from "@/engine/cartesian";
import { embedPlanePoint, projectWorldPoint, toProjectedRigPose } from "@/engine/planeProjection";
import type { RelativeRigPose } from "@/engine/types";

function pose(handPhase = 0, headPhase = 0): RelativeRigPose {
  return {
    handPose: { phaseAbs: handPhase, radius: 1 },
    headPose: { phaseAbs: headPhase, radius: 1 }
  };
}

describe("planeProjection", () => {
  it("keeps wall projection identical to existing cartesian output", () => {
    const relative = pose(Math.PI / 3, Math.PI);

    expect(toProjectedRigPose(relative, "wall")).toEqual(toCartesianRigPose(relative));
  });

  it("embeds plane-local axes into the chosen world bases", () => {
    expect(embedPlanePoint("wall", { x: 2, y: 3 })).toEqual({ x: 2, y: 3, z: 0 });
    expect(embedPlanePoint("wheel", { x: 2, y: 3 })).toEqual({ x: 0, y: 3, z: 2 });
    expect(embedPlanePoint("floor", { x: 2, y: 3 })).toEqual({ x: 2, y: 0, z: 3 });
  });

  it("uses front orthographic projection by default", () => {
    expect(projectWorldPoint({ x: 2, y: 3, z: 4 })).toEqual({ x: 2, y: 3 });
  });

  it("collapses pure depth in front orthographic mode", () => {
    const relative = pose(0, 0);

    expect(toProjectedRigPose(relative, "wheel")).toEqual({
      handPosition: { x: 0, y: 0 },
      headPosition: { x: 0, y: 0 }
    });
    expect(toProjectedRigPose(relative, "floor")).toEqual({
      handPosition: { x: 1, y: 0 },
      headPosition: { x: 2, y: 0 }
    });
  });

  it("rotates all planes through the tilted orthographic camera", () => {
    const settings = { mode: "tilted", yawDeg: -25, pitchDeg: 18 } as const;

    expect(projectWorldPoint({ x: 0, y: 0, z: 1 }, settings).x).toBeCloseTo(-0.422618, 6);
    expect(projectWorldPoint({ x: 0, y: 0, z: 1 }, settings).y).toBeCloseTo(-0.280065, 6);

    const wall = toProjectedRigPose(pose(0, 0), "wall", settings);
    expect(wall.handPosition.x).toBeCloseTo(0.906308, 6);
    expect(wall.handPosition.y).toBeCloseTo(-0.130596, 6);
  });
});
