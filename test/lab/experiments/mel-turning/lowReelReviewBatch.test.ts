import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  MEL_TURNING_REVIEW_BATCH_ID,
  MEL_TURNING_REVIEW_CASE_COUNT,
  buildMelTurningReviewBatch,
  writeMelTurningReviewBatch
} from "../../../../experiments/generate_mel_turning_review";
import { parseTurningReviewArtifact } from "@/lab/experiments/mel-turning/review/turningReviewArtifact";

const REVIEW_DIRECTORY = new URL(
  "../../../../research/mel-turning/candidates/low-weave-opposite-review-001/",
  import.meta.url
);

describe("Mel turning physical-review batch", () => {
  it("builds a deterministic 16-route opposite left-weave batch", () => {
    const first = buildMelTurningReviewBatch();
    const second = buildMelTurningReviewBatch();

    expect(first.batchId).toBe(MEL_TURNING_REVIEW_BATCH_ID);
    expect(first.cases).toHaveLength(MEL_TURNING_REVIEW_CASE_COUNT);
    expect(first.casesCsv).toBe(second.casesCsv);
    expect(first.stepsCsv).toBe(second.stepsCsv);
    expect(first.workbenchJson).toBe(second.workbenchJson);
    expect(parseTurningReviewArtifact(JSON.parse(first.workbenchJson))).toEqual(
      first.workbenchArtifact
    );
    expect(first.workbenchArtifact.batch.candidates).toHaveLength(MEL_TURNING_REVIEW_CASE_COUNT);
    expect(first.workbenchArtifact.reviews).toEqual({});
    expect(first.cases.every(({ route }) => route.evidenceStatus === "unreviewed")).toBe(true);
    expect(first.cases.every(({ route }) => route.bridgeHalfbeats === 1 && route.isShortest)).toBe(
      true
    );
    expect(first.cases.every(({ route }) => route.modelStatus === "valid")).toBe(true);
    expect(new Set(first.cases.map(({ result }) => result.compatibility.sourceTiming))).toEqual(
      new Set(["TO", "SO"])
    );
    expect(new Set(first.cases.map(({ result }) => result.turnDirection))).toEqual(
      new Set(["left", "right"])
    );
    expect(
      first.cases.every(
        ({ result }) =>
          result.source.left === "low-native" &&
          result.source.right === "low-non-native" &&
          result.target.left === "low-native" &&
          result.target.right === "low-non-native" &&
          result.source.direction.mode === "opposite" &&
          result.source.direction.flow === "inwards" &&
          result.target.direction.mode === "opposite" &&
          result.target.direction.flow === "outwards"
      )
    ).toBe(true);
    expect(
      first.cases.slice(0, 12).every(({ result }) => result.source.offset === result.target.offset)
    ).toBe(true);
    expect(
      first.cases.slice(12).every(({ result }) => result.source.offset !== result.target.offset)
    ).toBe(true);
    expect(
      Object.fromEntries(
        [...new Set(first.cases.map(({ result }) => result))].map((result) => [
          `${result.compatibility.sourceTiming}:${result.source.offset}->${result.target.offset}:${result.turnDirection}`,
          first.cases.filter((entry) => entry.result === result).length
        ])
      )
    ).toEqual({
      "SO:0->0:left": 4,
      "SO:0->0:right": 4,
      "TO:1->1:left": 2,
      "TO:1->1:right": 2,
      "SO:0->2:left": 1,
      "SO:0->2:right": 1,
      "TO:1->3:left": 1,
      "TO:1->3:right": 1
    });
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
    expect(batch.casesCsv).not.toContain("review_verdict");
    expect(batch.casesCsv).not.toContain("naturalness");
    expect(batch.stepsCsv).not.toContain("physical_correction");
    expect(batch.workbenchJson).not.toContain("naturalness");
    expect(batch.workbenchJson).not.toContain("routeNotes");
  });

  it("keeps the checked-in review pack aligned and protects future annotations", async () => {
    const batch = buildMelTurningReviewBatch();

    await expect(writeMelTurningReviewBatch(fileURLToPath(REVIEW_DIRECTORY))).rejects.toThrow(
      /Refusing to replace existing review batch files/
    );
    expect(batch.casesCsv).toBe(await readFile(new URL("cases.csv", REVIEW_DIRECTORY), "utf8"));
    expect(batch.stepsCsv).toBe(await readFile(new URL("steps.csv", REVIEW_DIRECTORY), "utf8"));
    expect(batch.workbenchJson).toBe(
      await readFile(new URL("workbench.json", REVIEW_DIRECTORY), "utf8")
    );
  });
});
