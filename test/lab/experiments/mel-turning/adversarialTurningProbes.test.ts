import { describe, expect, it } from "vitest";

import {
  ADVERSARIAL_TURNING_PROBES,
  evaluateAdversarialTurningProbes
} from "@/lab/experiments/mel-turning/fixtures/adversarialTurningProbes";

describe("adversarial turning probes", () => {
  it("strips verified status from every mutated trace", () => {
    expect(ADVERSARIAL_TURNING_PROBES).toHaveLength(7);
    expect(
      ADVERSARIAL_TURNING_PROBES.every(
        (probe) => probe.trace.verificationStatus === "unverified"
      )
    ).toBe(true);
  });

  it("rejects timing and synchronization defects structurally", () => {
    const results = evaluateAdversarialTurningProbes();
    const rejected = results.filter(
      (result) => result.probe.expectation === "structurally-invalid"
    );

    expect(rejected).toHaveLength(3);
    expect(rejected.every((result) => result.analysis.contractStatus === "invalid")).toBe(true);
    expect(rejected.every((result) => result.analysis.physicalStatus === "not-assessed")).toBe(
      true
    );
  });

  it("leaves physical mutations unresolved instead of inventing a verdict", () => {
    const results = evaluateAdversarialTurningProbes();
    const unresolved = results.filter(
      (result) => result.probe.expectation === "structurally-valid-unresolved"
    );

    expect(unresolved).toHaveLength(4);
    expect(unresolved.every((result) => result.analysis.contractStatus === "valid")).toBe(true);
    expect(unresolved.every((result) => result.analysis.physicalStatus === "unresolved")).toBe(
      true
    );
  });

  it("matches every declared experiment expectation", () => {
    expect(evaluateAdversarialTurningProbes().every((result) => result.matchedExpectation)).toBe(
      true
    );
  });
});
