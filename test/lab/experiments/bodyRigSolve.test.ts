import { describe, expect, it } from "vitest";

import type { PlaneProjectionSettings } from "@/engine/planeProjection";
import type { WorldMultiRigPose } from "@/engine/types";
import { solveVisualizerBodyRig } from "@/visualizer/bodyRigSolve";
import { createSceneLayout } from "@/visualizer/sceneLayout";

const projectionSettings: PlaneProjectionSettings = {
  mode: "orthographic",
  yawDeg: -25,
  pitchDeg: 18
};

function createWorldPoses(): WorldMultiRigPose {
  return {
    left: {
      handPosition: { x: -0.5, y: 0.25, z: 0.1 },
      headPosition: { x: -0.25, y: 0.25, z: 0.1 },
      planeId: "wall"
    },
    right: {
      handPosition: { x: 0.5, y: 0.25, z: 0.2 },
      headPosition: { x: 0.75, y: 0.25, z: 0.2 },
      planeId: "wall"
    }
  };
}

describe("bodyRigSolve", () => {
  it("returns null when neither configured hand rig is present", () => {
    const layout = createSceneLayout({ cssWidth: 400, cssHeight: 300 });

    expect(
      solveVisualizerBodyRig({
        worldPoses: {
          center: {
            handPosition: { x: 0, y: 0.25, z: 0 },
            headPosition: { x: 0.25, y: 0.25, z: 0 },
            planeId: "wall"
          }
        },
        layout,
        projectionSettings
      })
    ).toBeNull();
  });

  it("maps configured hand targets through rig anchors", () => {
    const layout = createSceneLayout({
      cssWidth: 400,
      cssHeight: 300,
      rigAnchors: {
        lead: { x: -0.25, y: 0.1 },
        trail: { x: 0.25, y: 0.1 }
      }
    });
    const result = solveVisualizerBodyRig({
      worldPoses: {
        lead: createWorldPoses().left,
        trail: createWorldPoses().right
      },
      layout,
      rigIds: {
        left: "lead",
        right: "trail"
      },
      projectionSettings
    });

    expect(result).not.toBeNull();
    expect(result?.rigIds).toEqual({ left: "lead", right: "trail" });
    expect(result?.pose.solve.leftArm.handTarget).toEqual({ x: -0.75, y: 0.35, z: 0.1 });
    expect(result?.pose.solve.rightArm.handTarget).toEqual({ x: 0.75, y: 0.35, z: 0.2 });
  });
});