export const MEL_TURNING_LAB_ROUTE = {
  path: "/lab/mel-turning",
  name: "mel-turning-lab"
} as const;

export const MEL_TURNING_LAB_LINK = {
  label: "Mel Turning",
  to: MEL_TURNING_LAB_ROUTE.path
} as const;

export function loadMelTurningLabPage() {
  return import("./MelTurningLabPage.vue");
}
