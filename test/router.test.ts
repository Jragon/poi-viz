import { beforeEach, describe, expect, it, vi } from "vitest";

import { evaluateRouterModule, type RouterOptions } from "./helpers/evaluateRouterModule";
const lazyThreeDDebugPageModule = { default: { name: "Three3DDebugPage" } };
const threeDDebugRouteMetaModule = {
  THREE_D_DEBUG_ROUTE: {
    path: "/lab/three-d-debug",
    name: "three-d-debug"
  },
  loadThreeDDebugPage: () => Promise.resolve(lazyThreeDDebugPageModule)
};
const lazyVrmRigPageModule = { default: { name: "VrmRigLabPage" } };
const vrmRigRouteMetaModule = {
  VRM_RIG_ROUTE: {
    path: "/lab/vrm-rig",
    name: "vrm-rig"
  },
  loadVrmRigLabPage: () => Promise.resolve(lazyVrmRigPageModule)
};

describe("router", () => {
  let createRouterSpy: ReturnType<typeof vi.fn>;
  let createWebHistorySpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createRouterSpy = vi.fn((options: RouterOptions) => ({ options }));
    createWebHistorySpy = vi.fn((base: string) => ({ base }));
  });

  it("registers the three-d-debug route as a lazy-loaded page", async () => {
    const routerExports = evaluateRouterModule(createRouterSpy, createWebHistorySpy, [
      ["@/lab/experiments/three-d-debug/routeMeta", threeDDebugRouteMetaModule],
      ["@/lab/experiments/three-d-debug/Three3DDebugPage.vue", lazyThreeDDebugPageModule],
      ["@/lab/experiments/vrm-rig/routeMeta", vrmRigRouteMetaModule]
    ]);

    expect(routerExports).toHaveProperty("router");
    expect(createRouterSpy).toHaveBeenCalledTimes(1);

    const [routerOptions] = createRouterSpy.mock.calls[0] as [RouterOptions];
    const route = routerOptions.routes.find((candidate) => candidate.path === "/lab/three-d-debug");

    expect(route).toMatchObject({
      path: "/lab/three-d-debug",
      name: "three-d-debug"
    });
    expect(route?.component).toEqual(expect.any(Function));

    const loadedModule = await (route?.component as () => Promise<unknown>)();
    expect(loadedModule).toBe(lazyThreeDDebugPageModule);
  });
});
