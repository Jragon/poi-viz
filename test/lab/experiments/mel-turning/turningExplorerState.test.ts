import { describe, expect, it } from "vitest";

import type {
  TurningReelConfig,
  TurningReelDirection,
  TurningReelOffset,
  TurningReelPosition
} from "@/lab/experiments/mel-turning/adapter/melBeatGraphAdapter";
import {
  constrainTurningTarget,
  getCompatibleTargetOffsets,
  getObserverPreservingTargetDirection,
  getTurningEndpointCompatibility
} from "@/lab/experiments/mel-turning/model/turningEndpointCompatibility";
import {
  DEFAULT_TURNING_EXPLORER_STATE,
  parseTurningExplorerState,
  serializeTurningExplorerState
} from "@/lab/experiments/mel-turning/model/turningExplorerState";

const LOW_POSITIONS = [
  "low-native",
  "low-non-native",
  "low-back"
] as const satisfies readonly TurningReelPosition[];
const DIRECTIONS = [
  { mode: "same", direction: "clockwise" },
  { mode: "same", direction: "counterclockwise" },
  { mode: "opposite", flow: "inwards" },
  { mode: "opposite", flow: "outwards" }
] as const satisfies readonly TurningReelDirection[];
const OFFSETS = [0, 1, 2, 3] as const satisfies readonly TurningReelOffset[];

describe("turning explorer URL state", () => {
  it("round-trips compatible low-reel endpoints and turn direction", () => {
    const state = {
      source: {
        left: "low-back",
        right: "low-native",
        direction: { mode: "same", direction: "counterclockwise" },
        offset: 3
      },
      target: {
        left: "low-non-native",
        right: "low-back",
        direction: { mode: "same", direction: "clockwise" },
        offset: 2
      },
      turnDirection: "right"
    } as const;

    expect(parseTurningExplorerState(serializeTurningExplorerState(state))).toEqual(state);
  });

  it("rejects high positions and invalid values", () => {
    expect(
      parseTurningExplorerState({
        sl: "high-native",
        sr: "nope",
        sd: "sideways",
        so: "8",
        turn: "around"
      })
    ).toEqual(DEFAULT_TURNING_EXPLORER_STATE);
  });

  it("canonicalizes incompatible legacy links without changing target positions", () => {
    const parsed = parseTurningExplorerState({
      sl: "low-native",
      sr: "low-native",
      sd: "same-cw",
      so: "0",
      tl: "low-native",
      tr: "low-non-native",
      td: "same-cw",
      to: "0",
      turn: "right"
    });

    expect(parsed).toEqual({
      source: {
        left: "low-native",
        right: "low-native",
        direction: { mode: "same", direction: "clockwise" },
        offset: 0
      },
      target: {
        left: "low-native",
        right: "low-non-native",
        direction: { mode: "same", direction: "counterclockwise" },
        offset: 1
      },
      turnDirection: "right"
    });
    expect(serializeTurningExplorerState(parsed)).toMatchObject({
      tl: "low-native",
      tr: "low-non-native",
      td: "same-ccw",
      to: "1"
    });
  });
});

describe("turning endpoint compatibility", () => {
  it("derives the inverse direction for all four direction modes", () => {
    expect(DIRECTIONS.map((direction) => getObserverPreservingTargetDirection(direction))).toEqual([
      { mode: "same", direction: "counterclockwise" },
      { mode: "same", direction: "clockwise" },
      { mode: "opposite", flow: "outwards" },
      { mode: "opposite", flow: "inwards" }
    ]);
  });

  it("provides exactly two timing-compatible target offsets for every low-reel endpoint pair", () => {
    let sourceCount = 0;

    for (const left of LOW_POSITIONS) {
      for (const right of LOW_POSITIONS) {
        for (const direction of DIRECTIONS) {
          for (const offset of OFFSETS) {
            const source: TurningReelConfig = { left, right, direction, offset };

            for (const targetLeft of LOW_POSITIONS) {
              for (const targetRight of LOW_POSITIONS) {
                const compatibleOffsets = getCompatibleTargetOffsets(source, {
                  left: targetLeft,
                  right: targetRight
                });

                expect(compatibleOffsets).toHaveLength(2);
                expect(new Set(compatibleOffsets).size).toBe(2);

                const representative = getTurningEndpointCompatibility(source, {
                  left: targetLeft,
                  right: targetRight,
                  direction: getObserverPreservingTargetDirection(direction),
                  offset: compatibleOffsets[0]
                });
                const expectedParity =
                  representative.sourcePatternType === representative.targetPatternType
                    ? source.offset % 2
                    : (source.offset + 1) % 2;
                expect(
                  compatibleOffsets.every(
                    (compatibleOffset) => compatibleOffset % 2 === expectedParity
                  )
                ).toBe(true);

                for (const targetOffset of OFFSETS) {
                  const compatibility = getTurningEndpointCompatibility(source, {
                    left: targetLeft,
                    right: targetRight,
                    direction: getObserverPreservingTargetDirection(direction),
                    offset: targetOffset
                  });

                  expect(compatibility.compatible).toBe(compatibleOffsets.includes(targetOffset));
                  if (compatibility.compatible) {
                    expect(compatibility.targetTiming).toBe(compatibility.sourceTiming);
                  } else {
                    expect(compatibility.diagnostics).toEqual([
                      expect.objectContaining({ code: "TARGET_TIMING_MISMATCH" })
                    ]);
                  }
                }
              }
            }

            sourceCount += 1;
          }
        }
      }
    }

    expect(sourceCount).toBe(144);
  });

  it("preserves a valid target offset and flips only its parity when adjustment is required", () => {
    const source: TurningReelConfig = {
      left: "low-native",
      right: "low-native",
      direction: { mode: "same", direction: "clockwise" },
      offset: 0
    };
    const requestedTarget: TurningReelConfig = {
      left: "low-native",
      right: "low-non-native",
      direction: { mode: "same", direction: "clockwise" },
      offset: 2
    };
    const adjusted = constrainTurningTarget(source, requestedTarget);
    const preserved = constrainTurningTarget(source, { ...requestedTarget, offset: 1 });

    expect(adjusted).toMatchObject({
      target: {
        left: requestedTarget.left,
        right: requestedTarget.right,
        direction: { mode: "same", direction: "counterclockwise" },
        offset: 3
      },
      compatibleOffsets: [1, 3],
      directionAdjusted: true,
      offsetAdjusted: true
    });
    expect(preserved.target.offset).toBe(1);
    expect(preserved.offsetAdjusted).toBe(false);
  });

  it("defensively diagnoses incompatible programmatic endpoints", () => {
    const compatibility = getTurningEndpointCompatibility(
      {
        left: "low-native",
        right: "low-native",
        direction: { mode: "same", direction: "clockwise" },
        offset: 0
      },
      {
        left: "low-native",
        right: "low-non-native",
        direction: { mode: "same", direction: "clockwise" },
        offset: 0
      }
    );

    expect(compatibility.compatible).toBe(false);
    expect(compatibility.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "TARGET_DIRECTION_MISMATCH",
      "TARGET_TIMING_MISMATCH"
    ]);
  });
});
