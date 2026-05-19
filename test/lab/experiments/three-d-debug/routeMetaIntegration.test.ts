import { describe, expect, it, vi } from "vitest";

import {
  THREE_D_DEBUG_LAB_LINK,
  THREE_D_DEBUG_ROUTE,
  loadThreeDDebugPage
} from "@/lab/experiments/three-d-debug/routeMeta";
import { evaluateRouterModule, type RouterOptions } from "../../../helpers/evaluateRouterModule";

describe("Three.js Debug route metadata integration", () => {
  it("keeps the shared route metadata aligned with the router registration", async () => {
    const createRouterSpy = vi.fn((options: RouterOptions) => ({ options }));
    const createWebHistorySpy = vi.fn((base: string) => ({ base }));

    evaluateRouterModule(createRouterSpy, createWebHistorySpy, [
      ["@/lab/experiments/three-d-debug/routeMeta", { THREE_D_DEBUG_ROUTE, loadThreeDDebugPage }]
    ]);
    expect(createRouterSpy).toHaveBeenCalledTimes(1);

    const [routerOptions] = createRouterSpy.mock.calls[0] as [RouterOptions];
    const route = routerOptions.routes.find(
      (candidate) => candidate.name === THREE_D_DEBUG_ROUTE.name
    );

    expect(route).toEqual({
      ...THREE_D_DEBUG_ROUTE,
      component: loadThreeDDebugPage
    });

    expect(THREE_D_DEBUG_LAB_LINK).toEqual({
      label: "Three.js Debug",
      to: THREE_D_DEBUG_ROUTE.path
    });
    expect(THREE_D_DEBUG_LAB_LINK.to).toBe(route?.path);
  });
});
