import {
  CARDINAL_ORDER,
  isLegalEdge,
  resolveEdge,
  type Cardinal
} from "@/lab/experiments/qt-stall-graph/cardinals";
import { describe, expect, it } from "vitest";

// All 15 distinct unordered pairs of 6 cardinals.
const ALL_CARDINALS: Cardinal[] = ["U", "R", "D", "L", "F", "B"];

function allPairs(): Array<[Cardinal, Cardinal]> {
  const pairs: Array<[Cardinal, Cardinal]> = [];
  for (let i = 0; i < ALL_CARDINALS.length; i++) {
    for (let j = i + 1; j < ALL_CARDINALS.length; j++) {
      pairs.push([ALL_CARDINALS[i], ALL_CARDINALS[j]]);
    }
  }
  return pairs;
}

describe("CARDINAL_ORDER", () => {
  it("contains all 6 cardinals", () => {
    expect(CARDINAL_ORDER).toHaveLength(6);
    expect([...CARDINAL_ORDER].sort()).toEqual(["B", "D", "F", "L", "R", "U"]);
  });

  it("starts with F U R D L B (user preference)", () => {
    expect(CARDINAL_ORDER).toEqual(["F", "U", "R", "D", "L", "B"]);
  });
});

describe("resolveEdge — self loops", () => {
  it("returns null for every self-loop", () => {
    for (const c of ALL_CARDINALS) {
      expect(resolveEdge(c, c)).toBeNull();
    }
  });
});

describe("resolveEdge — opposite pairs", () => {
  const OPPOSITES: [Cardinal, Cardinal][] = [
    ["U", "D"],
    ["D", "U"],
    ["L", "R"],
    ["R", "L"],
    ["F", "B"],
    ["B", "F"]
  ];

  it("returns null for every opposite pair (both directions)", () => {
    for (const [a, b] of OPPOSITES) {
      expect(resolveEdge(a, b)).toBeNull();
    }
  });
});

describe("resolveEdge — bijection: exactly 12 legal edges", () => {
  it("returns non-null for all 12 legal distinct non-opposite pairs", () => {
    const legal = allPairs().filter(([a, b]) => resolveEdge(a, b) !== null);
    expect(legal).toHaveLength(12);
  });

  it("each legal edge resolves to a unique (planeId, fromDeg, toDeg)", () => {
    const seen = new Set<string>();
    for (const [a, b] of allPairs()) {
      const edge = resolveEdge(a, b);
      if (edge === null) continue;
      const key = `${edge.planeId}:${edge.fromDeg}-${edge.toDeg}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
    expect(seen.size).toBe(12);
  });

  it("every plane edge is hit by at least one legal transition", () => {
    const planeHits = new Set<string>();
    for (const [a, b] of allPairs()) {
      const edge = resolveEdge(a, b);
      if (edge !== null) planeHits.add(edge.planeId);
    }
    expect(planeHits).toContain("wall");
    expect(planeHits).toContain("wheel");
    expect(planeHits).toContain("floor");
  });
});

describe("resolveEdge — known expected mappings", () => {
  it("U→R resolves to wall plane, 90→0", () => {
    const edge = resolveEdge("U", "R");
    expect(edge).not.toBeNull();
    expect(edge?.planeId).toBe("wall");
    expect(edge?.fromDeg).toBe(90);
    expect(edge?.toDeg).toBe(0);
  });

  it("U→F resolves to wheel plane, 90→0", () => {
    const edge = resolveEdge("U", "F");
    expect(edge).not.toBeNull();
    expect(edge?.planeId).toBe("wheel");
    expect(edge?.fromDeg).toBe(90);
    expect(edge?.toDeg).toBe(0);
  });

  it("R→F resolves to floor plane, 0→90", () => {
    const edge = resolveEdge("R", "F");
    expect(edge).not.toBeNull();
    expect(edge?.planeId).toBe("floor");
    expect(edge?.fromDeg).toBe(0);
    expect(edge?.toDeg).toBe(90);
  });

  it("B→D resolves to wheel plane, 180→270", () => {
    const edge = resolveEdge("B", "D");
    expect(edge).not.toBeNull();
    expect(edge?.planeId).toBe("wheel");
    expect(edge?.fromDeg).toBe(180);
    expect(edge?.toDeg).toBe(270);
  });
});

describe("isLegalEdge", () => {
  it("matches resolveEdge non-null result", () => {
    for (const [a, b] of allPairs()) {
      expect(isLegalEdge(a, b)).toBe(resolveEdge(a, b) !== null);
    }
  });
});
