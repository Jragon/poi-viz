import {
  getPlaneNormal,
  projectWorldRigPose,
  type PlaneProjectionSettings
} from "@/engine/planeProjection";
import { getPlaneSideOffset } from "@/engine/planeSide";
import type { CartesianMultiRigPose, Vec3, WorldMultiRigPose, WorldRigPose } from "@/engine/types";

export interface PlaneSideDisplaySettings {
  readonly separationWorld: number;
}

export const DEFAULT_PLANE_SIDE_DISPLAY_SETTINGS: PlaneSideDisplaySettings = {
  separationWorld: 0
};

function addWorld(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scaleWorld(point: Vec3, scalar: number): Vec3 {
  return { x: point.x * scalar, y: point.y * scalar, z: point.z * scalar };
}

export function applyPlaneSideDisplayOffset(
  pose: WorldRigPose,
  settings: PlaneSideDisplaySettings = DEFAULT_PLANE_SIDE_DISPLAY_SETTINGS
): WorldRigPose {
  if (!pose.planeSide || settings.separationWorld <= 0) {
    return pose;
  }

  const offset = scaleWorld(
    getPlaneNormal(pose.planeId),
    getPlaneSideOffset(pose.planeSide) * settings.separationWorld
  );

  return {
    ...pose,
    handPosition: addWorld(pose.handPosition, offset),
    headPosition: addWorld(pose.headPosition, offset)
  };
}

export function applyPlaneSideDisplayOffsets(
  poses: WorldMultiRigPose,
  settings: PlaneSideDisplaySettings = DEFAULT_PLANE_SIDE_DISPLAY_SETTINGS
): WorldMultiRigPose {
  return Object.fromEntries(
    Object.entries(poses).map(([rigId, pose]) => [
      rigId,
      applyPlaneSideDisplayOffset(pose, settings)
    ])
  );
}

export function projectWorldMultiRigPose(
  poses: WorldMultiRigPose,
  projectionSettings: PlaneProjectionSettings
): CartesianMultiRigPose {
  return Object.fromEntries(
    Object.entries(poses).map(([rigId, pose]) => [
      rigId,
      projectWorldRigPose(pose, projectionSettings)
    ])
  );
}

export function hasPlaneSideDisplayOffset(settings: PlaneSideDisplaySettings): boolean {
  return settings.separationWorld > 0;
}
