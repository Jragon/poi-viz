import { describe, expect, it } from "vitest";

import type { WorldMultiRigPose } from "@/engine/types";
import {
  anchorWorldMultiRigPose,
  buildDebugRigSceneEntries,
  buildPlaneHelperStates,
  buildThreeDDebugSceneState,
  collectActivePlanes,
  getWorldPoseBounds
} from "@/lab/experiments/three-d-debug/worldPoseScene";
import { DEFAULT_RIG_STYLES } from "@/visualizer/drawingTools";

describe("worldPoseScene", () => {
  it("applies rig anchors to x/y while preserving z and metadata", () => {
    const poses: WorldMultiRigPose = {
      left: {
        handPosition: { x: 1, y: 2, z: 3 },
        headPosition: { x: 4, y: 5, z: 6 },
        planeId: "wall",
        planeSide: "a",
        behindBody: true,
        segmentIndex: 2,
        tLocal: 0.5
      },
      right: {
        handPosition: { x: -1, y: -2, z: -3 },
        headPosition: { x: -4, y: -5, z: -6 },
        planeId: "wheel"
      }
    };

    const anchored = anchorWorldMultiRigPose(poses, {
      left: { x: 10, y: -3 },
      right: { x: -2, y: 4 }
    });

    expect(anchored.left.handPosition).toEqual({ x: 11, y: -1, z: 3 });
    expect(anchored.left.headPosition).toEqual({ x: 14, y: 2, z: 6 });
    expect(anchored.left.planeId).toBe("wall");
    expect(anchored.left.planeSide).toBe("a");
    expect(anchored.left.behindBody).toBe(true);
    expect(anchored.left.segmentIndex).toBe(2);
    expect(anchored.left.tLocal).toBe(0.5);

    expect(anchored.right.handPosition).toEqual({ x: -3, y: 2, z: -3 });
    expect(anchored.right.headPosition).toEqual({ x: -6, y: -1, z: -6 });
    expect(anchored.right.planeId).toBe("wheel");
  });

  it("collects active planes in canonical order without duplicates", () => {
    const poses: WorldMultiRigPose = {
      left: {
        handPosition: { x: 0, y: 0, z: 0 },
        headPosition: { x: 1, y: 0, z: 0 },
        planeId: "floor"
      },
      right: {
        handPosition: { x: 0, y: 0, z: 0 },
        headPosition: { x: 0, y: 1, z: 0 },
        planeId: "wall"
      },
      wheel: {
        handPosition: { x: 0, y: 0, z: 0 },
        headPosition: { x: 0, y: 0, z: 1 },
        planeId: "wheel"
      }
    };

    expect(collectActivePlanes(poses)).toEqual(["wall", "wheel", "floor"]);
  });

  it("builds ordered debug rig entries using the shared rig palette", () => {
    const poses: WorldMultiRigPose = {
      left: {
        handPosition: { x: -2, y: 1, z: 0 },
        headPosition: { x: -1, y: 2, z: 0.5 },
        planeId: "wall"
      },
      right: {
        handPosition: { x: 2, y: -1, z: 0 },
        headPosition: { x: 3, y: -2, z: -0.5 },
        planeId: "wheel"
      }
    };

    expect(buildDebugRigSceneEntries(poses, ["left", "right", "missing"])).toEqual([
      {
        rigId: "left",
        handPosition: { x: -2, y: 1, z: 0 },
        headPosition: { x: -1, y: 2, z: 0.5 },
        handColor: DEFAULT_RIG_STYLES[0].handColor,
        headColor: DEFAULT_RIG_STYLES[0].headColor,
        tetherColor: DEFAULT_RIG_STYLES[0].lineColor
      },
      {
        rigId: "right",
        handPosition: { x: 2, y: -1, z: 0 },
        headPosition: { x: 3, y: -2, z: -0.5 },
        handColor: DEFAULT_RIG_STYLES[1].handColor,
        headColor: DEFAULT_RIG_STYLES[1].headColor,
        tetherColor: DEFAULT_RIG_STYLES[1].lineColor
      }
    ]);
  });

  it("builds plane helper states for wall, wheel, and floor visibility", () => {
    expect(buildPlaneHelperStates(["floor", "wall"], true)).toEqual([
      {
        planeId: "wall",
        color: "#60a5fa",
        rotation: { x: 0, y: 0, z: 0 },
        visible: true
      },
      {
        planeId: "wheel",
        color: "#f472b6",
        rotation: { x: 0, y: Math.PI * 0.5, z: 0 },
        visible: false
      },
      {
        planeId: "floor",
        color: "#34d399",
        rotation: { x: -Math.PI * 0.5, y: 0, z: 0 },
        visible: true
      }
    ]);

    expect(buildPlaneHelperStates(["wall"], false).every((state) => !state.visible)).toBe(true);
  });

  it("builds the page scene state directly from raw world poses", () => {
    const worldPoses: WorldMultiRigPose = {
      right: {
        handPosition: { x: 2, y: -1, z: 0 },
        headPosition: { x: 3, y: -2, z: -0.5 },
        planeId: "wheel"
      },
      left: {
        handPosition: { x: -2, y: 1, z: 0 },
        headPosition: { x: -1, y: 2, z: 0.5 },
        planeId: "wall"
      }
    };

    const sceneState = buildThreeDDebugSceneState(worldPoses, 1.5);

    expect(sceneState.worldPoses).toBe(worldPoses);
    expect(sceneState.activePlanes).toEqual(["wall", "wheel"]);
    expect(sceneState.worldBounds).toEqual({
      min: { x: -2, y: -2, z: -0.5 },
      max: { x: 3, y: 2, z: 0.5 },
      center: { x: 0.5, y: 0, z: 0 },
      radius: Math.hypot(2.5, 2, 0.5)
    });
    expect(sceneState.sceneCenterWorld).toEqual({ x: 0, y: 0, z: 0 });
    expect(sceneState.sceneRadiusWorld).toBe(1.5);
  });

  it("computes a stable scene bound from all hand and head points", () => {
    const poses: WorldMultiRigPose = {
      left: {
        handPosition: { x: -2, y: 1, z: -1 },
        headPosition: { x: 1, y: 3, z: 2 },
        planeId: "wall"
      },
      right: {
        handPosition: { x: 2, y: -1, z: 0 },
        headPosition: { x: 4, y: 2, z: 1 },
        planeId: "wheel"
      }
    };

    const bounds = getWorldPoseBounds(poses);

    expect(bounds.min).toEqual({ x: -2, y: -1, z: -1 });
    expect(bounds.max).toEqual({ x: 4, y: 3, z: 2 });
    expect(bounds.center).toEqual({ x: 1, y: 1, z: 0.5 });
    expect(bounds.radius).toBeCloseTo(Math.sqrt(11.25));
  });

  it("returns a safe default bound when no poses are active", () => {
    const bounds = getWorldPoseBounds({});
    const nextBounds = getWorldPoseBounds({});

    expect(bounds.min).toEqual({ x: -1, y: -1, z: -1 });
    expect(bounds.max).toEqual({ x: 1, y: 1, z: 1 });
    expect(bounds.center).toEqual({ x: 0, y: 0, z: 0 });
    expect(bounds.radius).toBeCloseTo(Math.sqrt(3));

    bounds.min.x = 42;

    expect(nextBounds).not.toBe(bounds);
    expect(nextBounds.min).not.toBe(bounds.min);
    expect(nextBounds.max).not.toBe(bounds.max);
    expect(nextBounds.center).not.toBe(bounds.center);
    expect(nextBounds.min).toEqual({ x: -1, y: -1, z: -1 });
    expect(nextBounds.radius).toBeCloseTo(Math.sqrt(3));
  });
});
