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
import {
  DEFAULT_VISUALIZER_BODY_RIG_IDS,
  type VisualizerBodyRigIds
} from "@/visualizer/bodyRigSolve";

export function buildBodyStickFigureScene(
  worldPoses: WorldMultiRigPose,
  projectionSettings?: PlaneProjectionSettings,
  rigIds?: Partial<VisualizerBodyRigIds>
): BodySkeletonFrame | null {
  const leftPose = worldPoses[rigIds?.left ?? DEFAULT_VISUALIZER_BODY_RIG_IDS.left] ?? null;
  const rightPose = worldPoses[rigIds?.right ?? DEFAULT_VISUALIZER_BODY_RIG_IDS.right] ?? null;

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
