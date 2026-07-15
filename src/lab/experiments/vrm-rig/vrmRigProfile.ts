import type { VRM, VRMHumanBoneName } from "@pixiv/three-vrm";
import * as THREE from "three";

import {
  buildBodyRigConfigFromArmReach,
  buildDefaultBodyRigDimensions,
  computeBodyRigCanonicalPatternSpace,
  type BodyRigDimensions
} from "@/body-rig";
import type { Vec3 } from "@/engine/types";

export type TargetRigSide = "left" | "right";
export type VrmAnatomicalSide = "left" | "right";

export interface VrmArmProfile {
  readonly clavicleLength: number;
  readonly upperArmLength: number;
  readonly forearmLength: number;
  readonly shoulderBase: Vec3;
  readonly shoulderSocket: Vec3;
}

export interface VrmLegProfile {
  readonly upperLegLength: number;
  readonly lowerLegLength: number;
}

export interface VrmRigProfile {
  readonly modelArmReach: number;
  readonly modelPatternRadius: number;
  readonly targetPatternRadius: number;
  readonly scale: number;
  readonly modelShoulderBaseSpan: number;
  readonly modelShoulderSocketSpan: number;
  /** Aligns the model's measured humanoid rest basis to +X/+Y/+Z. */
  readonly modelToTargetRotation: readonly [number, number, number, number];
  /** Includes the handedness reflection required by the VRM 1.0 basis. */
  readonly modelToTargetScaleSigns: Vec3;
  readonly arms: Readonly<Record<VrmAnatomicalSide, VrmArmProfile>>;
  readonly legs: Readonly<Record<VrmAnatomicalSide, VrmLegProfile>>;
  /** Anatomical side mapping. View mirroring never changes this contract. */
  readonly targetToVrmSide: Readonly<Record<TargetRigSide, VrmAnatomicalSide>>;
  readonly dimensions: BodyRigDimensions;
}

const MIN_MEASUREMENT = 1e-8;

function requiredBone(vrm: VRM, name: VRMHumanBoneName): THREE.Object3D {
  const bone = vrm.humanoid.getNormalizedBoneNode(name);
  if (!bone) {
    throw new Error(`VRM fixture is missing required humanoid bone: ${name}`);
  }
  return bone;
}

function position(vrm: VRM, name: VRMHumanBoneName): THREE.Vector3 {
  return requiredBone(vrm, name).getWorldPosition(new THREE.Vector3());
}

function plain(vector: THREE.Vector3): Vec3 {
  return { x: vector.x, y: vector.y, z: vector.z };
}

function distance(vrm: VRM, from: VRMHumanBoneName, to: VRMHumanBoneName): number {
  return position(vrm, from).distanceTo(position(vrm, to));
}

function midpoint(a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3 {
  return a.clone().add(b).multiplyScalar(0.5);
}

function buildModelToTargetTransform(vrm: VRM): {
  readonly rotation: THREE.Quaternion;
  readonly scaleSigns: Vec3;
} {
  const targetToVrmSide: Readonly<Record<TargetRigSide, VrmAnatomicalSide>> = {
    left: "left",
    right: "right"
  };
  const targetLeftSocket = position(vrm, `${targetToVrmSide.left}UpperArm` as VRMHumanBoneName);
  const targetRightSocket = position(vrm, `${targetToVrmSide.right}UpperArm` as VRMHumanBoneName);
  const socketMidpoint = midpoint(targetLeftSocket, targetRightSocket);
  const modelRight = targetRightSocket.clone().sub(targetLeftSocket).normalize();
  const torsoUp = socketMidpoint.clone().sub(position(vrm, "hips"));
  const modelUp = torsoUp.clone().addScaledVector(modelRight, -torsoUp.dot(modelRight)).normalize();
  const modelForward = new THREE.Vector3().crossVectors(modelUp, modelRight).normalize();

  if (
    modelRight.lengthSq() <= MIN_MEASUREMENT ||
    modelUp.lengthSq() <= MIN_MEASUREMENT ||
    modelForward.lengthSq() <= MIN_MEASUREMENT
  ) {
    throw new Error("VRM fixture has a degenerate humanoid rest basis.");
  }

  const modelBasis = new THREE.Matrix4().makeBasis(modelRight, modelUp, modelForward);
  const modelToTarget = modelBasis.invert();
  const translation = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  modelToTarget.decompose(translation, rotation, scale);

  return {
    rotation: rotation.normalize(),
    scaleSigns: {
      x: Math.sign(scale.x) || 1,
      y: Math.sign(scale.y) || 1,
      z: Math.sign(scale.z) || 1
    }
  };
}

function average(a: number, b: number): number {
  return (a + b) * 0.5;
}

function safeMeasurement(value: number, fallback: number): number {
  return Number.isFinite(value) && value > MIN_MEASUREMENT ? value : fallback;
}

function buildProfileDimensions(
  vrm: VRM,
  scale: number,
  arms: Readonly<Record<VrmAnatomicalSide, VrmArmProfile>>,
  legs: Readonly<Record<VrmAnatomicalSide, VrmLegProfile>>,
  modelArmReach: number
): BodyRigDimensions {
  const scaledArmReach = modelArmReach * scale;
  const fallback = buildDefaultBodyRigDimensions(scaledArmReach);
  const upperArmLength = average(arms.left.upperArmLength, arms.right.upperArmLength) * scale;
  const forearmLength = average(arms.left.forearmLength, arms.right.forearmLength) * scale;
  const leftSocket = position(vrm, "leftUpperArm");
  const rightSocket = position(vrm, "rightUpperArm");
  const shoulderMidpoint = midpoint(leftSocket, rightSocket);
  const hips = position(vrm, "hips");
  const leftUpperLeg = position(vrm, "leftUpperLeg");
  const rightUpperLeg = position(vrm, "rightUpperLeg");
  const head = position(vrm, "head");
  const shoulderSpan = leftSocket.distanceTo(rightSocket) * scale;
  const torsoHeight = safeMeasurement(
    shoulderMidpoint.distanceTo(hips) * scale,
    fallback.torsoHeight
  );
  const hipSpan = safeMeasurement(leftUpperLeg.distanceTo(rightUpperLeg) * scale, fallback.hipSpan);
  const thighLength = average(legs.left.upperLegLength, legs.right.upperLegLength) * scale;
  const shinLength = average(legs.left.lowerLegLength, legs.right.lowerLegLength) * scale;
  const headHeight = Math.max(0, head.y - shoulderMidpoint.y) * scale;
  const headRadius = Math.min(fallback.headRadius, headHeight * 0.45 || fallback.headRadius);
  const config = {
    ...buildBodyRigConfigFromArmReach(scaledArmReach),
    upperArmLength,
    forearmLength,
    baseShoulderSpan: shoulderSpan
  };
  const rootShoulderGirdleCenter = { ...fallback.rootShoulderGirdleCenter };
  const canonicalPatternSpace = computeBodyRigCanonicalPatternSpace({
    root: {
      shoulderGirdleCenter: rootShoulderGirdleCenter,
      worldUp: { x: 0, y: 1, z: 0 },
      neutralForward: { x: 0, y: 0, z: 1 },
      scale: 1
    },
    config,
    useMaxYawCompression: true
  });

  return {
    armReach: upperArmLength + forearmLength,
    config,
    shoulderSpan,
    torsoHeight,
    hipSpan,
    headRadius,
    headGap: Math.max(0, headHeight - headRadius),
    neckOffset: Math.min(fallback.neckOffset, headHeight * 0.2),
    thighLength: safeMeasurement(thighLength, fallback.thighLength),
    shinLength: safeMeasurement(shinLength, fallback.shinLength),
    footOffset: 0,
    stanceWidth: 0,
    cameraCenterWorld: { ...fallback.cameraCenterWorld },
    rootShoulderGirdleCenter,
    canonicalPatternSpace
  };
}

export function resolveVrmPatternScale(
  modelPatternRadius: number,
  targetPatternRadius: number
): number {
  if (!Number.isFinite(modelPatternRadius) || modelPatternRadius <= MIN_MEASUREMENT) {
    throw new Error("VRM fixture has an invalid canonical pattern radius.");
  }

  if (!Number.isFinite(targetPatternRadius) || targetPatternRadius <= MIN_MEASUREMENT) {
    throw new Error("Target canonical pattern radius is invalid.");
  }

  return targetPatternRadius / modelPatternRadius;
}

export function buildVrmRigProfile(vrm: VRM, targetPatternRadius = 1): VrmRigProfile {
  if (!Number.isFinite(targetPatternRadius) || targetPatternRadius <= MIN_MEASUREMENT) {
    throw new Error("Target canonical pattern radius is invalid.");
  }

  vrm.humanoid.resetNormalizedPose();
  vrm.scene.position.set(0, 0, 0);
  vrm.scene.scale.set(1, 1, 1);
  vrm.scene.quaternion.identity();
  vrm.scene.updateMatrixWorld(true);

  const arms = {
    left: {
      clavicleLength: distance(vrm, "leftShoulder", "leftUpperArm"),
      upperArmLength: distance(vrm, "leftUpperArm", "leftLowerArm"),
      forearmLength: distance(vrm, "leftLowerArm", "leftHand"),
      shoulderBase: plain(position(vrm, "leftShoulder")),
      shoulderSocket: plain(position(vrm, "leftUpperArm"))
    },
    right: {
      clavicleLength: distance(vrm, "rightShoulder", "rightUpperArm"),
      upperArmLength: distance(vrm, "rightUpperArm", "rightLowerArm"),
      forearmLength: distance(vrm, "rightLowerArm", "rightHand"),
      shoulderBase: plain(position(vrm, "rightShoulder")),
      shoulderSocket: plain(position(vrm, "rightUpperArm"))
    }
  } as const;
  const modelArmReach = average(
    arms.left.upperArmLength + arms.left.forearmLength,
    arms.right.upperArmLength + arms.right.forearmLength
  );
  if (!Number.isFinite(modelArmReach) || modelArmReach <= MIN_MEASUREMENT) {
    throw new Error("VRM fixture has an invalid humanoid arm reach.");
  }
  const legs = {
    left: {
      upperLegLength: distance(vrm, "leftUpperLeg", "leftLowerLeg"),
      lowerLegLength: distance(vrm, "leftLowerLeg", "leftFoot")
    },
    right: {
      upperLegLength: distance(vrm, "rightUpperLeg", "rightLowerLeg"),
      lowerLegLength: distance(vrm, "rightLowerLeg", "rightFoot")
    }
  } as const;
  const unscaledDimensions = buildProfileDimensions(vrm, 1, arms, legs, modelArmReach);
  const modelPatternRadius = unscaledDimensions.canonicalPatternSpace.unitRadius;
  const scale = resolveVrmPatternScale(modelPatternRadius, targetPatternRadius);
  const dimensions = buildProfileDimensions(vrm, scale, arms, legs, modelArmReach);
  if (Math.abs(dimensions.canonicalPatternSpace.unitRadius - targetPatternRadius) > 1e-6) {
    throw new Error("VRM canonical pattern radius did not normalize to the requested target.");
  }
  const targetToVrmSide: Readonly<Record<TargetRigSide, VrmAnatomicalSide>> = {
    left: "left",
    right: "right"
  };
  const modelToTarget = buildModelToTargetTransform(vrm);

  return {
    modelArmReach,
    modelPatternRadius,
    targetPatternRadius,
    scale,
    modelShoulderBaseSpan: distance(vrm, "leftShoulder", "rightShoulder"),
    modelShoulderSocketSpan: distance(vrm, "leftUpperArm", "rightUpperArm"),
    modelToTargetRotation: modelToTarget.rotation.toArray(),
    modelToTargetScaleSigns: modelToTarget.scaleSigns,
    arms,
    legs,
    targetToVrmSide,
    dimensions
  };
}
