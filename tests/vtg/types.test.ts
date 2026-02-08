import { PI } from "@/state/constants";
import {
  headSpeedRadiansPerBeatToPoiCyclesPerArmCycle,
  poiCyclesPerArmCycleToHeadSpeedRadiansPerBeat,
  VTG_CANONICAL_ARM_SPEED_RADIANS_PER_BEAT
} from "@/vtg/types";
import { describe, expect, it } from "vitest";

describe("VTG type semantics", () => {
  it("defines canonical arm speed as one cycle per beat", () => {
    expect(VTG_CANONICAL_ARM_SPEED_RADIANS_PER_BEAT).toBeCloseTo(2 * PI, 12);
  });

  it("converts signed poiCyclesPerArmCycle to head speed in radians per beat", () => {
    expect(poiCyclesPerArmCycleToHeadSpeedRadiansPerBeat(3)).toBeCloseTo(6 * PI, 12);
    expect(poiCyclesPerArmCycleToHeadSpeedRadiansPerBeat(-1)).toBeCloseTo(-2 * PI, 12);
  });

  it("round-trips head speed and signed poiCyclesPerArmCycle", () => {
    const input = -3;
    const headSpeed = poiCyclesPerArmCycleToHeadSpeedRadiansPerBeat(input);
    expect(headSpeedRadiansPerBeatToPoiCyclesPerArmCycle(headSpeed)).toBeCloseTo(input, 12);
  });
});
