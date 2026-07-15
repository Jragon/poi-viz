import { buildBodyRigDimensionsForCanonicalUnitRadius, type BodyRigDimensions } from "@/body-rig";
import type { Vec3, WorldMultiRigPose, WorldRigPose } from "@/engine/types";

export type VrmRigPoseCaseId =
  | "arms-down"
  | "t-pose"
  | "forward-reach"
  | "overhead"
  | "cross-body"
  | "behind"
  | "both-right"
  | "unreachable";

export interface VrmRigPoseCase {
  readonly id: VrmRigPoseCaseId;
  readonly label: string;
  readonly description: string;
  readonly expectReachable: boolean;
  readonly worldPoses: WorldMultiRigPose;
}

function poiPose(handPosition: Vec3, tetherDirection: Vec3): WorldRigPose {
  return {
    handPosition,
    headPosition: {
      x: handPosition.x + tetherDirection.x,
      y: handPosition.y + tetherDirection.y,
      z: handPosition.z + tetherDirection.z
    },
    planeId: "wall"
  };
}

function poseCase(
  id: VrmRigPoseCaseId,
  label: string,
  description: string,
  expectReachable: boolean,
  leftHand: Vec3,
  rightHand: Vec3,
  tetherLength: number
): VrmRigPoseCase {
  return {
    id,
    label,
    description,
    expectReachable,
    worldPoses: {
      left: poiPose(leftHand, { x: -tetherLength, y: 0, z: 0 }),
      right: poiPose(rightHand, { x: tetherLength, y: 0, z: 0 })
    }
  };
}

/**
 * Fixed, model-independent poses for inspecting the body solve separately from
 * sequence playback. Coordinates are derived from the same body dimensions as
 * the live VRM lab, so changing the canonical scale keeps the cases meaningful.
 */
export function buildVrmRigPoseCases(
  dimensions: BodyRigDimensions = buildBodyRigDimensionsForCanonicalUnitRadius(1)
): readonly VrmRigPoseCase[] {
  const reach = dimensions.armReach;
  const halfShoulder = dimensions.shoulderSpan * 0.5;
  const tetherLength = reach * 0.18;

  return [
    poseCase(
      "arms-down",
      "Arms down",
      "Low neutral reach; checks relaxed elbow direction and shoulder stability.",
      true,
      { x: -halfShoulder * 0.9, y: -reach * 0.72, z: reach * 0.08 },
      { x: halfShoulder * 0.9, y: -reach * 0.72, z: reach * 0.08 },
      tetherLength
    ),
    poseCase(
      "t-pose",
      "T-pose",
      "Symmetric straight-arm side reach without using torso yaw.",
      true,
      { x: -halfShoulder - reach * 0.95, y: 0, z: 0 },
      { x: halfShoulder + reach * 0.95, y: 0, z: 0 },
      tetherLength
    ),
    poseCase(
      "forward-reach",
      "Forward reach",
      "Both arms forward; exercises protraction and the elbow-pole singularity.",
      true,
      { x: -halfShoulder * 0.65, y: -reach * 0.05, z: reach * 0.7 },
      { x: halfShoulder * 0.65, y: -reach * 0.05, z: reach * 0.7 },
      tetherLength
    ),
    poseCase(
      "overhead",
      "Full overhead",
      "Near-full vertical reach with visible clearance above the canonical head.",
      true,
      { x: -reach * 0.14, y: reach * 1.04, z: reach * 0.08 },
      { x: reach * 0.14, y: reach * 1.04, z: reach * 0.08 },
      tetherLength
    ),
    poseCase(
      "cross-body",
      "Cross-body",
      "Each hand crosses the center line without allowing the shoulders to collapse.",
      true,
      { x: reach * 0.36, y: -reach * 0.05, z: reach * 0.18 },
      { x: -reach * 0.36, y: -reach * 0.05, z: reach * 0.18 },
      tetherLength
    ),
    poseCase(
      "behind",
      "Behind body",
      "Moderate rear reach; exercises shoulder retraction and pole fallback.",
      true,
      { x: -halfShoulder * 0.9, y: -reach * 0.2, z: -reach * 0.55 },
      { x: halfShoulder * 0.9, y: -reach * 0.2, z: -reach * 0.55 },
      tetherLength
    ),
    poseCase(
      "both-right",
      "Both hands right",
      "Far side reach that requires coupled pelvis and thoracic rotation.",
      true,
      { x: reach * 0.8, y: reach * 0.12, z: reach * 0.15 },
      { x: reach * 1.1, y: reach * 0.12, z: -reach * 0.15 },
      tetherLength
    ),
    poseCase(
      "unreachable",
      "Unreachable",
      "Deliberately impossible side reach; must clamp explicitly and symmetrically.",
      false,
      { x: -halfShoulder - reach * 1.6, y: 0, z: 0 },
      { x: halfShoulder + reach * 1.6, y: 0, z: 0 },
      tetherLength
    )
  ];
}

export function getVrmRigPoseCase(
  id: VrmRigPoseCaseId,
  cases: readonly VrmRigPoseCase[] = buildVrmRigPoseCases()
): VrmRigPoseCase {
  const result = cases.find((entry) => entry.id === id);

  if (!result) {
    throw new Error(`Unknown VRM rig pose case: ${id}`);
  }

  return result;
}
