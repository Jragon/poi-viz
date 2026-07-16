import type { PlaneId, RigId, Vec2, Vec3, WorldMultiRigPose, WorldRigPose } from "@/engine/types";
import { LAB_PLANE_COLORS, LAB_PLANE_ORDER } from "@/lab/planePresentation";
import { DEFAULT_RIG_STYLES } from "@/visualizer/drawingTools";

export interface WorldPoseBounds {
  readonly min: Vec3;
  readonly max: Vec3;
  readonly center: Vec3;
  readonly radius: number;
}

export interface DebugRigSceneEntry {
  readonly rigId: RigId;
  readonly handPosition: Vec3;
  readonly headPosition: Vec3;
  readonly handColor: string;
  readonly headColor: string;
  readonly tetherColor: string;
}

export interface PlaneHelperState {
  readonly planeId: PlaneId;
  readonly color: string;
  readonly rotation: Vec3;
  readonly visible: boolean;
}

export interface OriginPlaneSheetState {
  readonly planeId: PlaneId;
  readonly center: Vec3;
  readonly color: string;
  readonly rotation: Vec3;
  readonly radiusWorld: number;
  readonly opacity: number;
  readonly visible: boolean;
}

export interface DefaultCameraViewState {
  readonly target: Vec3;
  readonly position: Vec3;
  readonly near: number;
  readonly far: number;
  readonly minDistanceWorld: number;
  readonly maxDistanceWorld: number;
}

export interface ThreeDDebugSceneState {
  readonly worldPoses: WorldMultiRigPose;
  readonly activePlanes: PlaneId[];
  readonly worldBounds: WorldPoseBounds;
  readonly sceneCenterWorld: Vec3;
  readonly sceneRadiusWorld: number;
}

const CANONICAL_PLANE_ORDER = LAB_PLANE_ORDER;
const DEFAULT_ANCHOR: Vec2 = { x: 0, y: 0 };
export const ORIGIN_PLANE_SHEET_RADIUS_WORLD = 1.5;
export const ORIGIN_PLANE_SHEET_OPACITY = 0.12;
const PLANE_HELPER_COLORS = LAB_PLANE_COLORS;
const PLANE_HELPER_ROTATIONS: Record<PlaneId, Vec3> = {
  wall: { x: 0, y: 0, z: 0 },
  wheel: { x: 0, y: Math.PI * 0.5, z: 0 },
  floor: { x: -Math.PI * 0.5, y: 0, z: 0 }
};
const WORLD_ORIGIN: Vec3 = { x: 0, y: 0, z: 0 };
const DEFAULT_SCENE_RADIUS_WORLD = 2;
const DEFAULT_CAMERA_NEAR = 0.1;
const DEFAULT_CAMERA_FAR_MIN = 100;
const DEFAULT_CAMERA_FAR_MULTIPLIER = 16;
const DEFAULT_CAMERA_MIN_DISTANCE_MULTIPLIER = 0.5;
const DEFAULT_CAMERA_MAX_DISTANCE_MULTIPLIER = 12;
const DEFAULT_CAMERA_MIN_DISTANCE_MIN = 0.5;
const DEFAULT_CAMERA_MAX_DISTANCE_MIN = 12;
const DEFAULT_CAMERA_POSITION_MULTIPLIERS = {
  x: 1.8,
  y: 1.15,
  z: 1.8
} as const;

function createDefaultBounds(): WorldPoseBounds {
  return {
    min: { x: -1, y: -1, z: -1 },
    max: { x: 1, y: 1, z: 1 },
    center: { x: 0, y: 0, z: 0 },
    radius: Math.sqrt(3)
  };
}

function addAnchor(point: Vec3, anchor: Vec2): Vec3 {
  return {
    x: point.x + anchor.x,
    y: point.y + anchor.y,
    z: point.z
  };
}

function resolveRigAnchor(rigAnchors: Partial<Record<RigId, Vec2>>, rigId: RigId): Vec2 {
  return rigAnchors[rigId] ?? DEFAULT_ANCHOR;
}

function anchorWorldRigPose(pose: WorldRigPose, anchor: Vec2): WorldRigPose {
  return {
    ...pose,
    handPosition: addAnchor(pose.handPosition, anchor),
    headPosition: addAnchor(pose.headPosition, anchor)
  };
}

export function anchorWorldMultiRigPose(
  poses: WorldMultiRigPose,
  rigAnchors: Partial<Record<RigId, Vec2>>
): WorldMultiRigPose {
  const anchored: WorldMultiRigPose = {};

  for (const [rigId, pose] of Object.entries(poses)) {
    anchored[rigId] = anchorWorldRigPose(pose, resolveRigAnchor(rigAnchors, rigId));
  }

  return anchored;
}

export function collectActivePlanes(poses: WorldMultiRigPose): PlaneId[] {
  const activePlanes = new Set<PlaneId>();

  for (const pose of Object.values(poses)) {
    activePlanes.add(pose.planeId);
  }

  return CANONICAL_PLANE_ORDER.filter((planeId) => activePlanes.has(planeId));
}

export function buildDebugRigSceneEntries(
  poses: WorldMultiRigPose,
  rigOrder: readonly RigId[]
): DebugRigSceneEntry[] {
  const entries: DebugRigSceneEntry[] = [];

  rigOrder.forEach((rigId, index) => {
    const pose = poses[rigId];
    if (!pose) {
      return;
    }

    const palette = DEFAULT_RIG_STYLES[index % DEFAULT_RIG_STYLES.length];
    entries.push({
      rigId,
      handPosition: pose.handPosition,
      headPosition: pose.headPosition,
      handColor: palette.handColor,
      headColor: palette.headColor,
      tetherColor: palette.lineColor
    });
  });

  return entries;
}

export function buildPlaneHelperStates(
  activePlanes: readonly PlaneId[],
  showPlaneHelpers: boolean
): PlaneHelperState[] {
  return buildOriginPlaneSheetStates(activePlanes, showPlaneHelpers).map((planeState) => ({
    planeId: planeState.planeId,
    color: planeState.color,
    rotation: planeState.rotation,
    visible: planeState.visible
  }));
}

export function buildOriginPlaneSheetStates(
  activePlanes: readonly PlaneId[],
  showPlaneSheets: boolean
): OriginPlaneSheetState[] {
  const activePlaneSet = new Set<PlaneId>(activePlanes);

  return CANONICAL_PLANE_ORDER.map((planeId) => ({
    planeId,
    center: { ...WORLD_ORIGIN },
    color: PLANE_HELPER_COLORS[planeId],
    rotation: { ...PLANE_HELPER_ROTATIONS[planeId] },
    radiusWorld: ORIGIN_PLANE_SHEET_RADIUS_WORLD,
    opacity: ORIGIN_PLANE_SHEET_OPACITY,
    visible: showPlaneSheets && activePlaneSet.has(planeId)
  }));
}

export function resolveSceneRadiusWorld(sceneRadiusWorld: number): number {
  return Number.isFinite(sceneRadiusWorld) && sceneRadiusWorld > 0
    ? sceneRadiusWorld
    : DEFAULT_SCENE_RADIUS_WORLD;
}

export function buildDefaultCameraViewState(
  sceneCenterWorld: Vec3,
  sceneRadiusWorld: number
): DefaultCameraViewState {
  const resolvedSceneRadiusWorld = resolveSceneRadiusWorld(sceneRadiusWorld);
  const target = { ...sceneCenterWorld };

  return {
    target,
    position: {
      x: target.x + resolvedSceneRadiusWorld * DEFAULT_CAMERA_POSITION_MULTIPLIERS.x,
      y: target.y + resolvedSceneRadiusWorld * DEFAULT_CAMERA_POSITION_MULTIPLIERS.y,
      z: target.z + resolvedSceneRadiusWorld * DEFAULT_CAMERA_POSITION_MULTIPLIERS.z
    },
    near: DEFAULT_CAMERA_NEAR,
    far: Math.max(DEFAULT_CAMERA_FAR_MIN, resolvedSceneRadiusWorld * DEFAULT_CAMERA_FAR_MULTIPLIER),
    minDistanceWorld: Math.max(
      DEFAULT_CAMERA_MIN_DISTANCE_MIN,
      resolvedSceneRadiusWorld * DEFAULT_CAMERA_MIN_DISTANCE_MULTIPLIER
    ),
    maxDistanceWorld: Math.max(
      DEFAULT_CAMERA_MAX_DISTANCE_MIN,
      resolvedSceneRadiusWorld * DEFAULT_CAMERA_MAX_DISTANCE_MULTIPLIER
    )
  };
}

export function getWorldPoseBounds(poses: WorldMultiRigPose): WorldPoseBounds {
  const points: Vec3[] = [];

  for (const pose of Object.values(poses)) {
    points.push(pose.handPosition, pose.headPosition);
  }

  if (points.length === 0) {
    return createDefaultBounds();
  }

  const min: Vec3 = { ...points[0] };
  const max: Vec3 = { ...points[0] };

  for (const point of points) {
    min.x = Math.min(min.x, point.x);
    min.y = Math.min(min.y, point.y);
    min.z = Math.min(min.z, point.z);
    max.x = Math.max(max.x, point.x);
    max.y = Math.max(max.y, point.y);
    max.z = Math.max(max.z, point.z);
  }

  const center: Vec3 = {
    x: (min.x + max.x) * 0.5,
    y: (min.y + max.y) * 0.5,
    z: (min.z + max.z) * 0.5
  };

  let radius = 0;

  for (const point of points) {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const dz = point.z - center.z;
    radius = Math.max(radius, Math.hypot(dx, dy, dz));
  }

  return {
    min,
    max,
    center,
    radius
  };
}

export function buildThreeDDebugSceneState(
  worldPoses: WorldMultiRigPose,
  preferredSceneRadiusWorld: number
): ThreeDDebugSceneState {
  const worldBounds = getWorldPoseBounds(worldPoses);
  const resolvedSceneRadiusWorld = Math.max(
    resolveSceneRadiusWorld(preferredSceneRadiusWorld),
    worldBounds.radius,
    DEFAULT_SCENE_RADIUS_WORLD
  );

  return {
    worldPoses,
    activePlanes: collectActivePlanes(worldPoses),
    worldBounds,
    // Keep the debug orbit target locked to canonical origin so playback and
    // document-bound changes do not make the inspection camera drift.
    sceneCenterWorld: WORLD_ORIGIN,
    sceneRadiusWorld: resolvedSceneRadiusWorld
  };
}
