import { PI } from "@/engine/constants";
import type { PlaneSide, TimeUnit } from "@/engine/types";
import type {
  PoiBeatDerivedRowState,
  PoiBeatDirection,
  PoiBeatGraph,
  PoiBeatInterval,
  PoiBeatLane,
  PoiBeatLaneId,
  PoiBeatPhaseLabel,
  PoiBeatTrack
} from "@/lab/experiments/poi-beat-graph/types";

export const POI_BEAT_LANES: readonly PoiBeatLane[] = [
  { id: "left-high", label: "Left high", lateral: "left", vertical: "high" },
  { id: "left-low", label: "Left low", lateral: "left", vertical: "low" },
  { id: "center", label: "Center", lateral: "center", vertical: "center" },
  { id: "right-low", label: "Right low", lateral: "right", vertical: "low" },
  { id: "right-high", label: "Right high", lateral: "right", vertical: "high" }
] as const;

const INITIAL_PHASE_RAD: Record<PoiBeatPhaseLabel, number> = {
  up: PI / 2,
  down: (3 * PI) / 2
};

const DIRECTION_SIGN: Record<PoiBeatDirection, 1 | -1> = {
  clockwise: -1,
  counterclockwise: 1
};

export function getPoiBeatLane(laneId: PoiBeatLaneId): PoiBeatLane {
  const lane = POI_BEAT_LANES.find((candidate) => candidate.id === laneId);
  if (!lane) {
    throw new Error(`Unknown poi beat lane: ${laneId}`);
  }
  return lane;
}

export function getOrderedRows(track: PoiBeatTrack): readonly PoiBeatTrack["rows"][number][] {
  return [...track.rows].sort((a, b) => a.step - b.step);
}

export function getDirectionSign(direction: PoiBeatDirection): 1 | -1 {
  return DIRECTION_SIGN[direction];
}

export function deriveRowPhaseAbs(track: PoiBeatTrack, step: number): number {
  return INITIAL_PHASE_RAD[track.initialPhase] + getDirectionSign(track.poiDirection) * PI * step;
}

export function deriveRowPhaseLabel(track: PoiBeatTrack, step: number): PoiBeatPhaseLabel {
  const evenStep = step % 2 === 0;
  if (track.initialPhase === "up") return evenStep ? "up" : "down";
  return evenStep ? "down" : "up";
}

export function deriveRowSide(laneId: PoiBeatLaneId): PlaneSide {
  return laneId === "center" ? "a" : "b";
}

export function deriveRowState(
  track: PoiBeatTrack,
  row: PoiBeatTrack["rows"][number]
): PoiBeatDerivedRowState {
  return {
    row,
    phaseAbs: deriveRowPhaseAbs(track, row.step),
    phaseLabel: deriveRowPhaseLabel(track, row.step),
    planeSide: deriveRowSide(row.laneId)
  };
}

export function deriveRowStates(track: PoiBeatTrack): readonly PoiBeatDerivedRowState[] {
  return getOrderedRows(track).map((row) => deriveRowState(track, row));
}

export function deriveLoopIntervals(
  track: PoiBeatTrack,
  halfBeatDuration: TimeUnit
): readonly PoiBeatInterval[] {
  const rows = getOrderedRows(track);
  return rows.map((fromRow, index) => {
    const toRow = rows[(index + 1) % rows.length];
    return {
      index,
      trackId: track.id,
      fromRow,
      toRow,
      kind: fromRow.laneId === toRow.laneId ? "same-lane" : "lane-switch",
      planeSide: deriveRowSide(toRow.laneId),
      durationUnits: halfBeatDuration
    };
  });
}

export function movePoiBeatGraphRowLane(
  graph: PoiBeatGraph,
  trackId: string,
  step: number,
  laneId: PoiBeatLaneId
): PoiBeatGraph {
  return {
    ...graph,
    tracks: graph.tracks.map((track) => {
      if (track.id !== trackId) return track;

      return {
        ...track,
        rows: track.rows.map((row) => (row.step === step ? { ...row, laneId } : row))
      };
    })
  };
}

export function appendPoiBeatGraphRow(graph: PoiBeatGraph): PoiBeatGraph {
  const nextStep = graph.cycleSteps;
  return {
    ...graph,
    cycleSteps: graph.cycleSteps + 1,
    tracks: graph.tracks.map((track) => {
      const rows = getOrderedRows(track);
      const lastRow = rows[rows.length - 1];
      const laneId = lastRow?.laneId ?? "center";

      return {
        ...track,
        rows: [...rows, { step: nextStep, laneId }]
      };
    })
  };
}

export function deletePoiBeatGraphLastRow(graph: PoiBeatGraph): PoiBeatGraph {
  if (graph.cycleSteps <= 2) return graph;

  const nextCycleSteps = graph.cycleSteps - 1;
  return {
    ...graph,
    cycleSteps: nextCycleSteps,
    tracks: graph.tracks.map((track) => ({
      ...track,
      rows: getOrderedRows(track).filter((row) => row.step < nextCycleSteps)
    }))
  };
}
