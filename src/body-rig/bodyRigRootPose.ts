import type { Vec3 } from "@/engine/types";

const ROOT_COMPONENT_EPSILON = 1e-12;

export interface BodyRigRootPose {
  readonly origin: Vec3;
  readonly facingDeg: number;
  readonly up: Vec3;
  readonly forward: Vec3;
  readonly right: Vec3;
}

function canonicalComponent(value: number): number {
  return Math.abs(value) <= ROOT_COMPONENT_EPSILON ? 0 : value;
}

export function buildBodyRigRootPose(origin: Vec3, facingDeg = 0): BodyRigRootPose {
  if (!Number.isFinite(facingDeg)) {
    throw new RangeError("Body rig root facing must be a finite number of degrees");
  }

  const facingRad = (facingDeg * Math.PI) / 180;
  const sin = canonicalComponent(Math.sin(facingRad));
  const cos = canonicalComponent(Math.cos(facingRad));

  return {
    origin,
    facingDeg,
    up: { x: 0, y: 1, z: 0 },
    forward: { x: sin, y: 0, z: cos },
    right: { x: cos, y: 0, z: -sin }
  };
}

export function transformBodyRigRootPoint(rootPose: BodyRigRootPose, point: Vec3): Vec3 {
  const localX = point.x - rootPose.origin.x;
  const localY = point.y - rootPose.origin.y;
  const localZ = point.z - rootPose.origin.z;

  return {
    x:
      rootPose.origin.x +
      rootPose.right.x * localX +
      rootPose.up.x * localY +
      rootPose.forward.x * localZ,
    y:
      rootPose.origin.y +
      rootPose.right.y * localX +
      rootPose.up.y * localY +
      rootPose.forward.y * localZ,
    z:
      rootPose.origin.z +
      rootPose.right.z * localX +
      rootPose.up.z * localY +
      rootPose.forward.z * localZ
  };
}
