import * as THREE from "three";

import type { BodySkeletonFrame } from "@/body-rig";

export const MANNEQUIN_PROPORTIONS = {
  totalHeight: 6.7,
  headHeight: 1,
  headWidth: 0.55,
  neckBeadWidth: 0.24,
  shoulderSpanOuter: 1.4,
  shoulderJointSpan: 1.1,
  upperTorsoHeight: 1.35,
  pelvisHeight: 1.0,
  upperArmLength: 1.15,
  forearmLength: 1.1,
  handLength: 0.65,
  thighLength: 1.3,
  shinLength: 1.4,
  footVisibleHeight: 0.4,
  chestWidth: 0.95,
  waistWidth: 0.75,
  pelvisWidth: 0.85,
  hipJointSpan: 0.55,
  upperArmMaxWidth: 0.28,
  forearmMaxWidth: 0.24,
  handMaxWidth: 0.21,
  thighMaxWidth: 0.31,
  calfMaxWidth: 0.25,
  ankleWidth: 0.12
} as const;

export type MannequinShapeKind = "egg" | "tapered-capsule" | "block";

export type MannequinPieceName =
  | "head"
  | "ribcage"
  | "pelvis"
  | "leftUpperArm"
  | "rightUpperArm"
  | "leftForearm"
  | "rightForearm"
  | "leftThigh"
  | "rightThigh"
  | "leftShin"
  | "rightShin";

export interface MannequinPieceConfig {
  readonly shape: MannequinShapeKind;
  readonly lengthRatio: number;
  readonly proximalRadius: number;
  readonly distalRadius: number;
  readonly radialSegments: number;
  readonly capSegments: number;
}

export type MannequinBodyConfig = Record<MannequinPieceName, MannequinPieceConfig>;

const DEFAULT_RADIAL_SEGMENTS = 18;
const DEFAULT_CAP_SEGMENTS = 8;

function clampPositive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function createBodyPieceConfig(
  shape: MannequinShapeKind,
  lengthRatio: number,
  proximalRadius: number,
  distalRadius: number
): MannequinPieceConfig {
  return {
    shape,
    lengthRatio,
    proximalRadius,
    distalRadius,
    radialSegments: DEFAULT_RADIAL_SEGMENTS,
    capSegments: DEFAULT_CAP_SEGMENTS
  };
}

export function resolveHeadHeightWorld(shoulderJointSpanWorld: number): number {
  return clampPositive(
    shoulderJointSpanWorld / MANNEQUIN_PROPORTIONS.shoulderJointSpan,
    shoulderJointSpanWorld
  );
}

export function resolveHeadHeightWorldFromTotalHeight(totalHeightWorld: number): number {
  return clampPositive(
    totalHeightWorld / MANNEQUIN_PROPORTIONS.totalHeight,
    totalHeightWorld / 6.7
  );
}

export function buildMannequinBodyConfig(frame: BodySkeletonFrame): MannequinBodyConfig {
  const shoulderSpan = clampPositive(frame.supportPose.shoulderSpan, 0.8);
  const headHeight = resolveHeadHeightWorld(shoulderSpan);
  const upperArmRadius = headHeight * MANNEQUIN_PROPORTIONS.upperArmMaxWidth * 0.5;
  const forearmRadius = headHeight * MANNEQUIN_PROPORTIONS.forearmMaxWidth * 0.5;
  const thighRadius = headHeight * MANNEQUIN_PROPORTIONS.thighMaxWidth * 0.5;
  const calfRadius = headHeight * MANNEQUIN_PROPORTIONS.calfMaxWidth * 0.5;
  const ankleRadius = headHeight * MANNEQUIN_PROPORTIONS.ankleWidth * 0.5;

  return {
    head: createBodyPieceConfig(
      "egg",
      1,
      headHeight * MANNEQUIN_PROPORTIONS.headWidth * 0.5,
      headHeight * MANNEQUIN_PROPORTIONS.headWidth * 0.44
    ),
    ribcage: createBodyPieceConfig(
      "block",
      0.9,
      headHeight * MANNEQUIN_PROPORTIONS.chestWidth * 0.5,
      headHeight * MANNEQUIN_PROPORTIONS.waistWidth * 0.5
    ),
    pelvis: createBodyPieceConfig(
      "block",
      0.82,
      headHeight * MANNEQUIN_PROPORTIONS.waistWidth * 0.5,
      headHeight * MANNEQUIN_PROPORTIONS.pelvisWidth * 0.5
    ),
    leftUpperArm: createBodyPieceConfig(
      "tapered-capsule",
      0.93,
      upperArmRadius,
      forearmRadius * 0.98
    ),
    rightUpperArm: createBodyPieceConfig(
      "tapered-capsule",
      0.93,
      upperArmRadius,
      forearmRadius * 0.98
    ),
    leftForearm: createBodyPieceConfig(
      "tapered-capsule",
      0.88,
      forearmRadius,
      forearmRadius * 0.72
    ),
    rightForearm: createBodyPieceConfig(
      "tapered-capsule",
      0.88,
      forearmRadius,
      forearmRadius * 0.72
    ),
    leftThigh: createBodyPieceConfig(
      "tapered-capsule",
      0.94,
      thighRadius,
      calfRadius * 1.02
    ),
    rightThigh: createBodyPieceConfig(
      "tapered-capsule",
      0.94,
      thighRadius,
      calfRadius * 1.02
    ),
    leftShin: createBodyPieceConfig(
      "tapered-capsule",
      0.9,
      calfRadius,
      ankleRadius
    ),
    rightShin: createBodyPieceConfig(
      "tapered-capsule",
      0.9,
      calfRadius,
      ankleRadius
    )
  };
}

export function createEggGeometry(
  radiusX: number,
  radiusY: number,
  segments = DEFAULT_RADIAL_SEGMENTS
): THREE.BufferGeometry {
  const safeRadiusX = clampPositive(radiusX, 0.1);
  const safeRadiusY = clampPositive(radiusY, safeRadiusX * 1.2);
  const geometry = new THREE.SphereGeometry(safeRadiusX, segments, segments);

  geometry.scale(1, safeRadiusY / safeRadiusX, 1);
  geometry.translate(0, safeRadiusY * 0.08, 0);

  return geometry;
}

export function createTaperedCapsule(
  proximalRadius: number,
  distalRadius: number,
  bodyLength: number,
  capSegments = DEFAULT_CAP_SEGMENTS,
  radialSegments = DEFAULT_RADIAL_SEGMENTS
): THREE.BufferGeometry {
  const safeProximalRadius = clampPositive(proximalRadius, 0.03);
  const safeDistalRadius = clampPositive(distalRadius, safeProximalRadius * 0.7);
  const safeBodyLength = Math.max(bodyLength, Math.max(safeProximalRadius, safeDistalRadius) * 0.25);
  const proximalHalf = Math.PI * 0.5;
  const points: THREE.Vector2[] = [];

  for (let index = 0; index <= capSegments; index += 1) {
    const theta = (index / capSegments) * proximalHalf;
    points.push(
      new THREE.Vector2(
        Math.sin(theta) * safeDistalRadius,
        safeBodyLength * 0.5 + Math.cos(theta) * safeDistalRadius
      )
    );
  }

  points.push(new THREE.Vector2(safeDistalRadius, safeBodyLength * 0.5));
  points.push(new THREE.Vector2(safeProximalRadius, -safeBodyLength * 0.5));

  for (let index = 0; index <= capSegments; index += 1) {
    const theta = proximalHalf + (index / capSegments) * proximalHalf;
    points.push(
      new THREE.Vector2(
        Math.sin(theta) * safeProximalRadius,
        -safeBodyLength * 0.5 + Math.cos(theta) * safeProximalRadius
      )
    );
  }

  return new THREE.LatheGeometry(points, radialSegments);
}