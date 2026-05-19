import {
  buildBodyRigDimensionsForSharedHandRadius,
  buildBodyRigFrameFromDimensions,
  buildBodySkeletonFrame,
  solveBodyRigFrame,
  type BodySkeletonFrame
} from "@/body-rig";
import {
  DEFAULT_PLANE_PROJECTION_SETTINGS,
  type PlaneProjectionSettings
} from "@/engine/planeProjection";
import type { WorldMultiRigPose } from "@/engine/types";

export function buildBodyStickFigureScene(
  worldPoses: WorldMultiRigPose,
  projectionSettings?: PlaneProjectionSettings
): BodySkeletonFrame | null {
  const leftPose = worldPoses["left"] ?? null;
  const rightPose = worldPoses["right"] ?? null;

  if (!leftPose && !rightPose) {
    return null;
  }

  const dimensions = buildBodyRigDimensionsForSharedHandRadius(1);
  const body = buildBodyRigFrameFromDimensions(dimensions);

  const pose = solveBodyRigFrame(
    body,
    {
      leftHandTarget: leftPose ? leftPose.handPosition : body.defaultLeftHandTarget,
      rightHandTarget: rightPose ? rightPose.handPosition : body.defaultRightHandTarget
    },
    projectionSettings ?? DEFAULT_PLANE_PROJECTION_SETTINGS
  );

  return buildBodySkeletonFrame(pose.body, pose.solve);
}
