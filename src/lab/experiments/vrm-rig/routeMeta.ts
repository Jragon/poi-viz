export const VRM_RIG_ROUTE = {
  path: "/lab/vrm-rig",
  name: "vrm-rig"
} as const;

export const VRM_RIG_LAB_LINK = {
  label: "VRM Rig",
  to: VRM_RIG_ROUTE.path
} as const;

export function loadVrmRigLabPage() {
  return import("./VrmRigLabPage.vue");
}
