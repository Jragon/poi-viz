import * as THREE from "three";

import type { BodySkeletonFrame, SkeletonSegmentCategory } from "@/body-rig";

const CATEGORY_COLORS: Record<SkeletonSegmentCategory, string> = {
  head: "#e2e8f0",
  spine: "#94a3b8",
  arm: "#7dd3fc",
  leg: "#86efac"
};

const HEAD_SPHERE_DETAIL = 16;
const HAND_SPHERE_DETAIL = 16;

export class BodyStickFigureRenderer {
  private readonly segmentLines = new Map<string, THREE.Line>();
  private headMesh: THREE.Mesh | null = null;
  private handLeftMesh: THREE.Mesh | null = null;
  private handRightMesh: THREE.Mesh | null = null;

  sync(scene: THREE.Scene, frame: BodySkeletonFrame | null): void {
    if (!frame) {
      this.setAllVisible(false);
      return;
    }

    for (const seg of frame.segments) {
      const key = `${seg.from}-${seg.to}`;
      let line = this.segmentLines.get(key);

      if (!line) {
        line = new THREE.Line(
          new THREE.BufferGeometry(),
          new THREE.LineBasicMaterial({ color: CATEGORY_COLORS[seg.category] })
        );
        this.segmentLines.set(key, line);
        scene.add(line);
      }

      const from = frame.joints[seg.from];
      const to = frame.joints[seg.to];
      (line.geometry as THREE.BufferGeometry).setFromPoints([
        new THREE.Vector3(from.x, from.y, from.z),
        new THREE.Vector3(to.x, to.y, to.z)
      ]);
      line.visible = true;
    }

    if (!this.headMesh) {
      this.headMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, HEAD_SPHERE_DETAIL, HEAD_SPHERE_DETAIL),
        new THREE.MeshBasicMaterial({ color: CATEGORY_COLORS.head })
      );
      scene.add(this.headMesh);
    }
    const headJoint = frame.joints.headCenter;
    this.headMesh.position.set(headJoint.x, headJoint.y, headJoint.z);
    this.headMesh.visible = true;

    if (!this.handLeftMesh) {
      this.handLeftMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, HAND_SPHERE_DETAIL, HAND_SPHERE_DETAIL),
        new THREE.MeshBasicMaterial({ color: CATEGORY_COLORS.arm })
      );
      scene.add(this.handLeftMesh);
    }
    const handLeftJoint = frame.joints.handLeft;
    this.handLeftMesh.position.set(handLeftJoint.x, handLeftJoint.y, handLeftJoint.z);
    this.handLeftMesh.visible = true;

    if (!this.handRightMesh) {
      this.handRightMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, HAND_SPHERE_DETAIL, HAND_SPHERE_DETAIL),
        new THREE.MeshBasicMaterial({ color: CATEGORY_COLORS.arm })
      );
      scene.add(this.handRightMesh);
    }
    const handRightJoint = frame.joints.handRight;
    this.handRightMesh.position.set(handRightJoint.x, handRightJoint.y, handRightJoint.z);
    this.handRightMesh.visible = true;
  }

  dispose(scene: THREE.Scene): void {
    for (const line of this.segmentLines.values()) {
      scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.segmentLines.clear();

    for (const mesh of [this.headMesh, this.handLeftMesh, this.handRightMesh]) {
      if (mesh) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      }
    }
    this.headMesh = null;
    this.handLeftMesh = null;
    this.handRightMesh = null;
  }

  private setAllVisible(visible: boolean): void {
    for (const line of this.segmentLines.values()) {
      line.visible = visible;
    }
    if (this.headMesh) this.headMesh.visible = visible;
    if (this.handLeftMesh) this.handLeftMesh.visible = visible;
    if (this.handRightMesh) this.handRightMesh.visible = visible;
  }
}
