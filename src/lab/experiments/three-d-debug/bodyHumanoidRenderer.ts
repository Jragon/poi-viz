import * as THREE from "three";

import { SKELETON_JOINT_NAMES } from "@/body-rig";
import type { BodySkeletonFrame, SkeletonJointName, SkeletonSegmentCategory } from "@/body-rig";

const CATEGORY_COLORS: Record<SkeletonSegmentCategory, string> = {
  head: "#e2e8f0",
  spine: "#94a3b8",
  arm: "#7dd3fc",
  leg: "#86efac"
};

const LIMB_RADIUS: Record<SkeletonSegmentCategory, number> = {
  head: 0.022,
  spine: 0.028,
  arm: 0.020,
  leg: 0.024
};

const TORSO_CUE_COLOR = "#f59e0b";
const HEAD_CUE_COLOR = "#f8fafc";

const CAPSULE_CAP_SEGS = 4;
const CAPSULE_RADIAL_SEGS = 8;
const UNIT_CAPSULE_BODY_LENGTH = 1;

const Y_AXIS = new THREE.Vector3(0, 1, 0);

function makeSphereGeometry(name: SkeletonJointName): THREE.SphereGeometry {
  if (name === "headCenter") return new THREE.SphereGeometry(0.1, 16, 16);
  if (name === "handLeft" || name === "handRight") return new THREE.SphereGeometry(0.05, 12, 12);
  return new THREE.SphereGeometry(0.03, 8, 8);
}

function makeSphereColor(name: SkeletonJointName): string {
  switch (name) {
    case "headCenter":
    case "neck":
      return CATEGORY_COLORS.head;
    case "chest":
    case "clavicleLeft":
    case "clavicleRight":
    case "shoulderLeft":
    case "shoulderRight":
    case "pelvisCenter":
    case "hipLeft":
    case "hipRight":
      return CATEGORY_COLORS.spine;
    case "elbowLeft":
    case "elbowRight":
    case "handLeft":
    case "handRight":
      return CATEGORY_COLORS.arm;
    case "kneeLeft":
    case "kneeRight":
    case "footLeft":
    case "footRight":
      return CATEGORY_COLORS.leg;
    default: {
      const unreachableName: never = name;
      throw new Error(`Unhandled joint color for ${unreachableName}`);
    }
  }
}

function makeSegmentGeometry(category: SkeletonSegmentCategory): THREE.CapsuleGeometry {
  return new THREE.CapsuleGeometry(
    LIMB_RADIUS[category],
    UNIT_CAPSULE_BODY_LENGTH,
    CAPSULE_CAP_SEGS,
    CAPSULE_RADIAL_SEGS
  );
}

function getSegmentBaseSpan(category: SkeletonSegmentCategory): number {
  return UNIT_CAPSULE_BODY_LENGTH + LIMB_RADIUS[category] * 2;
}

const VOLUME_RADIUS = {
  torso: 0.095,
  pelvisVolume: 0.075,
  head: 0.11
} as const;

export class BodyHumanoidRenderer {
  private readonly segmentMeshes = new Map<string, THREE.Mesh>();
  private readonly volumeMeshes = new Map<string, THREE.Mesh>();
  private readonly jointMeshes = new Map<SkeletonJointName, THREE.Mesh>();
  private torsoCueMesh: THREE.Mesh | null = null;
  private headCueMesh: THREE.Mesh | null = null;

  sync(scene: THREE.Scene, frame: BodySkeletonFrame | null): void {
    if (!frame) {
      this.setAllVisible(false);
      return;
    }

    this.syncVolumes(scene, frame);
    this.syncSegments(scene, frame);
    this.syncJoints(scene, frame);
    this.syncOrientationCues(scene, frame);
  }

  private syncVolumes(scene: THREE.Scene, frame: BodySkeletonFrame): void {
    this.syncCapsuleVolume(scene, "torso", frame.joints.pelvisCenter, frame.joints.chest, VOLUME_RADIUS.torso, "#cbd5e1");
    this.syncCapsuleVolume(scene, "pelvis", frame.joints.hipLeft, frame.joints.hipRight, VOLUME_RADIUS.pelvisVolume, "#94a3b8");
    this.syncSphereVolume(scene, "head", frame.joints.headCenter, VOLUME_RADIUS.head, "#e2e8f0");
  }

  private syncCapsuleVolume(
    scene: THREE.Scene,
    key: string,
    from: { x: number; y: number; z: number },
    to: { x: number; y: number; z: number },
    radius: number,
    color: string
  ): void {
    const fromV = new THREE.Vector3(from.x, from.y, from.z);
    const toV = new THREE.Vector3(to.x, to.y, to.z);
    const dir = new THREE.Vector3().subVectors(toV, fromV);
    const length = dir.length();
    dir.normalize();
    const mid = new THREE.Vector3().lerpVectors(fromV, toV, 0.5);
    let mesh = this.volumeMeshes.get(key);
    if (!mesh) {
      mesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(radius, UNIT_CAPSULE_BODY_LENGTH, CAPSULE_CAP_SEGS, CAPSULE_RADIAL_SEGS),
        new THREE.MeshBasicMaterial({ color })
      );
      this.volumeMeshes.set(key, mesh);
      scene.add(mesh);
    }
    mesh.position.copy(mid);
    mesh.scale.set(1, length / (UNIT_CAPSULE_BODY_LENGTH + radius * 2), 1);
    if (length > 1e-6) {
      mesh.quaternion.setFromUnitVectors(Y_AXIS, dir);
    } else {
      mesh.quaternion.identity();
    }
    mesh.visible = true;
  }

  private syncSphereVolume(
    scene: THREE.Scene,
    key: string,
    center: { x: number; y: number; z: number },
    radius: number,
    color: string
  ): void {
    let mesh = this.volumeMeshes.get(key);
    if (!mesh) {
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 16, 16),
        new THREE.MeshBasicMaterial({ color })
      );
      this.volumeMeshes.set(key, mesh);
      scene.add(mesh);
    }
    mesh.position.set(center.x, center.y, center.z);
    mesh.visible = true;
  }

  private syncSegments(scene: THREE.Scene, frame: BodySkeletonFrame): void {
    for (const seg of frame.segments) {
      const key = `${seg.from}-${seg.to}`;
      const from = frame.joints[seg.from];
      const to = frame.joints[seg.to];

      const fromV = new THREE.Vector3(from.x, from.y, from.z);
      const toV = new THREE.Vector3(to.x, to.y, to.z);
      const dir = new THREE.Vector3().subVectors(toV, fromV);
      const length = dir.length();
      dir.normalize();
      const mid = new THREE.Vector3().lerpVectors(fromV, toV, 0.5);

      let mesh = this.segmentMeshes.get(key);
      if (!mesh) {
        mesh = new THREE.Mesh(
          makeSegmentGeometry(seg.category),
          new THREE.MeshBasicMaterial({ color: CATEGORY_COLORS[seg.category] })
        );
        this.segmentMeshes.set(key, mesh);
        scene.add(mesh);
      }

      mesh.position.copy(mid);
      mesh.scale.set(1, length / getSegmentBaseSpan(seg.category), 1);
      if (length > 1e-6) {
        mesh.quaternion.setFromUnitVectors(Y_AXIS, dir);
      } else {
        mesh.quaternion.identity();
      }
      mesh.visible = true;
    }
  }

  private syncJoints(scene: THREE.Scene, frame: BodySkeletonFrame): void {
    for (const name of SKELETON_JOINT_NAMES) {
      if (name !== "handLeft" && name !== "handRight") {
        continue;
      }
      const pos = frame.joints[name];
      let mesh = this.jointMeshes.get(name);
      if (!mesh) {
        mesh = new THREE.Mesh(
          makeSphereGeometry(name),
          new THREE.MeshBasicMaterial({ color: makeSphereColor(name) })
        );
        this.jointMeshes.set(name, mesh);
        scene.add(mesh);
      }
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.visible = true;
    }
  }

  private syncOrientationCues(scene: THREE.Scene, frame: BodySkeletonFrame): void {
    const { orientation, joints } = frame;
    const forwardV = new THREE.Vector3(
      orientation.forward.x,
      orientation.forward.y,
      orientation.forward.z
    );
    const upV = new THREE.Vector3(orientation.up.x, orientation.up.y, orientation.up.z);

    // Torso cue: amber cone at chest level, pointing forward to indicate facing direction
    const chest = joints.chest;
    if (!this.torsoCueMesh) {
      this.torsoCueMesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.04, 0.10, 8),
        new THREE.MeshBasicMaterial({ color: TORSO_CUE_COLOR })
      );
      scene.add(this.torsoCueMesh);
    }
    const torsoOffset = new THREE.Vector3()
      .addScaledVector(forwardV, 0.07)
      .addScaledVector(upV, -0.05);
    this.torsoCueMesh.position.set(
      chest.x + torsoOffset.x,
      chest.y + torsoOffset.y,
      chest.z + torsoOffset.z
    );
    this.torsoCueMesh.quaternion.setFromUnitVectors(Y_AXIS, forwardV);
    this.torsoCueMesh.visible = true;

    // Head-front cue: small bright sphere on the front face of the head sphere
    const headCenter = joints.headCenter;
    if (!this.headCueMesh) {
      this.headCueMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 8, 8),
        new THREE.MeshBasicMaterial({ color: HEAD_CUE_COLOR })
      );
      scene.add(this.headCueMesh);
    }
    this.headCueMesh.position.set(
      headCenter.x + forwardV.x * 0.085,
      headCenter.y + forwardV.y * 0.085,
      headCenter.z + forwardV.z * 0.085
    );
    this.headCueMesh.visible = true;
  }

  dispose(scene: THREE.Scene): void {
    for (const mesh of this.segmentMeshes.values()) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.segmentMeshes.clear();

    for (const mesh of this.volumeMeshes.values()) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.volumeMeshes.clear();

    for (const mesh of this.jointMeshes.values()) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.jointMeshes.clear();

    for (const mesh of [this.torsoCueMesh, this.headCueMesh]) {
      if (mesh) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
    }
    this.torsoCueMesh = null;
    this.headCueMesh = null;
  }

  private setAllVisible(visible: boolean): void {
    for (const mesh of this.segmentMeshes.values()) {
      mesh.visible = visible;
    }
    for (const mesh of this.volumeMeshes.values()) {
      mesh.visible = visible;
    }
    for (const mesh of this.jointMeshes.values()) {
      mesh.visible = visible;
    }
    if (this.torsoCueMesh) this.torsoCueMesh.visible = visible;
    if (this.headCueMesh) this.headCueMesh.visible = visible;
  }
}
