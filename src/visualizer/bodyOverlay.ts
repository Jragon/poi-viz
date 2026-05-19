import {
  type BodyRigDimensions,
  type BodyRigPose,
  type SkeletonSolverDiagnostics
} from "@/body-rig";
import type { PlaneProjectionSettings } from "@/engine/planeProjection";
import type { Vec2, WorldMultiRigPose } from "@/engine/types";
import {
  DEFAULT_VISUALIZER_BODY_RIG_IDS,
  resolveBodyRigDimensions,
  solveVisualizerBodyRig,
  type VisualizerBodyRigIds
} from "@/visualizer/bodyRigSolve";
import type { SceneLayout } from "@/visualizer/sceneLayout";

export type BodyOverlayRigIds = VisualizerBodyRigIds;
export { DEFAULT_VISUALIZER_BODY_RIG_IDS as DEFAULT_BODY_OVERLAY_RIG_IDS };

export interface BodyOverlayFrame {
  readonly pose: BodyRigPose;
  readonly solverDiagnostics: SkeletonSolverDiagnostics;
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

export const DEFAULT_BODY_OVERLAY_MIN_SCENE_RADIUS = 2.45;

export function getBodyOverlaySceneExtent(
  input: BodyOverlaySceneExtentInput
): BodyOverlaySceneExtent {
  const dimensions = resolveBodyRigDimensions(input.dimensions);
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
  const solved = solveVisualizerBodyRig(input);

  if (!solved) {
    return null;
  }

  return {
    pose: solved.pose,
    solverDiagnostics: solved.pose.skeleton.solverDiagnostics,
    dimensions: solved.dimensions,
    rigIds: solved.rigIds,
    behindBodySides: {
      left: solved.worldPoses.left?.behindBody ?? false,
      right: solved.worldPoses.right?.behindBody ?? false
    }
  };
}
