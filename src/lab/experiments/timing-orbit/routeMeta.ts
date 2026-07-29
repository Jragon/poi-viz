export const TIMING_ORBIT_LAB_ROUTE = {
  path: "/lab/timing-orbit",
  name: "timing-orbit-lab"
} as const;

export const TIMING_ORBIT_LAB_LINK = {
  label: "Timing Orbit",
  to: TIMING_ORBIT_LAB_ROUTE.path
} as const;

export function loadTimingOrbitLabPage() {
  return import("./TimingOrbitLabPage.vue");
}
