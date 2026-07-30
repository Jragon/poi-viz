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
  RigId,
  Vec3,
  WorldMultiRigPose,
  WorldRigPose
} from "@/engine/types";

export interface PlaneSideDisplayBoundary {
  readonly mode: "loop" | "finite";
  readonly initialSideByRig?: Readonly<Partial<Record<RigId, PlaneSide>>>;
}

export interface PlaneSideDisplaySettings {
  readonly sideADepthWorld: number;
  readonly sideBDepthWorld: number;
  readonly defaultSide: PlaneSide | null;
  readonly transitionWindowFraction?: number;
  readonly boundary?: PlaneSideDisplayBoundary;
}

export const DEFAULT_PLANE_SIDE_DISPLAY_SETTINGS: PlaneSideDisplaySettings = {
  sideADepthWorld: 0.12,
  sideBDepthWorld: 0.12,
  defaultSide: "a"
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

function scalePlaneSideDepthFactor(
  depthFactor: number,
  settings: PlaneSideDisplaySettings
): number {
  return depthFactor >= 0
    ? depthFactor * settings.sideADepthWorld
    : depthFactor * settings.sideBDepthWorld;
}

export function lookupAdjacentPlaneSide(
  segments: readonly PreparedSegment[],
  segmentIndex: number,
  defaultSide: PlaneSide | null
): PlaneSide | undefined {
  if (segments.length === 0) return undefined;
  const prevIndex = segmentIndex === 0 ? segments.length - 1 : segmentIndex - 1;
  return segments[prevIndex]?.planeSide ?? defaultSide ?? undefined;
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
  const side = pose.planeSide ?? settings.defaultSide;
  if (!side) {
    return pose;
  }

  const depthWorld = scalePlaneSideDepthFactor(getPlaneSideOffset(side), settings);
  if (!Number.isFinite(depthWorld) || depthWorld === 0) {
    return pose;
  }

  const offset = scaleWorld(getPlaneNormal(pose.planeId), depthWorld);

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
  if (settings.sideADepthWorld <= 0 && settings.sideBDepthWorld <= 0) return poses;

  const windowFraction = settings.transitionWindowFraction ?? DEFAULT_TRANSITION_WINDOW_FRACTION;

  return Object.fromEntries(
    Object.entries(poses).map(([rigId, pose]) => {
      const currentSide = pose.planeSide ?? settings.defaultSide;
      if (!currentSide) return [rigId, pose];

      const rigEntry = preparedMultiRig.rigs.find((r) => r.rigId === rigId);
      const segments = rigEntry?.prepared.segments;

      if (segments && pose.segmentIndex !== undefined && pose.tLocal !== undefined) {
        const currentSegment = segments[pose.segmentIndex];
        const previousSide =
          pose.segmentIndex === 0 && settings.boundary?.mode === "finite"
            ? settings.boundary.initialSideByRig?.[rigId]
            : lookupAdjacentPlaneSide(segments, pose.segmentIndex, settings.defaultSide);
        const progress =
          currentSegment && currentSegment.durationUnits > 0
            ? pose.tLocal / currentSegment.durationUnits
            : 0;
        const depthFactor = computePlaneSideDepthFactor(
          currentSide,
          previousSide,
          progress,
          windowFraction
        );
        const depthWorld = scalePlaneSideDepthFactor(depthFactor, settings);
        const offset = scaleWorld(getPlaneNormal(pose.planeId), depthWorld);
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
  return settings.sideADepthWorld > 0 || settings.sideBDepthWorld > 0;
}
