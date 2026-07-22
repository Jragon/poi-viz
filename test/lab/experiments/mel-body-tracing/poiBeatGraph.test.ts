import { PI } from "@/engine/constants";
import { evalPreparedMultiRigSequenceAt, prepareMultiRigSequence } from "@/engine/multirig";
import { decodeBeatGraphFromUrlParams } from "@/lab/experiments/mel-body-tracing/beat-graph/beatGraphUrlCodec";
import {
  compilePoiBeatGraph,
  DEFAULT_POI_BEAT_COMPILER_OPTIONS
} from "@/lab/experiments/mel-body-tracing/beat-graph/compileBeatGraph";
import { createLowCommonCosmoBeatGraph } from "@/lab/experiments/mel-body-tracing/beat-graph/cosmoSeed";
import {
  appendPoiBeatGraphRow,
  deletePoiBeatGraphLastRow,
  deriveLoopIntervals,
  deriveRowStates,
  filterPoiBeatGraphTracks,
  findActivePoiBeatStep,
  movePoiBeatGraphRowLane,
  setPoiBeatGraphTrackDirection,
  setPoiBeatGraphTrackInitialPhase,
  shiftPoiBeatGraphTrackRows,
  togglePoiBeatGraphRowSide
} from "@/lab/experiments/mel-body-tracing/beat-graph/graphHelpers";
import {
  createLowerWrapBeatGraph,
  createTwoHandLowWrapBeatGraph,
  createUpperWrapBeatGraph
} from "@/lab/experiments/mel-body-tracing/beat-graph/lowerWrapSeed";
import type { PoiBeatGraph } from "@/lab/experiments/mel-body-tracing/beat-graph/types";
import { describe, expect, it } from "vitest";

const HALF_BEAT_DURATION = 0.5;

const KNOWN_GOOD_BEAT_GRAPH_CASES = [
  {
    name: "low common cosmo",
    url: "?s=8&lt=cw-down-4b4b3a3b4a4a3b3a&rt=ccw-down-2b2b3a3b2a2a3b3a",
    rows: {
      left: [
        "right-low:b",
        "right-low:b",
        "center:a",
        "center:b",
        "right-low:a",
        "right-low:a",
        "center:b",
        "center:a"
      ],
      right: [
        "left-low:b",
        "left-low:b",
        "center:a",
        "center:b",
        "left-low:a",
        "left-low:a",
        "center:b",
        "center:a"
      ]
    },
    samples: {
      left: [
        [0.5, -0.35],
        [0.5, -0.35],
        [0.5, -0.35],
        [0.29, -0.35],
        [-0.29, -0.35],
        [-0.5, -0.35],
        [-0.29, -0.35],
        [0.29, -0.35],
        [0.5, -0.35],
        [0.5, -0.35],
        [0.5, -0.35],
        [0.29, -0.35],
        [-0.29, -0.35],
        [-0.5, -0.35],
        [-0.29, -0.35],
        [0.29, -0.35],
        [0.5, -0.35]
      ],
      right: [
        [-0.5, -0.35],
        [-0.5, -0.35],
        [-0.5, -0.35],
        [-0.29, -0.35],
        [0.29, -0.35],
        [0.5, -0.35],
        [0.29, -0.35],
        [-0.29, -0.35],
        [-0.5, -0.35],
        [-0.5, -0.35],
        [-0.5, -0.35],
        [-0.29, -0.35],
        [0.29, -0.35],
        [0.5, -0.35],
        [0.29, -0.35],
        [-0.29, -0.35],
        [-0.5, -0.35]
      ]
    }
  },
  {
    name: "direct low reel",
    url: "?s=6&lt=cw-up-2b2b3a4b4b3a&rt=ccw-up-4b4b3a2b2b3a",
    rows: {
      left: ["left-low:b", "left-low:b", "center:a", "right-low:b", "right-low:b", "center:a"],
      right: ["right-low:b", "right-low:b", "center:a", "left-low:b", "left-low:b", "center:a"]
    },
    samples: {
      left: [
        [-0.5, -0.35],
        [-0.5, -0.35],
        [-0.5, -0.35],
        [-0.396, -0.35],
        [0, -0.35],
        [0.396, -0.35],
        [0.5, -0.35],
        [0.5, -0.35],
        [0.5, -0.35],
        [0.396, -0.35],
        [0, -0.35],
        [-0.396, -0.35],
        [-0.5, -0.35]
      ],
      right: [
        [0.5, -0.35],
        [0.5, -0.35],
        [0.5, -0.35],
        [0.396, -0.35],
        [0, -0.35],
        [-0.396, -0.35],
        [-0.5, -0.35],
        [-0.5, -0.35],
        [-0.5, -0.35],
        [-0.396, -0.35],
        [0, -0.35],
        [0.396, -0.35],
        [0.5, -0.35]
      ]
    }
  },
  {
    name: "BTB low and high reels",
    url: "?s=6&lt=cw-down-4a4a3b2a2a3b&rt=ccw-down-1a1a3b5a5a3b",
    rows: {
      left: ["right-low:a", "right-low:a", "center:b", "left-low:a", "left-low:a", "center:b"],
      right: ["left-high:a", "left-high:a", "center:b", "right-high:a", "right-high:a", "center:b"]
    },
    samples: {
      left: [
        [0.5, -0.35],
        [0.5, -0.35],
        [0.5, -0.35],
        [0.396, -0.35],
        [0, -0.35],
        [-0.396, -0.35],
        [-0.5, -0.35],
        [-0.5, -0.35],
        [-0.5, -0.35],
        [-0.396, -0.35],
        [0, -0.35],
        [0.396, -0.35],
        [0.5, -0.35]
      ],
      right: [
        [-0.5, 0.35],
        [-0.5, 0.35],
        [-0.5, 0.35],
        [-0.396, 0.35],
        [0, 0.35],
        [0.396, 0.35],
        [0.5, 0.35],
        [0.5, 0.35],
        [0.5, 0.35],
        [0.396, 0.35],
        [0, 0.35],
        [-0.396, 0.35],
        [-0.5, 0.35]
      ]
    }
  },
  {
    name: "diagonal and vertical transfers",
    url: "?s=6&lt=cw-up-1b1b3a4b4b3a&rt=ccw-up-5b5b3a4b4b3a",
    rows: {
      left: ["left-high:b", "left-high:b", "center:a", "right-low:b", "right-low:b", "center:a"],
      right: ["right-high:b", "right-high:b", "center:a", "right-low:b", "right-low:b", "center:a"]
    },
    samples: {
      left: [
        [-0.5, 0.35],
        [-0.5, 0.35],
        [-0.5, 0.35],
        [-0.396, 0.278],
        [0, 0],
        [0.396, -0.278],
        [0.5, -0.35],
        [0.5, -0.35],
        [0.5, -0.35],
        [0.396, -0.278],
        [0, 0],
        [-0.396, 0.278],
        [-0.5, 0.35]
      ],
      right: [
        [0.5, 0.35],
        [0.5, 0.35],
        [0.5, 0.35],
        [0.5, 0.278],
        [0.5, 0],
        [0.5, -0.278],
        [0.5, -0.35],
        [0.5, -0.35],
        [0.5, -0.35],
        [0.5, -0.278],
        [0.5, 0],
        [0.5, 0.278],
        [0.5, 0.35]
      ]
    }
  }
] as const;

function getLowerWrapTrack() {
  const graph = createLowerWrapBeatGraph();
  const track = graph.tracks[0];
  if (!track) throw new Error("expected lower wrap graph to have a track");
  return track;
}

function getTrack(graph: PoiBeatGraph, trackId: string) {
  const track = graph.tracks.find((candidate) => candidate.id === trackId);
  if (!track) throw new Error(`expected graph to have ${trackId} track`);
  return track;
}

function getCircleOmega(
  segment: NonNullable<
    ReturnType<typeof compilePoiBeatGraph>["sequence"]["rigs"][number]
  >["sequence"]["segments"][number]
) {
  const driver = segment.head.driver;
  if (driver.kind !== "circle") {
    throw new Error(`expected circle head driver, got ${driver.kind}`);
  }
  return driver.omega;
}

function handXAt(prepared: ReturnType<typeof prepareMultiRigSequence>, t: number): number {
  return handPointAt(prepared, t).x;
}

function handPointAt(
  prepared: ReturnType<typeof prepareMultiRigSequence>,
  t: number,
  rigId = "right"
) {
  if (!prepared.ok) {
    throw new Error(`expected compiled sequence to prepare: ${JSON.stringify(prepared.errors)}`);
  }

  const result = evalPreparedMultiRigSequenceAt(prepared.prepared, t);
  if (!result.ok) {
    throw new Error(`expected compiled sequence to evaluate at ${t}`);
  }

  const handPose = result.poses[rigId]?.pose.handPose;
  if (!handPose) {
    throw new Error(`expected ${rigId} rig hand pose`);
  }

  return {
    x: handPose.radius * Math.cos(handPose.phaseAbs),
    y: handPose.radius * Math.sin(handPose.phaseAbs)
  };
}

function decodeGraphFromUrl(url: string): PoiBeatGraph {
  const params = new URLSearchParams(url);
  const decoded = decodeBeatGraphFromUrlParams({
    s: params.get("s"),
    lt: params.get("lt"),
    rt: params.get("rt")
  });

  if (!decoded.ok) {
    throw new Error(`expected valid beat graph URL: ${decoded.reason}`);
  }

  return decoded.graph;
}

function rowCodes(graph: PoiBeatGraph, trackId: string): readonly string[] {
  return getTrack(graph, trackId).rows.map((row) => `${row.laneId}:${row.planeSide ?? "d"}`);
}

function roundSample(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function roundedHandSamples(
  prepared: ReturnType<typeof prepareMultiRigSequence>,
  rigId: string,
  cycleSteps: number
): readonly (readonly [number, number])[] {
  return Array.from({ length: cycleSteps * 2 + 1 }, (_, sampleIndex) => {
    const point = handPointAt(prepared, sampleIndex * (HALF_BEAT_DURATION / 2), rigId);
    return [roundSample(point.x), roundSample(point.y)] as const;
  });
}

describe("PoiBeatGraph lower-wrap seed", () => {
  it("maps playback time to the active graph step", () => {
    expect(findActivePoiBeatStep(0, 6, HALF_BEAT_DURATION)).toBe(0);
    expect(findActivePoiBeatStep(0.24, 6, HALF_BEAT_DURATION)).toBe(0);
    expect(findActivePoiBeatStep(0.5, 6, HALF_BEAT_DURATION)).toBe(1);
    expect(findActivePoiBeatStep(2.99, 6, HALF_BEAT_DURATION)).toBe(5);
    expect(findActivePoiBeatStep(3, 6, HALF_BEAT_DURATION)).toBe(0);
    expect(findActivePoiBeatStep(3.5, 6, HALF_BEAT_DURATION)).toBe(1);
  });

  it("returns null for invalid active graph step inputs", () => {
    expect(findActivePoiBeatStep(Number.NaN, 6, HALF_BEAT_DURATION)).toBeNull();
    expect(findActivePoiBeatStep(0, 0, HALF_BEAT_DURATION)).toBeNull();
    expect(findActivePoiBeatStep(0, 6, 0)).toBeNull();
  });

  it("encodes the known six-row lane sequence", () => {
    const graph = createLowerWrapBeatGraph();
    const track = getLowerWrapTrack();

    expect(graph.cycleSteps).toBe(6);
    expect(track.hand).toBe("right");
    expect(track.poiDirection).toBe("counterclockwise");
    expect(track.initialPhase).toBe("up");
    expect(track.rows.map((row) => row.laneId)).toEqual([
      "right-low",
      "right-low",
      "center",
      "left-low",
      "left-low",
      "center"
    ]);
  });

  it("derives the lower-wrap phase and row-side states", () => {
    const states = deriveRowStates(getLowerWrapTrack());

    expect(states.map((state) => state.phaseLabel)).toEqual([
      "up",
      "down",
      "up",
      "down",
      "up",
      "down"
    ]);
    expect(states.map((state) => state.planeSide)).toEqual(["b", "b", "a", "b", "b", "a"]);
    expect(states.map((state) => state.isBTB)).toEqual([false, false, false, false, false, false]);
    expect(states.map((state) => state.phaseAbs)).toEqual([
      PI / 2,
      (3 * PI) / 2,
      (5 * PI) / 2,
      (7 * PI) / 2,
      (9 * PI) / 2,
      (11 * PI) / 2
    ]);
  });

  it("derives six first-class loop intervals", () => {
    const intervals = deriveLoopIntervals(getLowerWrapTrack(), HALF_BEAT_DURATION);

    expect(intervals).toHaveLength(6);
    expect(intervals.map((interval) => [interval.fromRow.step, interval.toRow.step])).toEqual([
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 0]
    ]);
    expect(intervals.map((interval) => interval.laneMotion)).toEqual([
      "same-lane",
      "lane-switch",
      "lane-switch",
      "same-lane",
      "lane-switch",
      "lane-switch"
    ]);
    expect(intervals.map((interval) => [interval.fromSide, interval.toSide])).toEqual([
      ["b", "b"],
      ["b", "a"],
      ["a", "b"],
      ["b", "b"],
      ["b", "a"],
      ["a", "b"]
    ]);
  });

  it("moves one row's active lane without mutating the original graph", () => {
    const graph = createLowerWrapBeatGraph();
    const edited = movePoiBeatGraphRowLane(graph, "right", 2, "left-low");

    expect(graph.tracks[0]?.rows[2]?.laneId).toBe("center");
    expect(edited.tracks[0]?.rows[2]?.laneId).toBe("left-low");
    expect(edited.tracks[0]?.rows.map((row) => row.laneId)).toEqual([
      "right-low",
      "right-low",
      "left-low",
      "left-low",
      "left-low",
      "center"
    ]);
  });

  it("clears authored side overrides when moving rows across lanes", () => {
    const graph: PoiBeatGraph = {
      ...createLowerWrapBeatGraph(),
      tracks: [
        {
          ...getLowerWrapTrack(),
          rows: [
            { step: 0, laneId: "right-low", planeSide: "a" },
            { step: 1, laneId: "right-low" },
            { step: 2, laneId: "center" },
            { step: 3, laneId: "left-low" },
            { step: 4, laneId: "left-low" },
            { step: 5, laneId: "center" }
          ]
        }
      ]
    };

    const edited = movePoiBeatGraphRowLane(graph, "right", 0, "left-low");

    expect(edited.tracks[0]?.rows[0]).toEqual({ step: 0, laneId: "left-low" });
  });

  it("toggles row side overrides against lane defaults", () => {
    const graph = createLowerWrapBeatGraph();
    const toggled = togglePoiBeatGraphRowSide(graph, "right", 2);
    const restored = togglePoiBeatGraphRowSide(toggled, "right", 2);

    expect(graph.tracks[0]?.rows[2]).toEqual({ step: 2, laneId: "center" });
    expect(toggled.tracks[0]?.rows[2]).toEqual({ step: 2, laneId: "center", planeSide: "b" });
    expect(deriveRowStates(getTrack(toggled, "right"))[2]?.isBTB).toBe(true);
    expect(restored.tracks[0]?.rows[2]).toEqual({ step: 2, laneId: "center" });
  });

  it("appends a new row by repeating each track's final active lane", () => {
    const graph = createLowerWrapBeatGraph();
    const edited = appendPoiBeatGraphRow(graph);

    expect(graph.cycleSteps).toBe(6);
    expect(edited.cycleSteps).toBe(7);
    expect(edited.tracks[0]?.rows.at(-1)).toEqual({ step: 6, laneId: "center" });
    expect(deriveLoopIntervals(edited.tracks[0]!, HALF_BEAT_DURATION)).toHaveLength(7);
  });

  it("deletes the final authored row while keeping at least two rows", () => {
    const graph = createLowerWrapBeatGraph();
    const edited = deletePoiBeatGraphLastRow(graph);

    expect(graph.cycleSteps).toBe(6);
    expect(edited.cycleSteps).toBe(5);
    expect(edited.tracks[0]?.rows.map((row) => row.step)).toEqual([0, 1, 2, 3, 4]);
    expect(deriveLoopIntervals(edited.tracks[0]!, HALF_BEAT_DURATION)).toHaveLength(5);

    const minimumGraph: PoiBeatGraph = {
      cycleSteps: 2,
      lanes: graph.lanes,
      tracks: [
        {
          ...graph.tracks[0]!,
          rows: [
            { step: 0, laneId: "right-low" },
            { step: 1, laneId: "right-low" }
          ]
        }
      ]
    };

    expect(deletePoiBeatGraphLastRow(minimumGraph)).toBe(minimumGraph);
  });

  it("shifts one track rows down by one step with wraparound", () => {
    const graph = createLowCommonCosmoBeatGraph();
    const shifted = shiftPoiBeatGraphTrackRows(graph, "left", 1);

    expect(getTrack(shifted, "left").rows.map((row) => row.step)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(getTrack(shifted, "left").rows.map((row) => row.laneId)).toEqual([
      "center",
      "right-low",
      "right-low",
      "center",
      "center",
      "right-low",
      "right-low",
      "center"
    ]);
    expect(getTrack(shifted, "left").initialPhase).toBe("down");
    expect(getTrack(graph, "right").rows).toEqual(getTrack(shifted, "right").rows);
    expect(getTrack(graph, "right").initialPhase).toBe(getTrack(shifted, "right").initialPhase);
  });

  it("shifts one track rows up by one step with wraparound", () => {
    const graph = createLowCommonCosmoBeatGraph();
    const shifted = shiftPoiBeatGraphTrackRows(graph, "right", -1);

    expect(getTrack(shifted, "right").rows.map((row) => row.step)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7
    ]);
    expect(getTrack(shifted, "right").rows.map((row) => row.laneId)).toEqual([
      "left-low",
      "center",
      "center",
      "left-low",
      "left-low",
      "center",
      "center",
      "left-low"
    ]);
    expect(getTrack(shifted, "right").initialPhase).toBe("down");
    expect(getTrack(graph, "left").rows).toEqual(getTrack(shifted, "left").rows);
    expect(getTrack(graph, "left").initialPhase).toBe(getTrack(shifted, "left").initialPhase);
  });

  it("keeps initial phase unchanged for even-step offsets", () => {
    const graph = createLowCommonCosmoBeatGraph();
    const shifted = shiftPoiBeatGraphTrackRows(graph, "left", 2);

    expect(getTrack(shifted, "left").initialPhase).toBe(getTrack(graph, "left").initialPhase);
  });
});

describe("PoiBeatGraph low common cosmo seed", () => {
  it("encodes mirrored eight-row low common cosmo tracks", () => {
    const graph = createLowCommonCosmoBeatGraph();
    const left = getTrack(graph, "left");
    const right = getTrack(graph, "right");

    expect(graph.cycleSteps).toBe(8);
    expect(graph.tracks.map((track) => track.id)).toEqual(["left", "right"]);
    expect(left.hand).toBe("left");
    expect(right.hand).toBe("right");
    expect(left.poiDirection).toBe("counterclockwise");
    expect(right.poiDirection).toBe("clockwise");
    expect(left.rows.map((row) => row.laneId)).toEqual([
      "right-low",
      "right-low",
      "center",
      "center",
      "right-low",
      "right-low",
      "center",
      "center"
    ]);
    expect(right.rows.map((row) => row.laneId)).toEqual([
      "left-low",
      "left-low",
      "center",
      "center",
      "left-low",
      "left-low",
      "center",
      "center"
    ]);
    expect(right.rows.map((row) => row.planeSide)).toEqual([
      "b",
      "b",
      "a",
      "b",
      "a",
      "a",
      "b",
      "a"
    ]);
  });

  it("derives independent lane and plane-side motion with local BTB flags", () => {
    const right = getTrack(createLowCommonCosmoBeatGraph(), "right");
    const states = deriveRowStates(right);
    const intervals = deriveLoopIntervals(right, HALF_BEAT_DURATION);

    expect(states.map((state) => state.phaseLabel)).toEqual([
      "up",
      "down",
      "up",
      "down",
      "up",
      "down",
      "up",
      "down"
    ]);
    expect(states.map((state) => state.planeSide)).toEqual([
      "b",
      "b",
      "a",
      "b",
      "a",
      "a",
      "b",
      "a"
    ]);
    expect(states.map((state) => state.isBTB)).toEqual([
      false,
      false,
      false,
      true,
      true,
      true,
      true,
      false
    ]);
    expect(intervals.map((interval) => interval.laneMotion)).toEqual([
      "same-lane",
      "lane-switch",
      "same-lane",
      "lane-switch",
      "same-lane",
      "lane-switch",
      "same-lane",
      "lane-switch"
    ]);
    expect(intervals.map((interval) => [interval.fromSide, interval.toSide])).toEqual([
      ["b", "b"],
      ["b", "a"],
      ["a", "b"],
      ["b", "a"],
      ["a", "a"],
      ["a", "b"],
      ["b", "a"],
      ["a", "b"]
    ]);
  });
});

describe("PoiBeatGraph two-hand low-wrap seed", () => {
  it("encodes deterministic together-opposites native low-wrap tracks", () => {
    const graph = createTwoHandLowWrapBeatGraph();
    const left = getTrack(graph, "left");
    const right = getTrack(graph, "right");

    expect(graph.cycleSteps).toBe(6);
    expect(graph.tracks.map((track) => track.id)).toEqual(["left", "right"]);
    expect(left.hand).toBe("left");
    expect(right.hand).toBe("right");
    expect(left.poiDirection).toBe("clockwise");
    expect(right.poiDirection).toBe("counterclockwise");
    expect(left.rows.map((row) => row.laneId)).toEqual([
      "left-low",
      "left-low",
      "center",
      "right-low",
      "right-low",
      "center"
    ]);
    expect(right.rows.map((row) => row.laneId)).toEqual([
      "right-low",
      "right-low",
      "center",
      "left-low",
      "left-low",
      "center"
    ]);
  });

  it("edits one hand's lane without mutating the other hand", () => {
    const graph = createTwoHandLowWrapBeatGraph();
    const edited = movePoiBeatGraphRowLane(graph, "left", 2, "right-high");

    expect(getTrack(graph, "left").rows[2]?.laneId).toBe("center");
    expect(getTrack(edited, "left").rows[2]?.laneId).toBe("right-high");
    expect(getTrack(edited, "right").rows).toEqual(getTrack(graph, "right").rows);
  });

  it("updates one hand's direction without mutating the other hand", () => {
    const graph = createTwoHandLowWrapBeatGraph();
    const edited = setPoiBeatGraphTrackDirection(graph, "left", "counterclockwise");
    const result = compilePoiBeatGraph(edited);
    const leftRig = result.sequence.rigs.find((rig) => rig.rigId === "left");
    const rightRig = result.sequence.rigs.find((rig) => rig.rigId === "right");

    expect(getTrack(graph, "left").poiDirection).toBe("clockwise");
    expect(getTrack(edited, "left").poiDirection).toBe("counterclockwise");
    expect(getTrack(edited, "right").poiDirection).toBe("counterclockwise");
    expect(leftRig && getCircleOmega(leftRig.sequence.segments[0]!)).toBe(2 * PI);
    expect(rightRig && getCircleOmega(rightRig.sequence.segments[0]!)).toBe(2 * PI);
  });

  it("updates one hand's initial phase without mutating the other hand", () => {
    const graph = createTwoHandLowWrapBeatGraph();
    const edited = setPoiBeatGraphTrackInitialPhase(graph, "right", "down");
    const result = compilePoiBeatGraph(edited);
    const rightRig = result.sequence.rigs.find((rig) => rig.rigId === "right");

    expect(getTrack(graph, "right").initialPhase).toBe("up");
    expect(getTrack(edited, "right").initialPhase).toBe("down");
    expect(getTrack(edited, "left").initialPhase).toBe("up");
    expect(deriveRowStates(getTrack(edited, "right")).map((state) => state.phaseLabel)).toEqual([
      "down",
      "up",
      "down",
      "up",
      "down",
      "up"
    ]);
    expect(rightRig?.sequence.segments[0]?.head.startPose.phaseAbs).toBe((3 * PI) / 2);
  });

  it("keeps append and delete synchronized across both hands", () => {
    const graph = createTwoHandLowWrapBeatGraph();
    const appended = appendPoiBeatGraphRow(graph);
    const deleted = deletePoiBeatGraphLastRow(appended);

    expect(appended.cycleSteps).toBe(7);
    expect(getTrack(appended, "left").rows.at(-1)).toEqual({ step: 6, laneId: "center" });
    expect(getTrack(appended, "right").rows.at(-1)).toEqual({ step: 6, laneId: "center" });
    expect(deleted.cycleSteps).toBe(6);
    expect(deleted.tracks.map((track) => track.rows.length)).toEqual([6, 6]);
  });
});

describe("compilePoiBeatGraph", () => {
  it("compiles the lower-wrap seed to deterministic engine segments", () => {
    const result = compilePoiBeatGraph(createLowerWrapBeatGraph());
    const rig = result.sequence.rigs[0];

    expect(result.diagnostics).toEqual([]);
    expect(rig?.rigId).toBe("right");
    expect(rig?.sequence.segments).toHaveLength(6);
    expect(rig?.sequence.segments.map((segment) => segment.durationUnits)).toEqual([
      0.5, 0.5, 0.5, 0.5, 0.5, 0.5
    ]);
    expect(rig?.sequence.segments.map((segment) => segment.planeSide)).toEqual([
      "b",
      "a",
      "b",
      "b",
      "a",
      "b"
    ]);
    expect(rig?.sequence.segments.map((segment) => segment.behindBody)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined
    ]);
    expect(rig?.sequence.segments.map((segment) => segment.hand.driver.kind)).toEqual([
      "circle",
      "runtime",
      "runtime",
      "circle",
      "runtime",
      "runtime"
    ]);
    expect(rig?.sequence.segments.map((segment) => segment.head.driver.kind)).toEqual([
      "circle",
      "circle",
      "circle",
      "circle",
      "circle",
      "circle"
    ]);
    expect(rig?.sequence.segments.map((segment) => segment.head.startPose.phaseAbs)).toEqual([
      PI / 2,
      (3 * PI) / 2,
      (5 * PI) / 2,
      (7 * PI) / 2,
      (9 * PI) / 2,
      (11 * PI) / 2
    ]);
    expect(rig?.sequence.segments.map((segment) => getCircleOmega(segment))).toEqual([
      2 * PI,
      2 * PI,
      2 * PI,
      2 * PI,
      2 * PI,
      2 * PI
    ]);
  });

  it("prepares and loops the compiled lower-wrap sequence", () => {
    const result = compilePoiBeatGraph(createLowerWrapBeatGraph());
    const prepared = prepareMultiRigSequence(result.sequence);

    expect(prepared.ok).toBe(true);
    if (!prepared.ok) {
      throw new Error(`expected compiled sequence to prepare: ${JSON.stringify(prepared.errors)}`);
    }

    expect(prepared.prepared.maxSequenceDuration).toBe(3);

    const start = evalPreparedMultiRigSequenceAt(prepared.prepared, 0);
    const loopBoundary = evalPreparedMultiRigSequenceAt(prepared.prepared, 3);

    expect(start.ok).toBe(true);
    expect(loopBoundary.ok).toBe(true);
    if (!start.ok || !loopBoundary.ok) {
      throw new Error("expected compiled sequence to evaluate at start and loop boundary");
    }

    expect(loopBoundary.poses.right.pose).toEqual(start.poses.right.pose);
  });

  it("compiles and prepares the upper-wrap seed without high-lane diagnostics", () => {
    const result = compilePoiBeatGraph(createUpperWrapBeatGraph());
    const rig = result.sequence.rigs[0];
    const prepared = prepareMultiRigSequence(result.sequence);

    expect(result.diagnostics).toEqual([]);
    expect(rig?.sequence.segments).toHaveLength(6);
    expect(rig?.sequence.segments.map((segment) => segment.hand.driver.kind)).toEqual([
      "circle",
      "runtime",
      "runtime",
      "circle",
      "runtime",
      "runtime"
    ]);
    expect(prepared.ok).toBe(true);

    const start = handPointAt(prepared, 0);
    const transferCenter = handPointAt(prepared, HALF_BEAT_DURATION * 2);

    expect(start.x).toBeCloseTo(DEFAULT_POI_BEAT_COMPILER_OPTIONS.handHorizontalOffset);
    expect(start.y).toBeCloseTo(DEFAULT_POI_BEAT_COMPILER_OPTIONS.handVerticalOffset);
    expect(transferCenter.x).toBeCloseTo(0);
    expect(transferCenter.y).toBeCloseTo(DEFAULT_POI_BEAT_COMPILER_OPTIONS.handVerticalOffset);
  });

  it("compiles the two-hand seed to left and right rigs in deterministic order", () => {
    const result = compilePoiBeatGraph(createTwoHandLowWrapBeatGraph());

    expect(result.diagnostics).toEqual([]);
    expect(result.sequence.rigs.map((rig) => rig.rigId)).toEqual(["left", "right"]);
    expect(result.sequence.rigs.map((rig) => rig.sequence.segments.length)).toEqual([6, 6]);
    expect(result.sequence.rigs.map((rig) => getCircleOmega(rig.sequence.segments[0]!))).toEqual([
      -2 * PI,
      2 * PI
    ]);
  });

  it("compiles low common cosmo side switches without center stationary diagnostics", () => {
    const result = compilePoiBeatGraph(createLowCommonCosmoBeatGraph());
    const rightRig = result.sequence.rigs.find((rig) => rig.rigId === "right");
    const prepared = prepareMultiRigSequence(result.sequence);

    expect(result.diagnostics).toEqual([]);
    expect(rightRig?.sequence.segments).toHaveLength(8);
    expect(rightRig?.sequence.segments.map((segment) => segment.planeSide)).toEqual([
      "b",
      "a",
      "b",
      "a",
      "a",
      "b",
      "a",
      "b"
    ]);
    expect(rightRig?.sequence.segments.map((segment) => segment.hand.driver.kind)).toEqual([
      "circle",
      "runtime",
      "runtime",
      "runtime",
      "circle",
      "runtime",
      "runtime",
      "runtime"
    ]);
    expect(prepared.ok).toBe(true);
  });

  it("marks BTB rows as behind-body segment metadata", () => {
    const graph: PoiBeatGraph = {
      cycleSteps: 2,
      lanes: createLowerWrapBeatGraph().lanes,
      tracks: [
        {
          id: "right",
          hand: "right",
          poiDirection: "clockwise",
          initialPhase: "up",
          rows: [
            { step: 0, laneId: "left-low", planeSide: "a" },
            { step: 1, laneId: "center" }
          ]
        }
      ]
    };
    const result = compilePoiBeatGraph(graph);
    const rig = result.sequence.rigs[0];

    expect(result.diagnostics).toEqual([]);
    expect(rig?.sequence.segments.map((segment) => segment.behindBody)).toEqual([true, undefined]);
  });

  it("compiles low common cosmo center side switches as opposite-low bounce paths", () => {
    const result = compilePoiBeatGraph(createLowCommonCosmoBeatGraph());
    const prepared = prepareMultiRigSequence(result.sequence);
    const options = DEFAULT_POI_BEAT_COMPILER_OPTIONS;
    const firstBounceStart = HALF_BEAT_DURATION;
    const firstBounceMidpoint = firstBounceStart + (HALF_BEAT_DURATION * 3) / 2;
    const firstCenterBeat = firstBounceStart + HALF_BEAT_DURATION;
    const firstBounceEnd = firstBounceStart + HALF_BEAT_DURATION * 3;

    const start = handPointAt(prepared, firstBounceStart);
    const centerBeat = handPointAt(prepared, firstCenterBeat);
    const midpoint = handPointAt(prepared, firstBounceMidpoint);
    const end = handPointAt(prepared, firstBounceEnd);

    expect(start.x).toBeCloseTo(-options.handHorizontalOffset);
    expect(start.y).toBeCloseTo(-options.handVerticalOffset);
    expect(Math.abs(centerBeat.x)).toBeGreaterThan(0.1);
    expect(centerBeat.y).toBeCloseTo(-options.handVerticalOffset);
    expect(midpoint.x).toBeCloseTo(options.handHorizontalOffset);
    expect(midpoint.y).toBeCloseTo(-options.handVerticalOffset);
    expect(end.x).toBeCloseTo(-options.handHorizontalOffset);
    expect(end.y).toBeCloseTo(-options.handVerticalOffset);
  });

  it("compiles low common cosmo wrap-around side switch as a continuous bounce path", () => {
    const result = compilePoiBeatGraph(createLowCommonCosmoBeatGraph());
    const prepared = prepareMultiRigSequence(result.sequence);
    const options = DEFAULT_POI_BEAT_COMPILER_OPTIONS;
    const secondBounceStart = HALF_BEAT_DURATION * 5;
    const secondBounceMidpoint = secondBounceStart + (HALF_BEAT_DURATION * 3) / 2;
    const loopBoundary = HALF_BEAT_DURATION * 8;

    const start = handPointAt(prepared, secondBounceStart);
    const midpoint = handPointAt(prepared, secondBounceMidpoint);
    const boundary = handPointAt(prepared, loopBoundary);

    expect(start.x).toBeCloseTo(-options.handHorizontalOffset);
    expect(start.y).toBeCloseTo(-options.handVerticalOffset);
    expect(midpoint.x).toBeCloseTo(options.handHorizontalOffset);
    expect(midpoint.y).toBeCloseTo(-options.handVerticalOffset);
    expect(boundary.x).toBeCloseTo(-options.handHorizontalOffset);
    expect(boundary.y).toBeCloseTo(-options.handVerticalOffset);
  });

  it("mirrors the BTB exit lane for high-to-low cosmo side-switch entries", () => {
    const graph: PoiBeatGraph = {
      cycleSteps: 4,
      lanes: createLowCommonCosmoBeatGraph().lanes,
      tracks: [
        {
          id: "left",
          hand: "left",
          poiDirection: "counterclockwise",
          initialPhase: "up",
          rows: [
            { step: 0, laneId: "right-high" },
            { step: 1, laneId: "center" },
            { step: 2, laneId: "center", planeSide: "b" },
            { step: 3, laneId: "right-low", planeSide: "a" }
          ]
        }
      ]
    };
    const result = compilePoiBeatGraph(graph);
    const prepared = prepareMultiRigSequence(result.sequence);
    const options = DEFAULT_POI_BEAT_COMPILER_OPTIONS;

    const start = handPointAt(prepared, 0, "left");
    const midpoint = handPointAt(prepared, (HALF_BEAT_DURATION * 3) / 2, "left");
    const end = handPointAt(prepared, HALF_BEAT_DURATION * 3, "left");

    expect(result.diagnostics).toEqual([]);
    expect(start.x).toBeCloseTo(options.handHorizontalOffset);
    expect(start.y).toBeCloseTo(options.handVerticalOffset);
    expect(midpoint.x).toBeCloseTo(-options.handHorizontalOffset);
    expect(midpoint.y).toBeCloseTo(-options.handVerticalOffset);
    expect(end.x).toBeCloseTo(options.handHorizontalOffset);
    expect(end.y).toBeCloseTo(-options.handVerticalOffset);
  });

  it("mirrors the BTB entry lane for low-to-high cosmo side-switch exits", () => {
    const graph: PoiBeatGraph = {
      cycleSteps: 4,
      lanes: createLowCommonCosmoBeatGraph().lanes,
      tracks: [
        {
          id: "right",
          hand: "right",
          poiDirection: "clockwise",
          initialPhase: "up",
          rows: [
            { step: 0, laneId: "left-low", planeSide: "a" },
            { step: 1, laneId: "center", planeSide: "b" },
            { step: 2, laneId: "center" },
            { step: 3, laneId: "left-high" }
          ]
        }
      ]
    };
    const result = compilePoiBeatGraph(graph);
    const prepared = prepareMultiRigSequence(result.sequence);
    const options = DEFAULT_POI_BEAT_COMPILER_OPTIONS;

    const start = handPointAt(prepared, 0);
    const midpoint = handPointAt(prepared, (HALF_BEAT_DURATION * 3) / 2);
    const end = handPointAt(prepared, HALF_BEAT_DURATION * 3);

    expect(result.diagnostics).toEqual([]);
    expect(start.x).toBeCloseTo(-options.handHorizontalOffset);
    expect(start.y).toBeCloseTo(-options.handVerticalOffset);
    expect(midpoint.x).toBeCloseTo(options.handHorizontalOffset);
    expect(midpoint.y).toBeCloseTo(-options.handVerticalOffset);
    expect(end.x).toBeCloseTo(-options.handHorizontalOffset);
    expect(end.y).toBeCloseTo(options.handVerticalOffset);
  });

  it("filters visible tracks for compilation without mutating the source graph", () => {
    const graph = createTwoHandLowWrapBeatGraph();
    const visibleGraph = filterPoiBeatGraphTracks(graph, ["right"]);
    const result = compilePoiBeatGraph(visibleGraph);

    expect(graph.tracks.map((track) => track.id)).toEqual(["left", "right"]);
    expect(visibleGraph.tracks.map((track) => track.id)).toEqual(["right"]);
    expect(result.sequence.rigs.map((rig) => rig.rigId)).toEqual(["right"]);
    expect(result.diagnostics).toEqual([]);
  });

  it.each(KNOWN_GOOD_BEAT_GRAPH_CASES)(
    "characterizes hand path samples for known-good URL: $name",
    ({ url, rows, samples }) => {
      const graph = decodeGraphFromUrl(url);
      const result = compilePoiBeatGraph(graph);
      const prepared = prepareMultiRigSequence(result.sequence);

      expect(result.diagnostics).toEqual([]);
      expect(prepared.ok).toBe(true);
      expect(rowCodes(graph, "left")).toEqual(rows.left);
      expect(rowCodes(graph, "right")).toEqual(rows.right);
      expect(roundedHandSamples(prepared, "left", graph.cycleSteps)).toEqual(samples.left);
      expect(roundedHandSamples(prepared, "right", graph.cycleSteps)).toEqual(samples.right);
    }
  );

  it("holds same-lane repeated-center reels at their source lanes", () => {
    const graph = decodeGraphFromUrl("?s=4&lt=cw-up-2b2b3a3a&rt=ccw-up-4b4b3a3a");
    const result = compilePoiBeatGraph(graph);
    const prepared = prepareMultiRigSequence(result.sequence);
    const leftRig = result.sequence.rigs.find((rig) => rig.rigId === "left");
    const rightRig = result.sequence.rigs.find((rig) => rig.rigId === "right");

    expect(result.diagnostics).toEqual([]);
    expect(leftRig?.sequence.segments[2]?.hand.driver.kind).toBe("runtime");
    expect(rightRig?.sequence.segments[2]?.hand.driver.kind).toBe("runtime");

    for (const t of [0.5, 1, 1.25, 1.5, 2]) {
      expect(handPointAt(prepared, t, "left").x).toBeCloseTo(
        -DEFAULT_POI_BEAT_COMPILER_OPTIONS.handHorizontalOffset
      );
      expect(handPointAt(prepared, t, "left").y).toBeCloseTo(
        -DEFAULT_POI_BEAT_COMPILER_OPTIONS.handVerticalOffset
      );
      expect(handPointAt(prepared, t, "right").x).toBeCloseTo(
        DEFAULT_POI_BEAT_COMPILER_OPTIONS.handHorizontalOffset
      );
      expect(handPointAt(prepared, t, "right").y).toBeCloseTo(
        -DEFAULT_POI_BEAT_COMPILER_OPTIONS.handVerticalOffset
      );
    }
  });

  it("moves same-lateral repeated-center transfers along the native high-low lane", () => {
    const graph: PoiBeatGraph = {
      cycleSteps: 4,
      lanes: createLowerWrapBeatGraph().lanes,
      tracks: [
        {
          id: "right",
          hand: "right",
          poiDirection: "counterclockwise",
          initialPhase: "up",
          rows: [
            { step: 0, laneId: "right-high" },
            { step: 1, laneId: "center" },
            { step: 2, laneId: "center" },
            { step: 3, laneId: "right-low" }
          ]
        }
      ]
    };
    const result = compilePoiBeatGraph(graph);
    const prepared = prepareMultiRigSequence(result.sequence);
    const rig = result.sequence.rigs[0];

    expect(result.diagnostics).toEqual([]);
    expect(rig?.sequence.segments[1]?.hand.driver.kind).toBe("runtime");

    const start = handPointAt(prepared, 0, "right");
    const midpoint = handPointAt(prepared, 0.75, "right");
    const end = handPointAt(prepared, 1.5, "right");

    expect(start.x).toBeCloseTo(DEFAULT_POI_BEAT_COMPILER_OPTIONS.handHorizontalOffset);
    expect(start.y).toBeCloseTo(DEFAULT_POI_BEAT_COMPILER_OPTIONS.handVerticalOffset);
    expect(midpoint.x).toBeCloseTo(DEFAULT_POI_BEAT_COMPILER_OPTIONS.handHorizontalOffset);
    expect(midpoint.y).toBeCloseTo(0);
    expect(end.x).toBeCloseTo(DEFAULT_POI_BEAT_COMPILER_OPTIONS.handHorizontalOffset);
    expect(end.y).toBeCloseTo(-DEFAULT_POI_BEAT_COMPILER_OPTIONS.handVerticalOffset);
  });

  it("treats repeated centers as setup before vertical cosmo side switches", () => {
    const graph = decodeGraphFromUrl("?s=8&lt=cw-up-3a3a3b4a4a3b1b1b&rt=ccw-up-3a3a4b4b3b1a1a3b");
    const leftTrack = getTrack(graph, "left");
    const leftIntervals = deriveLoopIntervals(leftTrack, HALF_BEAT_DURATION);
    const result = compilePoiBeatGraph(graph);
    const prepared = prepareMultiRigSequence(result.sequence);
    const leftRig = result.sequence.rigs.find((rig) => rig.rigId === "left");

    expect(rowCodes(graph, "left")).toEqual([
      "center:a",
      "center:a",
      "center:b",
      "right-low:a",
      "right-low:a",
      "center:b",
      "left-high:b",
      "left-high:b"
    ]);
    expect([7, 0, 1, 2].map((index) => leftIntervals[index]?.laneMotion)).toEqual([
      "lane-switch",
      "same-lane",
      "same-lane",
      "lane-switch"
    ]);
    expect(result.diagnostics).toEqual([]);
    expect(leftRig?.sequence.segments[0]?.hand.driver.kind).toBe("runtime");
    expect(leftRig?.sequence.segments[1]?.hand.driver.kind).toBe("runtime");

    const source = handPointAt(prepared, 3.5, "left");
    const setupApproach = handPointAt(prepared, 4, "left");
    const setup = handPointAt(prepared, 4.5, "left");
    const sideSwitchCrosspoint = handPointAt(prepared, 4.75, "left");
    const exitApproach = handPointAt(prepared, 5, "left");
    const destination = handPointAt(prepared, 5.5, "left");

    expect(source.x).toBeCloseTo(-DEFAULT_POI_BEAT_COMPILER_OPTIONS.handHorizontalOffset);
    expect(source.y).toBeCloseTo(DEFAULT_POI_BEAT_COMPILER_OPTIONS.handVerticalOffset);
    expect(setupApproach.x).toBeCloseTo(-DEFAULT_POI_BEAT_COMPILER_OPTIONS.handHorizontalOffset);
    expect(setupApproach.y).toBeCloseTo(0);
    expect(setup.x).toBeCloseTo(-DEFAULT_POI_BEAT_COMPILER_OPTIONS.handHorizontalOffset);
    expect(setup.y).toBeCloseTo(-DEFAULT_POI_BEAT_COMPILER_OPTIONS.handVerticalOffset);
    expect(sideSwitchCrosspoint.x).toBeCloseTo(
      -DEFAULT_POI_BEAT_COMPILER_OPTIONS.handHorizontalOffset
    );
    expect(sideSwitchCrosspoint.y).toBeCloseTo(
      -DEFAULT_POI_BEAT_COMPILER_OPTIONS.handVerticalOffset
    );
    expect(exitApproach.x).toBeGreaterThan(
      -DEFAULT_POI_BEAT_COMPILER_OPTIONS.handHorizontalOffset
    );
    expect(exitApproach.x).toBeLessThan(0);
    expect(exitApproach.y).toBeCloseTo(-DEFAULT_POI_BEAT_COMPILER_OPTIONS.handVerticalOffset);
    expect(destination.x).toBeCloseTo(DEFAULT_POI_BEAT_COMPILER_OPTIONS.handHorizontalOffset);
    expect(destination.y).toBeCloseTo(-DEFAULT_POI_BEAT_COMPILER_OPTIONS.handVerticalOffset);
  });

  it("treats center rows as pass-through points during lane switch chains", () => {
    const result = compilePoiBeatGraph(createLowerWrapBeatGraph());
    const prepared = prepareMultiRigSequence(result.sequence);
    const transferStart = HALF_BEAT_DURATION;
    const transferDuration = HALF_BEAT_DURATION * 2;
    const quarter = transferStart + transferDuration * 0.25;
    const center = transferStart + transferDuration * 0.5;
    const threeQuarter = transferStart + transferDuration * 0.75;
    const transferEnd = transferStart + transferDuration;

    const x0 = handXAt(prepared, transferStart);
    const x1 = handXAt(prepared, quarter);
    const x2 = handXAt(prepared, center);
    const x3 = handXAt(prepared, threeQuarter);
    const x4 = handXAt(prepared, transferEnd);

    const distances = [x0 - x1, x1 - x2, x2 - x3, x3 - x4];

    expect(x0).toBeCloseTo(0.5);
    expect(x1).toBeCloseTo(0.396484375);
    expect(x2).toBeCloseTo(0);
    expect(x3).toBeCloseTo(-0.396484375);
    expect(x4).toBeCloseTo(-0.5);
    expect(distances[1]).toBeGreaterThan(distances[0]);
    expect(Math.abs(distances[2])).toBeGreaterThan(Math.abs(distances[3]));
  });

  it("compiles center same-lane intervals without diagnostics", () => {
    const graph: PoiBeatGraph = {
      cycleSteps: 2,
      lanes: createLowerWrapBeatGraph().lanes,
      tracks: [
        {
          id: "right",
          hand: "right",
          poiDirection: "counterclockwise",
          initialPhase: "up",
          rows: [
            { step: 0, laneId: "center" },
            { step: 1, laneId: "center" }
          ]
        }
      ]
    };

    const result = compilePoiBeatGraph(graph);

    expect(result.diagnostics).toEqual([]);
    expect(result.sequence.rigs[0]?.sequence.segments).toHaveLength(2);
  });
});
