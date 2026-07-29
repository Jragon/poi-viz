import { describe, expect, it, vi } from "vitest";

import {
  TIMING_ORBIT_LAB_LINK,
  TIMING_ORBIT_LAB_ROUTE,
  loadTimingOrbitLabPage
} from "@/lab/experiments/timing-orbit/routeMeta";
import {
  THREE_D_DEBUG_ROUTE,
  loadThreeDDebugPage
} from "@/lab/experiments/three-d-debug/routeMeta";
import { VRM_RIG_ROUTE, loadVrmRigLabPage } from "@/lab/experiments/vrm-rig/routeMeta";
import { evaluateRouterModule, type RouterOptions } from "../helpers/evaluateRouterModule";

describe("timing orbit route metadata integration", () => {
  it("keeps the lab link aligned with the lazy router registration", () => {
    const createRouterSpy = vi.fn((options: RouterOptions) => ({ options }));
    const createWebHistorySpy = vi.fn((base: string) => ({ base }));

    evaluateRouterModule(createRouterSpy, createWebHistorySpy, [
      [
        "@/lab/experiments/timing-orbit/routeMeta",
        { TIMING_ORBIT_LAB_ROUTE, loadTimingOrbitLabPage }
      ],
      ["@/lab/experiments/three-d-debug/routeMeta", { THREE_D_DEBUG_ROUTE, loadThreeDDebugPage }],
      ["@/lab/experiments/vrm-rig/routeMeta", { VRM_RIG_ROUTE, loadVrmRigLabPage }]
    ]);

    const [routerOptions] = createRouterSpy.mock.calls[0] as [RouterOptions];
    const route = routerOptions.routes.find(
      (candidate) => candidate.name === TIMING_ORBIT_LAB_ROUTE.name
    );

    expect(route).toEqual({
      ...TIMING_ORBIT_LAB_ROUTE,
      component: loadTimingOrbitLabPage
    });
    expect(TIMING_ORBIT_LAB_LINK).toEqual({
      label: "Timing Orbit",
      to: TIMING_ORBIT_LAB_ROUTE.path
    });
  });
});
