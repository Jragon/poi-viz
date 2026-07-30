import { describe, expect, it } from "vitest";

import {
  DEFAULT_TURNING_EXPLORER_STATE,
  parseTurningExplorerState,
  serializeTurningExplorerState
} from "@/lab/experiments/mel-turning/model/turningExplorerState";

describe("turning explorer URL state", () => {
  it("round-trips independent low-reel endpoints and turn direction", () => {
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
        direction: { mode: "opposite", flow: "outwards" },
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
});
