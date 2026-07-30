import { describe, expect, it } from "vitest";

import { THREE_D_DEBUG_LAB_LINK } from "@/lab/experiments/three-d-debug/routeMeta";
import { VRM_RIG_LAB_LINK } from "@/lab/experiments/vrm-rig/routeMeta";
import {
  MEL_TURNING_LAB_LINK,
  MEL_TURNING_REVIEW_LINK
} from "@/lab/experiments/mel-turning/routeMeta";
import { PENDULUM_LAB_LINK } from "@/lab/experiments/pendulum/routeMeta";
import { TIMING_ORBIT_LAB_LINK } from "@/lab/experiments/timing-orbit/routeMeta";
import { labLinks } from "@/lab/labLinks";

describe("labLinks", () => {
  it("includes the timing orbit lab link", () => {
    expect(labLinks).toContain(TIMING_ORBIT_LAB_LINK);
  });

  it("includes the pendulum lab link", () => {
    expect(labLinks).toContain(PENDULUM_LAB_LINK);
  });

  it("includes the Mel turning lab link", () => {
    expect(labLinks).toContain(MEL_TURNING_LAB_LINK);
  });

  it("includes the turning pattern verifier", () => {
    expect(labLinks).toContain(MEL_TURNING_REVIEW_LINK);
  });

  it("includes the shared Three.js Debug lab link", () => {
    expect(labLinks).toContain(THREE_D_DEBUG_LAB_LINK);
  });

  it("includes the shared VRM rig lab link", () => {
    expect(labLinks).toContain(VRM_RIG_LAB_LINK);
  });

  it("links the stall graph layout playground", () => {
    expect(labLinks).toContainEqual({
      label: "Stall Graph Layouts",
      to: "/lab/qt-stall-graph/layout"
    });
  });

  it("links the quarter timing direction journal", () => {
    expect(labLinks).toContainEqual({
      label: "Timing / Direction",
      to: "/lab/quarter-timing-direction"
    });
  });
});
