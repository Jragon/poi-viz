import type { PlaneSide } from "@/engine/types";

export type PlaneSideOffset = 1 | -1;

const PLANE_SIDES = new Set<PlaneSide>(["a", "b"]);

export function isPlaneSide(value: unknown): value is PlaneSide {
  return typeof value === "string" && PLANE_SIDES.has(value as PlaneSide);
}

export function getPlaneSideOffset(side: PlaneSide): PlaneSideOffset {
  return side === "a" ? 1 : -1;
}
