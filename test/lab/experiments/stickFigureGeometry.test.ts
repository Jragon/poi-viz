import { describe, expect, it } from "vitest";

import { buildBodyRigConfigFromArmReach, type BodyRigConfig } from "@/body-rig/bodyRigConfig";
import {
  computeCanonicalWallOverlapCircle,
  computeBodyRigCanonicalPatternSpace,
  projectShoulderLine,
  solveBodyRig,
  solveStickArm,
  solveWorldBodyRig,
  solveWorldStickArm,
  type BodyRigRoot,
  type BodyRigSolveRequest,
  type RigGoals
} from "@/body-rig/stickFigureGeometry";

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function distance3(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

function dot3(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function getBaseRigRequest(
  overrides: {
    root?: Partial<BodyRigRoot>;
    config?: Partial<BodyRigConfig>;
    goals?: Partial<RigGoals>;
    yawSearchSteps?: number;
  } = {}
): BodyRigSolveRequest {
  return {
    root: {
      torsoCenter: { x: 200, y: 120 },
      shoulderY: 118,
      ...overrides.root
    },
    config: {
      baseShoulderSpan: 140,
      maxYawRad: Math.PI / 3,
      upperArmLength: 75,
      forearmLength: 75,
      ...overrides.config
    },
    goals: {
      leftHandTarget: { x: 80, y: 190 },
      rightHandTarget: { x: 320, y: 190 },
      ...overrides.goals
    },
    yawSearchSteps: overrides.yawSearchSteps ?? 72
  };
}

describe("solveStickArm", () => {
  it("preserves the requested hand target when it is within reach", () => {
    const result = solveStickArm({
      shoulder: { x: 120, y: 110 },
      handTarget: { x: 188, y: 142 },
      upperArmLength: 48,
      forearmLength: 52,
      armSide: "right"
    });

    expect(result.isClamped).toBe(false);
    expect(result.hand).toEqual(result.handTarget);
    expect(distance(result.shoulder, result.elbow)).toBeCloseTo(48);
    expect(distance(result.elbow, result.hand)).toBeCloseTo(52);
    expect(result.reach).toEqual({ min: 4, max: 100 });
  });

  it("clamps the hand to max reach when dragged too far", () => {
    const result = solveStickArm({
      shoulder: { x: 0, y: 0 },
      handTarget: { x: 160, y: 0 },
      upperArmLength: 45,
      forearmLength: 35,
      armSide: "right"
    });

    expect(result.isClamped).toBe(true);
    expect(result.hand).toEqual({ x: 80, y: 0 });
    expect(result.distanceToHand).toBe(80);
    expect(distance(result.shoulder, result.elbow)).toBeCloseTo(45);
    expect(distance(result.elbow, result.hand)).toBeCloseTo(35);
  });

  it("clamps the hand to min reach for folded unequal bones", () => {
    const result = solveStickArm({
      shoulder: { x: 0, y: 0 },
      handTarget: { x: 10, y: 0 },
      upperArmLength: 70,
      forearmLength: 30,
      armSide: "right"
    });

    expect(result.isClamped).toBe(true);
    expect(result.hand).toEqual({ x: 40, y: 0 });
    expect(result.reach).toEqual({ min: 40, max: 100 });
    expect(distance(result.shoulder, result.elbow)).toBeCloseTo(70);
    expect(distance(result.elbow, result.hand)).toBeCloseTo(30);
  });

  it("uses a deterministic bend side for the right arm", () => {
    const upward = solveStickArm({
      shoulder: { x: 0, y: 0 },
      handTarget: { x: 50, y: 0 },
      upperArmLength: 40,
      forearmLength: 30,
      armSide: "right"
    });
    const downward = solveStickArm({
      shoulder: { x: 0, y: 0 },
      handTarget: { x: -50, y: 0 },
      upperArmLength: 40,
      forearmLength: 30,
      armSide: "right"
    });

    expect(upward.elbow.y).toBeLessThan(0);
    expect(downward.elbow.y).toBeGreaterThan(0);
  });

  it("mirrors deterministic bend side for the left arm", () => {
    const leftArm = solveStickArm({
      shoulder: { x: 0, y: 0 },
      handTarget: { x: -50, y: 0 },
      upperArmLength: 40,
      forearmLength: 30,
      armSide: "left"
    });
    const rightArm = solveStickArm({
      shoulder: { x: 0, y: 0 },
      handTarget: { x: 50, y: 0 },
      upperArmLength: 40,
      forearmLength: 30,
      armSide: "right"
    });

    expect(leftArm.elbow.y).toBeLessThan(0);
    expect(rightArm.elbow.y).toBeLessThan(0);
    expect(leftArm.elbow.x).toBeCloseTo(-rightArm.elbow.x);
    expect(leftArm.elbow.y).toBeCloseTo(rightArm.elbow.y);
    expect(distance(leftArm.shoulder, leftArm.elbow)).toBeCloseTo(40);
    expect(distance(leftArm.elbow, leftArm.hand)).toBeCloseTo(30);
  });

  it("points both elbows outward when both arms use the same overhead target", () => {
    const sharedHandTarget = { x: 0, y: -80 };
    const leftArm = solveStickArm({
      shoulder: { x: -45, y: 0 },
      handTarget: sharedHandTarget,
      upperArmLength: 70,
      forearmLength: 70,
      armSide: "left"
    });
    const rightArm = solveStickArm({
      shoulder: { x: 45, y: 0 },
      handTarget: sharedHandTarget,
      upperArmLength: 70,
      forearmLength: 70,
      armSide: "right"
    });

    expect(leftArm.elbow.x).toBeLessThan(leftArm.shoulder.x);
    expect(rightArm.elbow.x).toBeGreaterThan(rightArm.shoulder.x);
    expect(leftArm.elbow.y).toBeLessThan(leftArm.shoulder.y);
    expect(rightArm.elbow.y).toBeLessThan(rightArm.shoulder.y);
  });

  it("keeps geometry independent from device-pixel scaling concerns", () => {
    const result = solveStickArm({
      shoulder: { x: 240, y: 180 },
      handTarget: { x: 300, y: 220 },
      upperArmLength: 50,
      forearmLength: 40,
      armSide: "right"
    });

    expect(result.hand.x).toBeCloseTo(300);
    expect(result.hand.y).toBeCloseTo(220);
    expect(result.distanceToHand).toBeCloseTo(Math.hypot(60, 40));
  });
});

describe("projectShoulderLine", () => {
  it("preserves full shoulder span at neutral yaw", () => {
    const result = projectShoulderLine({
      torsoCenter: { x: 200, y: 120 },
      shoulderY: 118,
      baseShoulderSpan: 140,
      yawRad: 0,
      maxYawRad: Math.PI / 3
    });

    expect(result.projectedShoulderSpan).toBeCloseTo(140);
    expect(result.leftShoulder).toEqual({ x: 130, y: 118 });
    expect(result.rightShoulder).toEqual({ x: 270, y: 118 });
    expect(result.nearSide).toBeNull();
    expect(result.farSide).toBeNull();
  });

  it("compresses shoulder span and exposes draw-order hints for positive yaw", () => {
    const result = projectShoulderLine({
      torsoCenter: { x: 200, y: 120 },
      shoulderY: 118,
      baseShoulderSpan: 140,
      yawRad: Math.PI / 3,
      maxYawRad: Math.PI / 3
    });

    expect(result.projectedShoulderSpan).toBeCloseTo(70);
    expect(result.normalizedYaw).toBeCloseTo(1);
    expect(result.nearSide).toBe("right");
    expect(result.farSide).toBe("left");
    expect(result.torsoCenter).toEqual({ x: 200, y: 120 });
  });

  it("mirrors draw-order hints for negative yaw", () => {
    const result = projectShoulderLine({
      torsoCenter: { x: 200, y: 120 },
      shoulderY: 118,
      baseShoulderSpan: 140,
      yawRad: -Math.PI / 3,
      maxYawRad: Math.PI / 3
    });

    expect(result.projectedShoulderSpan).toBeCloseTo(70);
    expect(result.normalizedYaw).toBeCloseTo(-1);
    expect(result.nearSide).toBe("left");
    expect(result.farSide).toBe("right");
  });

  it("clamps yaw and preserves a minimum projected span", () => {
    const result = projectShoulderLine({
      torsoCenter: { x: 200, y: 120 },
      shoulderY: 118,
      baseShoulderSpan: 150,
      yawRad: Math.PI,
      maxYawRad: Math.PI / 2,
      minProjectedSpanRatio: 0.4
    });

    expect(result.yawRad).toBeCloseTo(Math.PI / 2);
    expect(result.projectedShoulderSpan).toBeCloseTo(60);
  });
});

describe("solveWorldStickArm", () => {
  it("solves a 3D two-bone arm with forward elbow depth", () => {
    const result = solveWorldStickArm({
      shoulder: { x: 0, y: 0, z: 0 },
      handTarget: { x: 60, y: 40, z: 20 },
      upperArmLength: 55,
      forearmLength: 45,
      armSide: "right",
      torsoRight: { x: 1, y: 0, z: 0 },
      torsoForward: { x: 0, y: 0, z: 1 },
      worldUp: { x: 0, y: 1, z: 0 }
    });

    expect(result.isClamped).toBe(false);
    expect(result.hand.x).toBeCloseTo(result.handTarget.x);
    expect(result.hand.y).toBeCloseTo(result.handTarget.y);
    expect(result.hand.z).toBeCloseTo(result.handTarget.z);
    expect(distance3(result.shoulder, result.elbow)).toBeCloseTo(55);
    expect(distance3(result.elbow, result.hand)).toBeCloseTo(45);
    expect(result.elbow.z).toBeGreaterThan(0);
  });

  it("keeps elbow bend poles native-side and forward for shared overhead targets", () => {
    const leftArm = solveWorldStickArm({
      shoulder: { x: -45, y: 0, z: 0 },
      handTarget: { x: 0, y: 80, z: 0 },
      upperArmLength: 70,
      forearmLength: 70,
      armSide: "left",
      torsoRight: { x: 1, y: 0, z: 0 },
      torsoForward: { x: 0, y: 0, z: 1 },
      worldUp: { x: 0, y: 1, z: 0 }
    });
    const rightArm = solveWorldStickArm({
      shoulder: { x: 45, y: 0, z: 0 },
      handTarget: { x: 0, y: 80, z: 0 },
      upperArmLength: 70,
      forearmLength: 70,
      armSide: "right",
      torsoRight: { x: 1, y: 0, z: 0 },
      torsoForward: { x: 0, y: 0, z: 1 },
      worldUp: { x: 0, y: 1, z: 0 }
    });

    expect(leftArm.elbowPole.x).toBeLessThanOrEqual(0);
    expect(rightArm.elbowPole.x).toBeGreaterThanOrEqual(0);
    expect(leftArm.elbowPole.z).toBeGreaterThan(0);
    expect(rightArm.elbowPole.z).toBeGreaterThan(0);
    expect(leftArm.elbow.z).toBeGreaterThan(0);
    expect(rightArm.elbow.z).toBeGreaterThan(0);
  });

  it("keeps forward elbow depth stable when a hand target crosses shoulder height", () => {
    const belowShoulder = solveWorldStickArm({
      shoulder: { x: 45, y: 0, z: 0 },
      handTarget: { x: 0, y: -8, z: 0 },
      upperArmLength: 70,
      forearmLength: 70,
      armSide: "right",
      torsoRight: { x: 1, y: 0, z: 0 },
      torsoForward: { x: 0, y: 0, z: 1 },
      worldUp: { x: 0, y: 1, z: 0 }
    });
    const aboveShoulder = solveWorldStickArm({
      shoulder: { x: 45, y: 0, z: 0 },
      handTarget: { x: 0, y: 8, z: 0 },
      upperArmLength: 70,
      forearmLength: 70,
      armSide: "right",
      torsoRight: { x: 1, y: 0, z: 0 },
      torsoForward: { x: 0, y: 0, z: 1 },
      worldUp: { x: 0, y: 1, z: 0 }
    });

    expect(belowShoulder.elbowPole.z).toBeGreaterThan(0);
    expect(aboveShoulder.elbowPole.z).toBeGreaterThan(0);
    expect(Math.abs(aboveShoulder.elbowPole.y - belowShoulder.elbowPole.y)).toBeLessThan(0.35);
  });

  it("does not inject vertical elbow flips near horizontal full extension", () => {
    const belowHorizontal = solveWorldStickArm({
      shoulder: { x: 0, y: 0, z: 0 },
      handTarget: { x: 139.8, y: -0.25, z: 0 },
      upperArmLength: 70,
      forearmLength: 70,
      armSide: "right",
      torsoRight: { x: 1, y: 0, z: 0 },
      torsoForward: { x: 0, y: 0, z: 1 },
      worldUp: { x: 0, y: 1, z: 0 }
    });
    const aboveHorizontal = solveWorldStickArm({
      shoulder: { x: 0, y: 0, z: 0 },
      handTarget: { x: 139.8, y: 0.25, z: 0 },
      upperArmLength: 70,
      forearmLength: 70,
      armSide: "right",
      torsoRight: { x: 1, y: 0, z: 0 },
      torsoForward: { x: 0, y: 0, z: 1 },
      worldUp: { x: 0, y: 1, z: 0 }
    });

    expect(belowHorizontal.elbowPole.z).toBeGreaterThan(0);
    expect(aboveHorizontal.elbowPole.z).toBeGreaterThan(0);
    expect(Math.abs(belowHorizontal.elbowPole.y)).toBeLessThan(1e-9);
    expect(Math.abs(aboveHorizontal.elbowPole.y)).toBeLessThan(1e-9);
    expect(Math.sign(belowHorizontal.elbow.y)).toBe(Math.sign(belowHorizontal.handTarget.y));
    expect(Math.sign(aboveHorizontal.elbow.y)).toBe(Math.sign(aboveHorizontal.handTarget.y));
  });

  it("keeps a yawed full-body horizontal crossing forward instead of snapping backward", () => {
    const config = buildBodyRigConfigFromArmReach(1.25);
    const canonicalWallCircle = computeCanonicalWallOverlapCircle({
      root: {
        torsoCenter: { x: 0, y: 0 },
        shoulderY: 0
      },
      config,
      useMaxYawCompression: true
    });
    const solveAtY = (y: number) =>
      solveWorldBodyRig({
        root: {
          shoulderGirdleCenter: { x: 0, y: 0, z: 0 },
          worldUp: { x: 0, y: 1, z: 0 },
          neutralForward: { x: 0, y: 0, z: 1 },
          scale: 1
        },
        config,
        goals: {
          leftHandTarget: { x: 0, y: y * canonicalWallCircle.radius, z: 0 },
          rightHandTarget: {
            x: canonicalWallCircle.radius,
            y: y * canonicalWallCircle.radius,
            z: 0
          }
        }
      });

    const below = solveAtY(-0.01);
    const horizontal = solveAtY(0);
    const above = solveAtY(0.01);

    for (const solve of [below, horizontal, above]) {
      expect(dot3(solve.rightArm.elbowPole, solve.shoulders.torsoForward)).toBeGreaterThan(0.95);
      expect(Math.abs(dot3(solve.rightArm.elbowPole, solve.shoulders.worldUp))).toBeLessThan(0.05);
    }
    expect(horizontal.rightArm.elbow.z).toBeGreaterThan(0);
  });

  it("clamps unreachable world targets deterministically", () => {
    const result = solveWorldStickArm({
      shoulder: { x: 0, y: 0, z: 0 },
      handTarget: { x: 300, y: 0, z: 0 },
      upperArmLength: 40,
      forearmLength: 50,
      armSide: "right",
      torsoRight: { x: 1, y: 0, z: 0 },
      torsoForward: { x: 0, y: 0, z: 1 },
      worldUp: { x: 0, y: 1, z: 0 }
    });

    expect(result.isClamped).toBe(true);
    expect(result.hand).toEqual({ x: 90, y: 0, z: 0 });
    expect(result.reachError).toBeCloseTo(210);
  });
});

describe("computeCanonicalWallOverlapCircle", () => {
  it("computes the largest neutral canonical wall overlap circle inside both arm reaches", () => {
    const result = computeCanonicalWallOverlapCircle({
      root: {
        torsoCenter: { x: 0, y: 0 },
        shoulderY: 0
      },
      config: {
        baseShoulderSpan: 100,
        maxYawRad: Math.PI / 3,
        upperArmLength: 75,
        forearmLength: 75
      }
    });

    expect(result.center).toEqual({ x: 0, y: 0 });
    expect(result.projectedShoulderSpan).toBeCloseTo(100);
    expect(result.radius).toBeCloseTo(100);
    expect(result.usesMaxYawCompression).toBe(false);
  });

  it("uses the compressed shoulder span when asked for the maximum yaw overlap circle", () => {
    const result = computeCanonicalWallOverlapCircle({
      root: {
        torsoCenter: { x: 0, y: 0 },
        shoulderY: 0
      },
      config: {
        baseShoulderSpan: 100,
        maxYawRad: Math.PI / 3,
        upperArmLength: 75,
        forearmLength: 75
      },
      useMaxYawCompression: true
    });

    expect(result.projectedShoulderSpan).toBeCloseTo(50);
    expect(result.radius).toBeCloseTo(125);
    expect(result.usesMaxYawCompression).toBe(true);
  });

  it("keeps sampled boundary points reachable with both hands exactly overlapped", () => {
    const circle = computeCanonicalWallOverlapCircle({
      root: {
        torsoCenter: { x: 200, y: 120 },
        shoulderY: 120
      },
      config: {
        baseShoulderSpan: 120,
        maxYawRad: Math.PI / 3,
        upperArmLength: 75,
        forearmLength: 75,
        minProjectedSpanRatio: 0.4
      },
      useMaxYawCompression: true
    });

    for (let index = 0; index < 64; index += 1) {
      const angle = (index / 64) * Math.PI * 2;
      const target = {
        x: circle.center.x + Math.cos(angle) * circle.radius,
        y: circle.center.y + Math.sin(angle) * circle.radius
      };
      const solve = solveBodyRig({
        root: {
          torsoCenter: { x: 200, y: 120 },
          shoulderY: 120
        },
        config: {
          baseShoulderSpan: 120,
          maxYawRad: Math.PI / 3,
          upperArmLength: 75,
          forearmLength: 75,
          minProjectedSpanRatio: 0.4
        },
        goals: {
          leftHandTarget: target,
          rightHandTarget: target
        },
        yawSearchSteps: 144
      });

      expect(solve.leftArm.hand.x).toBeCloseTo(solve.rightArm.hand.x);
      expect(solve.leftArm.hand.y).toBeCloseTo(solve.rightArm.hand.y);
      expect(solve.leftArm.isClamped).toBe(false);
      expect(solve.rightArm.isClamped).toBe(false);
      expect(solve.diagnostics.isBestEffort).toBe(false);
    }
  });

  it("marks a sufficiently outside point as best effort even with shoulder contribution", () => {
    const circle = computeCanonicalWallOverlapCircle({
      root: {
        torsoCenter: { x: 200, y: 120 },
        shoulderY: 120
      },
      config: {
        baseShoulderSpan: 120,
        maxYawRad: Math.PI / 3,
        upperArmLength: 75,
        forearmLength: 75,
        minProjectedSpanRatio: 0.4
      },
      useMaxYawCompression: true
    });
    const target = { x: circle.center.x + circle.radius + 32, y: circle.center.y };
    const solve = solveBodyRig({
      root: {
        torsoCenter: { x: 200, y: 120 },
        shoulderY: 120
      },
      config: {
        baseShoulderSpan: 120,
        maxYawRad: Math.PI / 3,
        upperArmLength: 75,
        forearmLength: 75,
        minProjectedSpanRatio: 0.4
      },
      goals: {
        leftHandTarget: target,
        rightHandTarget: target
      },
      yawSearchSteps: 144
    });

    expect(solve.diagnostics.isBestEffort).toBe(true);
    expect(solve.leftArm.isClamped || solve.rightArm.isClamped).toBe(true);
  });
});

describe("computeBodyRigCanonicalPatternSpace", () => {
  it("uses the wall-plane overlap circle as origin and unit radius", () => {
    const config = buildBodyRigConfigFromArmReach(1.25);
    const result = computeBodyRigCanonicalPatternSpace({
      root: {
        shoulderGirdleCenter: { x: 0.25, y: 1.4, z: 0.5 },
        worldUp: { x: 0, y: 1, z: 0 },
        neutralForward: { x: 0, y: 0, z: 1 },
        scale: 1
      },
      config,
      useMaxYawCompression: true
    });

    expect(result.sourcePlane).toBe("wall");
    expect(result.origin).toEqual({ x: 0.25, y: 1.4, z: 0.5 });
    expect(result.unitRadius).toBeCloseTo(result.wallCircle.radius);
    expect(result.wallCircle.usesMaxYawCompression).toBe(true);
  });

  it("imports the same wall-plane origin and radius for wheel and floor projections", () => {
    const config = buildBodyRigConfigFromArmReach(1.25);
    const canonical = computeBodyRigCanonicalPatternSpace({
      root: {
        shoulderGirdleCenter: { x: 0, y: 1.4, z: 0 },
        worldUp: { x: 0, y: 1, z: 0 },
        neutralForward: { x: 0, y: 0, z: 1 },
        scale: 1
      },
      config,
      useMaxYawCompression: true
    });

    expect(canonical.projections.wall.origin).toEqual(canonical.origin);
    expect(canonical.projections.wheel.origin).toEqual(canonical.origin);
    expect(canonical.projections.floor.origin).toEqual(canonical.origin);
    expect(canonical.projections.wall.unitRadius).toBe(canonical.unitRadius);
    expect(canonical.projections.wheel.unitRadius).toBe(canonical.unitRadius);
    expect(canonical.projections.floor.unitRadius).toBe(canonical.unitRadius);
  });
});

describe("solveBodyRig", () => {
  it("infers neutral yaw for balanced hand targets", () => {
    const result = solveBodyRig(getBaseRigRequest());

    expect(result.yawRad).toBeCloseTo(0);
    expect(result.shoulders.nearSide).toBeNull();
    expect(result.diagnostics.isBestEffort).toBe(false);
  });

  it("infers positive yaw when both hand targets are right-biased", () => {
    const result = solveBodyRig(
      getBaseRigRequest({
        goals: {
          leftHandTarget: { x: 230, y: 185 },
          rightHandTarget: { x: 340, y: 185 }
        }
      })
    );

    expect(result.yawRad).toBeGreaterThan(0);
    expect(result.shoulders.nearSide).toBe("right");
  });

  it("infers negative yaw when both hand targets are left-biased", () => {
    const result = solveBodyRig(
      getBaseRigRequest({
        goals: {
          leftHandTarget: { x: 60, y: 185 },
          rightHandTarget: { x: 170, y: 185 }
        }
      })
    );

    expect(result.yawRad).toBeLessThan(0);
    expect(result.shoulders.nearSide).toBe("left");
  });

  it("mirrors yaw sign for mirrored hand targets", () => {
    const rightBiased = solveBodyRig(
      getBaseRigRequest({
        goals: {
          leftHandTarget: { x: 230, y: 185 },
          rightHandTarget: { x: 340, y: 185 }
        }
      })
    );
    const leftBiased = solveBodyRig(
      getBaseRigRequest({
        goals: {
          leftHandTarget: { x: 60, y: 185 },
          rightHandTarget: { x: 170, y: 185 }
        }
      })
    );

    expect(rightBiased.yawRad).toBeCloseTo(-leftBiased.yawRad);
  });

  it("keeps tiny near-neutral offsets neutral", () => {
    const result = solveBodyRig(
      getBaseRigRequest({
        goals: {
          leftHandTarget: { x: 83, y: 190 },
          rightHandTarget: { x: 321, y: 190 }
        }
      })
    );

    expect(result.yawRad).toBeCloseTo(0);
  });

  it("lifts both shoulders for a shared overhead target", () => {
    const result = solveBodyRig(
      getBaseRigRequest({
        goals: {
          leftHandTarget: { x: 165, y: 20 },
          rightHandTarget: { x: 235, y: 20 }
        }
      })
    );

    expect(result.diagnostics.leftShoulderLift).toBeGreaterThan(0);
    expect(result.diagnostics.rightShoulderLift).toBeGreaterThan(0);
    expect(result.diagnostics.effectiveLeftShoulder.y).toBeLessThan(
      result.diagnostics.projectedLeftShoulder.y
    );
    expect(result.diagnostics.effectiveRightShoulder.y).toBeLessThan(
      result.diagnostics.projectedRightShoulder.y
    );
  });

  it("allows asymmetric shoulder contribution when one arm is more constrained", () => {
    const result = solveBodyRig(
      getBaseRigRequest({
        goals: {
          leftHandTarget: { x: 85, y: 40 },
          rightHandTarget: { x: 280, y: 190 }
        }
      })
    );

    expect(result.diagnostics.leftShoulderLift).toBeGreaterThan(
      result.diagnostics.rightShoulderLift
    );
  });

  it("keeps effective shoulder span above the configured floor", () => {
    const result = solveBodyRig(
      getBaseRigRequest({
        config: {
          shoulderPolicy: {
            maxCrossBodyReach: 45,
            minEffectiveSpanRatio: 0.5
          }
        },
        goals: {
          leftHandTarget: { x: 190, y: 170 },
          rightHandTarget: { x: 210, y: 170 }
        }
      })
    );

    expect(
      result.shoulders.rightShoulder.x - result.shoulders.leftShoulder.x
    ).toBeGreaterThanOrEqual(getBaseRigRequest().config.baseShoulderSpan * 0.5);
  });

  it("returns deterministic output for identical inputs", () => {
    const input = getBaseRigRequest({
      goals: {
        leftHandTarget: { x: 235, y: 185 },
        rightHandTarget: { x: 345, y: 185 }
      }
    });

    expect(solveBodyRig(input)).toEqual(solveBodyRig(input));
  });

  it("returns a clamped best-effort pose for unreachable targets", () => {
    const result = solveBodyRig(
      getBaseRigRequest({
        config: {
          upperArmLength: 40,
          forearmLength: 40
        },
        goals: {
          leftHandTarget: { x: -120, y: 190 },
          rightHandTarget: { x: 520, y: 190 }
        }
      })
    );

    expect(Math.abs(result.yawRad)).toBeLessThanOrEqual(Math.PI / 3);
    expect(result.diagnostics.isBestEffort).toBe(true);
    expect(result.diagnostics.leftReachError + result.diagnostics.rightReachError).toBeGreaterThan(
      0
    );
    expect(result.leftArm.isClamped).toBe(true);
    expect(result.rightArm.isClamped).toBe(true);
    expect(result.cost).toBeGreaterThan(0);
  });
});

describe("solveWorldBodyRig", () => {
  it("keeps a balanced wall-plane pose neutral while solving in Vec3", () => {
    const result = solveWorldBodyRig({
      root: {
        shoulderGirdleCenter: { x: 200, y: 118, z: 0 },
        worldUp: { x: 0, y: 1, z: 0 },
        neutralForward: { x: 0, y: 0, z: 1 },
        scale: 1
      },
      config: getBaseRigRequest().config,
      goals: {
        leftHandTarget: { x: 80, y: 46, z: 0 },
        rightHandTarget: { x: 320, y: 46, z: 0 }
      },
      yawSearchSteps: 72
    });

    expect(result.yawRad).toBeCloseTo(0);
    expect(result.shoulders.leftShoulder.x).toBeLessThan(200);
    expect(result.shoulders.rightShoulder.x).toBeGreaterThan(200);
    expect(result.diagnostics.isBestEffort).toBe(false);
    expect(result.leftArm.elbowPole.x).toBeLessThanOrEqual(0);
    expect(result.rightArm.elbowPole.x).toBeGreaterThanOrEqual(0);
    expect(result.leftArm.elbowPole.z).toBeGreaterThan(0);
    expect(result.rightArm.elbowPole.z).toBeGreaterThan(0);
    expect(result.leftArm.elbow.z).toBeGreaterThan(0);
    expect(result.rightArm.elbow.z).toBeGreaterThan(0);
    expect(distance3(result.leftArm.shoulder, result.leftArm.elbow)).toBeCloseTo(
      getBaseRigRequest().config.upperArmLength
    );
    expect(distance3(result.leftArm.elbow, result.leftArm.hand)).toBeCloseTo(
      getBaseRigRequest().config.forearmLength
    );
  });

  it("lifts shoulders in world space for overhead targets", () => {
    const result = solveWorldBodyRig({
      root: {
        shoulderGirdleCenter: { x: 200, y: 118, z: 0 },
        worldUp: { x: 0, y: 1, z: 0 },
        neutralForward: { x: 0, y: 0, z: 1 },
        scale: 1
      },
      config: getBaseRigRequest().config,
      goals: {
        leftHandTarget: { x: 165, y: 216, z: 0 },
        rightHandTarget: { x: 235, y: 216, z: 0 }
      }
    });

    expect(result.diagnostics.leftShoulderLift).toBeGreaterThan(0);
    expect(result.diagnostics.rightShoulderLift).toBeGreaterThan(0);
    expect(result.shoulders.leftShoulder.y).toBeGreaterThan(118);
    expect(result.shoulders.rightShoulder.y).toBeGreaterThan(118);
  });

  it("exposes pelvis, chest, and shoulder-girdle state from the world solve", () => {
    const result = solveWorldBodyRig({
      root: {
        shoulderGirdleCenter: { x: 0, y: 1.4, z: 0 },
        neutralPelvisCenter: { x: 0, y: 0.8, z: 0 },
        neutralChestCenter: { x: 0, y: 1.35, z: 0 },
        worldUp: { x: 0, y: 1, z: 0 },
        neutralForward: { x: 0, y: 0, z: 1 },
        scale: 1
      },
      config: buildBodyRigConfigFromArmReach(1.25),
      goals: {
        leftHandTarget: { x: -0.55, y: 1.1, z: 0.2 },
        rightHandTarget: { x: 0.65, y: 1.25, z: 0.25 }
      },
      yawSearchSteps: 72
    });

    expect(result.pelvis.center.y).toBeCloseTo(0.8, 1);
    expect(Math.abs(result.pelvis.yawRad)).toBeLessThanOrEqual(Math.abs(result.yawRad) + 1e-9);
    expect(result.chest.center.y).toBeGreaterThan(result.pelvis.center.y);
    expect(result.shoulderGirdle.left.shoulderBase).toBeDefined();
    expect(result.shoulderGirdle.left.shoulderSocket).toEqual(result.leftArm.shoulder);
    expect(result.shoulderGirdle.right.shoulderSocket).toEqual(result.rightArm.shoulder);
    expect(result.diagnostics.pelvisYawLimitHit).toBe(false);
    expect(result.diagnostics.leftShoulder.overheadAmbiguous).toBe(false);
  });

  it("mirrors pelvis and shoulder-girdle state for mirrored world inputs", () => {
    const config = buildBodyRigConfigFromArmReach(1.25);
    const root = {
      shoulderGirdleCenter: { x: 0, y: 1.4, z: 0 },
      neutralPelvisCenter: { x: 0, y: 0.8, z: 0 },
      neutralChestCenter: { x: 0, y: 1.35, z: 0 },
      worldUp: { x: 0, y: 1, z: 0 },
      neutralForward: { x: 0, y: 0, z: 1 },
      scale: 1
    };
    const rightBiased = solveWorldBodyRig({
      root,
      config,
      goals: {
        leftHandTarget: { x: 0.05, y: 1.2, z: 0 },
        rightHandTarget: { x: 0.85, y: 1.2, z: 0 }
      }
    });
    const leftBiased = solveWorldBodyRig({
      root,
      config,
      goals: {
        leftHandTarget: { x: -0.85, y: 1.2, z: 0 },
        rightHandTarget: { x: -0.05, y: 1.2, z: 0 }
      }
    });

    expect(rightBiased.yawRad).toBeCloseTo(-leftBiased.yawRad);
    expect(rightBiased.pelvis.center.x).toBeCloseTo(-leftBiased.pelvis.center.x);
    expect(rightBiased.chest.center.x).toBeCloseTo(-leftBiased.chest.center.x);
    expect(rightBiased.shoulderGirdle.right.lateralTravel).toBeCloseTo(
      -leftBiased.shoulderGirdle.left.lateralTravel
    );
  });

  it("fades lateral shoulder travel near the overhead ambiguity zone", () => {
    const config = buildBodyRigConfigFromArmReach(1.25);
    const solveAtOffset = (offsetX: number) =>
      solveWorldBodyRig({
        root: {
          shoulderGirdleCenter: { x: 0, y: 1.4, z: 0 },
          neutralPelvisCenter: { x: 0, y: 0.8, z: 0 },
          neutralChestCenter: { x: 0, y: 1.35, z: 0 },
          worldUp: { x: 0, y: 1, z: 0 },
          neutralForward: { x: 0, y: 0, z: 1 },
          scale: 1
        },
        config,
        goals: {
          leftHandTarget: { x: offsetX, y: 2.35, z: 0 },
          rightHandTarget: { x: offsetX, y: 2.35, z: 0 }
        },
        yawSearchSteps: 96
      });

    const left = solveAtOffset(-0.03);
    const center = solveAtOffset(0);
    const right = solveAtOffset(0.03);

    expect(center.diagnostics.leftShoulder.overheadAmbiguous).toBe(true);
    expect(center.diagnostics.rightShoulder.overheadAmbiguous).toBe(true);
    expect(Math.abs(center.shoulderGirdle.left.lateralTravel)).toBeLessThan(0.01);
    expect(Math.abs(center.shoulderGirdle.right.lateralTravel)).toBeLessThan(0.01);
    expect(Math.abs(left.shoulderGirdle.left.lateralTravel - center.shoulderGirdle.left.lateralTravel)).toBeLessThan(0.04);
    expect(Math.abs(right.shoulderGirdle.right.lateralTravel - center.shoulderGirdle.right.lateralTravel)).toBeLessThan(0.04);
    expect(center.shoulderGirdle.left.lift).toBeGreaterThan(0);
    expect(center.shoulderGirdle.right.lift).toBeGreaterThan(0);
    expect(center.shoulderGirdle.left.protraction).toBeGreaterThan(0);
    expect(center.shoulderGirdle.right.protraction).toBeGreaterThan(0);
  });

  it("recovers lateral shoulder travel smoothly across the overhead fade band", () => {
    const config = buildBodyRigConfigFromArmReach(1.25);
    const root = {
      shoulderGirdleCenter: { x: 0, y: 1.4, z: 0 },
      neutralPelvisCenter: { x: 0, y: 0.8, z: 0 },
      neutralChestCenter: { x: 0, y: 1.35, z: 0 },
      worldUp: { x: 0, y: 1, z: 0 },
      neutralForward: { x: 0, y: 0, z: 1 },
      scale: 1
    };
    const solveAtOffset = (offsetX: number) =>
      solveWorldBodyRig({
        root,
        config,
        goals: {
          leftHandTarget: { x: offsetX, y: 2.35, z: 0 },
          rightHandTarget: { x: offsetX, y: 2.35, z: 0 }
        },
        yawSearchSteps: 96
      });

    const justInside = solveAtOffset(0.224);
    const justOutside = solveAtOffset(0.226);
    const midFade = solveAtOffset(0.29);
    const outsideFade = solveAtOffset(0.42);

    expect(justInside.diagnostics.leftShoulder.overheadAmbiguous).toBe(true);
    expect(justOutside.diagnostics.leftShoulder.overheadAmbiguous).toBe(false);
    expect(
      Math.abs(justOutside.shoulderGirdle.left.lateralTravel - justInside.shoulderGirdle.left.lateralTravel)
    ).toBeLessThan(0.01);
    expect(Math.abs(midFade.shoulderGirdle.left.lateralTravel)).toBeGreaterThan(
      Math.abs(justOutside.shoulderGirdle.left.lateralTravel)
    );
    expect(Math.abs(midFade.shoulderGirdle.left.lateralTravel)).toBeLessThan(
      Math.abs(outsideFade.shoulderGirdle.left.lateralTravel)
    );
  });

  it("does not apply overhead lateral fade to non-overhead forward reaches", () => {
    const config = buildBodyRigConfigFromArmReach(1.25);
    const result = solveWorldBodyRig({
      root: {
        shoulderGirdleCenter: { x: 0, y: 1.4, z: 0 },
        neutralPelvisCenter: { x: 0, y: 0.8, z: 0 },
        neutralChestCenter: { x: 0, y: 1.35, z: 0 },
        worldUp: { x: 0, y: 1, z: 0 },
        neutralForward: { x: 0, y: 0, z: 1 },
        scale: 1
      },
      config,
      goals: {
        leftHandTarget: { x: 0.45, y: 1.4, z: 1.25 },
        rightHandTarget: { x: 0.45, y: 1.4, z: 1.25 }
      },
      yawSearchSteps: 96
    });

    expect(result.diagnostics.leftShoulder.overheadAmbiguous).toBe(false);
    expect(result.diagnostics.rightShoulder.overheadAmbiguous).toBe(false);
    expect(Math.abs(result.shoulderGirdle.left.lateralTravel)).toBeGreaterThan(0.01);
    expect(Math.abs(result.shoulderGirdle.right.lateralTravel)).toBeGreaterThan(0.01);
  });

  it("keeps shoulder sockets stable as a shared overhead target crosses center", () => {
    const config = buildBodyRigConfigFromArmReach(1.25);
    const root = {
      shoulderGirdleCenter: { x: 0, y: 1.4, z: 0 },
      neutralPelvisCenter: { x: 0, y: 0.8, z: 0 },
      neutralChestCenter: { x: 0, y: 1.35, z: 0 },
      worldUp: { x: 0, y: 1, z: 0 },
      neutralForward: { x: 0, y: 0, z: 1 },
      scale: 1
    };
    const solves = [-0.04, -0.02, 0, 0.02, 0.04].map((offsetX) =>
      solveWorldBodyRig({
        root,
        config,
        goals: {
          leftHandTarget: { x: offsetX, y: 2.3, z: 0 },
          rightHandTarget: { x: offsetX, y: 2.3, z: 0 }
        },
        yawSearchSteps: 96
      })
    );

    for (let index = 1; index < solves.length; index += 1) {
      expect(Math.abs(solves[index].leftArm.shoulder.x - solves[index - 1].leftArm.shoulder.x)).toBeLessThan(0.08);
      expect(Math.abs(solves[index].rightArm.shoulder.x - solves[index - 1].rightArm.shoulder.x)).toBeLessThan(0.08);
      expect(solves[index].leftArm.elbowPole.z).toBeGreaterThan(0);
      expect(solves[index].rightArm.elbowPole.z).toBeGreaterThan(0);
    }
  });
});
