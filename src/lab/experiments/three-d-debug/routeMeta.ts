export const THREE_D_DEBUG_ROUTE = {
  path: "/lab/three-d-debug",
  name: "three-d-debug"
} as const;

export const THREE_D_DEBUG_LAB_LINK = {
  label: "Three.js Debug",
  to: THREE_D_DEBUG_ROUTE.path
} as const;

export function loadThreeDDebugPage() {
  return import("./Three3DDebugPage.vue");
}
