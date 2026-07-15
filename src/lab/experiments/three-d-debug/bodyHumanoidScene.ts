import {
  buildBodyRigDimensionsForCanonicalUnitRadius,
  buildBodyRigFrameFromDimensions,
  solveBodyRigFrame,
  type BodyRigMotionSolver,
  type BodyRigDimensions,
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

export function buildBodyHumanoidScene(
  worldPoses: WorldMultiRigPose,
  projectionSettings?: PlaneProjectionSettings,
  rigIds?: Partial<VisualizerBodyRigIds>,
  dimensions: BodyRigDimensions = buildBodyRigDimensionsForCanonicalUnitRadius(1),
  motion?: { readonly solver: BodyRigMotionSolver; readonly time?: number }
): BodySkeletonFrame | null {
  const leftPose = worldPoses[rigIds?.left ?? DEFAULT_VISUALIZER_BODY_RIG_IDS.left] ?? null;
  const rightPose = worldPoses[rigIds?.right ?? DEFAULT_VISUALIZER_BODY_RIG_IDS.right] ?? null;

  if (!leftPose && !rightPose) {
    return null;
  }

  const body = buildBodyRigFrameFromDimensions(dimensions);

  const goals = {
    leftHandTarget: leftPose?.handPosition ?? body.defaultLeftHandTarget,
    rightHandTarget: rightPose?.handPosition ?? body.defaultRightHandTarget
  };
  const pose = motion
    ? motion.time === undefined
      ? motion.solver.solve(body, goals, projectionSettings ?? DEFAULT_PLANE_PROJECTION_SETTINGS)
      : motion.solver.solve(body, goals, projectionSettings ?? DEFAULT_PLANE_PROJECTION_SETTINGS, {
          time: motion.time
        })
    : solveBodyRigFrame(body, goals, projectionSettings ?? DEFAULT_PLANE_PROJECTION_SETTINGS);

  return pose.skeleton;
}
