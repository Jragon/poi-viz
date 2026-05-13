import type { PoiBeatDirection } from "@/lab/experiments/mel-body-tracing/beat-graph/types";
import {
  DEFAULT_COSMO_CONFIG,
  getValidCosmoPartners,
  isValidCosmoPair
} from "@/lab/experiments/mel-body-tracing/explorers/cosmoRules";
import type {
  CosmoBackPosition,
  CosmoConfig,
  CosmoFrontPosition
} from "@/lab/experiments/mel-body-tracing/explorers/cosmoTypes";
import {
  DEFAULT_REEL_CONFIG,
  REEL_POSITION_OPTIONS
} from "@/lab/experiments/mel-body-tracing/explorers/reelRules";
import type {
  ReelConfig,
  ReelDirection,
  ReelPosition
} from "@/lab/experiments/mel-body-tracing/explorers/reelTypes";
import {
  DEFAULT_WRAP_CONFIG,
  getValidPartners,
  isValidWrapPair
} from "@/lab/experiments/mel-body-tracing/explorers/wrapRules";
import type {
  WrapConfig,
  WrapPositionPair
} from "@/lab/experiments/mel-body-tracing/explorers/wrapTypes";

export type BodyTracingExplorerTab = "reel" | "wrap" | "cosmo";

export interface BodyTracingExplorerState {
  readonly tab: BodyTracingExplorerTab;
  readonly reel: ReelConfig;
  readonly wrap: WrapConfig;
  readonly cosmo: CosmoConfig;
}

export type ExplorerQuery = Record<string, string>;

const REEL_POSITIONS = new Set<ReelPosition>(REEL_POSITION_OPTIONS);
const COSMO_FRONT_POSITIONS = new Set<CosmoFrontPosition>([
  "high-native",
  "low-native",
  "high-non-native",
  "low-non-native"
]);
const COSMO_BACK_POSITIONS = new Set<CosmoBackPosition>(["high-back", "low-back"]);

export const DEFAULT_EXPLORER_STATE: BodyTracingExplorerState = {
  tab: "reel",
  reel: DEFAULT_REEL_CONFIG,
  wrap: DEFAULT_WRAP_CONFIG,
  cosmo: DEFAULT_COSMO_CONFIG
};

function firstQueryValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return firstQueryValue(value[0]);
  return undefined;
}

function parseTab(value: unknown): BodyTracingExplorerTab {
  const tab = firstQueryValue(value);
  if (tab === "wrap" || tab === "cosmo" || tab === "reel") return tab;
  if (tab) console.warn(`Invalid body tracing explorer tab: ${tab}`);
  return DEFAULT_EXPLORER_STATE.tab;
}

function parsePosition(value: unknown, fallback: ReelPosition): ReelPosition {
  const position = firstQueryValue(value);
  if (position && REEL_POSITIONS.has(position as ReelPosition)) return position as ReelPosition;
  if (position) console.warn(`Invalid reel position: ${position}`);
  return fallback;
}

function parseDirection(value: unknown, fallback: ReelDirection): ReelDirection {
  const direction = firstQueryValue(value);
  if (direction === "same-cw") return { mode: "same", direction: "clockwise" };
  if (direction === "same-ccw") return { mode: "same", direction: "counterclockwise" };
  if (direction === "opp-in") return { mode: "opposite", flow: "inwards" };
  if (direction === "opp-out") return { mode: "opposite", flow: "outwards" };
  if (direction) console.warn(`Invalid reel direction: ${direction}`);
  return fallback;
}

function encodeDirection(direction: ReelDirection): string {
  if (direction.mode === "same") {
    return direction.direction === "clockwise" ? "same-cw" : "same-ccw";
  }

  return direction.flow === "inwards" ? "opp-in" : "opp-out";
}

function parseNumberUnion<T extends number>(
  value: unknown,
  validValues: readonly T[],
  fallback: T,
  label: string
): T {
  const rawValue = firstQueryValue(value);
  const parsed = rawValue === undefined ? NaN : Number(rawValue);
  if (validValues.includes(parsed as T)) return parsed as T;
  if (rawValue !== undefined) console.warn(`Invalid ${label}: ${rawValue}`);
  return fallback;
}

function parseReelConfig(query: Record<string, unknown>): ReelConfig {
  return {
    left: parsePosition(query.left, DEFAULT_REEL_CONFIG.left),
    right: parsePosition(query.right, DEFAULT_REEL_CONFIG.right),
    direction: parseDirection(query.dir, DEFAULT_REEL_CONFIG.direction),
    offset: parseNumberUnion(
      query.offset,
      [0, 1, 2, 3] as const,
      DEFAULT_REEL_CONFIG.offset,
      "reel offset"
    )
  };
}

function parseWrapPair(
  query: Record<string, unknown>,
  prefix: "l" | "r",
  fallback: WrapPositionPair
): WrapPositionPair {
  const a = parsePosition(query[`${prefix}a`], fallback.a);
  const fallbackB = isValidWrapPair(a, fallback.b) ? fallback.b : getValidPartners(a)[0];
  const b = parsePosition(query[`${prefix}b`], fallbackB);

  if (isValidWrapPair(a, b)) return { a, b };
  console.warn(`Invalid wrap pair: ${a} -> ${b}`);
  return { a, b: fallbackB };
}

function parseWrapConfig(query: Record<string, unknown>): WrapConfig {
  return {
    left: parseWrapPair(query, "l", DEFAULT_WRAP_CONFIG.left),
    right: parseWrapPair(query, "r", DEFAULT_WRAP_CONFIG.right),
    direction: parseDirection(query.dir, DEFAULT_WRAP_CONFIG.direction),
    offset: parseNumberUnion(
      query.offset,
      [0, 1, 2, 3, 4, 5] as const,
      DEFAULT_WRAP_CONFIG.offset,
      "wrap offset"
    )
  };
}

function parseCosmoFront(value: unknown, fallback: CosmoFrontPosition): CosmoFrontPosition {
  const position = firstQueryValue(value);
  if (position && COSMO_FRONT_POSITIONS.has(position as CosmoFrontPosition)) {
    return position as CosmoFrontPosition;
  }
  if (position) console.warn(`Invalid cosmo front position: ${position}`);
  return fallback;
}

function parseCosmoBack(value: unknown, fallback: CosmoBackPosition): CosmoBackPosition {
  const position = firstQueryValue(value);
  if (position && COSMO_BACK_POSITIONS.has(position as CosmoBackPosition)) {
    return position as CosmoBackPosition;
  }
  if (position) console.warn(`Invalid cosmo back position: ${position}`);
  return fallback;
}

function parseCosmoPair(
  query: Record<string, unknown>,
  prefix: "l" | "r",
  fallback: CosmoConfig["left"]
): CosmoConfig["left"] {
  const a = parseCosmoFront(query[`${prefix}a`], fallback.a);
  const fallbackB = isValidCosmoPair(a, fallback.b) ? fallback.b : getValidCosmoPartners(a)[0];
  const b = parseCosmoBack(query[`${prefix}b`], fallbackB);

  if (isValidCosmoPair(a, b)) return { a, b };
  console.warn(`Invalid cosmo pair: ${a} -> ${b}`);
  return { a, b: fallbackB };
}

function parseCosmoConfig(query: Record<string, unknown>): CosmoConfig {
  return {
    left: parseCosmoPair(query, "l", DEFAULT_COSMO_CONFIG.left),
    right: parseCosmoPair(query, "r", DEFAULT_COSMO_CONFIG.right),
    direction: parseDirection(query.dir, DEFAULT_COSMO_CONFIG.direction),
    offset: parseNumberUnion(
      query.offset,
      [0, 1, 2, 3, 4, 5, 6, 7] as const,
      DEFAULT_COSMO_CONFIG.offset,
      "cosmo offset"
    )
  };
}

export function parseExplorerState(query: Record<string, unknown>): BodyTracingExplorerState {
  const tab = parseTab(query.t);

  return {
    tab,
    reel: tab === "reel" ? parseReelConfig(query) : DEFAULT_REEL_CONFIG,
    wrap: tab === "wrap" ? parseWrapConfig(query) : DEFAULT_WRAP_CONFIG,
    cosmo: tab === "cosmo" ? parseCosmoConfig(query) : DEFAULT_COSMO_CONFIG
  };
}

function directionsEqual(left: ReelDirection, right: ReelDirection): boolean {
  if (left.mode !== right.mode) return false;
  if (left.mode === "same" && right.mode === "same") return left.direction === right.direction;
  if (left.mode === "opposite" && right.mode === "opposite") return left.flow === right.flow;
  return false;
}

function appendDirectionParam(
  query: Record<string, string>,
  direction: ReelDirection,
  defaultDirection: ReelDirection
): void {
  if (!directionsEqual(direction, defaultDirection)) query.dir = encodeDirection(direction);
}

function serializeReelConfig(config: ReelConfig): ExplorerQuery {
  const query: ExplorerQuery = {};
  if (config.left !== DEFAULT_REEL_CONFIG.left) query.left = config.left;
  if (config.right !== DEFAULT_REEL_CONFIG.right) query.right = config.right;
  appendDirectionParam(query, config.direction, DEFAULT_REEL_CONFIG.direction);
  if (config.offset !== DEFAULT_REEL_CONFIG.offset) query.offset = String(config.offset);
  return query;
}

function serializeWrapConfig(config: WrapConfig): ExplorerQuery {
  const query: ExplorerQuery = {};
  if (config.left.a !== DEFAULT_WRAP_CONFIG.left.a) query.la = config.left.a;
  if (config.left.b !== DEFAULT_WRAP_CONFIG.left.b) query.lb = config.left.b;
  if (config.right.a !== DEFAULT_WRAP_CONFIG.right.a) query.ra = config.right.a;
  if (config.right.b !== DEFAULT_WRAP_CONFIG.right.b) query.rb = config.right.b;
  appendDirectionParam(query, config.direction, DEFAULT_WRAP_CONFIG.direction);
  if (config.offset !== DEFAULT_WRAP_CONFIG.offset) query.offset = String(config.offset);
  return query;
}

function serializeCosmoConfig(config: CosmoConfig): ExplorerQuery {
  const query: ExplorerQuery = {};
  if (config.left.a !== DEFAULT_COSMO_CONFIG.left.a) query.la = config.left.a;
  if (config.left.b !== DEFAULT_COSMO_CONFIG.left.b) query.lb = config.left.b;
  if (config.right.a !== DEFAULT_COSMO_CONFIG.right.a) query.ra = config.right.a;
  if (config.right.b !== DEFAULT_COSMO_CONFIG.right.b) query.rb = config.right.b;
  appendDirectionParam(query, config.direction, DEFAULT_COSMO_CONFIG.direction);
  if (config.offset !== DEFAULT_COSMO_CONFIG.offset) query.offset = String(config.offset);
  return query;
}

export function serializeExplorerState(state: BodyTracingExplorerState): ExplorerQuery {
  const query: ExplorerQuery = { t: state.tab };
  if (state.tab === "wrap") return { ...query, ...serializeWrapConfig(state.wrap) };
  if (state.tab === "cosmo") return { ...query, ...serializeCosmoConfig(state.cosmo) };
  return { ...query, ...serializeReelConfig(state.reel) };
}

export function formatDirectionLabel(direction: PoiBeatDirection): string {
  return direction === "clockwise" ? "CW" : "CCW";
}
