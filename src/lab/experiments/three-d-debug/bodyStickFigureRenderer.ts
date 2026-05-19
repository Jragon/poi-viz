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

const Y_AXIS = new THREE.Vector3(0, 1, 0);

function makeSphereGeometry(name: SkeletonJointName): THREE.SphereGeometry {
  if (name === "headCenter") return new THREE.SphereGeometry(0.1, 16, 16);
  if (name === "handLeft" || name === "handRight") return new THREE.SphereGeometry(0.05, 12, 12);
  return new THREE.SphereGeometry(0.03, 8, 8);
}

function makeSphereColor(name: SkeletonJointName): string {
  if (name === "headCenter" || name === "neck") return CATEGORY_COLORS.head;
  if (
    name === "shoulderLeft" ||
    name === "shoulderRight" ||
    name === "shoulderCenter" ||
    name === "pelvis" ||
    name === "hipLeft" ||
    name === "hipRight"
  )
    return CATEGORY_COLORS.spine;
  if (
    name === "elbowLeft" ||
    name === "elbowRight" ||
    name === "handLeft" ||
    name === "handRight"
  )
    return CATEGORY_COLORS.arm;
  return CATEGORY_COLORS.leg;
}

export class BodyStickFigureRenderer {
  private readonly segmentMeshes = new Map<string, THREE.Mesh>();
  private readonly jointMeshes = new Map<SkeletonJointName, THREE.Mesh>();
  private torsoCueMesh: THREE.Mesh | null = null;
  private headCueMesh: THREE.Mesh | null = null;

  sync(scene: THREE.Scene, frame: BodySkeletonFrame | null): void {
    if (!frame) {
      this.setAllVisible(false);
      return;
    }

    this.syncSegments(scene, frame);
    this.syncJoints(scene, frame);
    this.syncOrientationCues(scene, frame);
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
      const radius = LIMB_RADIUS[seg.category];

      let mesh = this.segmentMeshes.get(key);
      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.CapsuleGeometry(radius, Math.max(0, length), CAPSULE_CAP_SEGS, CAPSULE_RADIAL_SEGS),
          new THREE.MeshBasicMaterial({ color: CATEGORY_COLORS[seg.category] })
        );
        this.segmentMeshes.set(key, mesh);
        scene.add(mesh);
      } else {
        mesh.geometry.dispose();
        mesh.geometry = new THREE.CapsuleGeometry(
          radius,
          Math.max(0, length),
          CAPSULE_CAP_SEGS,
          CAPSULE_RADIAL_SEGS
        );
      }

      mesh.position.copy(mid);
      if (length > 1e-6) {
        mesh.quaternion.setFromUnitVectors(Y_AXIS, dir);
      }
      mesh.visible = true;
    }
  }

  private syncJoints(scene: THREE.Scene, frame: BodySkeletonFrame): void {
    for (const name of SKELETON_JOINT_NAMES) {
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
    const shoulderCenter = joints.shoulderCenter;
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
      shoulderCenter.x + torsoOffset.x,
      shoulderCenter.y + torsoOffset.y,
      shoulderCenter.z + torsoOffset.z
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
    for (const mesh of this.jointMeshes.values()) {
      mesh.visible = visible;
    }
    if (this.torsoCueMesh) this.torsoCueMesh.visible = visible;
    if (this.headCueMesh) this.headCueMesh.visible = visible;
  }
}
