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

  it("rejects structurally coherent mutations when topology now decides them", () => {
    const results = evaluateAdversarialTurningProbes();
    const rejected = results.filter(
      (result) => result.probe.expectation === "topologically-invalid"
    );

    expect(rejected).toHaveLength(4);
    expect(rejected.every((result) => result.analysis.contractStatus === "valid")).toBe(true);
    expect(rejected.every((result) => result.analysis.topologyStatus === "invalid")).toBe(true);
    expect(rejected.every((result) => result.analysis.physicalStatus === "not-assessed")).toBe(
      true
    );
  });

  it("matches every declared experiment expectation", () => {
    expect(evaluateAdversarialTurningProbes().every((result) => result.matchedExpectation)).toBe(
      true
    );
  });
});
