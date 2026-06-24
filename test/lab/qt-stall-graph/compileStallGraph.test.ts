import { prepareSequence } from "@/engine/sequence";
import {
  compileStallGraphState,
  type StallGraphDiagnostic
} from "@/lab/experiments/qt-stall-graph/compileStallGraph";
import { type StallGraphEditState } from "@/lab/experiments/qt-stall-graph/stateModel";
import { describe, expect, it } from "vitest";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wallFlower(): StallGraphEditState {
  const left = new Map([
    [0, { cardinal: "U" as const }],
    [1, { cardinal: "R" as const }],
    [2, { cardinal: "D" as const }],
    [3, { cardinal: "L" as const }]
  ]);
  const right = new Map([
    [0, { cardinal: "R" as const }],
    [1, { cardinal: "D" as const }],
    [2, { cardinal: "L" as const }],
    [3, { cardinal: "U" as const }]
  ]);
  return {
    left,
    right,
    editMode: "left",
    selectedNodeKey: null,
    showLeft: true,
    showRight: true,
    playLeft: true,
    playRight: true
  };
}

// ─── Wall flower (canonical case) ─────────────────────────────────────────────

describe("compileStallGraphState — wall 4-petal flower", () => {
  it("compiles without diagnostics", () => {
    const result = compileStallGraphState(wallFlower());
    expect(result.diagnostics).toHaveLength(0);
    expect(result.sequence).not.toBeNull();
  });

  it("produces 4 segments per hand", () => {
    const { sequence } = compileStallGraphState(wallFlower());
    expect(sequence).not.toBeNull();
    const left = sequence!.rigs.find((r) => r.rigId === "left");
    const right = sequence!.rigs.find((r) => r.rigId === "right");
    expect(left?.sequence.segments).toHaveLength(4);
    expect(right?.sequence.segments).toHaveLength(4);
  });

  it("all segments use wall plane", () => {
    const { sequence } = compileStallGraphState(wallFlower());
    for (const rig of sequence!.rigs) {
      for (const seg of rig.sequence.segments) {
        expect(seg.planeId).toBe("wall");
      }
    }
  });

  it("total duration is 1 unit (4 × 0.25)", () => {
    const { sequence } = compileStallGraphState(wallFlower());
    const prepared = prepareSequence(sequence!.rigs[0].sequence);
    expect(prepared.ok).toBe(true);
    if (prepared.ok) expect(prepared.prepared.totalDuration).toBeCloseTo(1, 12);
  });

  it("is deterministic — identical input produces identical output", () => {
    const a = compileStallGraphState(wallFlower());
    const b = compileStallGraphState(wallFlower());
    expect(JSON.stringify(a.sequence)).toBe(JSON.stringify(b.sequence));
  });

  it("sequence is engine-valid (prepareSequence succeeds)", () => {
    const { sequence } = compileStallGraphState(wallFlower());
    for (const rig of sequence!.rigs) {
      const prepared = prepareSequence(rig.sequence);
      expect(prepared.ok).toBe(true);
    }
  });
});

// ─── 3D wall + wheel mix (back-hemisphere arcs included) ─────────────────────

describe("compileStallGraphState — 3D wall + wheel flower with back-hemisphere", () => {
  function graph3d(): StallGraphEditState {
    const left = new Map([
      [0, { cardinal: "U" as const }],
      [1, { cardinal: "R" as const }],
      [2, { cardinal: "D" as const }],
      [3, { cardinal: "L" as const }]
    ]);
    const right = new Map([
      [0, { cardinal: "F" as const }],
      [1, { cardinal: "U" as const }],
      [2, { cardinal: "B" as const }],
      [3, { cardinal: "D" as const }]
    ]);
    return {
      left,
      right,
      editMode: "left",
      selectedNodeKey: null,
      showLeft: true,
      showRight: true,
      playLeft: true,
      playRight: true
    };
  }

  it("compiles without diagnostics (back hemisphere allowed)", () => {
    const result = compileStallGraphState(graph3d());
    expect(result.diagnostics).toHaveLength(0);
    expect(result.sequence).not.toBeNull();
  });

  it("left hand uses wall plane throughout", () => {
    const { sequence } = compileStallGraphState(graph3d());
    const left = sequence!.rigs.find((r) => r.rigId === "left")!;
    for (const seg of left.sequence.segments) {
      expect(seg.planeId).toBe("wall");
    }
  });

  it("right hand uses wheel plane throughout", () => {
    const { sequence } = compileStallGraphState(graph3d());
    const right = sequence!.rigs.find((r) => r.rigId === "right")!;
    for (const seg of right.sequence.segments) {
      expect(seg.planeId).toBe("wheel");
    }
  });

  it("sequence is engine-valid for both hands", () => {
    const { sequence } = compileStallGraphState(graph3d());
    for (const rig of sequence!.rigs) {
      const prepared = prepareSequence(rig.sequence);
      expect(prepared.ok).toBe(true);
    }
  });
});

// ─── Diagnostics ─────────────────────────────────────────────────────────────

describe("compileStallGraphState — diagnostics", () => {
  it("reports EMPTY_TRACK when a hand has no marks", () => {
    const state: StallGraphEditState = {
      left: new Map(),
      right: new Map(),
      editMode: "left",
      selectedNodeKey: null,
      showLeft: true,
      showRight: true,
      playLeft: true,
      playRight: true
    };
    const { sequence, diagnostics } = compileStallGraphState(state);
    expect(sequence).toBeNull();
    expect(
      diagnostics.some((d: StallGraphDiagnostic) => d.code === "EMPTY_TRACK" && d.hand === "left")
    ).toBe(true);
    expect(
      diagnostics.some((d: StallGraphDiagnostic) => d.code === "EMPTY_TRACK" && d.hand === "right")
    ).toBe(true);
  });

  it("reports SINGLE_MARK_TRACK when a hand has only one mark", () => {
    const state: StallGraphEditState = {
      left: new Map([[0, { cardinal: "U" as const }]]),
      right: new Map([[0, { cardinal: "R" as const }]]),
      editMode: "left",
      selectedNodeKey: null,
      showLeft: true,
      showRight: true,
      playLeft: true,
      playRight: true
    };
    const { sequence, diagnostics } = compileStallGraphState(state);
    expect(sequence).toBeNull();
    expect(
      diagnostics.some(
        (d: StallGraphDiagnostic) => d.code === "SINGLE_MARK_TRACK" && d.hand === "left"
      )
    ).toBe(true);
    expect(
      diagnostics.some(
        (d: StallGraphDiagnostic) => d.code === "SINGLE_MARK_TRACK" && d.hand === "right"
      )
    ).toBe(true);
  });

  it("reports ILLEGAL_EDGE for an opposite-cardinal transition", () => {
    const state: StallGraphEditState = {
      left: new Map([
        [0, { cardinal: "U" as const }],
        [1, { cardinal: "D" as const }]
      ]),
      right: new Map([
        [0, { cardinal: "R" as const }],
        [1, { cardinal: "L" as const }]
      ]),
      editMode: "left",
      selectedNodeKey: null,
      showLeft: true,
      showRight: true,
      playLeft: true,
      playRight: true
    };
    const { sequence, diagnostics } = compileStallGraphState(state);
    expect(sequence).toBeNull();
    expect(diagnostics.some((d: StallGraphDiagnostic) => d.code === "ILLEGAL_EDGE")).toBe(true);
  });

  it("reports MISSING_ROW_MARK when a played hand skips a beat row", () => {
    const state: StallGraphEditState = {
      left: new Map([
        [0, { cardinal: "U" as const }],
        [2, { cardinal: "R" as const }]
      ]),
      right: new Map(),
      editMode: "left",
      selectedNodeKey: null,
      showLeft: true,
      showRight: true,
      playLeft: true,
      playRight: false
    };
    const { sequence, diagnostics } = compileStallGraphState(state);
    expect(sequence).toBeNull();
    expect(
      diagnostics.some(
        (d: StallGraphDiagnostic) =>
          d.code === "MISSING_ROW_MARK" && d.hand === "left" && d.beatIndex === 1
      )
    ).toBe(true);
  });

  it("requires marks on visible beat rows, not only rows up to the last mark", () => {
    const state: StallGraphEditState = {
      left: new Map([
        [0, { cardinal: "U" as const }],
        [1, { cardinal: "R" as const }]
      ]),
      right: new Map(),
      editMode: "left",
      selectedNodeKey: null,
      showLeft: true,
      showRight: true,
      playLeft: true,
      playRight: false
    };
    const { sequence, diagnostics } = compileStallGraphState(state, { beatCount: 4 });
    expect(sequence).toBeNull();
    expect(
      diagnostics.filter(
        (d: StallGraphDiagnostic) => d.code === "MISSING_ROW_MARK" && d.hand === "left"
      )
    ).toEqual([
      { code: "MISSING_ROW_MARK", hand: "left", beatIndex: 2 },
      { code: "MISSING_ROW_MARK", hand: "left", beatIndex: 3 }
    ]);
  });

  it("reports EMPTY_TRACK for a played empty hand even when the other hand is valid", () => {
    const state: StallGraphEditState = {
      left: new Map([
        [0, { cardinal: "U" as const }],
        [1, { cardinal: "R" as const }]
      ]),
      right: new Map(),
      editMode: "left",
      selectedNodeKey: null,
      showLeft: true,
      showRight: true,
      playLeft: true,
      playRight: true
    };
    const { sequence, diagnostics } = compileStallGraphState(state, { beatCount: 2 });
    expect(sequence?.rigs.map((rig) => rig.rigId)).toEqual(["left"]);
    expect(
      diagnostics.some((d: StallGraphDiagnostic) => d.code === "EMPTY_TRACK" && d.hand === "right")
    ).toBe(true);
  });

  it("does not silently fix illegal edges", () => {
    const state: StallGraphEditState = {
      left: new Map([
        [0, { cardinal: "U" as const }],
        [1, { cardinal: "D" as const }]
      ]),
      right: new Map([
        [0, { cardinal: "U" as const }],
        [1, { cardinal: "D" as const }]
      ]),
      editMode: "left",
      selectedNodeKey: null,
      showLeft: true,
      showRight: true,
      playLeft: true,
      playRight: true
    };
    const { sequence } = compileStallGraphState(state);
    expect(sequence).toBeNull();
  });
});
