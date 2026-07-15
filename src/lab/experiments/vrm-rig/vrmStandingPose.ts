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
  readonly modelFootAnchorBeforeTranslation: Vec3;
  readonly targetFootAnchor: Vec3;
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
  readonly pelvisError: number;
  readonly leftFootError: number;
  readonly rightFootError: number;
  readonly maxJointError: number;
}

interface VrmArmDefinition {
  readonly targetSide: TargetRigSide;
  readonly vrmSide: VrmAnatomicalSide;
  readonly shoulder: VRMHumanBoneName;
  readonly upperArm: VRMHumanBoneName;
  readonly lowerArm: VRMHumanBoneName;
  readonly hand: VRMHumanBoneName;
}

interface VrmLegDefinition {
  readonly targetSide: TargetRigSide;
  readonly vrmSide: VrmAnatomicalSide;
  readonly upperLeg: VRMHumanBoneName;
  readonly lowerLeg: VRMHumanBoneName;
  readonly foot: VRMHumanBoneName;
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

const LEG_JOINTS: Readonly<
  Record<TargetRigSide, readonly [SkeletonJointName, SkeletonJointName, SkeletonJointName]>
> = {
  left: ["hipLeft", "kneeLeft", "footLeft"],
  right: ["hipRight", "kneeRight", "footRight"]
};

function armBoneName(
  side: VrmAnatomicalSide,
  suffix: "Shoulder" | "UpperArm" | "LowerArm" | "Hand"
) {
  return `${side}${suffix}` as VRMHumanBoneName;
}

function legBoneName(side: VrmAnatomicalSide, suffix: "UpperLeg" | "LowerLeg" | "Foot") {
  return `${side}${suffix}` as VRMHumanBoneName;
}

function buildArmDefinitions(profile: VrmRigProfile): readonly VrmArmDefinition[] {
  return (["left", "right"] as const).map((targetSide) => {
    const vrmSide = profile.targetToVrmSide[targetSide];
    return {
      targetSide,
      vrmSide,
      shoulder: armBoneName(vrmSide, "Shoulder"),
      upperArm: armBoneName(vrmSide, "UpperArm"),
      lowerArm: armBoneName(vrmSide, "LowerArm"),
      hand: armBoneName(vrmSide, "Hand")
    };
  });
}

function buildLegDefinitions(profile: VrmRigProfile): readonly VrmLegDefinition[] {
  return (["left", "right"] as const).map((targetSide) => {
    const vrmSide = profile.targetToVrmSide[targetSide];
    return {
      targetSide,
      vrmSide,
      upperLeg: legBoneName(vrmSide, "UpperLeg"),
      lowerLeg: legBoneName(vrmSide, "LowerLeg"),
      foot: legBoneName(vrmSide, "Foot")
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

function solveTwoBoneTarget(
  root: THREE.Vector3,
  target: Vec3,
  polePoint: Vec3,
  upperLength: number,
  lowerLength: number
): { readonly joint: THREE.Vector3; readonly end: THREE.Vector3 } {
  const targetVector = new THREE.Vector3(target.x, target.y, target.z).sub(root);
  const targetDistance = targetVector.length();
  const direction =
    targetDistance > MIN_DIRECTION_LENGTH
      ? targetVector.clone().multiplyScalar(1 / targetDistance)
      : new THREE.Vector3(0, -1, 0);
  const minReach = Math.abs(upperLength - lowerLength);
  const maxReach = upperLength + lowerLength;
  const distance = THREE.MathUtils.clamp(targetDistance, minReach, maxReach);
  const baseDistance =
    (upperLength ** 2 - lowerLength ** 2 + distance ** 2) /
    Math.max(distance * 2, MIN_DIRECTION_LENGTH);
  const jointHeight = Math.sqrt(Math.max(0, upperLength ** 2 - baseDistance ** 2));
  const pole = new THREE.Vector3(polePoint.x, polePoint.y, polePoint.z).sub(root);
  pole.addScaledVector(direction, -pole.dot(direction));
  if (pole.lengthSq() <= MIN_DIRECTION_LENGTH) {
    pole.set(0, 0, 1).addScaledVector(direction, -direction.z);
  }
  pole.normalize();
  const joint = root
    .clone()
    .addScaledVector(direction, baseDistance)
    .addScaledVector(pole, jointHeight);
  const end = root.clone().addScaledVector(direction, distance);
  return { joint, end };
}

/**
 * Applies the current deterministic body-solver output to VRM normalized bones.
 * The adapter roots the avatar through its pelvis, solves both legs back to
 * planted feet, drives torso yaw, aims each measured clavicle toward its target
 * socket, and solves both arm chains. Hands, head, facial state, and locomotion
 * remain in their VRM reference state.
 */
export class VrmStandingPoseAdapter {
  private calibration: VrmRigCalibration | null = null;
  private readonly profile: VrmRigProfile;
  private readonly arms: readonly VrmArmDefinition[];
  private readonly legs: readonly VrmLegDefinition[];
  private readonly restLocalRotations = new Map<VRMHumanBoneName, THREE.Quaternion>();

  public constructor(
    private readonly vrm: VRM,
    profile?: VrmRigProfile
  ) {
    this.profile = profile ?? buildVrmRigProfile(vrm);
    this.arms = buildArmDefinitions(this.profile);
    this.legs = buildLegDefinitions(this.profile);
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
    this.applySceneTransform(1);
    scene.updateMatrixWorld(true);

    const modelArmReach = this.profile.modelArmReach;
    const targetArmReach = frame.supportPose.armReach;
    const scale = this.profile.scale;

    this.applySceneTransform(scale);
    scene.updateMatrixWorld(true);

    const { modelAnchor, targetAnchor, translation } = this.alignFootAnchors(frame);

    this.calibration = {
      modelArmReach,
      targetArmReach,
      scale,
      modelFootAnchorBeforeTranslation: toPlainVector(modelAnchor),
      targetFootAnchor: toPlainVector(targetAnchor),
      translation: toPlainVector(translation)
    };

    return this.calibration;
  }

  public apply(frame: BodySkeletonFrame): void {
    if (!this.calibration) {
      this.calibrate(frame);
    }

    const humanoid = this.vrm.humanoid;
    const calibration = this.calibration;
    if (!calibration) {
      throw new Error("VRM rig calibration is unavailable.");
    }

    humanoid.resetNormalizedPose();
    this.vrm.scene.position.set(
      calibration.translation.x,
      calibration.translation.y,
      calibration.translation.z
    );
    this.applySceneTransform(this.profile.scale);
    this.vrm.scene.updateMatrixWorld(true);

    const hips = getRequiredBone(this.vrm, "hips");
    const chest = getRequiredBone(this.vrm, "chest");
    const pelvisYaw = frame.solverDiagnostics.pelvisYawRad;
    const chestYaw = frame.solverDiagnostics.chestYawRad;

    this.placeHips(hips, frame.joints.pelvisCenter);
    this.applyWorldYaw("hips", hips, pelvisYaw);
    this.applyWorldYaw("chest", chest, chestYaw - pelvisYaw);
    humanoid.normalizedHumanBonesRoot.updateMatrixWorld(true);

    for (const leg of this.legs) {
      this.solveAndAimLeg(leg, frame);
    }

    for (const arm of this.arms) {
      this.solveAndAimArm(arm, frame);
    }
    this.vrm.scene.updateMatrixWorld(true);
  }

  public measure(frame: BodySkeletonFrame): VrmPoseDiagnostics {
    const left = this.measureArm("left", frame);
    const right = this.measureArm("right", frame);
    const pelvisError = worldPosition(this.vrm, "hips").distanceTo(
      new THREE.Vector3(
        frame.joints.pelvisCenter.x,
        frame.joints.pelvisCenter.y,
        frame.joints.pelvisCenter.z
      )
    );
    const leftFootError = this.measureBoneError("leftFoot", frame.joints.footLeft);
    const rightFootError = this.measureBoneError("rightFoot", frame.joints.footRight);
    return {
      left,
      right,
      pelvisError,
      leftFootError,
      rightFootError,
      maxJointError: Math.max(
        left.shoulderError,
        left.elbowError,
        left.wristError,
        right.shoulderError,
        right.elbowError,
        right.wristError,
        pelvisError,
        leftFootError,
        rightFootError
      )
    };
  }

  private captureRestRotations(): void {
    this.vrm.humanoid.resetNormalizedPose();
    for (const name of [
      "spine",
      "chest",
      "hips",
      ...this.arms.flatMap((arm) => [arm.shoulder, arm.upperArm, arm.lowerArm]),
      ...this.legs.flatMap((leg) => [leg.upperLeg, leg.lowerLeg])
    ] as VRMHumanBoneName[]) {
      if (!this.restLocalRotations.has(name)) {
        this.restLocalRotations.set(name, getRequiredBone(this.vrm, name).quaternion.clone());
      }
    }
  }

  private alignFootAnchors(frame: BodySkeletonFrame): {
    readonly modelAnchor: THREE.Vector3;
    readonly targetAnchor: THREE.Vector3;
    readonly translation: THREE.Vector3;
  } {
    const modelAnchor = midpoint(
      toPlainVector(worldPosition(this.vrm, "leftFoot")),
      toPlainVector(worldPosition(this.vrm, "rightFoot"))
    );
    const targetAnchor = midpoint(frame.joints.footLeft, frame.joints.footRight);
    const translation = targetAnchor.clone().sub(modelAnchor);
    this.vrm.scene.position.add(translation);
    this.vrm.scene.updateMatrixWorld(true);
    return { modelAnchor, targetAnchor, translation };
  }

  private placeHips(hips: THREE.Object3D, target: Vec3): void {
    const parent = hips.parent;
    if (!parent) {
      throw new Error("VRM normalized hips bone has no parent transform.");
    }
    parent.updateWorldMatrix(true, false);
    const localTarget = new THREE.Vector3(target.x, target.y, target.z).applyMatrix4(
      parent.matrixWorld.clone().invert()
    );
    hips.position.copy(localTarget);
    hips.updateWorldMatrix(false, true);
  }

  private restRotation(name: VRMHumanBoneName): THREE.Quaternion {
    const rotation = this.restLocalRotations.get(name);
    if (!rotation) {
      throw new Error(`Missing captured VRM rest rotation for ${name}.`);
    }
    return rotation;
  }

  private applySceneTransform(scale: number): void {
    const signs = this.profile.modelToTargetScaleSigns;
    this.vrm.scene.scale.set(signs.x * scale, signs.y * scale, signs.z * scale);
    this.vrm.scene.quaternion.fromArray(this.profile.modelToTargetRotation);
  }

  private applyWorldYaw(name: VRMHumanBoneName, bone: THREE.Object3D, angleRad: number): void {
    const parent = bone.parent;
    if (!parent) {
      throw new Error(`VRM normalized bone ${name} has no parent transform.`);
    }

    parent.updateWorldMatrix(true, false);
    const inverseParent = parent.matrixWorld.clone().invert();
    const localAxis = WORLD_UP.clone().transformDirection(inverseParent);
    const determinant = new THREE.Matrix3().setFromMatrix4(parent.matrixWorld).determinant();
    const handedAngle = determinant < 0 ? -angleRad : angleRad;
    const localDelta = new THREE.Quaternion().setFromAxisAngle(localAxis, handedAngle);
    bone.quaternion.copy(localDelta).multiply(this.restRotation(name)).normalize();
    bone.updateWorldMatrix(false, true);
  }

  private solveAndAimArm(arm: VrmArmDefinition, frame: BodySkeletonFrame): void {
    const [, shoulderJoint, , handJoint] = ARM_JOINTS[arm.targetSide];
    const modelShoulderBase = worldPosition(this.vrm, arm.shoulder);
    const targetShoulder = frame.joints[shoulderJoint];
    this.aimBone(
      arm.shoulder,
      arm.upperArm,
      new THREE.Vector3(
        targetShoulder.x - modelShoulderBase.x,
        targetShoulder.y - modelShoulderBase.y,
        targetShoulder.z - modelShoulderBase.z
      )
    );

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

  private solveAndAimLeg(leg: VrmLegDefinition, frame: BodySkeletonFrame): void {
    const [, kneeJoint, footJoint] = LEG_JOINTS[leg.targetSide];
    const modelHip = worldPosition(this.vrm, leg.upperLeg);
    const modelLeg = this.profile.legs[leg.vrmSide];
    const solve = solveTwoBoneTarget(
      modelHip,
      frame.joints[footJoint],
      frame.joints[kneeJoint],
      modelLeg.upperLegLength * this.profile.scale,
      modelLeg.lowerLegLength * this.profile.scale
    );

    this.aimBone(leg.upperLeg, leg.lowerLeg, solve.joint.clone().sub(modelHip));
    this.aimBone(leg.lowerLeg, leg.foot, solve.end.clone().sub(solve.joint));
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
    const parent = bone.parent;
    if (!parent) {
      throw new Error(`VRM normalized bone ${boneName} has no parent transform.`);
    }

    parent.updateWorldMatrix(true, false);
    const desiredLocalDirection = targetDirection.transformDirection(
      parent.matrixWorld.clone().invert()
    );
    const restRotation = this.restRotation(boneName);
    const restLocalDirection = localChildDirection.applyQuaternion(restRotation);
    const swing = new THREE.Quaternion().setFromUnitVectors(
      restLocalDirection,
      desiredLocalDirection
    );

    bone.quaternion.copy(swing).multiply(restRotation).normalize();
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

  private measureBoneError(bone: VRMHumanBoneName, target: Vec3): number {
    return worldPosition(this.vrm, bone).distanceTo(
      new THREE.Vector3(target.x, target.y, target.z)
    );
  }
}
