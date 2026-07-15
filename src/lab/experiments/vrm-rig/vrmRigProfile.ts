import type { VRM, VRMHumanBoneName } from "@pixiv/three-vrm";
import * as THREE from "three";

import {
  buildBodyRigConfigFromArmReach,
  buildBodyRigDimensionsForCanonicalUnitRadius,
  computeBodyRigCanonicalPatternSpace,
  type BodyRigDimensions
} from "@/body-rig";
import type { Vec3 } from "@/engine/types";

export type TargetRigSide = "left" | "right";
export type VrmAnatomicalSide = "left" | "right";

export interface VrmArmProfile {
  readonly upperArmLength: number;
  readonly forearmLength: number;
  readonly shoulderBase: Vec3;
  readonly shoulderSocket: Vec3;
}

export interface VrmRigProfile {
  readonly modelArmReach: number;
  readonly targetArmReach: number;
  readonly scale: number;
  readonly modelShoulderBaseSpan: number;
  readonly modelShoulderSocketSpan: number;
  /** Rigidly aligns the model's measured humanoid rest basis to +X/+Y/+Z. */
  readonly modelToTargetRotation: readonly [number, number, number, number];
  readonly arms: Readonly<Record<VrmAnatomicalSide, VrmArmProfile>>;
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

function buildModelToTargetRotation(vrm: VRM): THREE.Quaternion {
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
  const modelForward = new THREE.Vector3().crossVectors(modelRight, modelUp).normalize();

  if (
    modelRight.lengthSq() <= MIN_MEASUREMENT ||
    modelUp.lengthSq() <= MIN_MEASUREMENT ||
    modelForward.lengthSq() <= MIN_MEASUREMENT
  ) {
    throw new Error("VRM fixture has a degenerate humanoid rest basis.");
  }

  const modelBasis = new THREE.Matrix4().makeBasis(modelRight, modelUp, modelForward);
  return new THREE.Quaternion().setFromRotationMatrix(modelBasis).invert().normalize();
}

function average(a: number, b: number): number {
  return (a + b) * 0.5;
}

function safeMeasurement(value: number, fallback: number): number {
  return Number.isFinite(value) && value > MIN_MEASUREMENT ? value : fallback;
}

function buildProfileDimensions(
  vrm: VRM,
  targetArmReach: number,
  scale: number,
  arms: Readonly<Record<VrmAnatomicalSide, VrmArmProfile>>
): BodyRigDimensions {
  const fallback = buildBodyRigDimensionsForCanonicalUnitRadius(1);
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
  const thighLength =
    average(
      distance(vrm, "leftUpperLeg", "leftLowerLeg"),
      distance(vrm, "rightUpperLeg", "rightLowerLeg")
    ) * scale;
  const shinLength =
    average(
      distance(vrm, "leftLowerLeg", "leftFoot"),
      distance(vrm, "rightLowerLeg", "rightFoot")
    ) * scale;
  const headHeight = Math.max(0, head.y - shoulderMidpoint.y) * scale;
  const headRadius = Math.min(fallback.headRadius, headHeight * 0.45 || fallback.headRadius);
  const config = {
    ...buildBodyRigConfigFromArmReach(targetArmReach),
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
    footOffset: fallback.footOffset,
    stanceWidth: 0,
    cameraCenterWorld: { ...fallback.cameraCenterWorld },
    rootShoulderGirdleCenter,
    canonicalPatternSpace
  };
}

export function buildVrmRigProfile(
  vrm: VRM,
  targetArmReach = buildBodyRigDimensionsForCanonicalUnitRadius(1).armReach
): VrmRigProfile {
  if (!Number.isFinite(targetArmReach) || targetArmReach <= MIN_MEASUREMENT) {
    throw new Error("Target body rig has an invalid arm reach.");
  }

  vrm.humanoid.resetNormalizedPose();
  vrm.scene.position.set(0, 0, 0);
  vrm.scene.scale.set(1, 1, 1);
  vrm.scene.quaternion.identity();
  vrm.scene.updateMatrixWorld(true);

  const arms = {
    left: {
      upperArmLength: distance(vrm, "leftUpperArm", "leftLowerArm"),
      forearmLength: distance(vrm, "leftLowerArm", "leftHand"),
      shoulderBase: plain(position(vrm, "leftShoulder")),
      shoulderSocket: plain(position(vrm, "leftUpperArm"))
    },
    right: {
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
  const scale = targetArmReach / modelArmReach;
  const targetToVrmSide: Readonly<Record<TargetRigSide, VrmAnatomicalSide>> = {
    left: "left",
    right: "right"
  };
  const modelToTargetRotation = buildModelToTargetRotation(vrm);

  return {
    modelArmReach,
    targetArmReach,
    scale,
    modelShoulderBaseSpan: distance(vrm, "leftShoulder", "rightShoulder"),
    modelShoulderSocketSpan: distance(vrm, "leftUpperArm", "rightUpperArm"),
    modelToTargetRotation: modelToTargetRotation.toArray(),
    arms,
    targetToVrmSide,
    dimensions: buildProfileDimensions(vrm, targetArmReach, scale, arms)
  };
}
