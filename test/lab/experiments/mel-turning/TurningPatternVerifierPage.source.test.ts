import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/lab/experiments/mel-turning/review/TurningPatternVerifierPage.vue"),
  "utf8"
);

describe("TurningPatternVerifierPage source boundary", () => {
  it("uses the existing graph without adding a movement visualizer", () => {
    expect(source).toContain("MelTurningGraph");
    expect(source).not.toContain("PoiCanvasViewport");
    expect(source).not.toContain("createVisualizerWorkspace");
  });

  it("keeps review input to factual outcomes, notation edits, and freeform notes", () => {
    expect(source).toContain("Possible");
    expect(source).toContain("Not possible");
    expect(source).toContain("Inconclusive");
    expect(source).toContain("Edit pattern");
    expect(source).toContain("Freeform observations about this pattern");
    expect(source).not.toContain("Naturalness");
    expect(source).not.toContain("routeNotes");
  });

  it("provides JSON import, durable local drafts, and reviewed JSON export", () => {
    expect(source).toContain("Import JSON");
    expect(source).toContain("Export reviewed JSON");
    expect(source).toContain("saveTurningReviewWorkbench");
    expect(source).toContain("Local progress already exists");
  });
});
