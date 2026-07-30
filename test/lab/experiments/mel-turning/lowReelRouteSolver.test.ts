import { describe, expect, it } from "vitest";

import type { TurningReelConfig } from "@/lab/experiments/mel-turning/adapter/melBeatGraphAdapter";
import { solveLowReelTurningRoutes } from "@/lab/experiments/mel-turning/model/lowReelRouteSolver";

const VERIFIED_WEAVE_SOURCE: TurningReelConfig = {
  left: "low-native",
  right: "low-non-native",
  direction: { mode: "same", direction: "clockwise" },
  offset: 3
};

const VERIFIED_WEAVE_TARGET: TurningReelConfig = {
  left: "low-native",
  right: "low-non-native",
  direction: { mode: "same", direction: "counterclockwise" },
  offset: 1
};

const VERIFIED_TS_PREPARATION_SOURCE: TurningReelConfig = {
  left: "low-native",
  right: "low-native",
  direction: { mode: "same", direction: "clockwise" },
  offset: 1
};

const VERIFIED_TS_PREPARATION_TARGET: TurningReelConfig = {
  left: "low-native",
  right: "low-native",
  direction: { mode: "same", direction: "counterclockwise" },
  offset: 3
};

describe("low-reel preparation/turn/recovery solver", () => {
  it.each(["left", "right"] as const)(
    "retains the verified direct weave routes for a %s turn",
    (turnDirection) => {
      const result = solveLowReelTurningRoutes({
        source: VERIFIED_WEAVE_SOURCE,
        target: VERIFIED_WEAVE_TARGET,
        turnDirection
      });
      const verified = result.routes.filter(
        (route) => route.evidenceStatus === "exact-route-verified"
      );

      expect(result.compatibility.compatible).toBe(true);
      expect(result.shortestBridgeHalfbeats).toBe(1);
      expect(result.shortestRouteCount).toBeGreaterThanOrEqual(2);
      expect(verified).toHaveLength(2);
      expect(
        verified.every(
          (route) =>
            route.preparationHalfbeats === 0 &&
            route.recoveryHalfbeats === 0 &&
            route.edges[0]?.kind === "body-turn"
        )
      ).toBe(true);
    }
  );

  it("finds the verified TS same-anchor preparation without merging latent center anchors", () => {
    const result = solveLowReelTurningRoutes({
      source: VERIFIED_TS_PREPARATION_SOURCE,
      target: VERIFIED_TS_PREPARATION_TARGET,
      turnDirection: "right",
      options: { maxExtraHalfbeats: 2, maxRoutes: 500 }
    });
    const prepared = result.routes.find(
      (route) =>
        route.evidenceStatus === "exact-route-verified" &&
        route.preparationHalfbeats === 1 &&
        route.recoveryHalfbeats === 0
    );

    expect(prepared).toBeDefined();
    expect(prepared?.edges.map((edge) => edge.kind)).toEqual(["circle-extension", "body-turn"]);
    expect(prepared?.edges[0]).toMatchObject({
      leftAction: "circle-extension",
      rightAction: "reel-continuation"
    });
    const source = prepared?.states[0];
    const preparedState = prepared?.states[1];
    expect(source?.left.laneId).toBe("center");
    expect(preparedState?.left.laneId).toBe("center");
    expect(preparedState?.left.planeSide).toBe(source?.left.planeSide);
    expect(preparedState?.left.phase).not.toBe(source?.left.phase);
    expect(preparedState?.left.handPoint).toEqual(source?.left.handPoint);
    expect(preparedState?.right.handPoint).toEqual(source?.right.handPoint);
    expect(preparedState?.left.handPoint.x).not.toBeCloseTo(
      preparedState?.right.handPoint.x ?? Number.NaN
    );
  });

  it("keeps route shape and ordering deterministic", () => {
    const input = {
      source: VERIFIED_TS_PREPARATION_SOURCE,
      target: VERIFIED_TS_PREPARATION_TARGET,
      turnDirection: "right",
      options: { maxExtraHalfbeats: 1, maxRoutes: 80 }
    } as const;
    const first = solveLowReelTurningRoutes(input);
    const second = solveLowReelTurningRoutes(input);

    expect(second).toEqual(first);
    expect(
      first.routes.every(
        (route) =>
          route.edges.filter((edge) => edge.kind === "body-turn").length === 1 &&
          route.bridgeHalfbeats === route.preparationHalfbeats + 1 + route.recoveryHalfbeats
      )
    ).toBe(true);
  });

  it("rejects incompatible endpoints before building a route graph", () => {
    const result = solveLowReelTurningRoutes({
      source: VERIFIED_WEAVE_SOURCE,
      target: {
        ...VERIFIED_WEAVE_TARGET,
        direction: { mode: "same", direction: "clockwise" },
        offset: 0
      },
      turnDirection: "left"
    });

    expect(result.shortestBridgeHalfbeats).toBeNull();
    expect(result.routes).toEqual([]);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "TARGET_DIRECTION_MISMATCH",
      "TARGET_TIMING_MISMATCH"
    ]);
  });

  it("rejects unsafe research enumeration bounds explicitly", () => {
    expect(() =>
      solveLowReelTurningRoutes({
        source: VERIFIED_WEAVE_SOURCE,
        target: VERIFIED_WEAVE_TARGET,
        turnDirection: "left",
        options: { maxExtraHalfbeats: 3 }
      })
    ).toThrow(/maxExtraHalfbeats/);
  });
});
