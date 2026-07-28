import { describe, expect, it } from "vitest";

import { getVerifiedTurningTrace } from "@/lab/experiments/mel-turning/fixtures/verifiedTurningTraces";
import {
  getTurningFacingAtStep,
  projectTurningHandSide,
  projectTurningLaneId
} from "@/lab/experiments/mel-turning/model/turningDisplayFrame";
import type { TurningLaneId } from "@/lab/experiments/mel-turning/model/turningTypes";

const LANES: readonly TurningLaneId[] = [
  "left-high",
  "left-low",
  "center",
  "right-low",
  "right-high"
];

describe("turning display frames", () => {
  it("keeps every lane fixed in the body-relative frame", () => {
    for (const facing of [0, 180] as const) {
      for (const lane of LANES) {
        expect(projectTurningLaneId(lane, facing, "body-relative")).toBe(lane);
      }
    }
  });

  it("mirrors only left and right lanes after the turn in the observer-relative frame", () => {
    expect(projectTurningLaneId("left-high", 180, "observer-relative")).toBe("right-high");
    expect(projectTurningLaneId("left-low", 180, "observer-relative")).toBe("right-low");
    expect(projectTurningLaneId("center", 180, "observer-relative")).toBe("center");
    expect(projectTurningLaneId("right-low", 180, "observer-relative")).toBe("left-low");
    expect(projectTurningLaneId("right-high", 180, "observer-relative")).toBe("left-high");

    for (const lane of LANES) {
      expect(projectTurningLaneId(lane, 0, "observer-relative")).toBe(lane);
    }
  });

  it("projects hand annotation sides with the same observer-frame mirror", () => {
    expect(projectTurningHandSide("left", 0, "observer-relative")).toBe("left");
    expect(projectTurningHandSide("right", 0, "observer-relative")).toBe("right");
    expect(projectTurningHandSide("left", 180, "observer-relative")).toBe("right");
    expect(projectTurningHandSide("right", 180, "observer-relative")).toBe("left");
    expect(projectTurningHandSide("left", 180, "body-relative")).toBe("left");
  });

  it("changes facing only after the shared turn interval", () => {
    const trace = getVerifiedTurningTrace("ts-left-chasing-1-to-2");

    expect(getTurningFacingAtStep(trace, 7)).toBe(0);
    expect(getTurningFacingAtStep(trace, 8)).toBe(180);
  });
});
