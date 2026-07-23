import { evalPreparedMultiRigSequenceAt, prepareMultiRigSequence } from "@/engine/multirig";
import {
  buildRastaxelPendulumExperiment,
  createDefaultRastaxelPendulumExperiment,
  resolveRastaxelDirection,
  sampleRastaxelHandMotion,
  sampleRastaxelPendulumMotion
} from "@/lab/experiments/pendulum/rastaxelPendulumExperiment";
import { describe, expect, it } from "vitest";

const TAU = Math.PI * 2;

describe("Rastaxel pendulum motif", () => {
  it("builds two deterministic two-unit runtime motifs", () => {
    const config = createDefaultRastaxelPendulumExperiment();
    const sequence = buildRastaxelPendulumExperiment(config);
    const prepared = prepareMultiRigSequence(sequence);

    expect(prepared).toMatchObject({ ok: true });
    expect(sequence.rigs).toHaveLength(2);
    expect(sequence.rigs[0]?.sequence.segments).toHaveLength(8);
    expect(sequence.rigs[0]?.sequence.segments[0]).toMatchObject({ durationUnits: 0.25 });
    expect(sequence.rigs[0]?.sequence.segments[0]?.head.driver).toMatchObject({
      kind: "runtime",
      label: "rastaxel-pendulum-step-0"
    });
  });

  it("keeps each explicit quarter-step continuous at its boundary", () => {
    const config = createDefaultRastaxelPendulumExperiment();
    const sequence = buildRastaxelPendulumExperiment(config);
    const prepared = prepareMultiRigSequence(sequence);
    if (!prepared.ok) throw new Error("Expected Rastaxel sequence to prepare");

    for (const boundary of [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75]) {
      const before = evalPreparedMultiRigSequenceAt(prepared.prepared, boundary - 1e-7);
      const after = evalPreparedMultiRigSequenceAt(prepared.prepared, boundary);
      if (!before.ok || !after.ok) throw new Error("Expected boundary samples to evaluate");

      for (const rigId of ["left", "right"] as const) {
        const beforePhase = before.poses[rigId]?.pose.headPose.phaseAbs ?? 0;
        const afterPhase = after.poses[rigId]?.pose.headPose.phaseAbs ?? 0;
        const phaseDelta = Math.atan2(
          Math.sin(afterPhase - beforePhase),
          Math.cos(afterPhase - beforePhase)
        );
        expect(Math.abs(phaseDelta)).toBeLessThan(1e-5);
      }
    }
  });

  it("supports independent hand drivers with continuous circle motion", () => {
    const config = {
      ...createDefaultRastaxelPendulumExperiment(),
      leftHandDriver: {
        radius: 0.7,
        startPhaseDeg: 15,
        omega: 1
      },
      rightHandDriver: {
        radius: 0.4,
        startPhaseDeg: -45,
        omega: -0.5
      }
    };
    const sequence = buildRastaxelPendulumExperiment(config);
    const prepared = prepareMultiRigSequence(sequence);
    if (!prepared.ok) throw new Error("Expected Rastaxel sequence to prepare");

    expect(sequence.rigs[0]?.sequence.segments[0]?.hand).toMatchObject({
      startPose: { phaseAbs: (15 * Math.PI) / 180, radius: 0.7 },
      driver: { kind: "circle", omega: TAU }
    });
    expect(sequence.rigs[1]?.sequence.segments[0]?.hand).toMatchObject({
      startPose: { phaseAbs: (-45 * Math.PI) / 180 - TAU / 2, radius: 0.4 },
      driver: { kind: "circle", omega: -TAU / 2 }
    });

    for (const boundary of [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75]) {
      const before = evalPreparedMultiRigSequenceAt(prepared.prepared, boundary - 1e-7);
      const after = evalPreparedMultiRigSequenceAt(prepared.prepared, boundary);
      if (!before.ok || !after.ok) throw new Error("Expected hand boundary samples to evaluate");

      for (const rigId of ["left", "right"] as const) {
        const beforePhase = before.poses[rigId]?.pose.handPose.phaseAbs ?? 0;
        const afterPhase = after.poses[rigId]?.pose.handPose.phaseAbs ?? 0;
        const phaseDelta = Math.atan2(
          Math.sin(afterPhase - beforePhase),
          Math.cos(afterPhase - beforePhase)
        );
        expect(Math.abs(phaseDelta)).toBeLessThan(1e-5);
      }
    }
  });

  it("keeps static hand drivers at their configured phase", () => {
    const config = createDefaultRastaxelPendulumExperiment();
    const left = sampleRastaxelHandMotion(config, "left", 1.25, 0);
    const right = sampleRastaxelHandMotion(config, "right", 1.25, 4);

    expect(left).toEqual({ phaseAbs: -Math.PI / 2, radius: 0.5, omegaRadPerUnit: 0 });
    expect(right).toEqual({ phaseAbs: -Math.PI / 2, radius: 0.5, omegaRadPerUnit: 0 });
  });

  it("uses a pendulum for the first unit and a circle for the second", () => {
    const config = createDefaultRastaxelPendulumExperiment();
    const atBottom = sampleRastaxelPendulumMotion(config, 0);
    const atDeadpoint = sampleRastaxelPendulumMotion(config, 0.25);
    const atHandoff = sampleRastaxelPendulumMotion(config, 1);
    const atCircleQuarter = sampleRastaxelPendulumMotion(config, 1.25);

    expect(atBottom.segment).toBe("pendulum");
    expect(atDeadpoint.segment).toBe("pendulum");
    expect(atHandoff.segment).toBe("circle");
    expect(atCircleQuarter.segment).toBe("circle");
    expect(atBottom.phaseAbs).toBeCloseTo(-Math.PI / 2, 6);
    expect(atDeadpoint.phaseAbs).toBeCloseTo(-Math.PI, 4);
    expect(atHandoff.phaseAbs).toBeCloseTo(-Math.PI / 2, 6);
    expect(atCircleQuarter.phaseAbs).toBeCloseTo(-Math.PI, 6);
  });

  it("exposes the raw speed discontinuity at the pendulum-to-circle handoff", () => {
    const config = createDefaultRastaxelPendulumExperiment();
    const incomingSample = sampleRastaxelPendulumMotion(config, 1 - 1e-8);
    const outgoingSample = sampleRastaxelPendulumMotion(config, 1);
    const incoming = incomingSample.speedInExtensions;
    const outgoing = outgoingSample.speedInExtensions;

    expect(outgoing).toBeCloseTo(1, 8);
    expect(incoming).toBeGreaterThan(1.5);
    expect(incoming / outgoing).toBeGreaterThan(1.5);
    expect(Math.sign(incomingSample.angularVelocity)).toBe(
      Math.sign(outgoingSample.angularVelocity)
    );
  });

  it("maps anatomical flow to handed phase directions", () => {
    expect(resolveRastaxelDirection("left", "inwards")).toBe(-1);
    expect(resolveRastaxelDirection("left", "outwards")).toBe(1);
    expect(resolveRastaxelDirection("right", "inwards")).toBe(1);
    expect(resolveRastaxelDirection("right", "outwards")).toBe(-1);
  });

  it("keeps each hand's pendulum and circle direction aligned", () => {
    const config = createDefaultRastaxelPendulumExperiment();
    const leftBefore = sampleRastaxelPendulumMotion(config, 1 - 1e-8, 0, "left");
    const leftAfter = sampleRastaxelPendulumMotion(config, 1, 0, "left");
    const rightBefore = sampleRastaxelPendulumMotion(config, 1 - 1e-8, 0, "right");
    const rightAfter = sampleRastaxelPendulumMotion(config, 1, 0, "right");

    expect(Math.sign(leftBefore.angularVelocity)).toBe(-1);
    expect(Math.sign(leftAfter.angularVelocity)).toBe(-1);
    expect(Math.sign(rightBefore.angularVelocity)).toBe(1);
    expect(Math.sign(rightAfter.angularVelocity)).toBe(1);
    expect(Math.sign(leftAfter.angularVelocity)).not.toBe(Math.sign(rightAfter.angularVelocity));
  });

  it.each([
    ["inwards", "inwards", -1, 1],
    ["outwards", "outwards", 1, -1],
    ["inwards", "outwards", -1, -1],
    ["outwards", "inwards", 1, 1]
  ] as const)("supports %s left / %s right flow", (leftFlow, rightFlow, leftSign, rightSign) => {
    const config = {
      ...createDefaultRastaxelPendulumExperiment(),
      leftFlow,
      rightFlow
    };
    expect(Math.sign(sampleRastaxelPendulumMotion(config, 1.5, 0, "left").angularVelocity)).toBe(
      leftSign
    );
    expect(Math.sign(sampleRastaxelPendulumMotion(config, 1.5, 0, "right").angularVelocity)).toBe(
      rightSign
    );
  });

  it("applies right-track offsets in quarter-unit steps", () => {
    const config = createDefaultRastaxelPendulumExperiment();
    const sequence = buildRastaxelPendulumExperiment(config);
    const leftLabels = sequence.rigs[0]?.sequence.segments.map((segment) =>
      segment.head.driver.kind === "runtime" ? segment.head.driver.label : ""
    );
    const rightLabels = sequence.rigs[1]?.sequence.segments.map((segment) =>
      segment.head.driver.kind === "runtime" ? segment.head.driver.label : ""
    );
    expect(leftLabels).toEqual([
      "rastaxel-pendulum-step-0",
      "rastaxel-pendulum-step-1",
      "rastaxel-pendulum-step-2",
      "rastaxel-pendulum-step-3",
      "rastaxel-pendulum-step-4",
      "rastaxel-pendulum-step-5",
      "rastaxel-pendulum-step-6",
      "rastaxel-pendulum-step-7"
    ]);
    expect(rightLabels).toEqual([
      "rastaxel-pendulum-step-4",
      "rastaxel-pendulum-step-5",
      "rastaxel-pendulum-step-6",
      "rastaxel-pendulum-step-7",
      "rastaxel-pendulum-step-0",
      "rastaxel-pendulum-step-1",
      "rastaxel-pendulum-step-2",
      "rastaxel-pendulum-step-3"
    ]);

    const halfMotif = sampleRastaxelPendulumMotion(config, 0.5, 0, "left");
    const shifted = sampleRastaxelPendulumMotion(config, 0, 2, "left");
    expect(shifted.phaseAbs).toBeCloseTo(halfMotif.phaseAbs, 8);
    expect(shifted.speedInExtensions).toBeCloseTo(halfMotif.speedInExtensions, 8);

    const wrapped = sampleRastaxelPendulumMotion(config, 2, 0, "left");
    expect(wrapped.phaseAbs).toBeCloseTo(
      sampleRastaxelPendulumMotion(config, 0, 0, "left").phaseAbs,
      8
    );
  });

  it("keeps circle speed normalized to one extension per unit", () => {
    const config = createDefaultRastaxelPendulumExperiment();
    expect(
      Math.abs(sampleRastaxelPendulumMotion(config, 1.5, 0, "left").angularVelocity)
    ).toBeCloseTo(TAU, 8);
    expect(sampleRastaxelPendulumMotion(config, 1.5, 0, "right").speedInExtensions).toBeCloseTo(
      1,
      8
    );
  });
});
