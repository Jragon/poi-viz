import type { MultiRigSequence, Segment } from "@/engine/types";
import { resolveEdge, type Cardinal } from "@/lab/experiments/qt-stall-graph/cardinals";
import {
  type StallPatternDraft,
  type StallPatternHand,
  type StallPatternTrackDraft
} from "@/lab/experiments/qt-stall-graph/stallPattern";

// ─── Constants (re-derived locally; do not import from elementaryQuarterTime) ─

const HAND_RADIUS = 1;
const HEAD_RADIUS = 0.5;
const ANTISPIN_RATIO = -3;
const QUARTER_DURATION = 0.25;

// ─── Types ────────────────────────────────────────────────────────────────────

export type StallGraphDiagnosticCode =
  | "EMPTY_TRACK"
  | "SINGLE_MARK_TRACK"
  | "MISSING_ROW_MARK"
  | "ILLEGAL_EDGE"
  | "NO_VALID_HANDS";

export interface StallGraphDiagnostic {
  readonly code: StallGraphDiagnosticCode;
  readonly hand?: "left" | "right";
  readonly beatIndex?: number;
  readonly edgeIndex?: number;
  readonly from?: Cardinal;
  readonly to?: Cardinal;
}

export interface CompileStallGraphResult {
  readonly sequence: MultiRigSequence | null;
  readonly diagnostics: readonly StallGraphDiagnostic[];
}

// ─── Segment builder (confirmed in Phase 0) ───────────────────────────────────

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Returns the signed short angular step in radians between two local angles. */
function shortStepRad(fromDeg: number, toDeg: number): number {
  let delta = (((toDeg - fromDeg) % 360) + 360) % 360;
  if (delta > 180) delta -= 360;
  return degToRad(delta);
}

function buildEdgeSegment(
  fromDeg: number,
  toDeg: number,
  planeId: import("@/engine/types").PlaneId
): Segment {
  const fromRad = degToRad(fromDeg);
  const stepRad = shortStepRad(fromDeg, toDeg);
  const handOmega = stepRad / QUARTER_DURATION;
  const headOmega = ANTISPIN_RATIO * handOmega;

  return {
    durationUnits: QUARTER_DURATION,
    planeId,
    hand: {
      startPose: { phaseAbs: fromRad, radius: HAND_RADIUS },
      driver: { kind: "circle", omega: handOmega }
    },
    head: {
      startPose: { phaseAbs: fromRad, radius: HEAD_RADIUS },
      driver: { kind: "circle", omega: headOmega }
    }
  };
}

function compileHand(
  hand: StallPatternHand,
  track: StallPatternTrackDraft,
  diagnostics: StallGraphDiagnostic[]
): Segment[] | null {
  const marks = track.filter((mark): mark is Cardinal => mark !== null);
  if (marks.length === 0) {
    diagnostics.push({ code: "EMPTY_TRACK", hand });
    return null;
  }

  if (marks.length === 1) {
    diagnostics.push({ code: "SINGLE_MARK_TRACK", hand });
    return null;
  }

  let hasMissingRows = false;
  track.forEach((mark, beatIndex) => {
    if (mark !== null) return;
    diagnostics.push({ code: "MISSING_ROW_MARK", hand, beatIndex });
    hasMissingRows = true;
  });

  if (hasMissingRows) return null;
  const segments: Segment[] = [];
  let hasError = false;

  for (let i = 0; i < marks.length; i++) {
    const from = marks[i];
    const to = marks[(i + 1) % marks.length];
    const edge = resolveEdge(from, to);

    if (edge === null) {
      diagnostics.push({ code: "ILLEGAL_EDGE", hand, edgeIndex: i, from, to });
      hasError = true;
      continue;
    }

    segments.push(buildEdgeSegment(edge.fromDeg, edge.toDeg, edge.planeId));
  }

  return hasError ? null : segments;
}

// ─── Public compiler ──────────────────────────────────────────────────────────

export function compileStallPattern(draft: StallPatternDraft): CompileStallGraphResult {
  const diagnostics: StallGraphDiagnostic[] = [];
  if (draft.tracks.left === null && draft.tracks.right === null) {
    diagnostics.push({ code: "NO_VALID_HANDS" });
    return { sequence: null, diagnostics };
  }

  const leftSegments = draft.tracks.left
    ? compileHand("left", draft.tracks.left, diagnostics)
    : null;
  const rightSegments = draft.tracks.right
    ? compileHand("right", draft.tracks.right, diagnostics)
    : null;

  if (leftSegments === null && rightSegments === null) {
    diagnostics.push({ code: "NO_VALID_HANDS" });
    return { sequence: null, diagnostics };
  }

  const rigs = [];
  if (leftSegments !== null) {
    rigs.push({ rigId: "left", sequence: { segments: leftSegments } });
  }
  if (rightSegments !== null) {
    rigs.push({ rigId: "right", sequence: { segments: rightSegments } });
  }

  const sequence: MultiRigSequence = { rigs };
  return { sequence, diagnostics };
}
