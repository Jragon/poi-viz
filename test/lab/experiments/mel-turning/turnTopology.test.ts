import { describe, expect, it } from "vitest";

import {
  deriveLocationRelativeCircle,
  derivePlaneRelativeCircle,
  enumerateHandTurnTargets,
  getLowReelLocation,
  isLowReelNodeFacingValid,
  validateHandTurnTopology
} from "@/lab/experiments/mel-turning/model/turnTopology";
import { UNVERIFIED_ONE_HAND_TURN_CANDIDATES } from "@/lab/experiments/mel-turning/fixtures/verifiedOneHandTurns";
import { UNVERIFIED_TWO_HAND_TURN_CANDIDATES } from "@/lab/experiments/mel-turning/fixtures/verifiedTwoHandTurns";
import { analyzeTurningTraceTurn } from "@/lab/experiments/mel-turning/model/turnEdgeAnalysis";
import { buildTurnLegalityMatrixRow } from "@/lab/experiments/mel-turning/model/turnLegalityMatrix";
import type {
  LowReelLocation,
  TurningNode
} from "@/lab/experiments/mel-turning/model/turningTypes";

const locationParts: Readonly<
  Record<
    LowReelLocation,
    Pick<TurningNode, "laneId"> & {
      readonly handPlacement: NonNullable<TurningNode["handPlacement"]>;
    }
  >
> = {
  C: { laneId: "center", handPlacement: "wall" },
  L: { laneId: "left-low", handPlacement: "wall" },
  R: { laneId: "right-low", handPlacement: "wall" },
  Cb: { laneId: "center", handPlacement: "behind-body" },
  Lb: { laneId: "left-low", handPlacement: "behind-body" },
  Rb: { laneId: "right-low", handPlacement: "behind-body" }
};

function node(
  location: LowReelLocation,
  planeSide: TurningNode["planeSide"],
  phase: TurningNode["phase"]
): TurningNode {
  return {
    step: 0,
    ...locationParts[location],
    planeSide,
    phase
  };
}

describe("low-reel turn topology", () => {
  it("keeps poi front/back separate from behind-body hand placement", () => {
    expect(["C", "Lb", "Rb"].map((location) =>
      deriveLocationRelativeCircle(location as LowReelLocation)
    )).toEqual(["front", "front", "front"]);
    expect(["L", "R", "Cb"].map((location) =>
      deriveLocationRelativeCircle(location as LowReelLocation)
    )).toEqual(["back", "back", "back"]);

    expect(getLowReelLocation(node("Lb", "a", "up"))).toBe("Lb");
    expect(derivePlaneRelativeCircle("a", 0)).toBe("front");
    expect(derivePlaneRelativeCircle("a", 180)).toBe("back");
  });

  it("validates location, plane side, and facing as one state", () => {
    for (const location of ["C", "Lb", "Rb"] as const) {
      expect(isLowReelNodeFacingValid(node(location, "a", "up"), 0)).toBe(true);
      expect(isLowReelNodeFacingValid(node(location, "b", "up"), 180)).toBe(true);
      expect(isLowReelNodeFacingValid(node(location, "b", "up"), 0)).toBe(false);
    }
    for (const location of ["L", "R", "Cb"] as const) {
      expect(isLowReelNodeFacingValid(node(location, "b", "up"), 0)).toBe(true);
      expect(isLowReelNodeFacingValid(node(location, "a", "up"), 180)).toBe(true);
      expect(isLowReelNodeFacingValid(node(location, "a", "up"), 0)).toBe(false);
    }
  });

  it("uses hand, source location, and turn direction for rear-circle holds", () => {
    const cases = [
      ["right", "L", "left", "C", "valid"],
      ["right", "L", "right", "Rb", "invalid"],
      ["right", "R", "left", "Lb", "valid"],
      ["right", "R", "right", "C", "valid"],
      ["left", "L", "left", "C", "valid"],
      ["left", "L", "right", "Rb", "valid"],
      ["left", "R", "left", "Lb", "invalid"],
      ["left", "R", "right", "C", "valid"]
    ] as const;

    for (const [hand, source, turnDirection, target, status] of cases) {
      const result = validateHandTurnTopology({
        hand,
        poiDirection: "clockwise",
        from: node(source, "b", "up"),
        to: node(target, "b", "down"),
        turnDirection,
        fromFacing: 0,
        toFacing: 180
      });
      expect(result.status, `${hand} ${source} ${turnDirection} → ${target}`).toBe(status);
    }
  });

  it("allows the same front-center source to cross or hold on a left turn", () => {
    const input = {
      hand: "left",
      poiDirection: "clockwise",
      from: node("C", "a", "down"),
      turnDirection: "left",
      fromFacing: 0,
      toFacing: 180
    } as const;

    expect(
      validateHandTurnTopology({
        ...input,
        to: node("C", "b", "up")
      })
    ).toMatchObject({
      status: "valid",
      mechanism: "cross",
      actualGate: "left",
      expectedGate: "left"
    });

    expect(
      validateHandTurnTopology({
        ...input,
        to: node("R", "a", "up")
      })
    ).toMatchObject({
      status: "valid",
      mechanism: "hold",
      actualGate: null
    });

    expect(enumerateHandTurnTargets(input)).toMatchObject({
      holdRuleStatus: "known",
      targets: [
        {
          node: {
            laneId: "center",
            handPlacement: "wall",
            planeSide: "b",
            phase: "up"
          },
          topology: { mechanism: "cross", status: "valid" }
        },
        {
          node: {
            laneId: "right-low",
            handPlacement: "wall",
            planeSide: "a",
            phase: "up"
          },
          topology: { mechanism: "hold", status: "valid" }
        }
      ]
    });
  });

  it("uses the opposite gate for a rear-circle crossing", () => {
    const valid = validateHandTurnTopology({
      hand: "right",
      poiDirection: "clockwise",
      from: node("L", "b", "up"),
      to: node("L", "a", "down"),
      turnDirection: "left",
      fromFacing: 0,
      toFacing: 180
    });
    expect(valid).toMatchObject({
      status: "valid",
      actualGate: "right",
      expectedGate: "right"
    });

    const inward = validateHandTurnTopology({
      hand: "right",
      poiDirection: "clockwise",
      from: node("L", "b", "down"),
      to: node("L", "a", "up"),
      turnDirection: "left",
      fromFacing: 0,
      toFacing: 180
    });
    expect(inward).toMatchObject({
      status: "invalid",
      actualGate: "left",
      expectedGate: "right",
      diagnostics: [{ code: "TURN_CROSS_GATE_MISMATCH" }]
    });

    expect(
      enumerateHandTurnTargets({
        hand: "right",
        poiDirection: "clockwise",
        from: node("L", "b", "up"),
        turnDirection: "left",
        fromFacing: 0,
        toFacing: 180
      })
    ).toMatchObject({
      holdRuleStatus: "known",
      targets: [
        {
          node: { laneId: "left-low", planeSide: "a" },
          topology: { mechanism: "cross", actualGate: "right" }
        },
        {
          node: { laneId: "center", planeSide: "b" },
          topology: { mechanism: "hold" }
        }
      ]
    });
  });

  it("keeps corrected and contradicted rows explicit without calling them verified", () => {
    expect(UNVERIFIED_ONE_HAND_TURN_CANDIDATES).toHaveLength(1);
    expect(
      buildTurnLegalityMatrixRow(UNVERIFIED_ONE_HAND_TURN_CANDIDATES[0]!).topologyStatus
    ).toBe("invalid");

    expect(UNVERIFIED_TWO_HAND_TURN_CANDIDATES).toHaveLength(2);
    expect(
      UNVERIFIED_TWO_HAND_TURN_CANDIDATES.map(
        (fixture) => analyzeTurningTraceTurn(fixture.trace).topologyStatus
      )
    ).toEqual(["valid", "valid"]);
    expect(
      UNVERIFIED_TWO_HAND_TURN_CANDIDATES.every(
        (fixture) => fixture.trace.verificationStatus === "unverified"
      )
    ).toBe(true);
  });
});
