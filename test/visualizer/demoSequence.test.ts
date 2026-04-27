import { describe, expect, it } from "vitest";

import { prepareMultiRigSequence } from "@/engine/multirig";
import { demoSequence } from "@/visualizer/demoSequence";

describe("demoSequence", () => {
  it("prepares successfully and exposes the outer transport duration", () => {
    const result = prepareMultiRigSequence(demoSequence);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.prepared.rigs.map((rig) => rig.rigId)).toEqual(["left", "right"]);
    expect(result.prepared.maxSequenceDuration).toBeCloseTo(6 * Math.PI);
  });
});
