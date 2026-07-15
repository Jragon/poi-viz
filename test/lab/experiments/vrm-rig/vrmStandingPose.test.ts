import type { VRM, VRMHumanBoneName } from "@pixiv/three-vrm";
import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

import { SKELETON_SEGMENTS } from "@/body-rig";
import type { BodySkeletonFrame, SkeletonJointName } from "@/body-rig";
import {
  resolveVrmRigScale,
  VrmStandingPoseAdapter
} from "@/lab/experiments/vrm-rig/vrmStandingPose";

function makeFrame(): BodySkeletonFrame {
  const joints: Record<SkeletonJointName, { x: number; y: number; z: number }> = {
    headCenter: { x: 0, y: 1.65, z: 0 },
    neck: { x: 0, y: 1.52, z: 0 },
    chest: { x: 0, y: 1.4, z: 0 },
    clavicleLeft: { x: -0.12, y: 1.42, z: 0.02 },
    clavicleRight: { x: 0.12, y: 1.42, z: 0.02 },
    shoulderLeft: { x: -0.2, y: 1.46, z: 0.08 },
    shoulderRight: { x: 0.2, y: 1.36, z: -0.08 },
    elbowLeft: { x: -0.4, y: 1.22, z: 0.24 },
    elbowRight: { x: 0.45, y: 1.24, z: 0.16 },
    handLeft: { x: -0.58, y: 1.02, z: 0.4 },
    handRight: { x: 0.66, y: 1.08, z: 0.34 },
    pelvisCenter: { x: 0, y: 0.95, z: 0 },
    hipLeft: { x: -0.14, y: 0.95, z: 0 },
    hipRight: { x: 0.14, y: 0.95, z: 0 },
    kneeLeft: { x: -0.14, y: 0.52, z: 0.02 },
    kneeRight: { x: 0.14, y: 0.52, z: 0.02 },
    footLeft: { x: -0.14, y: 0.08, z: 0.08 },
    footRight: { x: 0.14, y: 0.08, z: 0.08 }
  };

  return {
    joints,
    segments: SKELETON_SEGMENTS,
    orientation: {
      up: { x: 0, y: 1, z: 0 },
      forward: { x: 0, y: 0, z: 1 },
      right: { x: 1, y: 0, z: 0 }
    },
    supportPose: {
      armReach: 0.65,
      upperArmLength: 0.32,
      forearmLength: 0.33,
      shoulderSpan: 0.36
    },
    solverDiagnostics: {
      yawRad: 0.2,
      pelvisYawRad: 0.08,
      chestYawRad: 0.2,
      pelvisLimitHit: false,
      leftArm: {
        isClamped: false,
        reach: { min: 0, max: 0.65 },
        distanceToHand: 0.6
      },
      rightArm: {
        isClamped: false,
        reach: { min: 0, max: 0.65 },
        distanceToHand: 0.6
      },
      leftShoulder: {
        lift: 0,
        protraction: 0,
        retraction: 0,
        lateralTravel: 0,
        overheadAmbiguous: false,
        limitHit: false
      },
      rightShoulder: {
        lift: 0,
        protraction: 0,
        retraction: 0,
        lateralTravel: 0,
        overheadAmbiguous: false,
        limitHit: false
      },
      bestEffortReasons: []
    }
  };
}

function makeFakeVrm() {
  const scene = new THREE.Group();
  const normalizedRoot = new THREE.Group();
  scene.add(normalizedRoot);

  const bones = new Map<VRMHumanBoneName, THREE.Object3D>();
  const addBone = (
    name: VRMHumanBoneName,
    parent: THREE.Object3D,
    position: readonly [number, number, number]
  ) => {
    const bone = new THREE.Object3D();
    bone.name = name;
    bone.position.set(...position);
    parent.add(bone);
    bones.set(name, bone);
    return bone;
  };

  const spine = addBone("spine", normalizedRoot, [0, 0.9, 0]);
  const chest = addBone("chest", spine, [0, 0.3, 0]);
  const leftShoulder = addBone("leftShoulder", chest, [-0.15, 0.1, 0]);
  const leftUpperArm = addBone("leftUpperArm", leftShoulder, [-0.1, 0, 0]);
  const leftLowerArm = addBone("leftLowerArm", leftUpperArm, [-0.3, 0, 0]);
  addBone("leftHand", leftLowerArm, [-0.3, 0, 0]);
  const rightShoulder = addBone("rightShoulder", chest, [0.15, 0.1, 0]);
  const rightUpperArm = addBone("rightUpperArm", rightShoulder, [0.1, 0, 0]);
  const rightLowerArm = addBone("rightLowerArm", rightUpperArm, [0.3, 0, 0]);
  addBone("rightHand", rightLowerArm, [0.3, 0, 0]);

  const humanoidUpdate = vi.fn();
  const constraintUpdate = vi.fn();
  const resetNormalizedPose = () => {
    for (const bone of bones.values()) {
      bone.quaternion.identity();
    }
  };
  const vrm = {
    scene,
    humanoid: {
      normalizedHumanBonesRoot: normalizedRoot,
      getNormalizedBoneNode: (name: VRMHumanBoneName) => bones.get(name) ?? null,
      resetNormalizedPose,
      update: humanoidUpdate
    },
    nodeConstraintManager: {
      update: constraintUpdate
    }
  } as unknown as VRM;

  return { vrm, bones, humanoidUpdate, constraintUpdate };
}

function worldDirection(from: THREE.Object3D, to: THREE.Object3D) {
  return to
    .getWorldPosition(new THREE.Vector3())
    .sub(from.getWorldPosition(new THREE.Vector3()))
    .normalize();
}

function frameDirection(
  frame: BodySkeletonFrame,
  from: SkeletonJointName,
  to: SkeletonJointName
) {
  const start = frame.joints[from];
  const end = frame.joints[to];
  return new THREE.Vector3(end.x - start.x, end.y - start.y, end.z - start.z).normalize();
}

describe("resolveVrmRigScale", () => {
  it("scales the model arm reach to the deterministic target rig", () => {
    expect(resolveVrmRigScale(0.5, 1.25)).toBeCloseTo(2.5);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid model arm reach %s",
    (modelArmReach) => {
      expect(() => resolveVrmRigScale(modelArmReach, 1)).toThrow(
        "VRM fixture has an invalid humanoid arm reach"
      );
    }
  );

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid target arm reach %s",
    (targetArmReach) => {
      expect(() => resolveVrmRigScale(1, targetArmReach)).toThrow(
        "Target body rig has an invalid arm reach"
      );
    }
  );
});

describe("VrmStandingPoseAdapter", () => {
  it("aims normalized upper and lower arm bones at the solver segments", () => {
    const frame = makeFrame();
    const { vrm, bones, humanoidUpdate, constraintUpdate } = makeFakeVrm();
    const adapter = new VrmStandingPoseAdapter(vrm);

    adapter.apply(frame);

    expect(
      worldDirection(bones.get("leftUpperArm")!, bones.get("leftLowerArm")!).angleTo(
        frameDirection(frame, "shoulderLeft", "elbowLeft")
      )
    ).toBeLessThan(1e-6);
    expect(
      worldDirection(bones.get("leftLowerArm")!, bones.get("leftHand")!).angleTo(
        frameDirection(frame, "elbowLeft", "handLeft")
      )
    ).toBeLessThan(1e-6);
    expect(
      worldDirection(bones.get("rightUpperArm")!, bones.get("rightLowerArm")!).angleTo(
        frameDirection(frame, "shoulderRight", "elbowRight")
      )
    ).toBeLessThan(1e-6);
    expect(
      worldDirection(bones.get("rightLowerArm")!, bones.get("rightHand")!).angleTo(
        frameDirection(frame, "elbowRight", "handRight")
      )
    ).toBeLessThan(1e-6);
    expect(humanoidUpdate).toHaveBeenCalledOnce();
    expect(constraintUpdate).toHaveBeenCalledOnce();
  });

  it("produces the same normalized bone rotations when the same frame is reapplied", () => {
    const frame = makeFrame();
    const { vrm, bones } = makeFakeVrm();
    const adapter = new VrmStandingPoseAdapter(vrm);

    adapter.apply(frame);
    const firstRotations = Array.from(bones.values(), (bone) => bone.quaternion.toArray());

    adapter.apply(frame);
    const secondRotations = Array.from(bones.values(), (bone) => bone.quaternion.toArray());

    expect(secondRotations).toEqual(firstRotations);
  });
});
