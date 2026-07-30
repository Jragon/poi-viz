import { describe, expect, it } from "vitest";

import {
  buildLowReelRouteProjection,
  buildLowReelRouteProjectionSteps
} from "@/lab/experiments/mel-turning/model/lowReelRouteProjection";
import { solveLowReelTurningRoutes } from "@/lab/experiments/mel-turning/model/lowReelRouteSolver";

describe("low-reel solver route projection", () => {
  it("wraps a direct shortest route in one complete source and target cycle", () => {
    const result = solveLowReelTurningRoutes({
      source: {
        left: "low-native",
        right: "low-non-native",
        direction: { mode: "opposite", flow: "inwards" },
        offset: 0
      },
      target: {
        left: "low-native",
        right: "low-non-native",
        direction: { mode: "opposite", flow: "outwards" },
        offset: 0
      },
      turnDirection: "left",
      options: { maxRoutes: 40, includeUnresolved: true }
    });
    const route = result.routes[0];
    if (!route) throw new Error("Expected a direct solver route.");

    const projection = buildLowReelRouteProjection(result, route);

    expect(result.shortestBridgeHalfbeats).toBe(1);
    expect(projection.steps).toHaveLength(10);
    expect(projection.steps.slice(0, 5).every((step) => step.region === "source")).toBe(true);
    expect(projection.steps.slice(-5).every((step) => step.region === "target")).toBe(true);
    expect(projection.steps.map((step) => step.outgoingInterval?.kind ?? null)).toEqual([
      "source-cycle",
      "source-cycle",
      "source-cycle",
      "source-cycle",
      "body-turn",
      "target-cycle",
      "target-cycle",
      "target-cycle",
      "target-cycle",
      null
    ]);
    expect(projection.trace.events).toEqual([
      expect.objectContaining({
        afterStep: 4,
        direction: "left",
        degrees: 180
      })
    ]);
    expect(
      projection.trace.tracks.every(
        (track) =>
          track.nodes.length === projection.steps.length &&
          track.nodes.every((node) => node.handPoint !== undefined)
      )
    ).toBe(true);
  });

  it("places preparation and recovery around the projected body-turn boundary", () => {
    const result = solveLowReelTurningRoutes({
      source: {
        left: "low-native",
        right: "low-native",
        direction: { mode: "same", direction: "clockwise" },
        offset: 0
      },
      target: {
        left: "low-native",
        right: "low-native",
        direction: { mode: "same", direction: "counterclockwise" },
        offset: 0
      },
      turnDirection: "left",
      options: { maxRoutes: 40, includeUnresolved: true }
    });

    expect(result.shortestBridgeHalfbeats).toBe(2);
    expect(result.routes).not.toHaveLength(0);
    for (const route of result.routes) {
      const projection = buildLowReelRouteProjection(result, route);
      const turnStep = projection.steps.find((step) => step.outgoingInterval?.kind === "body-turn");

      expect(projection.steps).toHaveLength(11);
      expect(turnStep?.step).toBe(4 + route.turnEdgeIndex);
      expect(projection.trace.events[0]?.afterStep).toBe(4 + route.turnEdgeIndex);
      expect(
        projection.steps.filter((step) => step.outgoingInterval?.kind === "body-turn")
      ).toHaveLength(1);
      expect(projection.steps.at(-1)?.region).toBe("target");
    }
  });

  it("rejects a route from another solver result", () => {
    const first = solveLowReelTurningRoutes({
      source: {
        left: "low-native",
        right: "low-non-native",
        direction: { mode: "opposite", flow: "inwards" },
        offset: 0
      },
      target: {
        left: "low-native",
        right: "low-non-native",
        direction: { mode: "opposite", flow: "outwards" },
        offset: 0
      },
      turnDirection: "left"
    });
    const second = solveLowReelTurningRoutes({
      source: first.source,
      target: { ...first.target, offset: 2 },
      turnDirection: "left"
    });
    const foreignRoute = first.routes[0];
    if (!foreignRoute) throw new Error("Expected a foreign solver route.");

    expect(() => buildLowReelRouteProjectionSteps(second, foreignRoute)).toThrow(
      "does not belong to this low-reel solver result"
    );
  });
});
