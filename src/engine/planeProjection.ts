import type {
  CartesianMultiRigPose,
  CartesianRigPose,
  PlaneId,
  Radius,
  RelativeRigPose,
  RigId,
  Vec2,
  Vec3
} from "@/engine/types";

type ProjectableEvaluatedPose = {
  pose: RelativeRigPose;
  planeId: PlaneId;
};

export type ProjectionMode = "orthographic" | "tilted";
export type ProjectionModePreference = "auto" | ProjectionMode;

export interface PlaneProjectionSettings {
  readonly mode: ProjectionMode;
  readonly yawDeg: number;
  readonly pitchDeg: number;
}

export const DEFAULT_TILTED_PROJECTION_YAW_DEG = -25;
export const DEFAULT_TILTED_PROJECTION_PITCH_DEG = 18;

export const DEFAULT_PLANE_PROJECTION_SETTINGS: PlaneProjectionSettings = {
  mode: "orthographic",
  yawDeg: DEFAULT_TILTED_PROJECTION_YAW_DEG,
  pitchDeg: DEFAULT_TILTED_PROJECTION_PITCH_DEG
};

function localPolarToPlanePoint(radius: Radius, phaseRad: number): Vec2 {
  return {
    x: radius * Math.cos(phaseRad),
    y: radius * Math.sin(phaseRad)
  };
}

function addWorld(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function projectTiltedWorldPoint(point: Vec3, settings: PlaneProjectionSettings): Vec2 {
  const yaw = toRadians(settings.yawDeg);
  const pitch = toRadians(settings.pitchDeg);
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const yawedX = point.x * cosYaw + point.z * sinYaw;
  const yawedZ = -point.x * sinYaw + point.z * cosYaw;

  return {
    x: yawedX,
    y: point.y * cosPitch - yawedZ * sinPitch
  };
}

export function embedPlanePoint(planeId: PlaneId, local: Vec2): Vec3 {
  switch (planeId) {
    case "wall":
      return { x: local.x, y: local.y, z: 0 };
    case "wheel":
      return { x: 0, y: local.y, z: local.x };
    case "floor":
      return { x: local.x, y: 0, z: local.y };
  }
}

export function getPlaneNormal(planeId: PlaneId): Vec3 {
  switch (planeId) {
    case "wall":
      return { x: 0, y: 0, z: 1 };
    case "wheel":
      return { x: 1, y: 0, z: 0 };
    case "floor":
      return { x: 0, y: 1, z: 0 };
  }
}

export function projectWorldPoint(
  point: Vec3,
  settings: PlaneProjectionSettings = DEFAULT_PLANE_PROJECTION_SETTINGS
): Vec2 {
  if (settings.mode === "tilted") {
    return projectTiltedWorldPoint(point, settings);
  }

  return { x: point.x, y: point.y };
}

export function toProjectedRigPose(
  relative: RelativeRigPose,
  planeId: PlaneId,
  settings: PlaneProjectionSettings = DEFAULT_PLANE_PROJECTION_SETTINGS
): CartesianRigPose {
  const handWorld = embedPlanePoint(
    planeId,
    localPolarToPlanePoint(relative.handPose.radius, relative.handPose.phaseAbs)
  );
  const headWorld = addWorld(
    handWorld,
    embedPlanePoint(
      planeId,
      localPolarToPlanePoint(relative.headPose.radius, relative.headPose.phaseAbs)
    )
  );

  return {
    handPosition: projectWorldPoint(handWorld, settings),
    headPosition: projectWorldPoint(headWorld, settings)
  };
}

export function toProjectedMultiRigPose(
  poses: Record<RigId, ProjectableEvaluatedPose>,
  settings: PlaneProjectionSettings = DEFAULT_PLANE_PROJECTION_SETTINGS
): CartesianMultiRigPose {
  return Object.fromEntries(
    Object.entries(poses).map(([rigId, value]) => [
      rigId,
      toProjectedRigPose(value.pose, value.planeId, settings)
    ])
  );
}
