import { describe, expect, it } from "vitest";

import {
  decodeBeatGraphFromUrlParams,
  encodeBeatGraphToUrlParams
} from "@/lab/experiments/mel-body-tracing/beat-graph/beatGraphUrlCodec";
import { createLowCommonCosmoBeatGraph } from "@/lab/experiments/mel-body-tracing/beat-graph/cosmoSeed";

describe("beatGraphUrlCodec", () => {
  it("round-trips a two-track beat graph", () => {
    const graph = createLowCommonCosmoBeatGraph();
    const params = encodeBeatGraphToUrlParams(graph);

    expect(params).not.toBeNull();
    const decoded = decodeBeatGraphFromUrlParams(params ?? {});

    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.graph).toEqual(graph);
  });

  it("rejects unsupported track counts", () => {
    const graph = createLowCommonCosmoBeatGraph();
    expect(encodeBeatGraphToUrlParams({ ...graph, tracks: graph.tracks.slice(0, 1) })).toBeNull();
  });

  it("rejects malformed track payloads", () => {
    expect(decodeBeatGraphFromUrlParams({ s: "8", lt: "cw-up-2a", rt: "nope" })).toEqual({
      ok: false,
      reason: "Beat graph URL contains invalid track data"
    });
  });
});
