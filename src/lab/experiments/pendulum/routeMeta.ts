export const PENDULUM_LAB_ROUTE = {
  path: "/lab/pendulum",
  name: "pendulum-lab"
} as const;

export const PENDULUM_LAB_LINK = {
  label: "Pendulum",
  to: PENDULUM_LAB_ROUTE.path
} as const;

export function loadPendulumLabPage() {
  return import("./PendulumLabPage.vue");
}
