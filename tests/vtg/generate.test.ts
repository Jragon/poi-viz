import { vectorMagnitude } from "@/engine/math";
import { getPositions } from "@/engine/positions";
import { createDefaultState } from "@/state/defaults";
import type { HandId } from "@/types/state";
import { classifyPhaseBucket, classifyVTG } from "@/vtg/classify";
import { generateVTGState } from "@/vtg/generate";
import { VTG_ELEMENTS, VTG_PHASE_BUCKETS, type VTGDescriptor, type VTGElement } from "@/vtg/types";
import { describe, expect, it } from "vitest";
import { DEFAULT_SAMPLE_BEATS, MATH_TOLERANCE, expectWithinTolerance } from "../engine/helpers";

const HAND_IDS: HandId[] = ["L", "R"];
const VTG_TEST_HEAD_CYCLES = [-3, -1, 1, 3];

const WITHIN_TOLERANCE_DEGREES = 4.9;
const OUTSIDE_TOLERANCE_DEGREES = 5.1;
const RADIANS_PER_DEGREE = Math.PI / 180;
const DEGREES_PER_TURN = 360;

function normalizeDegrees(value: number): number {
  const normalized = value % DEGREES_PER_TURN;
  return normalized < 0 ? normalized + DEGREES_PER_TURN : normalized;
}

/**
 * Clones state while offsetting right relative poi phase for bucket tolerance tests.
 */
function withRightPoiPhaseOffset(state: ReturnType<typeof createDefaultState>, phaseOffsetRadians: number) {
  return {
    global: { ...state.global },
    hands: {
      L: { ...state.hands.L },
      R: {
        ...state.hands.R,
        poiPhase: state.hands.R.poiPhase + phaseOffsetRadians
      }
    }
  };
}

/**
 * Runs radius/tether invariants on a generated VTG state across deterministic sample beats.
 */
function assertGeneratedStateInvariants(state: ReturnType<typeof createDefaultState>): void {
  for (const tBeats of DEFAULT_SAMPLE_BEATS) {
    const positions = getPositions(
      {
        bpm: state.global.bpm,
        hands: state.hands
      },
      tBeats
    );

    for (const handId of HAND_IDS) {
      const handMagnitude = vectorMagnitude(positions[handId].hand);
      const tetherMagnitude = vectorMagnitude(positions[handId].tether);
      expectWithinTolerance(handMagnitude, state.hands[handId].armRadius, MATH_TOLERANCE, `${handId} hand radius at t=${tBeats}`);
      expectWithinTolerance(
        tetherMagnitude,
        state.hands[handId].poiRadius,
        MATH_TOLERANCE,
        `${handId} tether radius at t=${tBeats}`
      );
    }
  }
}

describe("VTG generator", () => {
  it("anchors hand phases to canonical phase-zero baseline", () => {
    const baseState = createDefaultState();
    const expectedLeftArmByElement: Record<VTGElement, 0 | 180> = {
      Earth: 0,
      Air: 0,
      Water: 180,
      Fire: 180
    };

    for (const armElement of VTG_ELEMENTS) {
      const generated = generateVTGState(
        {
          armElement,
          poiElement: "Earth",
          phaseDeg: 0,
          poiCyclesPerArmCycle: 3
        },
        baseState
      );

      const rightArmPhaseDeg = normalizeDegrees((generated.hands.R.armPhase / Math.PI) * 180);
      const leftArmPhaseDeg = normalizeDegrees((generated.hands.L.armPhase / Math.PI) * 180);
      expect(rightArmPhaseDeg).toBeCloseTo(0, 10);
      expect(leftArmPhaseDeg).toBeCloseTo(expectedLeftArmByElement[armElement], 10);
    }
  });

  it("round-trips descriptor classification independently of global phase reference", () => {
    const descriptor: VTGDescriptor = {
      armElement: "Air",
      poiElement: "Water",
      phaseDeg: 0,
      poiCyclesPerArmCycle: -3
    };
    const phaseReferences = ["right", "down", "left", "up"] as const;
    const firstState = createDefaultState();
    firstState.global.phaseReference = phaseReferences[0];
    const firstGenerated = generateVTGState(descriptor, firstState);

    for (const phaseReference of phaseReferences) {
      const baseState = createDefaultState();
      baseState.global.phaseReference = phaseReference;
      const generated = generateVTGState(descriptor, baseState);
      const classified = classifyVTG(generated);

      expect(classified.armElement).toBe(descriptor.armElement);
      expect(classified.poiElement).toBe(descriptor.poiElement);
      expect(classified.phaseDeg).toBe(descriptor.phaseDeg);
      expect(generated.hands).toEqual(firstGenerated.hands);
    }
  });

  it("generates states whose classified VTG buckets match descriptor expectations", () => {
    const baseState = createDefaultState();

    for (const poiCyclesPerArmCycle of VTG_TEST_HEAD_CYCLES) {
      for (const armElement of VTG_ELEMENTS) {
        for (const poiElement of VTG_ELEMENTS) {
          for (const phaseDeg of VTG_PHASE_BUCKETS) {
            const descriptor: VTGDescriptor = {
              armElement,
              poiElement,
              phaseDeg,
              poiCyclesPerArmCycle
            };

            const generated = generateVTGState(descriptor, baseState);
            const classified = classifyVTG(generated);

            expect(classified.armElement).toBe(descriptor.armElement);
            expect(classified.poiElement).toBe(descriptor.poiElement);
            expect(classified.phaseDeg).toBe(descriptor.phaseDeg);

            expect(generated.global).toEqual(baseState.global);
            expect(generated.hands.L.armRadius).toBe(baseState.hands.L.armRadius);
            expect(generated.hands.R.armRadius).toBe(baseState.hands.R.armRadius);
            expect(generated.hands.L.poiRadius).toBe(baseState.hands.L.poiRadius);
            expect(generated.hands.R.poiRadius).toBe(baseState.hands.R.poiRadius);
          }
        }
      }
    }
  });

  it("keeps Water/Fire poi elements distinct from Earth/Air for phase 0", () => {
    const baseState = createDefaultState();

    const waterState = generateVTGState(
      {
        armElement: "Earth",
        poiElement: "Water",
        phaseDeg: 0,
        poiCyclesPerArmCycle: -3
      },
      baseState
    );
    const fireState = generateVTGState(
      {
        armElement: "Earth",
        poiElement: "Fire",
        phaseDeg: 0,
        poiCyclesPerArmCycle: -3
      },
      baseState
    );

    expect(classifyVTG(waterState).poiElement).toBe("Water");
    expect(classifyVTG(fireState).poiElement).toBe("Fire");
  });

  it("classifies phase buckets within ±5° and rejects values outside tolerance", () => {
    const baseState = createDefaultState();
    const descriptor: VTGDescriptor = {
      armElement: "Earth",
      poiElement: "Earth",
      phaseDeg: 90,
      poiCyclesPerArmCycle: 3
    };
    const generated = generateVTGState(descriptor, baseState);

    const insidePositive = withRightPoiPhaseOffset(generated, WITHIN_TOLERANCE_DEGREES * RADIANS_PER_DEGREE);
    const insideNegative = withRightPoiPhaseOffset(generated, -WITHIN_TOLERANCE_DEGREES * RADIANS_PER_DEGREE);
    const outsidePositive = withRightPoiPhaseOffset(generated, OUTSIDE_TOLERANCE_DEGREES * RADIANS_PER_DEGREE);

    expect(classifyPhaseBucket(insidePositive)).toBe(90);
    expect(classifyPhaseBucket(insideNegative)).toBe(90);
    expect(() => classifyPhaseBucket(outsidePositive)).toThrow();
  });

  it("applies phase buckets as meaningful poi-head offset changes while hands stay fixed", () => {
    const baseState = createDefaultState();
    const baseDescriptor: VTGDescriptor = {
      armElement: "Earth",
      poiElement: "Earth",
      phaseDeg: 0,
      poiCyclesPerArmCycle: 3
    };
    const rotatedDescriptor: VTGDescriptor = {
      ...baseDescriptor,
      phaseDeg: 90
    };

    const baseStateGenerated = generateVTGState(baseDescriptor, baseState);
    const rotatedStateGenerated = generateVTGState(rotatedDescriptor, baseState);

    const baseRightHeadPhase = baseStateGenerated.hands.R.armPhase + baseStateGenerated.hands.R.poiPhase;
    const rotatedRightHeadPhase = rotatedStateGenerated.hands.R.armPhase + rotatedStateGenerated.hands.R.poiPhase;

    expect(baseStateGenerated.hands.R.armPhase).toBe(rotatedStateGenerated.hands.R.armPhase);
    expect(baseRightHeadPhase).not.toBe(rotatedRightHeadPhase);
  });

  it("applies signed poi cycles-per-arm-cycle to head speed", () => {
    const baseState = createDefaultState();
    const fastDescriptor: VTGDescriptor = {
      armElement: "Earth",
      poiElement: "Earth",
      phaseDeg: 0,
      poiCyclesPerArmCycle: 3
    };
    const slowDescriptor: VTGDescriptor = {
      ...fastDescriptor,
      poiCyclesPerArmCycle: -1
    };

    const fastState = generateVTGState(fastDescriptor, baseState);
    const slowState = generateVTGState(slowDescriptor, baseState);

    const fastHeadCycles = (fastState.hands.R.armSpeed + fastState.hands.R.poiSpeed) / (2 * Math.PI);
    const slowHeadCycles = (slowState.hands.R.armSpeed + slowState.hands.R.poiSpeed) / (2 * Math.PI);

    expect(fastHeadCycles).toBeCloseTo(3, 10);
    expect(slowHeadCycles).toBeCloseTo(-1, 10);
  });

  it("rejects zero poi cycles-per-arm-cycle", () => {
    const baseState = createDefaultState();
    const descriptor: VTGDescriptor = {
      armElement: "Earth",
      poiElement: "Earth",
      phaseDeg: 0,
      poiCyclesPerArmCycle: 0
    };

    expect(() => generateVTGState(descriptor, baseState)).toThrow();
  });

  it("produces finite angular params and preserves engine invariants for representative states", () => {
    const baseState = createDefaultState();
    const sampledDescriptors: VTGDescriptor[] = [
      { armElement: "Earth", poiElement: "Earth", phaseDeg: 0, poiCyclesPerArmCycle: -3 },
      { armElement: "Air", poiElement: "Fire", phaseDeg: 90, poiCyclesPerArmCycle: -1 },
      { armElement: "Water", poiElement: "Air", phaseDeg: 180, poiCyclesPerArmCycle: 1 },
      { armElement: "Fire", poiElement: "Water", phaseDeg: 270, poiCyclesPerArmCycle: 3 }
    ];

    for (const descriptor of sampledDescriptors) {
      const generated = generateVTGState(descriptor, baseState);

      for (const handId of HAND_IDS) {
        expect(Number.isFinite(generated.hands[handId].armSpeed)).toBe(true);
        expect(Number.isFinite(generated.hands[handId].armPhase)).toBe(true);
        expect(Number.isFinite(generated.hands[handId].poiSpeed)).toBe(true);
        expect(Number.isFinite(generated.hands[handId].poiPhase)).toBe(true);
      }

      assertGeneratedStateInvariants(generated);
    }
  });
});
