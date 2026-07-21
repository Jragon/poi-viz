import { describe, expect, it } from "vitest";

import { compilePatternSource, validatePatternSource } from "@/patterns/patternAdapters";
import { createLowCommonCosmoBeatGraph } from "@/lab/experiments/mel-body-tracing/beat-graph/cosmoSeed";
import { createEmptyStallPatternDraft } from "@/lab/experiments/qt-stall-graph/stallPattern";

describe("pattern adapters", () => {
  it("compiles a beat graph source into an engine sequence", () => {
    const result = compilePatternSource({
      kind: "beat-graph",
      graph: createLowCommonCosmoBeatGraph()
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.sequence.rigs.length).toBeGreaterThan(0);
  });

  it("validates beat graph structure before persistence", () => {
    const result = validatePatternSource({
      kind: "beat-graph",
      graph: {
        cycleSteps: 2,
        lanes: [],
        tracks: []
      }
    });

    expect(result.ok).toBe(false);
  });

  it("rejects an incomplete stall draft that cannot compile", () => {
    const result = compilePatternSource({
      kind: "stall-graph",
      draft: createEmptyStallPatternDraft()
    });

    expect(result.ok).toBe(false);
  });
});
