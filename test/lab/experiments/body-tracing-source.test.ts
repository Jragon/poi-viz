import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  "src/lab/experiments/body-tracing/BodyTracingStickFigureCanvas.vue",
  "utf8"
);

describe("BodyTracingStickFigureCanvas source", () => {
  it("draws from the shared skeleton frame instead of local shoulder and pelvis heuristics", () => {
    expect(source).toContain("pose.skeleton");
    expect(source).toContain("drawCapsuleSegment");
    expect(source).toContain("pelvisCenter");
    expect(source).not.toContain("pose.shoulders.leftShoulder");
    expect(source).not.toContain("pose.shoulders.rightShoulder");
    expect(source).not.toContain("body.pelvis");
  });

  it("uses canonical wall-plane pattern space for the shared hand guide", () => {
    expect(source).toContain("computeBodyRigCanonicalPatternSpace");
    expect(source).toContain("canonicalPatternSpace.unitRadius");
  });
});
