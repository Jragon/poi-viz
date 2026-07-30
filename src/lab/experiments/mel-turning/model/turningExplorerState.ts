import type {
  TurningReelConfig,
  TurningReelDirection,
  TurningReelOffset,
  TurningReelPosition
} from "@/lab/experiments/mel-turning/adapter/melBeatGraphAdapter";
import { constrainTurningTarget } from "@/lab/experiments/mel-turning/model/turningEndpointCompatibility";
import type { BodyTurnDirection } from "@/lab/experiments/mel-turning/model/turningTypes";

export interface TurningExplorerState {
  readonly source: TurningReelConfig;
  readonly target: TurningReelConfig;
  readonly turnDirection: BodyTurnDirection;
}

export type TurningExplorerQuery = Record<string, string>;

const LOW_REEL_POSITIONS = new Set<TurningReelPosition>([
  "low-native",
  "low-non-native",
  "low-back"
]);
const REEL_OFFSETS = new Set<TurningReelOffset>([0, 1, 2, 3]);

export const DEFAULT_TURNING_EXPLORER_STATE: TurningExplorerState = {
  source: {
    left: "low-native",
    right: "low-non-native",
    direction: { mode: "opposite", flow: "inwards" },
    offset: 0
  },
  target: {
    left: "low-native",
    right: "low-non-native",
    direction: { mode: "opposite", flow: "outwards" },
    offset: 0
  },
  turnDirection: "left"
};

function firstQueryValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return firstQueryValue(value[0]);
  return undefined;
}

function parsePosition(value: unknown, fallback: TurningReelPosition): TurningReelPosition {
  const candidate = firstQueryValue(value);
  return candidate && LOW_REEL_POSITIONS.has(candidate as TurningReelPosition)
    ? (candidate as TurningReelPosition)
    : fallback;
}

function parseDirection(value: unknown, fallback: TurningReelDirection): TurningReelDirection {
  switch (firstQueryValue(value)) {
    case "same-cw":
      return { mode: "same", direction: "clockwise" };
    case "same-ccw":
      return { mode: "same", direction: "counterclockwise" };
    case "opp-in":
      return { mode: "opposite", flow: "inwards" };
    case "opp-out":
      return { mode: "opposite", flow: "outwards" };
    default:
      return fallback;
  }
}

function encodeDirection(direction: TurningReelDirection): string {
  if (direction.mode === "same") {
    return direction.direction === "clockwise" ? "same-cw" : "same-ccw";
  }
  return direction.flow === "inwards" ? "opp-in" : "opp-out";
}

function cloneDirection(direction: TurningReelDirection): TurningReelDirection {
  return { ...direction };
}

function parseOffset(value: unknown, fallback: TurningReelOffset): TurningReelOffset {
  const candidate = Number(firstQueryValue(value));
  return REEL_OFFSETS.has(candidate as TurningReelOffset)
    ? (candidate as TurningReelOffset)
    : fallback;
}

function parseConfig(
  query: Record<string, unknown>,
  prefix: "s" | "t",
  fallback: TurningReelConfig
): TurningReelConfig {
  return {
    left: parsePosition(query[`${prefix}l`], fallback.left),
    right: parsePosition(query[`${prefix}r`], fallback.right),
    direction: parseDirection(query[`${prefix}d`], fallback.direction),
    offset: parseOffset(query[`${prefix}o`], fallback.offset)
  };
}

export function parseTurningExplorerState(query: Record<string, unknown>): TurningExplorerState {
  return normalizeTurningExplorerState({
    source: parseConfig(query, "s", DEFAULT_TURNING_EXPLORER_STATE.source),
    target: parseConfig(query, "t", DEFAULT_TURNING_EXPLORER_STATE.target),
    turnDirection: firstQueryValue(query.turn) === "right" ? "right" : "left"
  });
}

function serializeConfig(
  query: TurningExplorerQuery,
  prefix: "s" | "t",
  config: TurningReelConfig
): void {
  query[`${prefix}l`] = config.left;
  query[`${prefix}r`] = config.right;
  query[`${prefix}d`] = encodeDirection(config.direction);
  query[`${prefix}o`] = String(config.offset);
}

export function serializeTurningExplorerState(state: TurningExplorerState): TurningExplorerQuery {
  const normalized = normalizeTurningExplorerState(state);
  const query: TurningExplorerQuery = {};
  serializeConfig(query, "s", normalized.source);
  serializeConfig(query, "t", normalized.target);
  query.turn = normalized.turnDirection;
  return query;
}

export function normalizeTurningExplorerState(state: TurningExplorerState): TurningExplorerState {
  const constrained = constrainTurningTarget(state.source, state.target);

  return {
    source: {
      left: state.source.left,
      right: state.source.right,
      direction: cloneDirection(state.source.direction),
      offset: state.source.offset
    },
    target: constrained.target,
    turnDirection: state.turnDirection
  };
}
