import { createDefaultState } from "@/state/defaults";
import type { AppState } from "@/types/state";
import {
  classifyArmElement,
  classifyPoiElement,
  classifyVTG,
  describeArmGeometryAtCardinals,
  describeElementGeometryAtCardinals,
  describePoiGeometryAtCardinals,
  type CardinalGeometryDescription
} from "@/vtg/classify";
import { generateVTGState } from "@/vtg/generate";
import { VTG_ELEMENTS, type VTGDescriptor, type VTGElement } from "@/vtg/types";
import { describe, expect, it } from "vitest";

const ROTATION_RADIANS = [Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
const TEST_POI_CYCLES = [-3, 3];

/**
 * Rotates the full pattern in world coordinates by offsetting both arm phases equally.
 * This shifts absolute orientation while preserving all timing/direction relations.
 */
function rotateStateGlobally(state: AppState, deltaRadians: number): AppState {
  return {
    global: { ...state.global },
    hands: {
      L: {
        ...state.hands.L,
        armPhase: state.hands.L.armPhase + deltaRadians
      },
      R: {
        ...state.hands.R,
        armPhase: state.hands.R.armPhase + deltaRadians
      }
    }
  };
}

/**
 * Converts one of the test rotation offsets into a cardinal phase step in degrees.
 */
function rotationStepDegrees(deltaRadians: number): 90 | 180 | 270 {
  if (Math.abs(deltaRadians - Math.PI / 2) <= Number.EPSILON) {
    return 90;
  }
  if (Math.abs(deltaRadians - Math.PI) <= Number.EPSILON) {
    return 180;
  }
  return 270;
}

/**
 * Wraps phase degrees into VTG cardinal buckets.
 */
function wrapPhaseDeg(phaseDeg: 0 | 90 | 180 | 270, deltaDeg: 90 | 180 | 270): 0 | 90 | 180 | 270 {
  const normalized = (phaseDeg + deltaDeg) % 360;
  if (normalized === 0 || normalized === 90 || normalized === 180 || normalized === 270) {
    return normalized;
  }
  throw new Error("Unexpected phase bucket.");
}

const EXPECTED_CARDINAL_GEOMETRY: Record<VTGElement, CardinalGeometryDescription> = {
  Earth: { right: "together", up: "together", left: "together", down: "together" },
  Air: { right: "apart", up: "together", left: "apart", down: "together" },
  Water: { right: "apart", up: "apart", left: "apart", down: "apart" },
  Fire: { right: "together", up: "apart", left: "together", down: "apart" }
};

describe("VTG classification", () => {
  it("keeps arm/poi element classification invariant under global rotation", () => {
    const baseState = createDefaultState();

    for (const poiCyclesPerArmCycle of TEST_POI_CYCLES) {
      for (const armElement of VTG_ELEMENTS) {
        for (const poiElement of VTG_ELEMENTS) {
          const descriptor: VTGDescriptor = {
            armElement,
            poiElement,
            phaseDeg: 0,
            poiCyclesPerArmCycle
          };
          const generated = generateVTGState(descriptor, baseState);
          const initial = classifyVTG(generated);

          for (const deltaRadians of ROTATION_RADIANS) {
            const rotated = rotateStateGlobally(generated, deltaRadians);
            const rotatedClassified = classifyVTG(rotated);
            expect(classifyArmElement(rotated)).toBe(initial.armElement);
            expect(classifyPoiElement(rotated)).toBe(initial.poiElement);
            expect(rotatedClassified.armElement).toBe(initial.armElement);
            expect(rotatedClassified.poiElement).toBe(initial.poiElement);

            const expectedPhaseDeg = wrapPhaseDeg(initial.phaseDeg, rotationStepDegrees(deltaRadians));
            expect(rotatedClassified.phaseDeg).toBe(expectedPhaseDeg);
          }
        }
      }
    }
  });

  it("matches the canonical together/apart cardinal descriptions for each element", () => {
    const baseState = createDefaultState();

    for (const element of VTG_ELEMENTS) {
      expect(describeElementGeometryAtCardinals(element)).toEqual(EXPECTED_CARDINAL_GEOMETRY[element]);

      const armState = generateVTGState(
        {
          armElement: element,
          poiElement: "Earth",
          phaseDeg: 0,
          poiCyclesPerArmCycle: -3
        },
        baseState
      );
      expect(describeArmGeometryAtCardinals(armState)).toEqual(EXPECTED_CARDINAL_GEOMETRY[element]);

      const poiState = generateVTGState(
        {
          armElement: "Earth",
          poiElement: element,
          phaseDeg: 0,
          poiCyclesPerArmCycle: -3
        },
        baseState
      );
      expect(describePoiGeometryAtCardinals(poiState)).toEqual(EXPECTED_CARDINAL_GEOMETRY[element]);
    }
  });
});
