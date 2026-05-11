import type { PreparedMultiRigSequence } from "@/engine/multirig";
import {
  getPlaneNormal,
  projectWorldRigPose,
  type PlaneProjectionSettings
} from "@/engine/planeProjection";
import { getPlaneSideOffset } from "@/engine/planeSide";
import type { PreparedSegment } from "@/engine/sequence";
import type {
  CartesianMultiRigPose,
  PlaneSide,
  Vec3,
  WorldMultiRigPose,
  WorldRigPose
} from "@/engine/types";

export interface PlaneSideDisplaySettings {
  readonly separationWorld: number;
  readonly transitionWindowFraction?: number;
}

export const DEFAULT_PLANE_SIDE_DISPLAY_SETTINGS: PlaneSideDisplaySettings = {
  separationWorld: 0
};

const DEFAULT_TRANSITION_WINDOW_FRACTION = 0.75;

function addWorld(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scaleWorld(point: Vec3, scalar: number): Vec3 {
  return { x: point.x * scalar, y: point.y * scalar, z: point.z * scalar };
}

function smootherstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * c * (c * (c * 6 - 15) + 10);
}

export function lookupAdjacentPlaneSide(
  segments: readonly PreparedSegment[],
  segmentIndex: number
): PlaneSide | undefined {
  if (segments.length === 0) return undefined;
  const prevIndex = segmentIndex === 0 ? segments.length - 1 : segmentIndex - 1;
  return segments[prevIndex]?.planeSide;
}

export function computePlaneSideDepthFactor(
  currentSide: PlaneSide | undefined,
  previousSide: PlaneSide | undefined,
  progress: number,
  windowFraction: number = DEFAULT_TRANSITION_WINDOW_FRACTION
): number {
  if (!currentSide) return 0;
  const currentOffset = getPlaneSideOffset(currentSide);
  if (!previousSide || previousSide === currentSide) return currentOffset;

  const previousOffset = getPlaneSideOffset(previousSide);
  const halfWindow = windowFraction / 2;
  const windowStart = 0.5 - halfWindow;
  const windowEnd = 0.5 + halfWindow;

  if (progress <= windowStart) return previousOffset;
  if (progress >= windowEnd) return currentOffset;

  const windowProgress = (progress - windowStart) / windowFraction;
  return previousOffset + (currentOffset - previousOffset) * smootherstep(windowProgress);
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

export function applyPlaneSideTransitionOffsets(
  poses: WorldMultiRigPose,
  preparedMultiRig: PreparedMultiRigSequence,
  settings: PlaneSideDisplaySettings = DEFAULT_PLANE_SIDE_DISPLAY_SETTINGS
): WorldMultiRigPose {
  if (settings.separationWorld <= 0) return poses;

  const windowFraction = settings.transitionWindowFraction ?? DEFAULT_TRANSITION_WINDOW_FRACTION;

  return Object.fromEntries(
    Object.entries(poses).map(([rigId, pose]) => {
      if (!pose.planeSide) return [rigId, pose];

      const rigEntry = preparedMultiRig.rigs.find((r) => r.rigId === rigId);
      const segments = rigEntry?.prepared.segments;

      if (segments && pose.segmentIndex !== undefined && pose.tLocal !== undefined) {
        const currentSegment = segments[pose.segmentIndex];
        const previousSide = lookupAdjacentPlaneSide(segments, pose.segmentIndex);
        const progress =
          currentSegment && currentSegment.durationUnits > 0
            ? pose.tLocal / currentSegment.durationUnits
            : 0;
        const depthFactor = computePlaneSideDepthFactor(
          pose.planeSide,
          previousSide,
          progress,
          windowFraction
        );
        const offset = scaleWorld(
          getPlaneNormal(pose.planeId),
          depthFactor * settings.separationWorld
        );
        return [
          rigId,
          {
            ...pose,
            handPosition: addWorld(pose.handPosition, offset),
            headPosition: addWorld(pose.headPosition, offset)
          }
        ];
      }

      return [rigId, applyPlaneSideDisplayOffset(pose, settings)];
    })
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
