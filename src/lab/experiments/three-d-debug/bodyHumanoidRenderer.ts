import * as THREE from "three";

import { SKELETON_JOINT_NAMES } from "@/body-rig";
import type { BodySkeletonFrame, SkeletonJointName } from "@/body-rig";

import {
  buildMannequinBodyConfig,
  createEggGeometry,
  createTaperedCapsule,
  MANNEQUIN_PROPORTIONS,
  resolveHeadHeightWorld,
  type MannequinPieceConfig
} from "./mannequinGeometry";

const LIMB_WOOD_COLOR = "#c4a882";
const BODY_WOOD_COLOR = "#d2b48c";
const PELVIS_WOOD_COLOR = "#bb9467";
const SKELETON_LINE_COLOR = "#cbd5e1";
const SKELETON_JOINT_COLOR = "#f8fafc";
const TORSO_CUE_COLOR = "#fbbf24";
const HEAD_CUE_COLOR = "#fff7ed";

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const EGG_UNIT_WIDTH = 2;
const HEAD_EGG_UNIT_HEIGHT = 2.48;
const TORSO_BLOCK_UNIT_HEIGHT = 1;
const TORSO_BLOCK_UNIT_DIAMETER = 2;
const UPPER_TORSO_DEPTH_RATIO = 0.3;
const PELVIS_DEPTH_RATIO = 0.3;

function resolveHeadDimensions(shoulderSpan: number) {
  const headHeight = resolveHeadHeightWorld(shoulderSpan);
  const headWidth = headHeight * MANNEQUIN_PROPORTIONS.headWidth;

  return {
    width: headWidth,
    height: headHeight,
    depth: headWidth * 0.88
  };
}

function syncBeadMesh(
  scene: THREE.Scene,
  meshes: Map<string, THREE.Mesh>,
  key: string,
  center: { x: number; y: number; z: number },
  diameter: number,
  color: string
): void {
  let mesh = meshes.get(key);

  if (!mesh) {
    mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 18, 18),
      new THREE.MeshBasicMaterial({ color })
    );
    meshes.set(key, mesh);
    scene.add(mesh);
  }

  mesh.position.set(center.x, center.y, center.z);
  mesh.scale.setScalar(Math.max(diameter, 1e-4));
  mesh.visible = true;
}

function toVector3(point: { x: number; y: number; z: number }): THREE.Vector3 {
  return new THREE.Vector3(point.x, point.y, point.z);
}

function setObjectBasis(
  object: THREE.Object3D,
  right: THREE.Vector3,
  up: THREE.Vector3,
  forward: THREE.Vector3
): void {
  const basis = new THREE.Matrix4().makeBasis(
    right.clone().normalize(),
    up.clone().normalize(),
    forward.clone().normalize()
  );

  object.quaternion.setFromRotationMatrix(basis);
}

export class BodyHumanoidRenderer {
  private readonly mannequinMeshes = new Map<string, THREE.Mesh>();
  private readonly skeletonLineMeshes = new Map<string, THREE.Line>();
  private readonly skeletonJointMeshes = new Map<SkeletonJointName, THREE.Mesh>();
  private torsoCueMesh: THREE.Mesh | null = null;
  private headCueMesh: THREE.Mesh | null = null;

  sync(scene: THREE.Scene, frame: BodySkeletonFrame | null, showSkeleton = false): void {
    if (!frame) {
      this.setAllVisible(false);
      return;
    }

    this.syncMannequin(scene, frame);
    this.syncSkeletonOverlay(scene, frame, showSkeleton);
    this.syncOrientationCues(scene, frame);
  }

  private syncMannequin(scene: THREE.Scene, frame: BodySkeletonFrame): void {
    const config = buildMannequinBodyConfig(frame);
    const head = resolveHeadDimensions(frame.supportPose.shoulderSpan);

    syncBeadMesh(
      scene,
      this.mannequinMeshes,
      "neckBead",
      frame.joints.neck,
      head.height * MANNEQUIN_PROPORTIONS.neckBeadWidth,
      BODY_WOOD_COLOR
    );
    syncBeadMesh(
      scene,
      this.mannequinMeshes,
      "shoulderLeftBead",
      frame.joints.shoulderLeft,
      head.height * (MANNEQUIN_PROPORTIONS.shoulderSpanOuter - MANNEQUIN_PROPORTIONS.shoulderJointSpan),
      BODY_WOOD_COLOR
    );
    syncBeadMesh(
      scene,
      this.mannequinMeshes,
      "shoulderRightBead",
      frame.joints.shoulderRight,
      head.height * (MANNEQUIN_PROPORTIONS.shoulderSpanOuter - MANNEQUIN_PROPORTIONS.shoulderJointSpan),
      BODY_WOOD_COLOR
    );

    this.syncLimbPiece(
      scene,
      "leftUpperArm",
      frame.joints.shoulderLeft,
      frame.joints.elbowLeft,
      config.leftUpperArm,
      LIMB_WOOD_COLOR
    );
    this.syncLimbPiece(
      scene,
      "rightUpperArm",
      frame.joints.shoulderRight,
      frame.joints.elbowRight,
      config.rightUpperArm,
      LIMB_WOOD_COLOR
    );
    this.syncLimbPiece(
      scene,
      "leftForearm",
      frame.joints.elbowLeft,
      frame.joints.handLeft,
      config.leftForearm,
      LIMB_WOOD_COLOR
    );
    this.syncLimbPiece(
      scene,
      "rightForearm",
      frame.joints.elbowRight,
      frame.joints.handRight,
      config.rightForearm,
      LIMB_WOOD_COLOR
    );
    this.syncLimbPiece(
      scene,
      "leftThigh",
      frame.joints.hipLeft,
      frame.joints.kneeLeft,
      config.leftThigh,
      PELVIS_WOOD_COLOR
    );
    this.syncLimbPiece(
      scene,
      "rightThigh",
      frame.joints.hipRight,
      frame.joints.kneeRight,
      config.rightThigh,
      PELVIS_WOOD_COLOR
    );
    this.syncLimbPiece(
      scene,
      "leftShin",
      frame.joints.kneeLeft,
      frame.joints.footLeft,
      config.leftShin,
      PELVIS_WOOD_COLOR
    );
    this.syncLimbPiece(
      scene,
      "rightShin",
      frame.joints.kneeRight,
      frame.joints.footRight,
      config.rightShin,
      PELVIS_WOOD_COLOR
    );

    this.syncRibcage(scene, frame, config.ribcage);
    this.syncPelvis(scene, frame, config.pelvis);
    this.syncHead(scene, frame, config.head);
  }

  private syncLimbPiece(
    scene: THREE.Scene,
    key: string,
    fromPoint: { x: number; y: number; z: number },
    toPoint: { x: number; y: number; z: number },
    config: MannequinPieceConfig,
    color: string
  ): void {
    const from = toVector3(fromPoint);
    const to = toVector3(toPoint);
    const axis = new THREE.Vector3().subVectors(to, from);
    const segmentLength = axis.length();
    const visibleLength = Math.max(segmentLength * config.lengthRatio, 1e-4);
    const midpoint = new THREE.Vector3().lerpVectors(from, to, 0.5);
    let mesh = this.mannequinMeshes.get(key);

    if (!mesh) {
      mesh = new THREE.Mesh(
        createTaperedCapsule(
          config.proximalRadius,
          config.distalRadius,
          1,
          config.capSegments,
          config.radialSegments
        ),
        new THREE.MeshBasicMaterial({ color })
      );
      this.mannequinMeshes.set(key, mesh);
      scene.add(mesh);
    }

    mesh.position.copy(midpoint);
    mesh.visible = segmentLength > 1e-6;
    if (!mesh.visible) {
      mesh.quaternion.identity();
      return;
    }

    axis.normalize();
    mesh.scale.set(1, visibleLength, 1);
    mesh.quaternion.setFromUnitVectors(Y_AXIS, axis);
  }

  private syncRibcage(
    scene: THREE.Scene,
    frame: BodySkeletonFrame,
    config: MannequinPieceConfig
  ): void {
    const shoulderLeft = toVector3(frame.joints.shoulderLeft);
    const shoulderRight = toVector3(frame.joints.shoulderRight);
    const pelvis = toVector3(frame.joints.pelvisCenter);
    const shoulderMid = new THREE.Vector3().lerpVectors(shoulderLeft, shoulderRight, 0.5);
    const shoulderWidth = Math.max(shoulderLeft.distanceTo(shoulderRight), frame.supportPose.shoulderSpan);
    const availableTorsoDrop = Math.max(shoulderMid.distanceTo(pelvis), 1e-4);
    const right = toVector3(frame.orientation.right);
    const up = toVector3(frame.orientation.up);
    const forward = toVector3(frame.orientation.forward);
    const head = resolveHeadDimensions(frame.supportPose.shoulderSpan);
      const targetRibcageWidth = head.height * MANNEQUIN_PROPORTIONS.chestWidth;
    const targetRibcageHeight = Math.max(
      Math.min(head.height * MANNEQUIN_PROPORTIONS.upperTorsoHeight, availableTorsoDrop * 0.62),
      targetRibcageWidth * 0.9
    );
    const targetRibcageDepth = targetRibcageWidth * UPPER_TORSO_DEPTH_RATIO;
    const center = new THREE.Vector3()
      .copy(shoulderMid)
      .addScaledVector(up, -targetRibcageHeight * 0.54);
    let mesh = this.mannequinMeshes.get("ribcage");

    if (!mesh) {
      mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(
          1,
          MANNEQUIN_PROPORTIONS.waistWidth / MANNEQUIN_PROPORTIONS.chestWidth,
          1,
          24,
          1,
          false
        ),
        new THREE.MeshBasicMaterial({ color: BODY_WOOD_COLOR })
      );
      this.mannequinMeshes.set("ribcage", mesh);
      scene.add(mesh);
    }

    mesh.position.copy(center);
    mesh.scale.set(
      targetRibcageWidth / TORSO_BLOCK_UNIT_DIAMETER,
      targetRibcageHeight / TORSO_BLOCK_UNIT_HEIGHT,
      targetRibcageDepth / TORSO_BLOCK_UNIT_DIAMETER
    );
    setObjectBasis(mesh, right, up, forward);
    mesh.visible = true;
  }

  private syncPelvis(
    scene: THREE.Scene,
    frame: BodySkeletonFrame,
    config: MannequinPieceConfig
  ): void {
    const hipLeft = toVector3(frame.joints.hipLeft);
    const hipRight = toVector3(frame.joints.hipRight);
    const pelvis = toVector3(frame.joints.pelvisCenter);
    const right = toVector3(frame.orientation.right);
    const up = toVector3(frame.orientation.up);
    const forward = toVector3(frame.orientation.forward);
    const head = resolveHeadDimensions(frame.supportPose.shoulderSpan);
      const targetPelvisWidth = head.height * MANNEQUIN_PROPORTIONS.pelvisWidth;
    const targetPelvisHeight = Math.max(
      head.height * MANNEQUIN_PROPORTIONS.pelvisHeight,
      targetPelvisWidth * 0.9
    );
    const targetPelvisDepth = targetPelvisWidth * PELVIS_DEPTH_RATIO;
    let mesh = this.mannequinMeshes.get("pelvis");

    if (!mesh) {
      mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(
          MANNEQUIN_PROPORTIONS.waistWidth / MANNEQUIN_PROPORTIONS.pelvisWidth,
          1,
          1,
          24,
          1,
          false
        ),
        new THREE.MeshBasicMaterial({ color: PELVIS_WOOD_COLOR })
      );
      this.mannequinMeshes.set("pelvis", mesh);
      scene.add(mesh);
    }

    mesh.position.copy(new THREE.Vector3().copy(pelvis).addScaledVector(up, targetPelvisHeight * 0.32));
    mesh.scale.set(
      targetPelvisWidth / TORSO_BLOCK_UNIT_DIAMETER,
      targetPelvisHeight / TORSO_BLOCK_UNIT_HEIGHT,
      targetPelvisDepth / TORSO_BLOCK_UNIT_DIAMETER
    );
    setObjectBasis(mesh, right, up, forward);
    mesh.visible = true;
  }

  private syncHead(
    scene: THREE.Scene,
    frame: BodySkeletonFrame,
    config: MannequinPieceConfig
  ): void {
    const headCenter = toVector3(frame.joints.headCenter);
    const right = toVector3(frame.orientation.right);
    const up = toVector3(frame.orientation.up);
    const forward = toVector3(frame.orientation.forward);
    const head = resolveHeadDimensions(frame.supportPose.shoulderSpan);
    let mesh = this.mannequinMeshes.get("head");

    if (!mesh) {
      mesh = new THREE.Mesh(createEggGeometry(1, 1.24), new THREE.MeshBasicMaterial({ color: BODY_WOOD_COLOR }));
      this.mannequinMeshes.set("head", mesh);
      scene.add(mesh);
    }

    mesh.position.copy(headCenter);
    mesh.scale.set(
      head.width / EGG_UNIT_WIDTH,
      head.height / HEAD_EGG_UNIT_HEIGHT,
      head.depth / EGG_UNIT_WIDTH
    );
    setObjectBasis(mesh, right, up, forward);
    mesh.visible = true;
    void config;
  }

  private syncSkeletonOverlay(
    scene: THREE.Scene,
    frame: BodySkeletonFrame,
    showSkeleton: boolean
  ): void {
    if (!showSkeleton) {
      for (const line of this.skeletonLineMeshes.values()) {
        line.visible = false;
      }
      for (const mesh of this.skeletonJointMeshes.values()) {
        mesh.visible = false;
      }
      return;
    }

    for (const segment of frame.segments) {
      const key = `${segment.from}-${segment.to}`;
      const from = toVector3(frame.joints[segment.from]);
      const to = toVector3(frame.joints[segment.to]);
      let line = this.skeletonLineMeshes.get(key);

      if (!line) {
        line = new THREE.Line(
          new THREE.BufferGeometry(),
          new THREE.LineBasicMaterial({
            color: SKELETON_LINE_COLOR,
            transparent: true,
            opacity: 0.55
          })
        );
        this.skeletonLineMeshes.set(key, line);
        scene.add(line);
      }

      (line.geometry as THREE.BufferGeometry).setFromPoints([from, to]);
      line.visible = true;
    }

    for (const jointName of SKELETON_JOINT_NAMES) {
      const joint = frame.joints[jointName];
      let mesh = this.skeletonJointMeshes.get(jointName);

      if (!mesh) {
        mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.018, 10, 10),
          new THREE.MeshBasicMaterial({
            color: SKELETON_JOINT_COLOR,
            transparent: true,
            opacity: 0.72
          })
        );
        this.skeletonJointMeshes.set(jointName, mesh);
        scene.add(mesh);
      }

      mesh.position.set(joint.x, joint.y, joint.z);
      mesh.visible = true;
    }
  }

  private syncOrientationCues(scene: THREE.Scene, frame: BodySkeletonFrame): void {
    const forward = toVector3(frame.orientation.forward);
    const up = toVector3(frame.orientation.up);
    const chest = frame.joints.chest;
    const headCenter = frame.joints.headCenter;

    if (!this.torsoCueMesh) {
      this.torsoCueMesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.022, 0.055, 10),
        new THREE.MeshBasicMaterial({ color: TORSO_CUE_COLOR })
      );
      scene.add(this.torsoCueMesh);
    }

    const torsoOffset = new THREE.Vector3()
      .addScaledVector(forward, 0.085)
      .addScaledVector(up, -0.025);
    this.torsoCueMesh.position.set(
      chest.x + torsoOffset.x,
      chest.y + torsoOffset.y,
      chest.z + torsoOffset.z
    );
    this.torsoCueMesh.quaternion.setFromUnitVectors(Y_AXIS, forward);
    this.torsoCueMesh.visible = true;

    if (!this.headCueMesh) {
      this.headCueMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 10, 10),
        new THREE.MeshBasicMaterial({ color: HEAD_CUE_COLOR })
      );
      scene.add(this.headCueMesh);
    }

    this.headCueMesh.position.set(
      headCenter.x + forward.x * 0.07,
      headCenter.y + forward.y * 0.07,
      headCenter.z + forward.z * 0.07
    );
    this.headCueMesh.visible = true;
  }

  dispose(scene: THREE.Scene): void {
    for (const mesh of this.mannequinMeshes.values()) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.mannequinMeshes.clear();

    for (const line of this.skeletonLineMeshes.values()) {
      scene.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.skeletonLineMeshes.clear();

    for (const mesh of this.skeletonJointMeshes.values()) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.skeletonJointMeshes.clear();

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
    for (const mesh of this.mannequinMeshes.values()) {
      mesh.visible = visible;
    }
    for (const line of this.skeletonLineMeshes.values()) {
      line.visible = visible;
    }
    for (const mesh of this.skeletonJointMeshes.values()) {
      mesh.visible = visible;
    }
    if (this.torsoCueMesh) {
      this.torsoCueMesh.visible = visible;
    }
    if (this.headCueMesh) {
      this.headCueMesh.visible = visible;
    }
  }
}
