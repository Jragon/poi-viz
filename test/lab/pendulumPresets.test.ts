import { toCartesianRigPose } from "@/engine/cartesian";
import { evalPreparedMultiRigSequenceAt, prepareMultiRigSequence } from "@/engine/multirig";
import {
  buildPendulumLabSequence,
  EXTENDULUM_HEAD_CYCLES_PER_UNIT,
  PENDULUM_PRESETS,
  type PendulumLabConfig
} from "@/lab/experiments/pendulum/pendulumPresets";
import { describe, expect, it } from "vitest";

const baseConfig: PendulumLabConfig = {
  presetId: "ordinary",
  amplitudeRad: Math.PI / 2,
  cyclesPerUnit: 0.5,
  swingPhaseRad: 0,
  pairOffsetRad: 0
};

describe("pendulum lab presets", () => {
  it("builds a valid wall-plane sequence for every preset", () => {
    for (const preset of PENDULUM_PRESETS) {
      const result = prepareMultiRigSequence(
        buildPendulumLabSequence({
          ...baseConfig,
          presetId: preset.id,
          pairOffsetRad: preset.defaultPairOffsetRad
        })
      );

      expect(result, preset.id).toMatchObject({ ok: true });
    }
  });

  it("uses extended pendulums for every two-poi timing preset", () => {
    for (const presetId of ["same-time", "quarter-time", "mirrored"] as const) {
      const preset = PENDULUM_PRESETS.find((candidate) => candidate.id === presetId);
      if (!preset) throw new Error(`missing ${presetId} preset`);
      const sequence = buildPendulumLabSequence({
        ...baseConfig,
        presetId,
        pairOffsetRad: preset.defaultPairOffsetRad
      });

      for (const rig of sequence.rigs) {
        const segment = rig.sequence.segments[0];
        if (!segment) throw new Error(`${presetId} must contain a segment`);
        expect(segment.hand.driver.kind).toBe("pendulum");
        expect(segment.head.driver.kind).toBe("pendulum");
        if (segment.hand.driver.kind !== "pendulum") continue;
        if (segment.head.driver.kind !== "pendulum") continue;
        expect(segment.hand.driver.swingPhaseRad).toBe(segment.head.driver.swingPhaseRad);
      }
    }
  });

  it("locks extendulum to one hand circle and two poi downswings", () => {
    const sequence = buildPendulumLabSequence({
      ...baseConfig,
      presetId: "extendulum",
      cyclesPerUnit: 1
    });
    const segment = sequence.rigs[0]?.sequence.segments[0];
    if (!segment) throw new Error("extendulum must contain a segment");
    if (segment.hand.driver.kind !== "circle") throw new Error("hand must use a circle");
    if (segment.head.driver.kind !== "pendulum") throw new Error("head must use a pendulum");

    const handCircles = (segment.hand.driver.omega * segment.durationUnits) / (Math.PI * 2);
    const headOscillatorCycles = segment.head.driver.cyclesPerUnit * segment.durationUnits;

    expect(handCircles).toBe(1);
    expect(segment.head.driver.cyclesPerUnit).toBe(EXTENDULUM_HEAD_CYCLES_PER_UNIT);
    expect(headOscillatorCycles).toBe(1);
    expect(headOscillatorCycles * 2).toBe(2);
  });

  it("keeps the simple isolated-pendulum tether midpoint at the rig origin", () => {
    const result = prepareMultiRigSequence(
      buildPendulumLabSequence({ ...baseConfig, presetId: "isolated" })
    );
    if (!result.ok) throw new Error("isolated preset must prepare");

    for (const time of [0, 0.25, 0.5, 0.75, 1]) {
      const evaluated = evalPreparedMultiRigSequenceAt(result.prepared, time);
      if (!evaluated.ok) throw new Error("isolated preset must evaluate");

      const pose = evaluated.poses.poi;
      if (!pose) throw new Error("isolated preset must contain the poi rig");
      const cartesian = toCartesianRigPose(pose.pose);
      expect((cartesian.handPosition.x + cartesian.headPosition.x) / 2).toBeCloseTo(0, 12);
      expect((cartesian.handPosition.y + cartesian.headPosition.y) / 2).toBeCloseTo(0, 12);
    }
  });
});
