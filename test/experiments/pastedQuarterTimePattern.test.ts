import { compileAuthoredDocument } from "@/authoring/compile";
import { prepareMultiRigSequence } from "@/engine/multirig";
import {
  getPastedQuarterTimeSequence,
  pastedQuarterTimePattern
} from "@/experiments/quarterTime/pastedQuarterTimePattern";
import { describe, expect, it } from "vitest";

describe("pastedQuarterTimePattern", () => {
  it("compiles through the authored document compiler", () => {
    const result = compileAuthoredDocument(pastedQuarterTimePattern.document);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(`expected pasted pattern to compile, got ${JSON.stringify(result.errors)}`);
    }

    expect(result.sequence.rigs.map((rig) => rig.rigId)).toEqual(["left", "right"]);
  });

  it("prepares as a multi-rig visualizer sequence", () => {
    const sequence = getPastedQuarterTimeSequence();
    const prepared = prepareMultiRigSequence(sequence);

    expect(prepared.ok).toBe(true);
    if (!prepared.ok) {
      throw new Error(`expected sequence to prepare, got ${JSON.stringify(prepared.errors)}`);
    }

    expect(prepared.prepared.rigs).toHaveLength(2);
    expect(prepared.prepared.maxSequenceDuration).toBeGreaterThan(0);
  });

  it("preserves the pasted segment counts and active planes", () => {
    const sequence = getPastedQuarterTimeSequence();
    const segmentCounts = Object.fromEntries(
      sequence.rigs.map((rig) => [rig.rigId, rig.sequence.segments.length])
    );
    const planes = new Set(
      sequence.rigs.flatMap((rig) =>
        rig.sequence.segments.map((placement) => placement.planeId ?? "wall")
      )
    );

    expect(segmentCounts).toEqual({ left: 7, right: 7 });
    expect(planes).toEqual(new Set(["wall", "wheel", "floor"]));
  });
});
