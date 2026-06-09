import {
  buildBodyRigConfigFromArmReach,
  buildBodyRigDimensionsForCanonicalUnitRadius,
  buildBodyRigFrameFromDimensions,
  solveBodyRigFrame,
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

import {
  MANNEQUIN_PROPORTIONS,
  resolveHeadHeightWorldFromTotalHeight
} from "./mannequinGeometry";

function buildThreeDDebugMannequinDimensions(): BodyRigDimensions {
  const base = buildBodyRigDimensionsForCanonicalUnitRadius(1);
  const baseTotalHeight =
    base.torsoHeight + base.thighLength + base.shinLength + base.headRadius * 2 + base.headGap;
  const headHeight = resolveHeadHeightWorldFromTotalHeight(baseTotalHeight);
  const armReach = headHeight * (MANNEQUIN_PROPORTIONS.upperArmLength + MANNEQUIN_PROPORTIONS.forearmLength);
  const shoulderSpan = headHeight * MANNEQUIN_PROPORTIONS.shoulderJointSpan;
  const baseConfig = buildBodyRigConfigFromArmReach(armReach);

  return {
    ...base,
    armReach,
    config: {
      ...baseConfig,
      baseShoulderSpan: shoulderSpan,
      pelvisPolicy: {
        ...baseConfig.pelvisPolicy,
        maxLateralShift: shoulderSpan * 0.12,
        maxForwardShift: shoulderSpan * 0.08
      }
    },
    shoulderSpan,
    torsoHeight: headHeight * 2.15,
    hipSpan: headHeight * MANNEQUIN_PROPORTIONS.hipJointSpan,
    headRadius: headHeight * 0.5,
    headGap: headHeight * 0.34,
    neckOffset: headHeight * 0.125,
    thighLength: headHeight * MANNEQUIN_PROPORTIONS.thighLength,
    shinLength: headHeight * MANNEQUIN_PROPORTIONS.shinLength,
    footOffset: headHeight * 0.14,
    stanceWidth: headHeight * 0.06
  };
}

export function buildBodyHumanoidScene(
  worldPoses: WorldMultiRigPose,
  projectionSettings?: PlaneProjectionSettings,
  rigIds?: Partial<VisualizerBodyRigIds>
): BodySkeletonFrame | null {
  const leftPose = worldPoses[rigIds?.left ?? DEFAULT_VISUALIZER_BODY_RIG_IDS.left] ?? null;
  const rightPose = worldPoses[rigIds?.right ?? DEFAULT_VISUALIZER_BODY_RIG_IDS.right] ?? null;

  if (!leftPose && !rightPose) {
    return null;
  }

  const dimensions = buildThreeDDebugMannequinDimensions();
  const body = buildBodyRigFrameFromDimensions(dimensions);

  const pose = solveBodyRigFrame(
    body,
    {
      leftHandTarget: leftPose?.handPosition ?? body.defaultLeftHandTarget,
      rightHandTarget: rightPose?.handPosition ?? body.defaultRightHandTarget
    },
    projectionSettings ?? DEFAULT_PLANE_PROJECTION_SETTINGS
  );

  return pose.skeleton;
}