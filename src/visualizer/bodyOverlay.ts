import {
  buildBodyRigDimensionsForSharedHandRadius,
  buildBodyRigFrame,
  solveBodyRigFrame,
  type BodyRigDimensions,
  type BodyRigPose
} from "@/body-rig";
import {
  DEFAULT_PLANE_PROJECTION_SETTINGS,
  type PlaneProjectionSettings
} from "@/engine/planeProjection";
import type { RigId, Vec2, Vec3, WorldMultiRigPose, WorldRigPose } from "@/engine/types";
import { getRigAnchor, type SceneLayout } from "@/visualizer/sceneLayout";

export interface BodyOverlayRigIds {
  readonly left: RigId;
  readonly right: RigId;
}

export interface BodyOverlayFrame {
  readonly pose: BodyRigPose;
  readonly dimensions: BodyRigDimensions;
  readonly rigIds: BodyOverlayRigIds;
  readonly behindBodySides: {
    readonly left: boolean;
    readonly right: boolean;
  };
}

export interface BodyOverlayInput {
  readonly worldPoses: WorldMultiRigPose;
  readonly layout: SceneLayout;
  readonly projectionSettings?: PlaneProjectionSettings;
  readonly dimensions?: BodyRigDimensions;
  readonly rigIds?: Partial<BodyOverlayRigIds>;
}

export interface BodyOverlaySceneExtentInput {
  readonly sequenceRadiusWorld: number;
  readonly dimensions?: BodyRigDimensions;
}

export interface BodyOverlaySceneExtent {
  readonly sceneRadiusWorld: number;
  readonly cameraCenterWorld: Vec2;
}

export const DEFAULT_BODY_OVERLAY_RIG_IDS: BodyOverlayRigIds = {
  left: "left",
  right: "right"
};

export const DEFAULT_BODY_OVERLAY_MIN_SCENE_RADIUS = 2.45;

function resolveBodyOverlayRigIds(rigIds?: Partial<BodyOverlayRigIds>): BodyOverlayRigIds {
  return {
    left: rigIds?.left ?? DEFAULT_BODY_OVERLAY_RIG_IDS.left,
    right: rigIds?.right ?? DEFAULT_BODY_OVERLAY_RIG_IDS.right
  };
}

function bodyRigDimensionsFromInput(dimensions?: BodyRigDimensions): BodyRigDimensions {
  return dimensions ?? buildBodyRigDimensionsForSharedHandRadius(1);
}

function buildBodyFrame(dimensions: BodyRigDimensions) {
  return buildBodyRigFrame({
    shoulderCenter: dimensions.rootShoulderCenter,
    rigConfig: dimensions.config,
    torsoHeight: dimensions.torsoHeight,
    hipSpan: dimensions.hipSpan,
    headRadius: dimensions.headRadius,
    headGap: dimensions.headGap,
    neckOffset: dimensions.neckOffset,
    thighLength: dimensions.thighLength,
    shinLength: dimensions.shinLength,
    footOffset: dimensions.footOffset,
    stanceWidth: dimensions.stanceWidth
  });
}

function anchoredHandTarget(layout: SceneLayout, rigId: RigId, pose: WorldRigPose): Vec3 {
  const anchor = getRigAnchor(layout, rigId);

  return {
    x: anchor.x + pose.handPosition.x,
    y: anchor.y + pose.handPosition.y,
    z: pose.handPosition.z
  };
}

export function getBodyOverlaySceneExtent(
  input: BodyOverlaySceneExtentInput
): BodyOverlaySceneExtent {
  const dimensions = bodyRigDimensionsFromInput(input.dimensions);
  const sequenceRadiusWorld =
    Number.isFinite(input.sequenceRadiusWorld) && input.sequenceRadiusWorld > 0
      ? input.sequenceRadiusWorld
      : 2;
  const bodyVerticalRadius =
    dimensions.torsoHeight + dimensions.thighLength + dimensions.shinLength;

  return {
    sceneRadiusWorld: Math.max(
      sequenceRadiusWorld + dimensions.shoulderSpan * 0.5,
      bodyVerticalRadius,
      DEFAULT_BODY_OVERLAY_MIN_SCENE_RADIUS
    ),
    cameraCenterWorld: dimensions.cameraCenterWorld
  };
}

export function computeBodyOverlay(input: BodyOverlayInput): BodyOverlayFrame | null {
  const rigIds = resolveBodyOverlayRigIds(input.rigIds);
  const leftPose = input.worldPoses[rigIds.left];
  const rightPose = input.worldPoses[rigIds.right];

  if (!leftPose && !rightPose) {
    return null;
  }

  const dimensions = bodyRigDimensionsFromInput(input.dimensions);
  const body = buildBodyFrame(dimensions);
  const pose = solveBodyRigFrame(
    body,
    {
      leftHandTarget: leftPose
        ? anchoredHandTarget(input.layout, rigIds.left, leftPose)
        : body.defaultLeftHandTarget,
      rightHandTarget: rightPose
        ? anchoredHandTarget(input.layout, rigIds.right, rightPose)
        : body.defaultRightHandTarget
    },
    input.projectionSettings ?? DEFAULT_PLANE_PROJECTION_SETTINGS
  );

  return {
    pose,
    dimensions,
    rigIds,
    behindBodySides: {
      left: leftPose?.behindBody ?? false,
      right: rightPose?.behindBody ?? false
    }
  };
}
