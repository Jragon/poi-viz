import { describe, expect, it } from "vitest";

import { VERIFIED_ONE_HAND_TURNS } from "@/lab/experiments/mel-turning/fixtures/verifiedOneHandTurns";
import { VERIFIED_TWO_HAND_TURNS } from "@/lab/experiments/mel-turning/fixtures/verifiedTwoHandTurns";
import {
  buildTurnLegalityMatrix,
  buildTurnLegalityMatrixRow
} from "@/lab/experiments/mel-turning/model/turnLegalityMatrix";

const MATRIX = buildTurnLegalityMatrix([
  ...VERIFIED_ONE_HAND_TURNS,
  ...VERIFIED_TWO_HAND_TURNS
]);

describe("turn legality matrix model", () => {
  it("derives one row for each of the 52 verified turns", () => {
    expect(MATRIX).toHaveLength(52);
    expect(new Set(MATRIX.map((row) => row.fixtureId)).size).toBe(52);
    expect(MATRIX.every((row) => row.verificationStatus === "physically-verified")).toBe(true);
  });

  it("keeps one-hand and coupled plane configurations distinct", () => {
    expect(MATRIX.find((row) => row.fixtureId === "one-native-in-left-cross")).toMatchObject({
      timing: "ONE",
      planeConfigurationBefore: "A",
      planeConfigurationAfter: "B",
      crossingCount: 1,
      hands: [{ hand: "right", mechanism: "cross", gate: "left" }]
    });

    expect(MATRIX.find((row) => row.fixtureId === "ss-right-counter-to-counter")).toMatchObject({
      timing: "SS",
      planeConfigurationBefore: "AB",
      planeConfigurationAfter: "AB",
      crossingCount: 0,
      hands: [
        { hand: "left", mechanism: "hold", gate: null },
        { hand: "right", mechanism: "hold", gate: null }
      ]
    });
  });

  it("derives preparation by comparing the turn source with the previous reel cycle", () => {
    const prepared = MATRIX.find((row) => row.fixtureId === "ts-right-chasing-2-to-1");
    expect(prepared?.hands).toMatchObject([
      { hand: "left", preparedBeforeTurn: true },
      { hand: "right", preparedBeforeTurn: false }
    ]);

    const direct = MATRIX.find((row) => row.fixtureId === "ts-left-chasing-1-to-2");
    expect(direct?.hands).toMatchObject([
      { hand: "left", preparedBeforeTurn: false },
      { hand: "right", preparedBeforeTurn: false }
    ]);
  });

  it("retains low-back hand placement independently from lane and plane side", () => {
    const lowBack = MATRIX.find((row) => row.fixtureId === "one-back-in-right-cross");
    expect(lowBack?.hands[0]).toMatchObject({
      fromLane: "center",
      toLane: "center",
      fromHandPlacement: "behind-body",
      toHandPlacement: "behind-body",
      fromPlaneSide: "b",
      toPlaneSide: "a"
    });
  });

  it("rejects duplicate ids instead of silently merging evidence", () => {
    const fixture = VERIFIED_ONE_HAND_TURNS[0];
    if (!fixture) throw new Error("Fixture invariant failed");

    expect(() => buildTurnLegalityMatrix([fixture, fixture])).toThrow(
      "Duplicate turning legality fixture id"
    );
  });

  it("rejects a fixture whose normalized track does not span the turn", () => {
    const fixture = VERIFIED_ONE_HAND_TURNS[0];
    if (!fixture) throw new Error("Fixture invariant failed");

    const broken = {
      ...fixture,
      trace: {
        ...fixture.trace,
        tracks: fixture.trace.tracks.map((track) => ({
          ...track,
          nodes: track.nodes.slice(0, fixture.trace.events[0]?.afterStep ?? 0)
        }))
      }
    };

    expect(() => buildTurnLegalityMatrixRow(broken)).toThrow("does not span its turn edge");
  });
});
