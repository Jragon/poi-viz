import { compileAuthoredDocument, validateAuthoredDocument } from "@/authoring/compile";
import { compileStallPattern } from "@/lab/experiments/qt-stall-graph/compileStallGraph";
import {
  validateStallPatternDraft,
  type StallPatternDraft
} from "@/lab/experiments/qt-stall-graph/stallPattern";
import {
  compilePoiBeatGraph,
  DEFAULT_POI_BEAT_COMPILER_OPTIONS
} from "@/lab/experiments/mel-body-tracing/beat-graph/compileBeatGraph";
import { POI_BEAT_LANES } from "@/lab/experiments/mel-body-tracing/beat-graph/graphHelpers";
import type { PoiBeatGraph } from "@/lab/experiments/mel-body-tracing/beat-graph/types";
import type {
  PatternCompileResult,
  PatternSource,
  PatternValidationResult
} from "@/patterns/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const BEAT_LANES_BY_ID = new Map(POI_BEAT_LANES.map((lane) => [lane.id, lane]));
const BEAT_HANDS = new Set(["left", "right"]);
const BEAT_DIRECTIONS = new Set(["clockwise", "counterclockwise"]);
const BEAT_PHASES = new Set(["up", "down"]);
const PLANE_SIDES = new Set(["a", "b"]);

function validateBeatGraph(value: unknown): PatternValidationResult {
  if (!isRecord(value)) return { ok: false, message: "Beat graph must be an object" };
  if (!Number.isSafeInteger(value.cycleSteps) || (value.cycleSteps as number) < 2) {
    return { ok: false, message: "Beat graph cycleSteps must be an integer of at least 2" };
  }
  if (
    !Array.isArray(value.lanes) ||
    value.lanes.length === 0 ||
    !Array.isArray(value.tracks) ||
    value.tracks.length === 0
  ) {
    return { ok: false, message: "Beat graph lanes and tracks are required" };
  }

  const laneIds = new Set<string>();
  for (const lane of value.lanes) {
    const canonicalLane = isRecord(lane) && typeof lane.id === "string"
      ? BEAT_LANES_BY_ID.get(lane.id as PoiBeatGraph["lanes"][number]["id"])
      : undefined;
    if (
      !isRecord(lane) ||
      typeof lane.id !== "string" ||
      !canonicalLane ||
      laneIds.has(lane.id) ||
      lane.label !== canonicalLane.label ||
      lane.lateral !== canonicalLane.lateral ||
      lane.vertical !== canonicalLane.vertical
    ) {
      return { ok: false, message: "Beat graph lanes are invalid" };
    }
    laneIds.add(lane.id);
  }

  const trackIds = new Set<string>();
  for (const track of value.tracks) {
    if (
      !isRecord(track) ||
      typeof track.id !== "string" ||
      track.id.length === 0 ||
      trackIds.has(track.id) ||
      typeof track.hand !== "string" ||
      !BEAT_HANDS.has(track.hand) ||
      typeof track.poiDirection !== "string" ||
      !BEAT_DIRECTIONS.has(track.poiDirection) ||
      typeof track.initialPhase !== "string" ||
      !BEAT_PHASES.has(track.initialPhase) ||
      !Array.isArray(track.rows)
    ) {
      return { ok: false, message: "Beat graph tracks are invalid" };
    }
    trackIds.add(track.id);
    if (track.rows.length !== value.cycleSteps) {
      return { ok: false, message: "Beat graph tracks must match cycleSteps" };
    }
    const rowSteps = new Set<number>();
    for (const row of track.rows) {
      if (
        !isRecord(row) ||
        !Number.isSafeInteger(row.step) ||
        (row.step as number) < 0 ||
        (row.step as number) >= (value.cycleSteps as number) ||
        rowSteps.has(row.step as number) ||
        typeof row.laneId !== "string" ||
        !laneIds.has(row.laneId) ||
        (row.planeSide !== undefined &&
          (typeof row.planeSide !== "string" || !PLANE_SIDES.has(row.planeSide)))
      ) {
        return { ok: false, message: "Beat graph rows are invalid" };
      }
      rowSteps.add(row.step as number);
    }
  }
  return { ok: true };
}

export function clonePatternSource(source: PatternSource): PatternSource {
  return JSON.parse(JSON.stringify(source)) as PatternSource;
}

export function validatePatternSource(source: PatternSource): PatternValidationResult {
  switch (source.kind) {
    case "authoring":
      return validateAuthoredDocument(source.document).ok
        ? { ok: true }
        : { ok: false, message: "Authoring document is invalid" };
    case "stall-graph": {
      const result = validateStallPatternDraft(source.draft);
      return result.ok
        ? { ok: true }
        : { ok: false, message: result.issues[0]?.message ?? "Invalid stall graph" };
    }
    case "beat-graph":
      return validateBeatGraph(source.graph);
  }
}

export function compilePatternSource(source: PatternSource): PatternCompileResult {
  try {
    switch (source.kind) {
      case "authoring": {
        const result = compileAuthoredDocument(source.document);
        return result.ok
          ? { ok: true, sequence: result.sequence, diagnostics: [] }
          : { ok: false, message: result.errors.map((error) => error.code).join(", ") };
      }
      case "stall-graph": {
        const result = compileStallPattern(source.draft);
        if (result.sequence === null) {
          return {
            ok: false,
            message: result.diagnostics.map((diagnostic) => diagnostic.code).join(", ")
          };
        }
        return {
          ok: true,
          sequence: result.sequence,
          diagnostics: result.diagnostics.map((diagnostic) => diagnostic.code)
        };
      }
      case "beat-graph": {
        const result = compilePoiBeatGraph(source.graph, DEFAULT_POI_BEAT_COMPILER_OPTIONS);
        return {
          ok: true,
          sequence: result.sequence,
          diagnostics: result.diagnostics.map((diagnostic) => diagnostic.code)
        };
      }
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Pattern compilation failed"
    };
  }
}

export function patternKindLabel(kind: PatternSource["kind"]): string {
  switch (kind) {
    case "authoring":
      return "Authoring";
    case "stall-graph":
      return "Stall Graph";
    case "beat-graph":
      return "Beat Graph";
  }
}

export function isPatternSource(value: unknown): value is PatternSource {
  if (!isRecord(value) || typeof value.kind !== "string") return false;
  if (value.kind === "authoring") return isRecord(value.document);
  if (value.kind === "stall-graph") return isRecord(value.draft);
  if (value.kind === "beat-graph") return isRecord(value.graph);
  return false;
}

export function asStallDraft(source: PatternSource): StallPatternDraft {
  if (source.kind !== "stall-graph") throw new Error("Pattern is not a stall graph");
  return source.draft;
}

export function asBeatGraph(source: PatternSource): PoiBeatGraph {
  if (source.kind !== "beat-graph") throw new Error("Pattern is not a beat graph");
  return source.graph;
}
