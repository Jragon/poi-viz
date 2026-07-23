import { evalPreparedMultiRigSequenceAt, prepareMultiRigSequence } from "@/engine/multirig";
import {
  buildRastaxelPendulumExperiment,
  createDefaultRastaxelPendulumExperiment,
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
        const phaseDelta = Math.atan2(Math.sin(afterPhase - beforePhase), Math.cos(afterPhase - beforePhase));
        expect(Math.abs(phaseDelta)).toBeLessThan(1e-5);
      }
    }
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

  it("uses the same global direction for the pendulum and circle", () => {
    const inward = createDefaultRastaxelPendulumExperiment();
    const outward = { ...inward, direction: 1 as const };

    const inwardBefore = sampleRastaxelPendulumMotion(inward, 1 - 1e-8);
    const inwardAfter = sampleRastaxelPendulumMotion(inward, 1);
    const outwardBefore = sampleRastaxelPendulumMotion(outward, 1 - 1e-8);
    const outwardAfter = sampleRastaxelPendulumMotion(outward, 1);

    expect(Math.sign(inwardBefore.angularVelocity)).toBe(-1);
    expect(Math.sign(inwardAfter.angularVelocity)).toBe(-1);
    expect(Math.sign(outwardBefore.angularVelocity)).toBe(1);
    expect(Math.sign(outwardAfter.angularVelocity)).toBe(1);
  });

  it("applies right-track offsets in quarter-unit steps", () => {
    const config = createDefaultRastaxelPendulumExperiment();
    const sequence = buildRastaxelPendulumExperiment(config);
    const leftLabels = sequence.rigs[0]?.sequence.segments.map((segment) => segment.head.driver.kind === "runtime" ? segment.head.driver.label : "");
    const rightLabels = sequence.rigs[1]?.sequence.segments.map((segment) => segment.head.driver.kind === "runtime" ? segment.head.driver.label : "");
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

    const halfMotif = sampleRastaxelPendulumMotion(config, 0.5);
    const shifted = sampleRastaxelPendulumMotion(config, 0, 2);
    expect(shifted.phaseAbs).toBeCloseTo(halfMotif.phaseAbs, 8);
    expect(shifted.speedInExtensions).toBeCloseTo(halfMotif.speedInExtensions, 8);

    const wrapped = sampleRastaxelPendulumMotion(config, 2, 0);
    expect(wrapped.phaseAbs).toBeCloseTo(sampleRastaxelPendulumMotion(config, 0).phaseAbs, 8);
  });

  it("keeps circle speed normalized to one extension per unit", () => {
    const config = createDefaultRastaxelPendulumExperiment();
    expect(Math.abs(sampleRastaxelPendulumMotion(config, 1.5).angularVelocity)).toBeCloseTo(TAU, 8);
    expect(sampleRastaxelPendulumMotion(config, 1.5).speedInExtensions).toBeCloseTo(1, 8);
  });
});
