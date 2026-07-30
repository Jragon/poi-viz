export const MEL_TURNING_LAB_ROUTE = {
  path: "/lab/mel-turning",
  name: "mel-turning-lab"
} as const;

export const MEL_TURNING_LAB_LINK = {
  label: "Turning Model Explorer",
  to: MEL_TURNING_LAB_ROUTE.path
} as const;

export const MEL_TURNING_REVIEW_ROUTE = {
  path: "/lab/mel-turning/review",
  name: "mel-turning-review"
} as const;

export const MEL_TURNING_REVIEW_LINK = {
  label: "Turning Pattern Verifier",
  to: MEL_TURNING_REVIEW_ROUTE.path
} as const;

export function loadMelTurningLabPage() {
  return import("./MelTurningLabPage.vue");
}

export function loadTurningPatternVerifierPage() {
  return import("./review/TurningPatternVerifierPage.vue");
}
