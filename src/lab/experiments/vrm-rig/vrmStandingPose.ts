import type { VRM, VRMHumanBoneName } from "@pixiv/three-vrm";
import * as THREE from "three";

import type { BodySkeletonFrame, SkeletonJointName } from "@/body-rig";
import type { Vec3 } from "@/engine/types";

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

interface BoneAimDefinition {
  readonly bone: VRMHumanBoneName;
  readonly child: VRMHumanBoneName;
  readonly from: SkeletonJointName;
  readonly to: SkeletonJointName;
}

const ARM_AIMS: readonly BoneAimDefinition[] = [
  {
    bone: "leftShoulder",
    child: "leftUpperArm",
    from: "clavicleLeft",
    to: "shoulderLeft"
  },
  {
    bone: "leftUpperArm",
    child: "leftLowerArm",
    from: "shoulderLeft",
    to: "elbowLeft"
  },
  {
    bone: "leftLowerArm",
    child: "leftHand",
    from: "elbowLeft",
    to: "handLeft"
  },
  {
    bone: "rightShoulder",
    child: "rightUpperArm",
    from: "clavicleRight",
    to: "shoulderRight"
  },
  {
    bone: "rightUpperArm",
    child: "rightLowerArm",
    from: "shoulderRight",
    to: "elbowRight"
  },
  {
    bone: "rightLowerArm",
    child: "rightHand",
    from: "elbowRight",
    to: "handRight"
  }
];

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

function distanceBetweenBones(vrm: VRM, from: VRMHumanBoneName, to: VRMHumanBoneName): number {
  return worldPosition(vrm, from).distanceTo(worldPosition(vrm, to));
}

function averageModelArmReach(vrm: VRM): number {
  const left =
    distanceBetweenBones(vrm, "leftUpperArm", "leftLowerArm") +
    distanceBetweenBones(vrm, "leftLowerArm", "leftHand");
  const right =
    distanceBetweenBones(vrm, "rightUpperArm", "rightLowerArm") +
    distanceBetweenBones(vrm, "rightLowerArm", "rightHand");

  return (left + right) * 0.5;
}

export function resolveVrmRigScale(modelArmReach: number, targetArmReach: number): number {
  if (!Number.isFinite(modelArmReach) || modelArmReach <= MIN_DIRECTION_LENGTH) {
    throw new Error("VRM fixture has an invalid humanoid arm reach.");
  }

  if (!Number.isFinite(targetArmReach) || targetArmReach <= MIN_DIRECTION_LENGTH) {
    throw new Error("Target body rig has an invalid arm reach.");
  }

  return targetArmReach / modelArmReach;
}

/**
 * Applies the current deterministic body-solver output to VRM normalized bones.
 * The adapter deliberately controls only torso yaw and both arm chains. Legs,
 * hands, head, and facial state remain in the VRM reference pose.
 */
export class VrmStandingPoseAdapter {
  private calibration: VrmRigCalibration | null = null;

  public constructor(private readonly vrm: VRM) {}

  public get currentCalibration(): VrmRigCalibration | null {
    return this.calibration;
  }

  public calibrate(frame: BodySkeletonFrame): VrmRigCalibration {
    const { scene, humanoid } = this.vrm;

    humanoid.resetNormalizedPose();
    scene.position.set(0, 0, 0);
    scene.scale.set(1, 1, 1);
    scene.updateMatrixWorld(true);

    const modelArmReach = averageModelArmReach(this.vrm);
    const targetArmReach = frame.supportPose.armReach;
    const scale = resolveVrmRigScale(modelArmReach, targetArmReach);

    scene.scale.setScalar(scale);
    scene.updateMatrixWorld(true);

    const modelAnchor = midpoint(
      toPlainVector(worldPosition(this.vrm, "leftShoulder")),
      toPlainVector(worldPosition(this.vrm, "rightShoulder"))
    );
    const targetAnchor = midpoint(frame.joints.clavicleLeft, frame.joints.clavicleRight);
    const translation = targetAnchor.clone().sub(modelAnchor);

    scene.position.add(translation);
    scene.updateMatrixWorld(true);

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

    const spine = getRequiredBone(this.vrm, "spine");
    const chest = getRequiredBone(this.vrm, "chest");
    const pelvisYaw = frame.solverDiagnostics.pelvisYawRad;
    const chestYaw = frame.solverDiagnostics.chestYawRad;

    spine.quaternion.setFromAxisAngle(WORLD_UP, pelvisYaw);
    chest.quaternion.setFromAxisAngle(WORLD_UP, chestYaw - pelvisYaw);
    humanoid.normalizedHumanBonesRoot.updateMatrixWorld(true);

    for (const aim of ARM_AIMS) {
      this.aimBone(aim, frame);
    }

    // Match the upstream lifecycle without advancing spring-bone simulation.
    // This copies normalized bones to the raw skinned rig, then evaluates the
    // fixture's authored upper/lower-arm twist constraints.
    humanoid.update();
    this.vrm.nodeConstraintManager?.update();
    this.vrm.scene.updateMatrixWorld(true);
  }

  private aimBone(aim: BoneAimDefinition, frame: BodySkeletonFrame): void {
    const bone = getRequiredBone(this.vrm, aim.bone);
    const child = getRequiredBone(this.vrm, aim.child);
    const targetFrom = frame.joints[aim.from];
    const targetTo = frame.joints[aim.to];
    const targetDirection = new THREE.Vector3(
      targetTo.x - targetFrom.x,
      targetTo.y - targetFrom.y,
      targetTo.z - targetFrom.z
    );

    if (targetDirection.lengthSq() <= MIN_DIRECTION_LENGTH) {
      return;
    }

    const restDirection = child.position.clone();
    if (restDirection.lengthSq() <= MIN_DIRECTION_LENGTH) {
      throw new Error(`VRM normalized bone ${aim.bone} has no usable child direction.`);
    }

    restDirection.normalize();
    targetDirection.normalize();

    const desiredWorldRotation = new THREE.Quaternion().setFromUnitVectors(
      restDirection,
      targetDirection
    );
    const parentWorldRotation = new THREE.Quaternion();
    bone.parent?.getWorldQuaternion(parentWorldRotation);

    bone.quaternion.copy(parentWorldRotation.invert()).multiply(desiredWorldRotation).normalize();
    bone.updateWorldMatrix(false, true);
  }
}
