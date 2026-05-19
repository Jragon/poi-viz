import type { Vec2, Vec3 } from "@/engine/types";

import { buildBodyRigConfigFromArmReach, type BodyRigConfig } from "./bodyRigConfig";
import {
  computeBodyRigCanonicalPatternSpace,
  type BodyRigCanonicalPatternSpaceResult
} from "./stickFigureGeometry";

export interface BodyRigDimensions {
  readonly armReach: number;
  readonly config: BodyRigConfig;
  readonly shoulderSpan: number;
  readonly torsoHeight: number;
  readonly hipSpan: number;
  readonly headRadius: number;
  readonly headGap: number;
  readonly neckOffset: number;
  readonly thighLength: number;
  readonly shinLength: number;
  readonly footOffset: number;
  readonly stanceWidth: number;
  readonly cameraCenterWorld: Vec2;
  readonly rootShoulderGirdleCenter: Vec3;
  readonly canonicalPatternSpace: BodyRigCanonicalPatternSpaceResult;
}

export const DEFAULT_BODY_ARM_REACH = 1.25;
export const DEFAULT_BODY_TORSO_HEIGHT_RATIO = 0.86;
export const DEFAULT_BODY_HIP_SPAN_SHOULDER_RATIO = 0.72;
export const DEFAULT_BODY_HEAD_RADIUS_RATIO = 0.21;
export const DEFAULT_BODY_HEAD_GAP_RATIO = 0.14;
export const DEFAULT_BODY_NECK_OFFSET_RATIO = 0.08;
export const DEFAULT_BODY_THIGH_LENGTH_RATIO = 0.625;
export const DEFAULT_BODY_SHIN_LENGTH_RATIO = 0.59375;
export const DEFAULT_BODY_FOOT_OFFSET_RATIO = 0.0625;
export const DEFAULT_BODY_STANCE_SHOULDER_RATIO = 0.2;
export const DEFAULT_BODY_CAMERA_CENTER_WORLD: Vec2 = { x: 0, y: -0.7 };
export const DEFAULT_BODY_ROOT_SHOULDER_GIRDLE_CENTER: Vec3 = { x: 0, y: 0, z: 0 };

export function buildDefaultBodyRigDimensions(
  armReach = DEFAULT_BODY_ARM_REACH
): BodyRigDimensions {
  const config = buildBodyRigConfigFromArmReach(armReach);
  const shoulderSpan = config.baseShoulderSpan;
  const canonicalPatternSpace = computeBodyRigCanonicalPatternSpace({
    root: {
      shoulderGirdleCenter: DEFAULT_BODY_ROOT_SHOULDER_GIRDLE_CENTER,
      worldUp: { x: 0, y: 1, z: 0 },
      neutralForward: { x: 0, y: 0, z: 1 },
      scale: 1
    },
    config,
    useMaxYawCompression: true
  });

  return {
    armReach,
    config,
    shoulderSpan,
    torsoHeight: armReach * DEFAULT_BODY_TORSO_HEIGHT_RATIO,
    hipSpan: shoulderSpan * DEFAULT_BODY_HIP_SPAN_SHOULDER_RATIO,
    headRadius: armReach * DEFAULT_BODY_HEAD_RADIUS_RATIO,
    headGap: armReach * DEFAULT_BODY_HEAD_GAP_RATIO,
    neckOffset: armReach * DEFAULT_BODY_NECK_OFFSET_RATIO,
    thighLength: armReach * DEFAULT_BODY_THIGH_LENGTH_RATIO,
    shinLength: armReach * DEFAULT_BODY_SHIN_LENGTH_RATIO,
    footOffset: armReach * DEFAULT_BODY_FOOT_OFFSET_RATIO,
    stanceWidth: shoulderSpan * DEFAULT_BODY_STANCE_SHOULDER_RATIO,
    cameraCenterWorld: DEFAULT_BODY_CAMERA_CENTER_WORLD,
    rootShoulderGirdleCenter: DEFAULT_BODY_ROOT_SHOULDER_GIRDLE_CENTER,
    canonicalPatternSpace
  };
}

export function buildBodyRigDimensionsForCanonicalUnitRadius(targetRadius = 1): BodyRigDimensions {
  const base = buildDefaultBodyRigDimensions(1);
  const radius = Number.isFinite(targetRadius) && targetRadius > 0 ? targetRadius : 1;

  return buildDefaultBodyRigDimensions(radius / base.canonicalPatternSpace.unitRadius);
}
