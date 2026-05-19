import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  "src/lab/experiments/body-tracing/BodyTracingStickFigureCanvas.vue",
  "utf8"
);

const doc = readFileSync(
  "src/lab/experiments/body-tracing/body-tracing.md",
  "utf8"
);

describe("BodyTracingStickFigureCanvas source", () => {
  it("draws from the shared skeleton frame instead of local shoulder and pelvis heuristics", () => {
    expect(source).toContain("pose.skeleton");
    expect(source).toContain("drawCapsuleSegment");
    expect(source).toContain("pelvisCenter");
    expect(source).not.toContain("pose.shoulders.leftShoulder");
    expect(source).not.toContain("pose.shoulders.rightShoulder");
    expect(source).not.toContain(["body", "pelvis"].join("."));
  });

  it("uses canonical wall-plane pattern space for the canonical pattern guide", () => {
    expect(source).toContain("computeBodyRigCanonicalPatternSpace");
    expect(source).toContain("canonicalPatternSpace.unitRadius");
    expect(source).toContain("drawCanonicalPatternGuide");
  });
});

describe("body-tracing.md documentation", () => {
  it("describes pelvis/chest/shoulder-girdle as solved by the body-rig layer", () => {
    expect(doc).toContain("body-rig layer");
    expect(doc).toContain("shoulder-girdle");
  });

  it("does not contain stale fixed-pelvis or 2D-span-proxy language", () => {
    expect(doc).not.toContain("pelvis, torso center, and neck stay fixed");
    expect(doc).not.toContain("shoulder span compresses as a 2D proxy");
  });

  it("describes canonical wall-plane scale as the unit radius contract", () => {
    expect(doc).toContain("canonical wall-plane unit radius");
  });

  it("states that projection and rendering are adapters over the solved skeleton", () => {
    expect(doc).toContain("adapters over the solved skeleton");
  });

  it("does not contain stale largest shared overlap-circle phrasing", () => {
    expect(doc).not.toMatch(/largest\s+shared.hand\s+overlap\s+circle/i);
  });
});
