import { PI } from "@/engine/constants";
import { prepareMultiRigSequence } from "@/engine/multirig";
import {
  buildCirclePendulumExperiment,
  createDefaultCirclePendulumExperiment,
  sampleCirclePendulumMotion
} from "@/lab/experiments/pendulum/circlePendulumExperiment";
import { describe, expect, it } from "vitest";

const TAU = Math.PI * 2;

describe("circle versus pendulum experiment", () => {
  it("uses one circle and one gravity pendulum cycle per unit by default", () => {
    const config = createDefaultCirclePendulumExperiment();
    const sequence = buildCirclePendulumExperiment(config);
    const prepared = prepareMultiRigSequence(sequence);

    expect(prepared).toMatchObject({ ok: true });
    const left = sequence.rigs.find((rig) => rig.rigId === "left")?.sequence.segments[0];
    const right = sequence.rigs.find((rig) => rig.rigId === "right")?.sequence.segments[0];
    if (!left || !right) throw new Error("Missing comparison rigs");

    expect(left.head.driver).toMatchObject({ kind: "circle", omega: -TAU });
    expect(right.head.driver).toMatchObject({ kind: "runtime", label: "normalized-gravity-pendulum" });
  });

  it("keeps the sine reference on the built-in pendulum driver", () => {
    const config = { ...createDefaultCirclePendulumExperiment(), curve: "sine" as const };
    const sequence = buildCirclePendulumExperiment(config);
    const right = sequence.rigs.find((rig) => rig.rigId === "right")?.sequence.segments[0];
    expect(right?.head.driver).toMatchObject({
      kind: "pendulum",
      amplitudeRad: PI / 2,
      cyclesPerUnit: 1,
      swingPhaseRad: 0
    });
  });

  it("provides deterministic experimental curve comparisons", () => {
    for (const curve of ["constant"] as const) {
      const config = { ...createDefaultCirclePendulumExperiment(), curve };
      const first = sampleCirclePendulumMotion(config, 0.125);
      const second = sampleCirclePendulumMotion(config, 0.125);
      expect(first).toEqual(second);
      expect(buildCirclePendulumExperiment(config).rigs[1]?.sequence.segments[0]?.head.driver).toMatchObject({
        kind: "runtime",
        label: "experimental-pendulum-curve"
      });
    }
  });

  it("keeps the default cardinal checkpoints aligned", () => {
    const config = createDefaultCirclePendulumExperiment();
    const samples = [0, 0.25, 0.5, 0.75, 1].map((time) =>
      sampleCirclePendulumMotion(config, time)
    );
    const degrees = samples.map((sample) =>
      [sample.circlePhaseAbs, sample.pendulumPhaseAbs].map(
        (phase) => Math.round(((phase * 180) / PI) * 1e6) / 1e6
      )
    );

    expect(degrees[0][0]).toBeCloseTo(-90, 6);
    expect(degrees[0][1]).toBeCloseTo(-90, 6);
    expect(degrees[1][0]).toBeCloseTo(-180, 6);
    expect(degrees[1][1]).toBeCloseTo(0, 6);
    expect(degrees[2][0]).toBeCloseTo(-270, 6);
    expect(degrees[2][1]).toBeCloseTo(-90, 6);
    expect(degrees[3][0]).toBeCloseTo(-360, 6);
    expect(degrees[3][1]).toBeCloseTo(-180, 6);
    expect(degrees[4][0]).toBeCloseTo(-450, 6);
    expect(degrees[4][1]).toBeCloseTo(-90, 6);
  });

  it("provides a normalized gravity reference with the same cardinal timing", () => {
    const config = { ...createDefaultCirclePendulumExperiment(), curve: "gravity" as const };
    const sequence = buildCirclePendulumExperiment(config);
    const prepared = prepareMultiRigSequence(sequence);
    expect(prepared).toMatchObject({ ok: true });

    const atBottom = sampleCirclePendulumMotion(config, 0);
    const atDeadPoint = sampleCirclePendulumMotion(config, 0.25);
    const atOppositeBottom = sampleCirclePendulumMotion(config, 0.5);

    expect(atBottom.pendulumPhaseAbs).toBeCloseTo(-PI / 2, 8);
    expect(atDeadPoint.pendulumPhaseAbs).toBeCloseTo(0, 5);
    expect(atOppositeBottom.pendulumPhaseAbs).toBeCloseTo(-PI / 2, 5);
    expect(Math.abs(atBottom.pendulumAngularVelocity)).toBeGreaterThan(
      Math.abs(atDeadPoint.pendulumAngularVelocity)
    );
  });
});
