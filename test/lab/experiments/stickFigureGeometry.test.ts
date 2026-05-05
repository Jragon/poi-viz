import { describe, expect, it } from "vitest";

import {
  computeSharedHandOverlapCircle,
  projectShoulderLine,
  solveBodyRigFromHands,
  solveStickArm,
  type BodyRigSolveInput
} from "@/lab/experiments/body-tracing/stickFigureGeometry";

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function getBaseRigInput(overrides: Partial<BodyRigSolveInput> = {}): BodyRigSolveInput {
  return {
    torsoCenter: { x: 200, y: 120 },
    shoulderY: 118,
    baseShoulderSpan: 140,
    maxYawRad: Math.PI / 3,
    upperArmLength: 75,
    forearmLength: 75,
    leftHandTarget: { x: 80, y: 190 },
    rightHandTarget: { x: 320, y: 190 },
    yawSearchSteps: 72,
    ...overrides
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

  it("points both elbows outward for an overhead shared hand target", () => {
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

describe("computeSharedHandOverlapCircle", () => {
  it("computes the largest neutral shared-hand circle inside both arm reaches", () => {
    const result = computeSharedHandOverlapCircle({
      torsoCenter: { x: 0, y: 0 },
      shoulderY: 0,
      baseShoulderSpan: 100,
      maxYawRad: Math.PI / 3,
      upperArmLength: 75,
      forearmLength: 75
    });

    expect(result.center).toEqual({ x: 0, y: 0 });
    expect(result.projectedShoulderSpan).toBeCloseTo(100);
    expect(result.radius).toBeCloseTo(100);
    expect(result.usesMaxYawCompression).toBe(false);
  });

  it("uses the compressed shoulder span when asked for the maximum yaw overlap circle", () => {
    const result = computeSharedHandOverlapCircle({
      torsoCenter: { x: 0, y: 0 },
      shoulderY: 0,
      baseShoulderSpan: 100,
      maxYawRad: Math.PI / 3,
      upperArmLength: 75,
      forearmLength: 75,
      useMaxYawCompression: true
    });

    expect(result.projectedShoulderSpan).toBeCloseTo(50);
    expect(result.radius).toBeCloseTo(125);
    expect(result.usesMaxYawCompression).toBe(true);
  });

  it("keeps sampled boundary points reachable with both hands exactly overlapped", () => {
    const circle = computeSharedHandOverlapCircle({
      torsoCenter: { x: 200, y: 120 },
      shoulderY: 120,
      baseShoulderSpan: 120,
      maxYawRad: Math.PI / 3,
      upperArmLength: 75,
      forearmLength: 75,
      minProjectedSpanRatio: 0.4,
      useMaxYawCompression: true
    });

    for (let index = 0; index < 64; index += 1) {
      const angle = (index / 64) * Math.PI * 2;
      const target = {
        x: circle.center.x + Math.cos(angle) * circle.radius,
        y: circle.center.y + Math.sin(angle) * circle.radius
      };
      const solve = solveBodyRigFromHands({
        torsoCenter: { x: 200, y: 120 },
        shoulderY: 120,
        baseShoulderSpan: 120,
        maxYawRad: Math.PI / 3,
        upperArmLength: 75,
        forearmLength: 75,
        leftHandTarget: target,
        rightHandTarget: target,
        minProjectedSpanRatio: 0.4,
        yawSearchSteps: 144
      });

      expect(solve.leftArm.hand.x).toBeCloseTo(solve.rightArm.hand.x);
      expect(solve.leftArm.hand.y).toBeCloseTo(solve.rightArm.hand.y);
      expect(solve.leftArm.isClamped).toBe(false);
      expect(solve.rightArm.isClamped).toBe(false);
      expect(solve.diagnostics.isBestEffort).toBe(false);
    }
  });

  it("marks at least one point just outside the shared circle as best effort", () => {
    const circle = computeSharedHandOverlapCircle({
      torsoCenter: { x: 200, y: 120 },
      shoulderY: 120,
      baseShoulderSpan: 120,
      maxYawRad: Math.PI / 3,
      upperArmLength: 75,
      forearmLength: 75,
      minProjectedSpanRatio: 0.4,
      useMaxYawCompression: true
    });
    const target = { x: circle.center.x + circle.radius + 1, y: circle.center.y };
    const solve = solveBodyRigFromHands({
      torsoCenter: { x: 200, y: 120 },
      shoulderY: 120,
      baseShoulderSpan: 120,
      maxYawRad: Math.PI / 3,
      upperArmLength: 75,
      forearmLength: 75,
      leftHandTarget: target,
      rightHandTarget: target,
      minProjectedSpanRatio: 0.4,
      yawSearchSteps: 144
    });

    expect(solve.diagnostics.isBestEffort).toBe(true);
    expect(solve.leftArm.isClamped || solve.rightArm.isClamped).toBe(true);
  });
});

describe("solveBodyRigFromHands", () => {
  it("infers neutral yaw for balanced hand targets", () => {
    const result = solveBodyRigFromHands(getBaseRigInput());

    expect(result.yawRad).toBeCloseTo(0);
    expect(result.shoulders.nearSide).toBeNull();
    expect(result.diagnostics.isBestEffort).toBe(false);
  });

  it("infers positive yaw when both hand targets are right-biased", () => {
    const result = solveBodyRigFromHands(
      getBaseRigInput({
        leftHandTarget: { x: 230, y: 185 },
        rightHandTarget: { x: 340, y: 185 }
      })
    );

    expect(result.yawRad).toBeGreaterThan(0);
    expect(result.shoulders.nearSide).toBe("right");
  });

  it("infers negative yaw when both hand targets are left-biased", () => {
    const result = solveBodyRigFromHands(
      getBaseRigInput({
        leftHandTarget: { x: 60, y: 185 },
        rightHandTarget: { x: 170, y: 185 }
      })
    );

    expect(result.yawRad).toBeLessThan(0);
    expect(result.shoulders.nearSide).toBe("left");
  });

  it("mirrors yaw sign for mirrored hand targets", () => {
    const rightBiased = solveBodyRigFromHands(
      getBaseRigInput({
        leftHandTarget: { x: 230, y: 185 },
        rightHandTarget: { x: 340, y: 185 }
      })
    );
    const leftBiased = solveBodyRigFromHands(
      getBaseRigInput({
        leftHandTarget: { x: 60, y: 185 },
        rightHandTarget: { x: 170, y: 185 }
      })
    );

    expect(rightBiased.yawRad).toBeCloseTo(-leftBiased.yawRad);
  });

  it("keeps tiny near-neutral offsets neutral", () => {
    const result = solveBodyRigFromHands(
      getBaseRigInput({
        leftHandTarget: { x: 83, y: 190 },
        rightHandTarget: { x: 321, y: 190 }
      })
    );

    expect(result.yawRad).toBeCloseTo(0);
  });

  it("returns deterministic output for identical inputs", () => {
    const input = getBaseRigInput({
      leftHandTarget: { x: 235, y: 185 },
      rightHandTarget: { x: 345, y: 185 }
    });

    expect(solveBodyRigFromHands(input)).toEqual(solveBodyRigFromHands(input));
  });

  it("returns a clamped best-effort pose for unreachable targets", () => {
    const result = solveBodyRigFromHands(
      getBaseRigInput({
        upperArmLength: 40,
        forearmLength: 40,
        leftHandTarget: { x: -120, y: 190 },
        rightHandTarget: { x: 520, y: 190 }
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
