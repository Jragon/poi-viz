import { describe, expect, it, vi } from "vitest";

import {
  PENDULUM_LAB_LINK,
  PENDULUM_LAB_ROUTE,
  loadPendulumLabPage
} from "@/lab/experiments/pendulum/routeMeta";
import {
  THREE_D_DEBUG_ROUTE,
  loadThreeDDebugPage
} from "@/lab/experiments/three-d-debug/routeMeta";
import { VRM_RIG_ROUTE, loadVrmRigLabPage } from "@/lab/experiments/vrm-rig/routeMeta";
import { evaluateRouterModule, type RouterOptions } from "../helpers/evaluateRouterModule";

describe("pendulum route metadata integration", () => {
  it("keeps the lab link aligned with the lazy router registration", () => {
    const createRouterSpy = vi.fn((options: RouterOptions) => ({ options }));
    const createWebHistorySpy = vi.fn((base: string) => ({ base }));

    evaluateRouterModule(createRouterSpy, createWebHistorySpy, [
      ["@/lab/experiments/pendulum/routeMeta", { PENDULUM_LAB_ROUTE, loadPendulumLabPage }],
      ["@/lab/experiments/three-d-debug/routeMeta", { THREE_D_DEBUG_ROUTE, loadThreeDDebugPage }],
      ["@/lab/experiments/vrm-rig/routeMeta", { VRM_RIG_ROUTE, loadVrmRigLabPage }]
    ]);

    const [routerOptions] = createRouterSpy.mock.calls[0] as [RouterOptions];
    const route = routerOptions.routes.find(
      (candidate) => candidate.name === PENDULUM_LAB_ROUTE.name
    );

    expect(route).toEqual({
      ...PENDULUM_LAB_ROUTE,
      component: loadPendulumLabPage
    });
    expect(PENDULUM_LAB_LINK).toEqual({
      label: "Pendulum",
      to: PENDULUM_LAB_ROUTE.path
    });
  });
});
