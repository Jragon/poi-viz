import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { VRM_RIG_MODEL_FILENAME } from "@/lab/experiments/vrm-rig/vrmModel";

interface Vrm0HumanBone {
  readonly bone: string;
  readonly node: number;
}

interface Vrm0Extension {
  readonly exporterVersion?: string;
  readonly meta?: {
    readonly title?: string;
    readonly author?: string;
    readonly licenseName?: string;
  };
  readonly humanoid?: {
    readonly humanBones?: readonly Vrm0HumanBone[];
  };
}

interface AuroraGltfJson {
  readonly extensions?: {
    readonly VRM?: Vrm0Extension;
  };
}

const REQUIRED_BONES = [
  "hips",
  "spine",
  "chest",
  "leftShoulder",
  "leftUpperArm",
  "leftLowerArm",
  "leftHand",
  "rightShoulder",
  "rightUpperArm",
  "rightLowerArm",
  "rightHand",
  "leftUpperLeg",
  "leftLowerLeg",
  "leftFoot",
  "rightUpperLeg",
  "rightLowerLeg",
  "rightFoot"
] as const;

function readGlbJson(file: URL): AuroraGltfJson {
  const bytes = readFileSync(file);
  expect(bytes.toString("ascii", 0, 4)).toBe("glTF");
  expect(bytes.readUInt32LE(4)).toBe(2);

  const jsonChunkLength = bytes.readUInt32LE(12);
  const jsonChunkType = bytes.toString("ascii", 16, 20);
  expect(jsonChunkType).toBe("JSON");

  return JSON.parse(
    bytes
      .subarray(20, 20 + jsonChunkLength)
      .toString("utf8")
      .replaceAll(String.fromCharCode(0), "")
      .trimEnd()
  ) as AuroraGltfJson;
}

describe("Aurora VRM asset contract", () => {
  it("ships the selected VRM0 avatar with the required humanoid mapping", () => {
    const gltf = readGlbJson(
      new URL(`../../../../public/models/vrm/${VRM_RIG_MODEL_FILENAME}`, import.meta.url)
    );
    const vrm = gltf.extensions?.VRM;
    const humanBones = vrm?.humanoid?.humanBones ?? [];
    const mappedBones = new Set(humanBones.map(({ bone }) => bone));

    expect(vrm?.exporterVersion).toBe("UniVRM-0.58.0");
    expect(vrm?.meta).toMatchObject({
      title: "Aurora",
      author: "Polygonal Mind",
      licenseName: "CC0"
    });
    expect(humanBones.every(({ node }) => Number.isInteger(node) && node >= 0)).toBe(true);
    expect(REQUIRED_BONES.filter((bone) => !mappedBones.has(bone))).toEqual([]);
  });
});
