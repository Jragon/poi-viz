import { compileAuthoredDocument } from "@/authoring/compile";
import { pendulumSavedPatterns } from "@/patterns/pendulumSavedPatterns";
import { describe, expect, it } from "vitest";

describe("pendulum saved patterns", () => {
  it("provides every lab composition as a valid editable authoring document", () => {
    expect(pendulumSavedPatterns.map((entry) => entry.id)).toEqual([
      "builtin-pendulum-ordinary",
      "builtin-pendulum-extended",
      "builtin-pendulum-isolated",
      "builtin-pendulum-same-time",
      "builtin-pendulum-quarter-time",
      "builtin-pendulum-mirrored",
      "builtin-pendulum-extendulum"
    ]);

    for (const entry of pendulumSavedPatterns) {
      expect(entry.source.kind, entry.id).toBe("authoring");
      if (entry.source.kind !== "authoring") continue;
      expect(compileAuthoredDocument(entry.source.document), entry.id).toMatchObject({ ok: true });
    }
  });

  it("keeps the extendulum's one-circle-to-one-oscillator-cycle ratio explicit", () => {
    const entry = pendulumSavedPatterns.find(
      (candidate) => candidate.id === "builtin-pendulum-extendulum"
    );
    if (entry?.source.kind !== "authoring") throw new Error("Missing extendulum authoring source");

    const segment = entry.source.document.tracks.left?.segments[0];
    if (!segment || segment.kind !== "first") throw new Error("Missing extendulum segment");
    if (segment.hand.driver.kind !== "circle") throw new Error("Hand must use a circle");
    if (segment.head.driver.kind !== "pendulum") throw new Error("Head must use a pendulum");

    const handCycles =
      (segment.hand.driver.omega * segment.durationUnits) / (Math.PI * 2);
    const headCycles = segment.head.driver.cyclesPerUnit * segment.durationUnits;
    expect(handCycles).toBeCloseTo(1, 12);
    expect(headCycles).toBeCloseTo(1, 12);
  });
});
