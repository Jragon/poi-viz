import { THREE_D_DEBUG_LAB_LINK } from "@/lab/experiments/three-d-debug/routeMeta";
import { VRM_RIG_LAB_LINK } from "@/lab/experiments/vrm-rig/routeMeta";
import { GRAVITY_LAB_LINK } from "@/lab/experiments/gravity/routeMeta";
import { MEL_TURNING_LAB_LINK } from "@/lab/experiments/mel-turning/routeMeta";
import { PENDULUM_LAB_LINK } from "@/lab/experiments/pendulum/routeMeta";

export const labLinks = [
  PENDULUM_LAB_LINK,
  GRAVITY_LAB_LINK,
  {
    label: "Quarter Time",
    to: "/lab/quarter-time-3d"
  },
  {
    label: "Stall Graph",
    to: "/lab/qt-stall-graph"
  },
  {
    label: "Timing / Direction",
    to: "/lab/quarter-timing-direction"
  },
  {
    label: "Stall Graph Layouts",
    to: "/lab/qt-stall-graph/layout"
  },
  {
    label: "Archer Weaves",
    to: "/lab/archer-weaves"
  },
  {
    label: "Body Tracing",
    to: "/lab/body-tracing"
  },
  {
    label: "Body Tracing Planes",
    to: "/lab/body-tracing/planes"
  },
  {
    label: "Body Tracing Explorer",
    to: "/lab/body-tracing-explorer"
  },
  {
    label: "Beat Graph Editor",
    to: "/lab/beat-graph"
  },
  MEL_TURNING_LAB_LINK,
  THREE_D_DEBUG_LAB_LINK,
  VRM_RIG_LAB_LINK
] as const;
