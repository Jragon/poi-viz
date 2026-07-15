import { describe, expect, it, vi } from "vitest";

import {
  THREE_D_DEBUG_ROUTE,
  loadThreeDDebugPage
} from "@/lab/experiments/three-d-debug/routeMeta";
import {
  VRM_RIG_LAB_LINK,
  VRM_RIG_ROUTE,
  loadVrmRigLabPage
} from "@/lab/experiments/vrm-rig/routeMeta";
import { evaluateRouterModule, type RouterOptions } from "../../../helpers/evaluateRouterModule";

describe("VRM rig route metadata integration", () => {
  it("keeps the lab link aligned with the lazy router registration", () => {
    const createRouterSpy = vi.fn((options: RouterOptions) => ({ options }));
    const createWebHistorySpy = vi.fn((base: string) => ({ base }));

    evaluateRouterModule(createRouterSpy, createWebHistorySpy, [
      ["@/lab/experiments/three-d-debug/routeMeta", { THREE_D_DEBUG_ROUTE, loadThreeDDebugPage }],
      ["@/lab/experiments/vrm-rig/routeMeta", { VRM_RIG_ROUTE, loadVrmRigLabPage }]
    ]);

    const [routerOptions] = createRouterSpy.mock.calls[0] as [RouterOptions];
    const route = routerOptions.routes.find((candidate) => candidate.name === VRM_RIG_ROUTE.name);

    expect(route).toEqual({
      ...VRM_RIG_ROUTE,
      component: loadVrmRigLabPage
    });
    expect(VRM_RIG_LAB_LINK).toEqual({
      label: "VRM Rig",
      to: VRM_RIG_ROUTE.path
    });
  });
});
