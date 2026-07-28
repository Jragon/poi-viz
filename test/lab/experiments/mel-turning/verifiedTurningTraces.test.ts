import { describe, expect, it } from "vitest";

import {
  VERIFIED_TURNING_TRACES,
  getVerifiedTurningTrace
} from "@/lab/experiments/mel-turning/fixtures/verifiedTurningTraces";

describe("verified Mel turning traces", () => {
  it("contains all 28 physically verified two-hand reel turns", () => {
    expect(VERIFIED_TURNING_TRACES).toHaveLength(28);
    expect(new Set(VERIFIED_TURNING_TRACES.map((trace) => trace.id)).size).toBe(28);
  });

  it("keeps the five Mel lanes in body-relative column order", () => {
    expect(VERIFIED_TURNING_TRACES[0]?.lanes.map((lane) => lane.id)).toEqual([
      "left-high",
      "left-low",
      "center",
      "right-low",
      "right-high"
    ]);
  });

  it("preserves uninterrupted half-beat phase timing through each body turn", () => {
    for (const trace of VERIFIED_TURNING_TRACES) {
      for (const track of trace.tracks) {
        expect(track.nodes.length).toBeGreaterThan(trace.events[0]?.afterStep ?? 0);

        for (let index = 1; index < track.nodes.length; index += 1) {
          const previous = track.nodes[index - 1];
          const current = track.nodes[index];
          expect(current?.step).toBe((previous?.step ?? -1) + 1);
          expect(current?.phase).not.toBe(previous?.phase);
        }
      }
    }
  });

  it("represents the 180 degree step once as an event shared by both tracks", () => {
    for (const trace of VERIFIED_TURNING_TRACES) {
      expect(trace.events).toHaveLength(1);
      expect(trace.events[0]).toMatchObject({
        kind: "body-turn",
        degrees: 180,
        fromFacing: 0,
        toFacing: 180
      });
      expect(trace.tracks.map((track) => track.hand)).toEqual(["left", "right"]);
    }
  });

  it("keeps the verified SO crossing on its actual t5 → t6 edge", () => {
    const trace = getVerifiedTurningTrace("so-left-chasing-2-to-2");

    expect(trace.events[0]?.afterStep).toBe(5);
    expect(trace.tracks.map((track) => track.nodes.length)).toEqual([11, 11]);
    expect(
      trace.tracks.map((track) => [track.nodes[5]?.planeSide, track.nodes[6]?.planeSide])
    ).toEqual([
      ["a", "b"],
      ["a", "b"]
    ]);
  });

  it("retains the verified open A/B bridge for split-same turn right", () => {
    const trace = getVerifiedTurningTrace("ss-right-counter-to-counter");
    const leftAtTurn = trace.tracks[0]?.nodes.find((node) => node.step === 7);
    const rightAtTurn = trace.tracks[1]?.nodes.find((node) => node.step === 7);

    expect(leftAtTurn).toMatchObject({
      laneId: "center",
      planeSide: "a",
      phase: "up"
    });
    expect(rightAtTurn).toMatchObject({
      laneId: "right-low",
      planeSide: "b",
      phase: "down"
    });
  });

  it("rejects unknown fixture ids", () => {
    expect(() => getVerifiedTurningTrace("not-a-trace")).toThrow("Unknown verified turning trace");
  });
});
