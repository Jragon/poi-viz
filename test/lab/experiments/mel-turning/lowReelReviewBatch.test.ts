import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  MEL_TURNING_REVIEW_BATCH_ID,
  MEL_TURNING_REVIEW_CASE_COUNT,
  buildMelTurningReviewBatch,
  writeMelTurningReviewBatch
} from "../../../../experiments/generate_mel_turning_review";

const REVIEW_DIRECTORY = new URL(
  "../../../../research/mel-turning/candidates/solver-review-001/",
  import.meta.url
);

describe("Mel turning physical-review batch", () => {
  it("builds a deterministic, stratified 16-route batch", () => {
    const first = buildMelTurningReviewBatch();
    const second = buildMelTurningReviewBatch();

    expect(first.batchId).toBe(MEL_TURNING_REVIEW_BATCH_ID);
    expect(first.cases).toHaveLength(MEL_TURNING_REVIEW_CASE_COUNT);
    expect(first.casesCsv).toBe(second.casesCsv);
    expect(first.stepsCsv).toBe(second.stepsCsv);
    expect(
      first.cases.slice(0, 4).every(({ route }) => route.evidenceStatus === "exact-route-verified")
    ).toBe(true);
    expect(new Set(first.cases.map(({ result }) => result.compatibility.sourceTiming))).toEqual(
      new Set(["TO", "SO", "TS", "SS"])
    );
    expect(new Set(first.cases.map(({ result }) => result.turnDirection))).toEqual(
      new Set(["left", "right"])
    );
    expect(
      new Set(
        first.cases.map(
          ({ result }) =>
            `${result.compatibility.sourcePatternType}->${result.compatibility.targetPatternType}`
        )
      )
    ).toEqual(new Set(["weave->weave", "mill->mill", "mill->weave", "weave->mill"]));
  });

  it("exports a complete source cycle, bridge, and target cycle for every route", () => {
    const batch = buildMelTurningReviewBatch();

    for (const reviewCase of batch.cases) {
      const steps = batch.steps.filter((step) => step.caseId === reviewCase.caseId);
      expect(steps).toHaveLength(9 + reviewCase.route.bridgeHalfbeats);
      expect(steps.slice(0, 5).every((step) => step.region === "source")).toBe(true);
      expect(steps.at(-1)?.region).toBe("target");
      expect(steps.filter((step) => step.edgeKind === "body-turn")).toHaveLength(1);
      expect(
        steps.every(
          (step) => step.leftAnchorBody !== "0.000 0.000" && step.rightAnchorBody !== "0.000 0.000"
        )
      ).toBe(true);
    }
    expect(batch.casesCsv).toContain("review_verdict,naturalness,review_notes");
    expect(batch.stepsCsv).toContain("physical_correction,review_notes");
  });

  it("keeps the checked-in review pack aligned and protects future annotations", async () => {
    const batch = buildMelTurningReviewBatch();

    await expect(writeMelTurningReviewBatch(fileURLToPath(REVIEW_DIRECTORY))).rejects.toThrow(
      /Refusing to replace existing physical-review CSVs/
    );
    expect(batch.casesCsv).toBe(await readFile(new URL("cases.csv", REVIEW_DIRECTORY), "utf8"));
    expect(batch.stepsCsv).toBe(await readFile(new URL("steps.csv", REVIEW_DIRECTORY), "utf8"));
  });
});
