import { PI } from "@/state/constants";
import {
  headSpeedRadiansPerBeatToPoiHeadCyclesPerArmCycle,
  poiHeadCyclesPerArmCycleToHeadSpeedRadiansPerBeat,
  VTG_CANONICAL_ARM_SPEED_RADIANS_PER_BEAT
} from "@/vtg/types";
import { describe, expect, it } from "vitest";

describe("VTG type semantics", () => {
  it("defines canonical arm speed as one cycle per beat", () => {
    expect(VTG_CANONICAL_ARM_SPEED_RADIANS_PER_BEAT).toBeCloseTo(2 * PI, 12);
  });

  it("converts signed poiHeadCyclesPerArmCycle to head speed in radians per beat", () => {
    expect(poiHeadCyclesPerArmCycleToHeadSpeedRadiansPerBeat(3)).toBeCloseTo(6 * PI, 12);
    expect(poiHeadCyclesPerArmCycleToHeadSpeedRadiansPerBeat(-1)).toBeCloseTo(-2 * PI, 12);
  });

  it("round-trips head speed and signed poiHeadCyclesPerArmCycle", () => {
    const input = -3;
    const headSpeed = poiHeadCyclesPerArmCycleToHeadSpeedRadiansPerBeat(input);
    expect(headSpeedRadiansPerBeatToPoiHeadCyclesPerArmCycle(headSpeed)).toBeCloseTo(input, 12);
  });
});
