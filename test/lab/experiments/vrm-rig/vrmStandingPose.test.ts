import type { VRM, VRMHumanBoneName } from "@pixiv/three-vrm";
import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

import {
  buildBodyRigFrameFromDimensions,
  solveBodyRigFrame,
  type BodyRigDimensions,
  type BodySkeletonFrame,
  type SkeletonJointName
} from "@/body-rig";
import { DEFAULT_PLANE_PROJECTION_SETTINGS } from "@/engine/planeProjection";
import { VrmStandingPoseAdapter } from "@/lab/experiments/vrm-rig/vrmStandingPose";
import {
  buildVrmRigProfile,
  resolveVrmPatternScale
} from "@/lab/experiments/vrm-rig/vrmRigProfile";

function makeFrame(dimensions: BodyRigDimensions): BodySkeletonFrame {
  const body = buildBodyRigFrameFromDimensions(dimensions);
  const reach = dimensions.armReach;
  const halfShoulder = dimensions.shoulderSpan * 0.5;
  return solveBodyRigFrame(
    body,
    {
      leftHandTarget: {
        x: -halfShoulder - reach * 0.55,
        y: -reach * 0.08,
        z: reach * 0.2
      },
      rightHandTarget: {
        x: halfShoulder + reach * 0.55,
        y: -reach * 0.08,
        z: reach * 0.2
      }
    },
    DEFAULT_PLANE_PROJECTION_SETTINGS
  ).skeleton;
}

function makeFakeVrm() {
  const scene = new THREE.Group();
  const normalizedRoot = new THREE.Group();
  normalizedRoot.rotation.y = 0.2;
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

  const hips = addBone("hips", normalizedRoot, [0, 0, 0]);
  const spine = addBone("spine", hips, [0, 0.9, 0]);
  const chest = addBone("chest", spine, [0, 0.3, 0]);
  addBone("neck", chest, [0, 0.18, 0]);
  addBone("head", bones.get("neck")!, [0, 0.16, 0]);
  const leftShoulder = addBone("leftShoulder", chest, [0.15, 0.1, 0]);
  const leftUpperArm = addBone("leftUpperArm", leftShoulder, [0.1, 0, 0]);
  const leftLowerArm = addBone("leftLowerArm", leftUpperArm, [0.3, 0, 0]);
  addBone("leftHand", leftLowerArm, [0.3, 0, 0]);
  const rightShoulder = addBone("rightShoulder", chest, [-0.15, 0.1, 0]);
  const rightUpperArm = addBone("rightUpperArm", rightShoulder, [-0.1, 0, 0]);
  const rightLowerArm = addBone("rightLowerArm", rightUpperArm, [-0.3, 0, 0]);
  addBone("rightHand", rightLowerArm, [-0.3, 0, 0]);
  const leftUpperLeg = addBone("leftUpperLeg", hips, [0.1, 0, 0]);
  const leftLowerLeg = addBone("leftLowerLeg", leftUpperLeg, [0, -0.4, 0]);
  addBone("leftFoot", leftLowerLeg, [0, -0.4, 0.08]);
  const rightUpperLeg = addBone("rightUpperLeg", hips, [-0.1, 0, 0]);
  const rightLowerLeg = addBone("rightLowerLeg", rightUpperLeg, [0, -0.4, 0]);
  addBone("rightFoot", rightLowerLeg, [0, -0.4, 0.08]);

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

describe("resolveVrmPatternScale", () => {
  it("scales the measured overlap circle to the canonical target radius", () => {
    expect(resolveVrmPatternScale(0.5, 1.25)).toBeCloseTo(2.5);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid model arm reach %s",
    (modelPatternRadius) => {
      expect(() => resolveVrmPatternScale(modelPatternRadius, 1)).toThrow(
        "VRM fixture has an invalid canonical pattern radius"
      );
    }
  );

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid target arm reach %s",
    (targetPatternRadius) => {
      expect(() => resolveVrmPatternScale(1, targetPatternRadius)).toThrow(
        "Target canonical pattern radius is invalid"
      );
    }
  );
});

describe("VrmStandingPoseAdapter", () => {
  it("keeps target and VRM sides anatomical", () => {
    const { vrm, bones } = makeFakeVrm();
    const profile = buildVrmRigProfile(vrm);

    expect(profile.targetToVrmSide).toEqual({ left: "left", right: "right" });
    expect(profile.targetPatternRadius).toBe(1);
    expect(profile.dimensions.canonicalPatternSpace.unitRadius).toBeCloseTo(1);
    expect(profile.dimensions.armReach).toBeCloseTo(profile.modelArmReach * profile.scale);

    vrm.scene.quaternion.fromArray(profile.modelToTargetRotation);
    vrm.scene.updateMatrixWorld(true);
    expect(
      worldDirection(bones.get("leftUpperArm")!, bones.get("rightUpperArm")!).angleTo(
        new THREE.Vector3(1, 0, 0)
      )
    ).toBeLessThan(1e-6);
  });

  it("re-solves the measured VRM arm chains onto the solver wrists", () => {
    const { vrm, bones, humanoidUpdate, constraintUpdate } = makeFakeVrm();
    const profile = buildVrmRigProfile(vrm);
    const frame = makeFrame(profile.dimensions);
    const adapter = new VrmStandingPoseAdapter(vrm, profile);

    adapter.apply(frame);

    const diagnostics = adapter.measure(frame);
    expect(diagnostics.left.wristError).toBeLessThan(1e-6);
    expect(diagnostics.right.wristError).toBeLessThan(1e-6);
    expect(
      bones
        .get("leftUpperArm")!
        .getWorldPosition(new THREE.Vector3())
        .distanceTo(bones.get("leftLowerArm")!.getWorldPosition(new THREE.Vector3()))
    ).toBeCloseTo(profile.arms.left.upperArmLength * profile.scale);
    expect(
      bones
        .get("rightUpperArm")!
        .getWorldPosition(new THREE.Vector3())
        .distanceTo(bones.get("rightLowerArm")!.getWorldPosition(new THREE.Vector3()))
    ).toBeCloseTo(profile.arms.right.upperArmLength * profile.scale);
    expect(humanoidUpdate).not.toHaveBeenCalled();
    expect(constraintUpdate).not.toHaveBeenCalled();
  });

  it("produces the same normalized bone rotations when the same frame is reapplied", () => {
    const { vrm, bones } = makeFakeVrm();
    const profile = buildVrmRigProfile(vrm);
    const frame = makeFrame(profile.dimensions);
    const adapter = new VrmStandingPoseAdapter(vrm, profile);

    adapter.apply(frame);
    const firstRotations = Array.from(bones.values(), (bone) => bone.quaternion.toArray());

    adapter.apply(frame);
    const secondRotations = Array.from(bones.values(), (bone) => bone.quaternion.toArray());

    expect(secondRotations).toEqual(firstRotations);
  });

  it("preserves planted-body registration when the solved body translates", () => {
    const { vrm } = makeFakeVrm();
    const profile = buildVrmRigProfile(vrm);
    const frame = makeFrame(profile.dimensions);
    const adapter = new VrmStandingPoseAdapter(vrm, profile);

    adapter.apply(frame);
    const initialDiagnostics = adapter.measure(frame);
    expect(initialDiagnostics.pelvisError).toBeLessThan(1e-6);
    expect(initialDiagnostics.leftFootError).toBeLessThan(1e-4);
    expect(initialDiagnostics.rightFootError).toBeLessThan(1e-4);
    expect(initialDiagnostics.left.wristError).toBeLessThan(1e-6);
    expect(initialDiagnostics.right.wristError).toBeLessThan(1e-6);

    const translation = { x: 0.35, y: -0.2, z: 0.18 };
    const translatedFrame = {
      ...frame,
      joints: Object.fromEntries(
        Object.entries(frame.joints).map(([name, joint]) => [
          name,
          {
            x: joint.x + translation.x,
            y: joint.y + translation.y,
            z: joint.z + translation.z
          }
        ])
      ) as Record<SkeletonJointName, { x: number; y: number; z: number }>
    } satisfies BodySkeletonFrame;

    adapter.apply(translatedFrame);
    const translatedDiagnostics = adapter.measure(translatedFrame);
    expect(translatedDiagnostics.pelvisError).toBeLessThan(1e-6);
    expect(translatedDiagnostics.leftFootError).toBeLessThan(1e-4);
    expect(translatedDiagnostics.rightFootError).toBeLessThan(1e-4);
    expect(translatedDiagnostics.left.wristError).toBeLessThan(1e-6);
    expect(translatedDiagnostics.right.wristError).toBeLessThan(1e-6);
    expect(translatedDiagnostics.maxJointError).toBeCloseTo(initialDiagnostics.maxJointError);
  });
});
