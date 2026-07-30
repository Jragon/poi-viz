import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/lab/experiments/mel-turning/MelTurningLabPage.vue"),
  "utf8"
);

describe("MelTurningLabPage source boundary", () => {
  it("uses shortest multi-edge solver routes instead of the direct-search candidate layer", () => {
    expect(source).toContain("solveLowReelTurningRoutes");
    expect(source).toContain("maxExtraHalfbeats: 0");
    expect(source).toContain("includeUnresolved: true");
    expect(source).toContain("route.isShortest");
    expect(source).not.toContain("searchLowReelDirectTurns");
    expect(source).not.toContain("buildLowReelTurningTrace(searchResult");
  });

  it("offers two graph frames and a playback-synchronised steps table", () => {
    expect(source).toContain("Body-relative graph");
    expect(source).toContain("Observer-relative graph");
    expect(source).toContain("Steps table");
    expect(source).toContain("LowReelRouteStepsTable");
    expect(source).toContain('@select-step="selectTableStep"');
  });
});
