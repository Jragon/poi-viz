import { describe, expect, it } from "vitest";
import {
  canonicalPhaseBucketToReference,
  canonicalToReferencePhaseRadians,
  getPhaseReferenceOffsetRadians,
  referencePhaseBucketToCanonical,
  referenceToCanonicalPhaseRadians
} from "@/state/phaseReference";

describe("phase reference helpers", () => {
  it("converts canonical phases to/from reference-relative phases", () => {
    const canonicalDown = (3 * Math.PI) / 2;
    const downRelative = canonicalToReferencePhaseRadians(canonicalDown, "down");

    expect(downRelative).toBeCloseTo(0, 10);
    expect(referenceToCanonicalPhaseRadians(downRelative, "down")).toBeCloseTo(canonicalDown, 10);
  });

  it("maps VTG phase buckets between canonical and reference-relative values", () => {
    expect(canonicalPhaseBucketToReference(0, "down")).toBe(90);
    expect(referencePhaseBucketToCanonical(0, "down")).toBe(270);
    expect(canonicalPhaseBucketToReference(270, "down")).toBe(0);
  });

  it("provides named offsets for each reference option", () => {
    expect(getPhaseReferenceOffsetRadians("right")).toBeCloseTo(0, 10);
    expect(getPhaseReferenceOffsetRadians("up")).toBeCloseTo(Math.PI / 2, 10);
    expect(getPhaseReferenceOffsetRadians("left")).toBeCloseTo(Math.PI, 10);
    expect(getPhaseReferenceOffsetRadians("down")).toBeCloseTo((3 * Math.PI) / 2, 10);
  });
});
