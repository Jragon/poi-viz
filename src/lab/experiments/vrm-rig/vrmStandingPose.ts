import type { VRM, VRMHumanBoneName } from "@pixiv/three-vrm";
import * as THREE from "three";

import { solveWorldStickArm, type BodySkeletonFrame, type SkeletonJointName } from "@/body-rig";
import type { Vec3 } from "@/engine/types";

import {
  buildVrmRigProfile,
  type TargetRigSide,
  type VrmAnatomicalSide,
  type VrmRigProfile
} from "./vrmRigProfile";

const MIN_DIRECTION_LENGTH = 1e-8;
const WORLD_UP = new THREE.Vector3(0, 1, 0);

export interface VrmRigCalibration {
  readonly modelArmReach: number;
  readonly targetArmReach: number;
  readonly scale: number;
  readonly modelAnchorBeforeTranslation: Vec3;
  readonly targetAnchor: Vec3;
  readonly translation: Vec3;
}

export interface VrmArmPoseDiagnostics {
  readonly vrmSide: VrmAnatomicalSide;
  readonly shoulderError: number;
  readonly elbowError: number;
  readonly wristError: number;
}

export interface VrmPoseDiagnostics {
  readonly left: VrmArmPoseDiagnostics;
  readonly right: VrmArmPoseDiagnostics;
  readonly maxJointError: number;
}

interface VrmArmDefinition {
  readonly targetSide: TargetRigSide;
  readonly vrmSide: VrmAnatomicalSide;
  readonly upperArm: VRMHumanBoneName;
  readonly lowerArm: VRMHumanBoneName;
  readonly hand: VRMHumanBoneName;
}

const ARM_JOINTS: Readonly<
  Record<
    TargetRigSide,
    readonly [SkeletonJointName, SkeletonJointName, SkeletonJointName, SkeletonJointName]
  >
> = {
  left: ["clavicleLeft", "shoulderLeft", "elbowLeft", "handLeft"],
  right: ["clavicleRight", "shoulderRight", "elbowRight", "handRight"]
};

function armBoneName(
  side: VrmAnatomicalSide,
  suffix: "Shoulder" | "UpperArm" | "LowerArm" | "Hand"
) {
  return `${side}${suffix}` as VRMHumanBoneName;
}

function buildArmDefinitions(profile: VrmRigProfile): readonly VrmArmDefinition[] {
  return (["left", "right"] as const).map((targetSide) => {
    const vrmSide = profile.targetToVrmSide[targetSide];
    return {
      targetSide,
      vrmSide,
      upperArm: armBoneName(vrmSide, "UpperArm"),
      lowerArm: armBoneName(vrmSide, "LowerArm"),
      hand: armBoneName(vrmSide, "Hand")
    };
  });
}

function midpoint(a: Vec3, b: Vec3): THREE.Vector3 {
  return new THREE.Vector3((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, (a.z + b.z) * 0.5);
}

function toPlainVector(vector: THREE.Vector3): Vec3 {
  return { x: vector.x, y: vector.y, z: vector.z };
}

function getRequiredBone(vrm: VRM, name: VRMHumanBoneName): THREE.Object3D {
  const node = vrm.humanoid.getNormalizedBoneNode(name);

  if (!node) {
    throw new Error(`VRM fixture is missing required humanoid bone: ${name}`);
  }

  return node;
}

function worldPosition(vrm: VRM, name: VRMHumanBoneName): THREE.Vector3 {
  return getRequiredBone(vrm, name).getWorldPosition(new THREE.Vector3());
}

/**
 * Applies the current deterministic body-solver output to VRM normalized bones.
 * The adapter deliberately controls only torso yaw and both arm chains. Legs,
 * hands, head, and facial state remain in the VRM reference pose.
 */
export class VrmStandingPoseAdapter {
  private calibration: VrmRigCalibration | null = null;
  private readonly profile: VrmRigProfile;
  private readonly arms: readonly VrmArmDefinition[];
  private readonly restLocalRotations = new Map<VRMHumanBoneName, THREE.Quaternion>();

  public constructor(
    private readonly vrm: VRM,
    profile?: VrmRigProfile
  ) {
    this.profile = profile ?? buildVrmRigProfile(vrm);
    this.arms = buildArmDefinitions(this.profile);
    this.captureRestRotations();
  }

  public get currentCalibration(): VrmRigCalibration | null {
    return this.calibration;
  }

  public get rigProfile(): VrmRigProfile {
    return this.profile;
  }

  public calibrate(frame: BodySkeletonFrame): VrmRigCalibration {
    const { scene, humanoid } = this.vrm;

    humanoid.resetNormalizedPose();
    scene.position.set(0, 0, 0);
    scene.scale.set(1, 1, 1);
    scene.quaternion.fromArray(this.profile.modelToTargetRotation);
    scene.updateMatrixWorld(true);

    const modelArmReach = this.profile.modelArmReach;
    const targetArmReach = frame.supportPose.armReach;
    const scale = this.profile.scale;

    if (Math.abs(targetArmReach - this.profile.dimensions.armReach) > 1e-6) {
      throw new Error("Body rig arm reach does not match the loaded VRM rig profile.");
    }

    scene.scale.setScalar(scale);
    scene.updateMatrixWorld(true);

    const { modelAnchor, targetAnchor, translation } = this.alignShoulderSockets(frame);

    this.calibration = {
      modelArmReach,
      targetArmReach,
      scale,
      modelAnchorBeforeTranslation: toPlainVector(modelAnchor),
      targetAnchor: toPlainVector(targetAnchor),
      translation: toPlainVector(translation)
    };

    return this.calibration;
  }

  public apply(frame: BodySkeletonFrame): void {
    if (!this.calibration) {
      this.calibrate(frame);
    }

    const humanoid = this.vrm.humanoid;

    humanoid.resetNormalizedPose();
    this.vrm.scene.position.set(0, 0, 0);
    this.vrm.scene.scale.setScalar(this.profile.scale);
    this.vrm.scene.quaternion.fromArray(this.profile.modelToTargetRotation);
    this.vrm.scene.updateMatrixWorld(true);

    const spine = getRequiredBone(this.vrm, "spine");
    const chest = getRequiredBone(this.vrm, "chest");
    const pelvisYaw = frame.solverDiagnostics.pelvisYawRad;
    const chestYaw = frame.solverDiagnostics.chestYawRad;

    this.applyWorldYaw("spine", spine, pelvisYaw);
    this.applyWorldYaw("chest", chest, chestYaw - pelvisYaw);
    humanoid.normalizedHumanBonesRoot.updateMatrixWorld(true);
    this.alignShoulderSockets(frame);

    for (const arm of this.arms) {
      this.solveAndAimArm(arm, frame);
    }
    this.vrm.scene.updateMatrixWorld(true);
  }

  public measure(frame: BodySkeletonFrame): VrmPoseDiagnostics {
    const left = this.measureArm("left", frame);
    const right = this.measureArm("right", frame);
    return {
      left,
      right,
      maxJointError: Math.max(
        left.shoulderError,
        left.elbowError,
        left.wristError,
        right.shoulderError,
        right.elbowError,
        right.wristError
      )
    };
  }

  private captureRestRotations(): void {
    this.vrm.humanoid.resetNormalizedPose();
    for (const name of [
      "spine",
      "chest",
      ...this.arms.flatMap((arm) => [arm.upperArm, arm.lowerArm])
    ] as VRMHumanBoneName[]) {
      if (!this.restLocalRotations.has(name)) {
        this.restLocalRotations.set(name, getRequiredBone(this.vrm, name).quaternion.clone());
      }
    }
  }

  private alignShoulderSockets(frame: BodySkeletonFrame): {
    readonly modelAnchor: THREE.Vector3;
    readonly targetAnchor: THREE.Vector3;
    readonly translation: THREE.Vector3;
  } {
    const modelAnchor = midpoint(
      toPlainVector(worldPosition(this.vrm, "leftUpperArm")),
      toPlainVector(worldPosition(this.vrm, "rightUpperArm"))
    );
    const targetAnchor = midpoint(frame.joints.shoulderLeft, frame.joints.shoulderRight);
    const translation = targetAnchor.clone().sub(modelAnchor);
    this.vrm.scene.position.add(translation);
    this.vrm.scene.updateMatrixWorld(true);
    return { modelAnchor, targetAnchor, translation };
  }

  private restRotation(name: VRMHumanBoneName): THREE.Quaternion {
    const rotation = this.restLocalRotations.get(name);
    if (!rotation) {
      throw new Error(`Missing captured VRM rest rotation for ${name}.`);
    }
    return rotation;
  }

  private applyWorldYaw(name: VRMHumanBoneName, bone: THREE.Object3D, angleRad: number): void {
    const parentWorldRotation = new THREE.Quaternion();
    bone.parent?.getWorldQuaternion(parentWorldRotation);
    const baseWorldRotation = parentWorldRotation.clone().multiply(this.restRotation(name));
    const desiredWorldRotation = new THREE.Quaternion()
      .setFromAxisAngle(WORLD_UP, angleRad)
      .multiply(baseWorldRotation);
    bone.quaternion
      .copy(parentWorldRotation.clone().invert())
      .multiply(desiredWorldRotation)
      .normalize();
    bone.updateWorldMatrix(false, true);
  }

  private solveAndAimArm(arm: VrmArmDefinition, frame: BodySkeletonFrame): void {
    const [, , , handJoint] = ARM_JOINTS[arm.targetSide];
    const modelShoulder = worldPosition(this.vrm, arm.upperArm);
    const modelArm = this.profile.arms[arm.vrmSide];
    const solve = solveWorldStickArm({
      shoulder: toPlainVector(modelShoulder),
      handTarget: frame.joints[handJoint],
      upperArmLength: modelArm.upperArmLength * this.profile.scale,
      forearmLength: modelArm.forearmLength * this.profile.scale,
      armSide: arm.targetSide,
      torsoRight: frame.orientation.right,
      torsoForward: frame.orientation.forward,
      worldUp: frame.orientation.up
    });

    this.aimBone(
      arm.upperArm,
      arm.lowerArm,
      new THREE.Vector3().subVectors(
        new THREE.Vector3(solve.elbow.x, solve.elbow.y, solve.elbow.z),
        modelShoulder
      )
    );
    this.aimBone(
      arm.lowerArm,
      arm.hand,
      new THREE.Vector3(
        solve.hand.x - solve.elbow.x,
        solve.hand.y - solve.elbow.y,
        solve.hand.z - solve.elbow.z
      )
    );
  }

  private aimBone(
    boneName: VRMHumanBoneName,
    childName: VRMHumanBoneName,
    targetDirection: THREE.Vector3
  ): void {
    const bone = getRequiredBone(this.vrm, boneName);
    const child = getRequiredBone(this.vrm, childName);

    if (targetDirection.lengthSq() <= MIN_DIRECTION_LENGTH) {
      return;
    }

    const localChildDirection = child.position.clone();
    if (localChildDirection.lengthSq() <= MIN_DIRECTION_LENGTH) {
      throw new Error(`VRM normalized bone ${boneName} has no usable child direction.`);
    }

    localChildDirection.normalize();
    targetDirection.normalize();
    const parentWorldRotation = new THREE.Quaternion();
    bone.parent?.getWorldQuaternion(parentWorldRotation);
    const baseWorldRotation = parentWorldRotation.clone().multiply(this.restRotation(boneName));
    const restWorldDirection = localChildDirection.clone().applyQuaternion(baseWorldRotation);
    const swing = new THREE.Quaternion().setFromUnitVectors(restWorldDirection, targetDirection);
    const desiredWorldRotation = swing.multiply(baseWorldRotation);

    bone.quaternion
      .copy(parentWorldRotation.clone().invert())
      .multiply(desiredWorldRotation)
      .normalize();
    bone.updateWorldMatrix(false, true);
  }

  private measureArm(targetSide: TargetRigSide, frame: BodySkeletonFrame): VrmArmPoseDiagnostics {
    const vrmSide = this.profile.targetToVrmSide[targetSide];
    const [, shoulder, elbow, hand] = ARM_JOINTS[targetSide];
    const error = (boneSuffix: "UpperArm" | "LowerArm" | "Hand", joint: SkeletonJointName) =>
      worldPosition(this.vrm, armBoneName(vrmSide, boneSuffix)).distanceTo(
        new THREE.Vector3(frame.joints[joint].x, frame.joints[joint].y, frame.joints[joint].z)
      );
    return {
      vrmSide,
      shoulderError: error("UpperArm", shoulder),
      elbowError: error("LowerArm", elbow),
      wristError: error("Hand", hand)
    };
  }
}
