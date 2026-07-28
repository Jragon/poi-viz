import { describe, expect, it } from "vitest";

import {
  VERIFIED_ONE_HAND_REFERENCES,
  VERIFIED_ONE_HAND_TURNS
} from "@/lab/experiments/mel-turning/fixtures/verifiedOneHandTurns";

describe("verified one-hand turning fixtures", () => {
  it("normalizes the two phase references and all 24 verified turns", () => {
    expect(VERIFIED_ONE_HAND_REFERENCES).toHaveLength(2);
    expect(VERIFIED_ONE_HAND_TURNS).toHaveLength(24);
    expect(new Set(VERIFIED_ONE_HAND_TURNS.map((fixture) => fixture.trace.id)).size).toBe(24);
  });

  it("keeps every turn as one uninterrupted adjacent half-beat edge", () => {
    for (const fixture of VERIFIED_ONE_HAND_TURNS) {
      const event = fixture.trace.events[0];
      const track = fixture.trace.tracks[0];
      expect(fixture.trace.tracks, fixture.trace.id).toHaveLength(1);
      expect(event, fixture.trace.id).toBeDefined();
      expect(track?.nodes[event?.afterStep ?? -1], fixture.trace.id).toBeDefined();
      expect(track?.nodes[(event?.afterStep ?? -1) + 1], fixture.trace.id).toBeDefined();

      for (let index = 1; index < (track?.nodes.length ?? 0); index += 1) {
        expect(track?.nodes[index]?.phase, fixture.trace.id).not.toBe(
          track?.nodes[index - 1]?.phase
        );
      }
    }
  });

  it("retains explicit behind-body placement for low-back notation", () => {
    const lowBack = VERIFIED_ONE_HAND_TURNS.filter(
      (fixture) => fixture.reelPosition === "low-back"
    );

    expect(lowBack).toHaveLength(8);
    expect(
      lowBack.every((fixture) =>
        fixture.trace.tracks[0]?.nodes.every((node) => node.handPlacement === "behind-body")
      )
    ).toBe(true);
  });

  it("preserves actual world rotation while body-relative flow flips", () => {
    const inward = VERIFIED_ONE_HAND_TURNS.filter(
      (fixture) => fixture.flowBefore === "inwards"
    );
    const outward = VERIFIED_ONE_HAND_TURNS.filter(
      (fixture) => fixture.flowBefore === "outwards"
    );

    expect(inward).toHaveLength(12);
    expect(outward).toHaveLength(12);
    expect(
      inward.every(
        (fixture) => fixture.trace.tracks[0]?.poiDirection === "counterclockwise"
      )
    ).toBe(true);
    expect(
      outward.every((fixture) => fixture.trace.tracks[0]?.poiDirection === "clockwise")
    ).toBe(true);
    expect(
      VERIFIED_ONE_HAND_TURNS.every(
        (fixture) =>
          fixture.flowAfter === (fixture.flowBefore === "inwards" ? "outwards" : "inwards")
      )
    ).toBe(true);
  });
});
