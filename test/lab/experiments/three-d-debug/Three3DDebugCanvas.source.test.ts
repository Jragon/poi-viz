import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const THREE_D_DEBUG_CANVAS_FILE = resolve(
  process.cwd(),
  "src/lab/experiments/three-d-debug/Three3DDebugCanvas.vue"
);

describe("Three3DDebugCanvas trail sync", () => {
  it("does not update trail line geometry through raw setFromPoints reuse", () => {
    const source = readFileSync(THREE_D_DEBUG_CANVAS_FILE, "utf8");

    expect(source).not.toContain(
      "(objects.hand.geometry as THREE.BufferGeometry).setFromPoints(vectorsFromPoints(handPoints));"
    );
    expect(source).not.toContain(
      "(objects.head.geometry as THREE.BufferGeometry).setFromPoints(vectorsFromPoints(headPoints));"
    );
  });
});