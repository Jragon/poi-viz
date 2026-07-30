import { describe, expect, it } from "vitest";

import { buildBodyRigDimensionsForCanonicalUnitRadius } from "@/body-rig";
import type { PlaneProjectionSettings } from "@/engine/planeProjection";
import type { WorldMultiRigPose } from "@/engine/types";
import { computeBodyOverlay, getBodyOverlaySceneExtent } from "@/visualizer/bodyOverlay";
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

describe("bodyOverlay", () => {
  it("returns null when neither configured hand rig is present", () => {
    const layout = createSceneLayout({ cssWidth: 400, cssHeight: 300 });

    expect(
      computeBodyOverlay({
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

  it("uses the default right hand target when only the left rig is active", () => {
    const layout = createSceneLayout({
      cssWidth: 400,
      cssHeight: 300,
      rigAnchors: {
        left: { x: -0.25, y: 0.1 }
      }
    });
    const overlay = computeBodyOverlay({
      worldPoses: { left: createWorldPoses().left },
      layout,
      projectionSettings
    });

    expect(overlay).not.toBeNull();
    expect(overlay?.pose.solve.leftArm.handTarget).toEqual({ x: -0.75, y: 0.35, z: 0.1 });
    expect(overlay?.pose.solve.rightArm.handTarget).toEqual(
      overlay?.pose.body.defaultRightHandTarget
    );
  });

  it("rotates an inactive hand's default support target with the root", () => {
    const layout = createSceneLayout({ cssWidth: 400, cssHeight: 300 });
    const front = computeBodyOverlay({
      worldPoses: { left: createWorldPoses().left },
      layout,
      projectionSettings,
      rootFacingDeg: 0
    });
    const midpoint = computeBodyOverlay({
      worldPoses: { left: createWorldPoses().left },
      layout,
      projectionSettings,
      rootFacingDeg: 90
    });
    const back = computeBodyOverlay({
      worldPoses: { left: createWorldPoses().left },
      layout,
      projectionSettings,
      rootFacingDeg: 180
    });

    expect(front?.pose.solve.rightArm.handTarget.x).toBeGreaterThan(0);
    expect(midpoint?.pose.solve.rightArm.handTarget.x).toBeCloseTo(0);
    expect(midpoint?.pose.solve.rightArm.handTarget.z).toBeLessThan(0);
    expect(back?.pose.solve.rightArm.handTarget.x).toBeLessThan(0);
  });

  it("uses the default left hand target when only the right rig is active", () => {
    const layout = createSceneLayout({
      cssWidth: 400,
      cssHeight: 300,
      rigAnchors: {
        right: { x: 0.25, y: 0.1 }
      }
    });
    const overlay = computeBodyOverlay({
      worldPoses: { right: createWorldPoses().right },
      layout,
      projectionSettings
    });

    expect(overlay).not.toBeNull();
    expect(overlay?.pose.solve.leftArm.handTarget).toEqual(
      overlay?.pose.body.defaultLeftHandTarget
    );
    expect(overlay?.pose.solve.rightArm.handTarget).toEqual({ x: 0.75, y: 0.35, z: 0.2 });
  });

  it("maps left and right hand targets through rig anchors", () => {
    const layout = createSceneLayout({
      cssWidth: 400,
      cssHeight: 300,
      rigAnchors: {
        left: { x: -0.25, y: 0.1 },
        right: { x: 0.25, y: 0.1 }
      }
    });
    const overlay = computeBodyOverlay({
      worldPoses: createWorldPoses(),
      layout,
      projectionSettings
    });

    expect(overlay).not.toBeNull();
    expect(overlay?.pose.solve.leftArm.handTarget).toEqual({ x: -0.75, y: 0.35, z: 0.1 });
    expect(overlay?.pose.solve.rightArm.handTarget).toEqual({ x: 0.75, y: 0.35, z: 0.2 });
  });

  it("threads root facing through the overlay while keeping world hand targets fixed", () => {
    const layout = createSceneLayout({ cssWidth: 400, cssHeight: 300 });
    const overlays = [0, 90, 180].map((rootFacingDeg) =>
      computeBodyOverlay({
        worldPoses: createWorldPoses(),
        layout,
        projectionSettings,
        rootFacingDeg
      })
    );
    const [front, midpoint, back] = overlays;

    expect(front?.pose.shoulders.leftShoulder.x).toBeLessThan(
      front?.pose.shoulders.rightShoulder.x ?? 0
    );
    expect(back?.pose.shoulders.leftShoulder.x).toBeGreaterThan(
      back?.pose.shoulders.rightShoulder.x ?? 0
    );
    expect(overlays.map((overlay) => overlay?.rootFacingDeg)).toEqual([0, 90, 180]);

    for (const overlay of overlays) {
      expect(overlay?.pose.solve.leftArm.handTarget).toEqual({
        x: -0.5,
        y: 0.25,
        z: 0.1
      });
      expect(overlay?.pose.solve.rightArm.handTarget).toEqual({
        x: 0.5,
        y: 0.25,
        z: 0.2
      });
    }

    const midpointFeet = midpoint?.pose.skeleton.joints;
    expect(midpointFeet?.footLeft.x).toBeCloseTo(midpointFeet?.footRight.x ?? 0);
    expect((midpointFeet?.footRight.z ?? 0) - (midpointFeet?.footLeft.z ?? 0)).toBeLessThan(0);
  });

  it("exposes solved skeleton joints and diagnostics on overlay poses", () => {
    const overlay = computeBodyOverlay({
      worldPoses: createWorldPoses(),
      layout: createSceneLayout({ cssWidth: 400, cssHeight: 300 }),
      projectionSettings
    });

    expect(overlay).not.toBeNull();
    expect(overlay?.pose.skeleton.joints.chest).toBeDefined();
    expect(overlay?.pose.skeleton.joints.pelvisCenter).toBeDefined();
    expect(overlay?.pose.skeleton.joints.clavicleLeft).toBeDefined();
    expect(overlay?.solverDiagnostics.leftShoulder).toBeDefined();
  });

  it("defaults behindBodySides to false when behindBody is absent from world poses", () => {
    const layout = createSceneLayout({ cssWidth: 400, cssHeight: 300 });
    const overlay = computeBodyOverlay({
      worldPoses: createWorldPoses(),
      layout,
      projectionSettings
    });

    expect(overlay).not.toBeNull();
    expect(overlay?.behindBodySides).toEqual({ left: false, right: false });
  });

  it("maps behind-body metadata onto overlay hand sides", () => {
    const layout = createSceneLayout({ cssWidth: 400, cssHeight: 300 });
    const overlay = computeBodyOverlay({
      worldPoses: {
        ...createWorldPoses(),
        left: { ...createWorldPoses().left, behindBody: true }
      },
      layout,
      projectionSettings
    });

    expect(overlay).not.toBeNull();
    expect(overlay?.behindBodySides).toEqual({ left: true, right: false });
  });

  it("uses active projection settings for projected hand targets", () => {
    const layout = createSceneLayout({ cssWidth: 400, cssHeight: 300 });
    const orthographic = computeBodyOverlay({
      worldPoses: createWorldPoses(),
      layout,
      projectionSettings
    });
    const tilted = computeBodyOverlay({
      worldPoses: createWorldPoses(),
      layout,
      projectionSettings: { mode: "tilted", yawDeg: -30, pitchDeg: 20 }
    });

    expect(orthographic?.pose.leftArm.handTarget.x).not.toBeCloseTo(
      tilted?.pose.leftArm.handTarget.x ?? 0
    );
    expect(orthographic?.pose.rightArm.handTarget.y).not.toBeCloseTo(
      tilted?.pose.rightArm.handTarget.y ?? 0
    );
  });

  it("scales default dimensions so radius one is the canonical wall-plane unit", () => {
    const overlay = computeBodyOverlay({
      worldPoses: createWorldPoses(),
      layout: createSceneLayout({ cssWidth: 400, cssHeight: 300 }),
      projectionSettings
    });

    expect(overlay?.dimensions.canonicalPatternSpace.sourcePlane).toBe("wall");
    expect(overlay?.dimensions.canonicalPatternSpace.unitRadius).toBeCloseTo(1);
  });

  it("computes body-aware scene framing from sequence radius and body dimensions", () => {
    const dimensions = buildBodyRigDimensionsForCanonicalUnitRadius(1);
    const extent = getBodyOverlaySceneExtent({
      sequenceRadiusWorld: 2,
      dimensions
    });
    const bodyVerticalRadius =
      dimensions.torsoHeight + dimensions.thighLength + dimensions.shinLength;

    expect(extent.sceneRadiusWorld).toBeCloseTo(
      Math.max(2 + dimensions.shoulderSpan * 0.5, bodyVerticalRadius, 2.45)
    );
    expect(extent.cameraCenterWorld).toEqual(dimensions.cameraCenterWorld);
  });
});
