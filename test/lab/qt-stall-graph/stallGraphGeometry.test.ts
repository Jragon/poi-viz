import { buildStallGraphGeometry } from "@/lab/experiments/qt-stall-graph/stallGraphGeometry";
import type { StallPatternDraft } from "@/lab/experiments/qt-stall-graph/stallPattern";
import { describe, expect, it } from "vitest";

function pattern(left: string, right: string | null = null): StallPatternDraft {
  return {
    version: 1,
    beatCount: left.length,
    tracks: {
      left: Array.from(left).map((step) => (step === "_" ? null : (step as "U" | "R" | "D" | "L"))),
      right:
        right === null
          ? null
          : Array.from(right).map((step) => (step === "_" ? null : (step as "U" | "R" | "D" | "L")))
    }
  };
}

describe("stall graph geometry", () => {
  it("makes a compact horizontal four-beat graph close to card proportions", () => {
    const geometry = buildStallGraphGeometry(pattern("URDL", "RDLU"), {
      orientation: "horizontal",
      density: "compact"
    });

    expect(geometry.width).toBe(174);
    expect(geometry.height).toBe(168);
    expect(geometry.points).toHaveLength(10);
    expect(geometry.connectors).toHaveLength(8);
    expect(geometry.beatLabels.map((label) => label.text)).toEqual(["1", "2", "3", "4", "loop"]);
  });

  it("keeps a 24-beat horizontal editor at fixed height and scrollable width", () => {
    const geometry = buildStallGraphGeometry(pattern("URDL".repeat(6)), {
      orientation: "horizontal",
      density: "editor"
    });

    expect(geometry.width).toBe(1118);
    expect(geometry.height).toBe(238);
  });

  it("swaps the time and cardinal axes in vertical orientation", () => {
    const horizontal = buildStallGraphGeometry(pattern("URDL"), {
      orientation: "horizontal",
      density: "editor"
    });
    const vertical = buildStallGraphGeometry(pattern("URDL"), {
      orientation: "vertical",
      density: "editor"
    });

    expect(vertical.width).toBe(252);
    expect(vertical.height).toBe(224);
    expect(vertical.width).not.toBe(horizontal.width);
    expect(vertical.height).not.toBe(horizontal.height);
  });

  it("does not connect across unfinished beats", () => {
    const geometry = buildStallGraphGeometry(pattern("U_DL"), {
      orientation: "horizontal",
      density: "compact"
    });

    expect(
      geometry.connectors.map((connector) => [connector.fromBeatIndex, connector.toBeatIndex])
    ).toEqual([
      [2, 3],
      [3, 0]
    ]);
  });

  it("marks illegal consecutive edges without removing them", () => {
    const geometry = buildStallGraphGeometry(pattern("UD"), {
      orientation: "horizontal",
      density: "compact"
    });

    expect(geometry.connectors).toHaveLength(2);
    expect(geometry.connectors.every((connector) => !connector.isLegal)).toBe(true);
  });

  it("renders a staff range with the next global beat as its terminal", () => {
    const geometry = buildStallGraphGeometry(pattern("URDL".repeat(6)), {
      orientation: "horizontal",
      density: "compact",
      beatRange: { start: 8, count: 8 }
    });

    expect(geometry.beatLabels.map((label) => label.text)).toEqual([
      "9",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
      "→17"
    ]);
    expect(geometry.connectors.at(-1)).toEqual(
      expect.objectContaining({ fromBeatIndex: 15, toBeatIndex: 16 })
    );
  });

  it("shows the active cursor only when its beat is inside the visible range", () => {
    const visible = buildStallGraphGeometry(pattern("URDL".repeat(3)), {
      orientation: "horizontal",
      density: "compact",
      beatRange: { start: 4, count: 4 },
      activeBeat: 6
    });
    const hidden = buildStallGraphGeometry(pattern("URDL".repeat(3)), {
      orientation: "horizontal",
      density: "compact",
      beatRange: { start: 4, count: 4 },
      activeBeat: 2
    });

    expect(visible.activeLine).not.toBeNull();
    expect(hidden.activeLine).toBeNull();
  });
});
