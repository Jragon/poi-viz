import { describe, expect, it, vi } from "vitest";

import {
  MEL_TURNING_LAB_LINK,
  MEL_TURNING_LAB_ROUTE,
  MEL_TURNING_REVIEW_LINK,
  MEL_TURNING_REVIEW_ROUTE,
  loadMelTurningLabPage,
  loadTurningPatternVerifierPage
} from "@/lab/experiments/mel-turning/routeMeta";
import { evaluateRouterModule, type RouterOptions } from "../../../helpers/evaluateRouterModule";

const THREE_D_DEBUG_STUB = {
  THREE_D_DEBUG_ROUTE: { path: "/lab/three-d-debug", name: "three-d-debug" },
  loadThreeDDebugPage: () => Promise.resolve({ default: { name: "Three3DDebugPage" } })
};
const VRM_RIG_STUB = {
  VRM_RIG_ROUTE: { path: "/lab/vrm-rig", name: "vrm-rig" },
  loadVrmRigLabPage: () => Promise.resolve({ default: { name: "VrmRigLabPage" } })
};

describe("Mel turning route metadata integration", () => {
  it("keeps the shared route metadata aligned with the router registration", () => {
    const createRouterSpy = vi.fn((options: RouterOptions) => ({ options }));
    const createWebHistorySpy = vi.fn((base: string) => ({ base }));

    evaluateRouterModule(createRouterSpy, createWebHistorySpy, [
      [
        "@/lab/experiments/mel-turning/routeMeta",
        {
          MEL_TURNING_LAB_ROUTE,
          MEL_TURNING_REVIEW_ROUTE,
          loadMelTurningLabPage,
          loadTurningPatternVerifierPage
        }
      ],
      ["@/lab/experiments/three-d-debug/routeMeta", THREE_D_DEBUG_STUB],
      ["@/lab/experiments/vrm-rig/routeMeta", VRM_RIG_STUB]
    ]);

    const [routerOptions] = createRouterSpy.mock.calls[0] as [RouterOptions];
    const route = routerOptions.routes.find(
      (candidate) => candidate.name === MEL_TURNING_LAB_ROUTE.name
    );

    expect(route).toEqual({
      ...MEL_TURNING_LAB_ROUTE,
      component: loadMelTurningLabPage
    });
    expect(MEL_TURNING_LAB_LINK).toEqual({
      label: "Turning Model Explorer",
      to: MEL_TURNING_LAB_ROUTE.path
    });

    const reviewRoute = routerOptions.routes.find(
      (candidate) => candidate.name === MEL_TURNING_REVIEW_ROUTE.name
    );
    expect(reviewRoute).toEqual({
      ...MEL_TURNING_REVIEW_ROUTE,
      component: loadTurningPatternVerifierPage
    });
    expect(MEL_TURNING_REVIEW_LINK).toEqual({
      label: "Turning Pattern Verifier",
      to: MEL_TURNING_REVIEW_ROUTE.path
    });
  });
});
