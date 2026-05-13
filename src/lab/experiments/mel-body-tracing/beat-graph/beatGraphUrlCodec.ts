import { POI_BEAT_LANES } from "@/lab/experiments/mel-body-tracing/beat-graph/graphHelpers";
import type {
  PoiBeatDirection,
  PoiBeatGraph,
  PoiBeatHand,
  PoiBeatLaneId,
  PoiBeatPhaseLabel,
  PoiBeatRow,
  PoiBeatTrack
} from "@/lab/experiments/mel-body-tracing/beat-graph/types";

export interface BeatGraphUrlParams {
  readonly s: string;
  readonly lt: string;
  readonly rt: string;
}

export type BeatGraphUrlCodecResult =
  | { readonly ok: true; readonly graph: PoiBeatGraph }
  | { readonly ok: false; readonly reason: string };

const LANE_TO_CODE: Record<PoiBeatLaneId, string> = {
  "left-high": "1",
  "left-low": "2",
  center: "3",
  "right-low": "4",
  "right-high": "5"
};

const CODE_TO_LANE: Record<string, PoiBeatLaneId> = {
  "1": "left-high",
  "2": "left-low",
  "3": "center",
  "4": "right-low",
  "5": "right-high"
};

const DIRECTION_TO_CODE: Record<PoiBeatDirection, string> = {
  clockwise: "cw",
  counterclockwise: "ccw"
};

const CODE_TO_DIRECTION: Record<string, PoiBeatDirection> = {
  cw: "clockwise",
  ccw: "counterclockwise"
};

function getRequiredTrack(graph: PoiBeatGraph, hand: PoiBeatHand): PoiBeatTrack | null {
  const matches = graph.tracks.filter((track) => track.hand === hand);
  if (matches.length !== 1) return null;
  return matches[0];
}

function encodeRows(rows: readonly PoiBeatRow[]): string {
  return [...rows]
    .sort((a, b) => a.step - b.step)
    .map((row) => `${LANE_TO_CODE[row.laneId]}${row.planeSide ?? "d"}`)
    .join("");
}

function encodeTrack(track: PoiBeatTrack): string {
  return `${DIRECTION_TO_CODE[track.poiDirection]}-${track.initialPhase}-${encodeRows(track.rows)}`;
}

export function encodeBeatGraphToUrlParams(graph: PoiBeatGraph): BeatGraphUrlParams | null {
  if (graph.tracks.length !== 2) return null;

  const leftTrack = getRequiredTrack(graph, "left");
  const rightTrack = getRequiredTrack(graph, "right");
  if (!leftTrack || !rightTrack) return null;

  if (leftTrack.rows.length !== graph.cycleSteps || rightTrack.rows.length !== graph.cycleSteps) {
    return null;
  }

  return {
    s: String(graph.cycleSteps),
    lt: encodeTrack(leftTrack),
    rt: encodeTrack(rightTrack)
  };
}

function decodeRows(payload: string, cycleSteps: number): readonly PoiBeatRow[] | null {
  if (payload.length !== cycleSteps * 2) return null;

  const rows: PoiBeatRow[] = [];
  for (let index = 0; index < payload.length; index += 2) {
    const laneId = CODE_TO_LANE[payload[index]];
    const sideCode = payload[index + 1];

    if (!laneId || (sideCode !== "a" && sideCode !== "b" && sideCode !== "d")) return null;

    rows.push({
      step: index / 2,
      laneId,
      ...(sideCode === "d" ? {} : { planeSide: sideCode })
    });
  }

  return rows;
}

function decodeTrack(payload: string, hand: PoiBeatHand, cycleSteps: number): PoiBeatTrack | null {
  const [directionCode, phaseCode, rowsPayload, ...extraParts] = payload.split("-");
  if (extraParts.length > 0) return null;

  const poiDirection = CODE_TO_DIRECTION[directionCode];
  const initialPhase = phaseCode as PoiBeatPhaseLabel;
  if (!poiDirection || (initialPhase !== "up" && initialPhase !== "down")) return null;

  const rows = decodeRows(rowsPayload ?? "", cycleSteps);
  if (!rows) return null;

  return {
    id: hand,
    hand,
    poiDirection,
    initialPhase,
    rows
  };
}

export function decodeBeatGraphFromUrlParams(params: {
  readonly s?: string | null;
  readonly lt?: string | null;
  readonly rt?: string | null;
}): BeatGraphUrlCodecResult {
  const cycleSteps = Number(params.s);
  if (!Number.isInteger(cycleSteps) || cycleSteps < 2) {
    return { ok: false, reason: "Beat graph URL requires integer cycle steps >= 2" };
  }

  if (!params.lt || !params.rt) {
    return { ok: false, reason: "Beat graph URL requires left and right track params" };
  }

  const leftTrack = decodeTrack(params.lt, "left", cycleSteps);
  const rightTrack = decodeTrack(params.rt, "right", cycleSteps);
  if (!leftTrack || !rightTrack) {
    return { ok: false, reason: "Beat graph URL contains invalid track data" };
  }

  return {
    ok: true,
    graph: {
      cycleSteps,
      lanes: POI_BEAT_LANES,
      tracks: [leftTrack, rightTrack]
    }
  };
}
