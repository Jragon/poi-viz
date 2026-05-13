import { describe, expect, it } from "vitest";

import {
  DEFAULT_EXPLORER_STATE,
  parseExplorerState,
  serializeExplorerState
} from "@/lab/experiments/mel-body-tracing/explorers/explorerUrlCodec";

describe("explorerUrlCodec", () => {
  it("keeps default reel URLs clean", () => {
    expect(serializeExplorerState(DEFAULT_EXPLORER_STATE)).toEqual({ t: "reel" });
  });

  it("serializes only active-tab non-default params", () => {
    expect(
      serializeExplorerState({
        ...DEFAULT_EXPLORER_STATE,
        tab: "wrap",
        reel: { ...DEFAULT_EXPLORER_STATE.reel, left: "high-native" },
        wrap: { ...DEFAULT_EXPLORER_STATE.wrap, offset: 2 }
      })
    ).toEqual({ t: "wrap", offset: "2" });
  });

  it("round-trips a changed cosmo config", () => {
    const state = parseExplorerState({
      t: "cosmo",
      la: "high-native",
      lb: "low-back",
      ra: "low-native",
      rb: "high-back",
      dir: "same-ccw",
      offset: "7"
    });

    expect(serializeExplorerState(state)).toEqual({
      t: "cosmo",
      la: "high-native",
      ra: "low-native",
      rb: "high-back",
      dir: "same-ccw",
      offset: "7"
    });
  });

  it("falls back to defaults for invalid values", () => {
    const state = parseExplorerState({ t: "bad", left: "nope", offset: "99" });

    expect(state.tab).toBe("reel");
    expect(state.reel).toEqual(DEFAULT_EXPLORER_STATE.reel);
  });
});
