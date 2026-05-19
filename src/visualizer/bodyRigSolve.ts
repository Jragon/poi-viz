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
import type { RigId, Vec3, WorldMultiRigPose, WorldRigPose } from "@/engine/types";
import { getRigAnchor, type SceneLayout } from "@/visualizer/sceneLayout";

export interface VisualizerBodyRigIds {
  readonly left: RigId;
  readonly right: RigId;
}

export interface VisualizerBodyRigSolveInput {
  readonly worldPoses: WorldMultiRigPose;
  readonly layout: SceneLayout;
  readonly projectionSettings?: PlaneProjectionSettings;
  readonly dimensions?: BodyRigDimensions;
  readonly rigIds?: Partial<VisualizerBodyRigIds>;
}

export interface VisualizerBodyRigSolveResult {
  readonly pose: BodyRigPose;
  readonly dimensions: BodyRigDimensions;
  readonly rigIds: VisualizerBodyRigIds;
  readonly worldPoses: {
    readonly left: WorldRigPose | null;
    readonly right: WorldRigPose | null;
  };
}

export const DEFAULT_VISUALIZER_BODY_RIG_IDS: VisualizerBodyRigIds = {
  left: "left",
  right: "right"
};

function resolveVisualizerBodyRigIds(
  rigIds?: Partial<VisualizerBodyRigIds>
): VisualizerBodyRigIds {
  return {
    left: rigIds?.left ?? DEFAULT_VISUALIZER_BODY_RIG_IDS.left,
    right: rigIds?.right ?? DEFAULT_VISUALIZER_BODY_RIG_IDS.right
  };
}

function resolveBodyRigDimensions(dimensions?: BodyRigDimensions): BodyRigDimensions {
  return dimensions ?? buildBodyRigDimensionsForSharedHandRadius(1);
}

function buildVisualizerBodyFrame(dimensions: BodyRigDimensions) {
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

export function solveVisualizerBodyRig(
  input: VisualizerBodyRigSolveInput
): VisualizerBodyRigSolveResult | null {
  const rigIds = resolveVisualizerBodyRigIds(input.rigIds);
  const leftPose = input.worldPoses[rigIds.left] ?? null;
  const rightPose = input.worldPoses[rigIds.right] ?? null;

  if (!leftPose && !rightPose) {
    return null;
  }

  const dimensions = resolveBodyRigDimensions(input.dimensions);
  const body = buildVisualizerBodyFrame(dimensions);

  return {
    pose: solveBodyRigFrame(
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
    ),
    dimensions,
    rigIds,
    worldPoses: {
      left: leftPose,
      right: rightPose
    }
  };
}