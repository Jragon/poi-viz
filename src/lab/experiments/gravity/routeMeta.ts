export const GRAVITY_LAB_ROUTE = {
  path: "/lab/gravity",
  name: "gravity-lab"
} as const;

export const GRAVITY_LAB_LINK = {
  label: "Gravity",
  to: GRAVITY_LAB_ROUTE.path
} as const;

export function loadGravityLabPage() {
  return import("./GravityLabPage.vue");
}
