import { describe, expect, it } from "vitest";

import {
  VERIFIED_TURNING_TRACES,
  getVerifiedTurningTrace
} from "@/lab/experiments/mel-turning/fixtures/verifiedTurningTraces";
import {
  analyzeTurningTraceTurn,
  derivePoiMidpointHorizontalDirection
} from "@/lab/experiments/mel-turning/model/turnEdgeAnalysis";
import type { TurningTrace } from "@/lab/experiments/mel-turning/model/turningTypes";

describe("turn-edge analysis", () => {
  it("derives midpoint horizontal direction from phase and poi direction", () => {
    expect(derivePoiMidpointHorizontalDirection("up", "clockwise")).toBe("right");
    expect(derivePoiMidpointHorizontalDirection("down", "clockwise")).toBe("left");
    expect(derivePoiMidpointHorizontalDirection("up", "counterclockwise")).toBe("left");
    expect(derivePoiMidpointHorizontalDirection("down", "counterclockwise")).toBe("right");
  });

  it("accepts every physically verified fixture as a synchronized shared edge", () => {
    for (const trace of VERIFIED_TURNING_TRACES) {
      const result = analyzeTurningTraceTurn(trace);

      expect(result.contractStatus, trace.id).toBe("valid");
      expect(result.physicalStatus, trace.id).toBe("verified");
      expect(result.diagnostics, trace.id).toEqual([]);
      expect(result.edge?.hands.left.from.step).toBe(result.edge?.sourceStep);
      expect(result.edge?.hands.right.from.step).toBe(result.edge?.sourceStep);
      expect(result.edge?.hands.left.to.step).toBe(result.edge?.targetStep);
      expect(result.edge?.hands.right.to.step).toBe(result.edge?.targetStep);
    }
  });

  it("classifies the verified hold/cross mechanisms without claiming gate legality", () => {
    const togetherSame = analyzeTurningTraceTurn(getVerifiedTurningTrace("ts-left-chasing-1-to-2"));
    expect(togetherSame.edge).toMatchObject({
      sourceStep: 7,
      targetStep: 8,
      crossingCount: 1,
      hands: {
        left: {
          midpointPoiDirection: "left",
          sideMotion: { kind: "hold", side: "b" }
        },
        right: {
          midpointPoiDirection: "left",
          sideMotion: {
            kind: "cross",
            fromSide: "a",
            toSide: "b",
            turnSide: "left"
          }
        }
      }
    });

    const splitOpposite = analyzeTurningTraceTurn(
      getVerifiedTurningTrace("so-left-chasing-2-to-2")
    );
    expect(splitOpposite.edge).toMatchObject({
      sourceStep: 5,
      targetStep: 6,
      crossingCount: 2,
      hands: {
        left: { sideMotion: { kind: "cross", fromSide: "a", toSide: "b" } },
        right: { sideMotion: { kind: "cross", fromSide: "a", toSide: "b" } }
      }
    });
  });

  it("rejects a missing hand track", () => {
    const trace = getVerifiedTurningTrace("ts-left-chasing-1-to-2");
    const invalid: TurningTrace = {
      ...trace,
      tracks: trace.tracks.filter((track) => track.hand === "left")
    };

    expect(analyzeTurningTraceTurn(invalid)).toMatchObject({
      contractStatus: "invalid",
      physicalStatus: "not-assessed",
      edge: null,
      diagnostics: [{ code: "TURN_HAND_TRACK_MISSING", hand: "right" }]
    });
  });

  it("rejects a phase reset across the half-beat turn", () => {
    const trace = getVerifiedTurningTrace("ts-left-chasing-1-to-2");
    const event = trace.events[0];
    const left = trace.tracks.find((track) => track.hand === "left");
    if (!event || !left) throw new Error("Fixture invariant failed");

    const source = left.nodes.find((node) => node.step === event.afterStep);
    const invalid: TurningTrace = {
      ...trace,
      tracks: trace.tracks.map((track) =>
        track.hand === "left"
          ? {
              ...track,
              nodes: track.nodes.map((node) =>
                node.step === event.afterStep + 1 && source
                  ? { ...node, phase: source.phase }
                  : node
              )
            }
          : track
      )
    };

    const result = analyzeTurningTraceTurn(invalid);
    expect(result.contractStatus).toBe("invalid");
    expect(result.edge).toBeNull();
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "TURN_PHASE_DISCONTINUITY",
        hand: "left"
      })
    );
  });

  it("keeps an unverified but structurally valid edge explicitly unresolved", () => {
    const trace = getVerifiedTurningTrace("ss-right-counter-to-counter");
    const unverified: TurningTrace = {
      ...trace,
      verificationStatus: "unverified"
    };

    expect(analyzeTurningTraceTurn(unverified)).toMatchObject({
      contractStatus: "valid",
      physicalStatus: "unresolved",
      diagnostics: []
    });
  });
});
