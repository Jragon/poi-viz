import type { PlaneId } from "@/engine/types";

export const LAB_PLANE_ORDER: readonly PlaneId[] = ["wall", "wheel", "floor"];

export const LAB_PLANE_LABELS: Record<PlaneId, string> = {
  wall: "Wall",
  wheel: "Wheel",
  floor: "Floor"
};

export const LAB_PLANE_COLORS: Record<PlaneId, string> = {
  wall: "#60a5fa",
  wheel: "#f472b6",
  floor: "#34d399"
};
