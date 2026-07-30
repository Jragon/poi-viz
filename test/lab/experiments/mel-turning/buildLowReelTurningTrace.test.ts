import { describe, expect, it } from "vitest";

import {
  buildLowReelEndpointPreviewTrace,
  buildLowReelTurningTrace
} from "@/lab/experiments/mel-turning/model/buildLowReelTurningTrace";
import { searchLowReelDirectTurns } from "@/lab/experiments/mel-turning/model/lowReelDirectTurnSearch";

describe("generated low-reel turning trace", () => {
  it("adds exact source and target cycle context around one shared turn edge", () => {
    const result = searchLowReelDirectTurns({
      source: {
        left: "low-native",
        right: "low-non-native",
        direction: { mode: "same", direction: "clockwise" },
        offset: 3
      },
      target: {
        left: "low-native",
        right: "low-non-native",
        direction: { mode: "same", direction: "counterclockwise" },
        offset: 1
      },
      turnDirection: "left"
    });
    const candidate = result.candidates.find((entry) => entry.topologyStatus === "valid");
    if (!candidate) throw new Error("Expected a valid generated candidate.");

    const trace = buildLowReelTurningTrace(result, candidate);

    expect(candidate.topologyStatus).toBe("valid");
    expect(trace.verificationStatus).toBe("unverified");
    expect(trace.tracks).toHaveLength(2);
    expect(
      trace.tracks.every(
        (track) => track.nodes.map((node) => node.step).join() === "0,1,2,3,4,5,6,7,8,9"
      )
    ).toBe(true);
    expect(trace.events).toEqual([
      expect.objectContaining({
        afterStep: 4,
        direction: "left",
        degrees: 180
      })
    ]);

    for (const track of trace.tracks) {
      expect(track.nodes[0]).toMatchObject({
        laneId: track.nodes[4]?.laneId,
        planeSide: track.nodes[4]?.planeSide,
        phase: track.nodes[4]?.phase,
        handPoint: track.nodes[4]?.handPoint
      });
      expect(track.nodes[5]).toMatchObject({
        laneId: track.nodes[9]?.laneId,
        planeSide: track.nodes[9]?.planeSide,
        phase: track.nodes[9]?.phase,
        handPoint: track.nodes[9]?.handPoint
      });
      expect(track.nodes[4]?.phase).not.toBe(track.nodes[5]?.phase);

      for (const node of track.nodes) {
        expect(Math.abs(node.handPoint?.x ?? 0)).toBeCloseTo(0.5);
        expect(node.handPoint?.y).toBeCloseTo(-0.35);
      }
    }
  });

  it("closes an endpoint preview with one repeated first row", () => {
    const trace = buildLowReelEndpointPreviewTrace({
      left: "low-back",
      right: "low-native",
      direction: { mode: "opposite", flow: "inwards" },
      offset: 2
    });

    expect(trace.events).toEqual([]);
    expect(trace.tracks.every((track) => track.nodes.length === 5)).toBe(true);
    expect(trace.tracks[0]?.nodes[4]).toMatchObject({
      step: 4,
      laneId: trace.tracks[0]?.nodes[0]?.laneId,
      phase: trace.tracks[0]?.nodes[0]?.phase
    });
  });

  it("keeps exact reel direction in generated trace identity", () => {
    const clockwise = buildLowReelEndpointPreviewTrace({
      left: "low-native",
      right: "low-native",
      direction: { mode: "same", direction: "clockwise" },
      offset: 0
    });
    const counterclockwise = buildLowReelEndpointPreviewTrace({
      left: "low-native",
      right: "low-native",
      direction: { mode: "same", direction: "counterclockwise" },
      offset: 0
    });

    expect(clockwise.id).not.toBe(counterclockwise.id);
  });

  it("rejects a row-pair candidate from a different endpoint search", () => {
    const source = {
      left: "low-native",
      right: "low-non-native",
      direction: { mode: "opposite", flow: "inwards" },
      offset: 0
    } as const;
    const first = searchLowReelDirectTurns({
      source,
      target: {
        left: "low-native",
        right: "low-non-native",
        direction: { mode: "opposite", flow: "outwards" },
        offset: 0
      },
      turnDirection: "left"
    });
    const second = searchLowReelDirectTurns({
      source,
      target: {
        left: "low-native",
        right: "low-non-native",
        direction: { mode: "opposite", flow: "outwards" },
        offset: 2
      },
      turnDirection: "left"
    });
    const foreignCandidate = first.candidates[0];
    if (!foreignCandidate) throw new Error("Expected a foreign candidate fixture.");

    expect(() => buildLowReelTurningTrace(second, foreignCandidate)).toThrowError(
      "does not belong to this low-reel search result"
    );
  });
});
