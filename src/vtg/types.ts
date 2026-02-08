/**
 * Discrete VTG element labels used for both arm and poi-head relationships.
 */
export type VTGElement = "Earth" | "Air" | "Water" | "Fire";

/**
 * Discrete VTG phase buckets in degrees.
 */
export type VTGPhaseDeg = 0 | 90 | 180 | 270;

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
 * Resolves timing + direction relation metadata for a VTG element label.
 *
 * @param element VTG element label.
 * @returns Timing and direction relation encoded by the element.
 */
export function getRelationForElement(element: VTGElement): VTGRelation {
  switch (element) {
    case "Earth":
      return { timing: "same-time", direction: "same-direction" };
    case "Air":
      return { timing: "same-time", direction: "opposite-direction" };
    case "Water":
      return { timing: "split-time", direction: "same-direction" };
    case "Fire":
      return { timing: "split-time", direction: "opposite-direction" };
  }
}

/**
 * Converts timing + direction metadata back into a VTG element label.
 *
 * @param relation VTG timing and direction pair.
 * @returns VTG element label matching the relation.
 */
export function getElementForRelation(relation: VTGRelation): VTGElement {
  if (relation.timing === "same-time") {
    return relation.direction === "same-direction" ? "Earth" : "Air";
  }
  return relation.direction === "same-direction" ? "Water" : "Fire";
}
