import { describe, expect, it } from "vitest";
import { createDefaultState } from "@/state/defaults";
import { applyElementPreset, applyFlowerModePreset } from "@/state/presets";
import { SAME_TIME_PHASE_OFFSET, SPLIT_TIME_PHASE_OFFSET } from "@/state/constants";

describe("element presets", () => {
  it("earth sets same time, same direction", () => {
    const state = createDefaultState();
    const next = applyElementPreset(state, "earth");

    expect(next.hands.L.armPhase).toBeCloseTo(next.hands.R.armPhase + SAME_TIME_PHASE_OFFSET, 10);
    expect(Math.sign(next.hands.R.armSpeed)).toBe(Math.sign(next.hands.L.armSpeed));
  });

  it("air sets same time, opposite direction", () => {
    const state = createDefaultState();
    const next = applyElementPreset(state, "air");

    expect(next.hands.L.armPhase).toBeCloseTo(next.hands.R.armPhase + SAME_TIME_PHASE_OFFSET, 10);
    expect(Math.sign(next.hands.R.armSpeed)).toBe(-Math.sign(next.hands.L.armSpeed));
  });

  it("water sets split time, same direction", () => {
    const state = createDefaultState();
    const next = applyElementPreset(state, "water");

    expect(next.hands.L.armPhase).toBeCloseTo(next.hands.R.armPhase + SPLIT_TIME_PHASE_OFFSET, 10);
    expect(Math.sign(next.hands.R.armSpeed)).toBe(Math.sign(next.hands.L.armSpeed));
  });

  it("fire sets split time, opposite direction", () => {
    const state = createDefaultState();
    const next = applyElementPreset(state, "fire");

    expect(next.hands.L.armPhase).toBeCloseTo(next.hands.R.armPhase + SPLIT_TIME_PHASE_OFFSET, 10);
    expect(Math.sign(next.hands.R.armSpeed)).toBe(-Math.sign(next.hands.L.armSpeed));
  });
});

describe("flower presets", () => {
  it("inspin sets poi speed to +k*arm speed and resets poi phase", () => {
    const state = createDefaultState();
    const petals = 5;
    const next = applyFlowerModePreset(state, "inspin", petals);

    expect(next.hands.L.poiSpeed).toBeCloseTo(petals * next.hands.L.armSpeed, 10);
    expect(next.hands.R.poiSpeed).toBeCloseTo(petals * next.hands.R.armSpeed, 10);
    expect(next.hands.L.poiPhase).toBe(0);
    expect(next.hands.R.poiPhase).toBe(0);
  });

  it("antispin sets poi speed to -k*arm speed and resets poi phase", () => {
    const state = createDefaultState();
    const petals = 4;
    const next = applyFlowerModePreset(state, "antispin", petals);

    expect(next.hands.L.poiSpeed).toBeCloseTo(-petals * next.hands.L.armSpeed, 10);
    expect(next.hands.R.poiSpeed).toBeCloseTo(-petals * next.hands.R.armSpeed, 10);
    expect(next.hands.L.poiPhase).toBe(0);
    expect(next.hands.R.poiPhase).toBe(0);
  });
});
