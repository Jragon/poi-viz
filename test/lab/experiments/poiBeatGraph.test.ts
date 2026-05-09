import { PI } from "@/engine/constants";
import { evalPreparedMultiRigSequenceAt, prepareMultiRigSequence } from "@/engine/multirig";
import {
  compilePoiBeatGraph,
  DEFAULT_POI_BEAT_COMPILER_OPTIONS
} from "@/lab/experiments/poi-beat-graph/compileBeatGraph";
import {
  appendPoiBeatGraphRow,
  deletePoiBeatGraphLastRow,
  deriveLoopIntervals,
  deriveRowStates,
  filterPoiBeatGraphTracks,
  movePoiBeatGraphRowLane,
  setPoiBeatGraphTrackDirection,
  setPoiBeatGraphTrackInitialPhase
} from "@/lab/experiments/poi-beat-graph/graphHelpers";
import {
  createLowerWrapBeatGraph,
  createTwoHandLowWrapBeatGraph,
  createUpperWrapBeatGraph
} from "@/lab/experiments/poi-beat-graph/lowerWrapSeed";
import type { PoiBeatGraph } from "@/lab/experiments/poi-beat-graph/types";
import { describe, expect, it } from "vitest";

const HALF_BEAT_DURATION = 0.5;

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

function handPointAt(prepared: ReturnType<typeof prepareMultiRigSequence>, t: number) {
  if (!prepared.ok) {
    throw new Error(`expected compiled sequence to prepare: ${JSON.stringify(prepared.errors)}`);
  }

  const result = evalPreparedMultiRigSequenceAt(prepared.prepared, t);
  if (!result.ok) {
    throw new Error(`expected compiled sequence to evaluate at ${t}`);
  }

  const handPose = result.poses.right?.pose.handPose;
  if (!handPose) {
    throw new Error("expected right rig hand pose");
  }

  return {
    x: handPose.radius * Math.cos(handPose.phaseAbs),
    y: handPose.radius * Math.sin(handPose.phaseAbs)
  };
}

describe("PoiBeatGraph lower-wrap seed", () => {
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
    expect(intervals.map((interval) => interval.kind)).toEqual([
      "same-lane",
      "lane-switch",
      "lane-switch",
      "same-lane",
      "lane-switch",
      "lane-switch"
    ]);
    expect(intervals.map((interval) => interval.planeSide)).toEqual(["b", "a", "b", "b", "a", "b"]);
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

  it("filters visible tracks for compilation without mutating the source graph", () => {
    const graph = createTwoHandLowWrapBeatGraph();
    const visibleGraph = filterPoiBeatGraphTracks(graph, ["right"]);
    const result = compilePoiBeatGraph(visibleGraph);

    expect(graph.tracks.map((track) => track.id)).toEqual(["left", "right"]);
    expect(visibleGraph.tracks.map((track) => track.id)).toEqual(["right"]);
    expect(result.sequence.rigs.map((rig) => rig.rigId)).toEqual(["right"]);
    expect(result.diagnostics).toEqual([]);
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

  it("reports center same-lane intervals as compiler diagnostics", () => {
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

    expect(result.diagnostics).toContainEqual({
      code: "CENTER_STATIONARY_INTERVAL",
      trackId: "right",
      intervalIndex: 0,
      step: 0,
      laneId: "center"
    });
  });
});
