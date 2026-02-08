import { TWO_PI } from "@/state/constants";
import type { QuarterTurnPhaseDeg } from "@/types/state";

/**
 * Discrete VTG element labels used for both arm and poi-head relationships.
 */
export type VTGElement = "Earth" | "Air" | "Water" | "Fire";

/**
 * Discrete VTG phase buckets in degrees.
 */
export type VTGPhaseDeg = QuarterTurnPhaseDeg;

/**
 * Canonical right-arm angular speed used by VTG generator contracts (`1 arm cycle / beat`).
 */
export const VTG_CANONICAL_ARM_SPEED_RADIANS_PER_BEAT = TWO_PI;

/**
 * VTG descriptor used to generate one canonical state.
 * This type is intentionally standalone so it can back sequencer steps later.
 */
export interface VTGDescriptor {
  armElement: VTGElement;
  poiElement: VTGElement;
  phaseDeg: VTGPhaseDeg;
  poiCyclesPerArmCycle: number;
}

/**
 * Timing relationship buckets used by VTG element mappings.
 */
export type VTGTiming = "same-time" | "split-time";

/**
 * Direction relationship buckets used by VTG element mappings.
 */
export type VTGDirection = "same-direction" | "opposite-direction";

/**
 * Pair of timing + direction relations implied by one VTG element.
 */
export interface VTGRelation {
  timing: VTGTiming;
  direction: VTGDirection;
}

/**
 * Canonical VTG element iteration order for row/column rendering.
 */
export const VTG_ELEMENTS: VTGElement[] = ["Earth", "Air", "Water", "Fire"];

/**
 * Canonical VTG phase bucket iteration order for selector chips.
 */
export const VTG_PHASE_BUCKETS: VTGPhaseDeg[] = [0, 90, 180, 270];

/**
 * Converts signed poi cycles-per-arm-cycle into world-frame head angular speed.
 *
 * Contract:
 * - `+N` means `N` head cycles per canonical arm cycle.
 * - `-N` means reversed-direction head motion with `N` cycles per canonical arm cycle.
 *
 * @param poiCyclesPerArmCycle Signed head cycles per canonical arm cycle.
 * @returns Head angular speed in radians per beat.
 */
export function poiCyclesPerArmCycleToHeadSpeedRadiansPerBeat(poiCyclesPerArmCycle: number): number {
  return poiCyclesPerArmCycle * VTG_CANONICAL_ARM_SPEED_RADIANS_PER_BEAT;
}

/**
 * Converts world-frame head angular speed into signed poi cycles-per-arm-cycle.
 *
 * @param headSpeedRadiansPerBeat Head angular speed in radians per beat.
 * @returns Signed head cycles per canonical arm cycle.
 */
export function headSpeedRadiansPerBeatToPoiCyclesPerArmCycle(headSpeedRadiansPerBeat: number): number {
  return headSpeedRadiansPerBeat / VTG_CANONICAL_ARM_SPEED_RADIANS_PER_BEAT;
}

/**
 * Authoritative VTG relation mapping table.
 * This is the single source of truth for element timing/direction semantics.
 */
export const VTG_ELEMENT_RELATIONS: Readonly<Record<VTGElement, VTGRelation>> = {
  Earth: { timing: "same-time", direction: "same-direction" },
  Air: { timing: "same-time", direction: "opposite-direction" },
  Water: { timing: "split-time", direction: "same-direction" },
  Fire: { timing: "split-time", direction: "opposite-direction" }
};

/**
 * Resolves timing + direction relation metadata for a VTG element label.
 *
 * @param element VTG element label.
 * @returns Timing and direction relation encoded by the element.
 */
export function getRelationForElement(element: VTGElement): VTGRelation {
  return VTG_ELEMENT_RELATIONS[element];
}

/**
 * Converts timing + direction metadata back into a VTG element label.
 *
 * @param relation VTG timing and direction pair.
 * @returns VTG element label matching the relation.
 */
export function getElementForRelation(relation: VTGRelation): VTGElement {
  for (const element of VTG_ELEMENTS) {
    const candidate = VTG_ELEMENT_RELATIONS[element];
    if (candidate.timing === relation.timing && candidate.direction === relation.direction) {
      return element;
    }
  }
  throw new Error("No VTG element matches the provided relation.");
}
