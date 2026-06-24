import { THREE_D_DEBUG_LAB_LINK } from "@/lab/experiments/three-d-debug/routeMeta";

export const labLinks = [
  {
    label: "Quarter Time",
    to: "/lab/quarter-time-3d"
  },
  {
    label: "Stall Graph",
    to: "/lab/qt-stall-graph"
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
  THREE_D_DEBUG_LAB_LINK
] as const;
