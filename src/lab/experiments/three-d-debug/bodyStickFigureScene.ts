import { buildBodySkeletonFrame, type BodySkeletonFrame } from "@/body-rig";
import type { WorldMultiRigPose } from "@/engine/types";
import type { PlaneProjectionSettings } from "@/engine/planeProjection";
import { solveVisualizerBodyRig } from "@/visualizer/bodyRigSolve";
import { createSceneLayout } from "@/visualizer/sceneLayout";

const DEFAULT_LAYOUT = createSceneLayout({ cssWidth: 1, cssHeight: 1 });

export function buildBodyStickFigureScene(
  worldPoses: WorldMultiRigPose,
  projectionSettings?: PlaneProjectionSettings
): BodySkeletonFrame | null {
  const solveResult = solveVisualizerBodyRig({
    worldPoses,
    layout: DEFAULT_LAYOUT,
    projectionSettings
  });

  if (!solveResult) {
    return null;
  }

  return buildBodySkeletonFrame(solveResult.pose.body, solveResult.pose.solve);
}
