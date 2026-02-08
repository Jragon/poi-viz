import type { AppState, HandId, PhaseReference } from "@/types/state";

export const FIXTURE_CASES_SCHEMA_VERSION = 1;
export const DEFAULT_FIXTURE_ID = "default";

const FIXTURE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * One fixture input case: deterministic state + stable fixture id.
 */
export interface FixtureCaseDefinition {
  id: string;
  state: AppState;
}

/**
 * JSON payload format for manually authored fixture input cases.
 */
export interface FixtureCasesFile {
  schemaVersion: number;
  cases: Array<{
    id: string;
    state: unknown;
  }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function cloneState(state: AppState): AppState {
  return {
    global: { ...state.global },
    hands: {
      L: { ...state.hands.L },
      R: { ...state.hands.R }
    }
  };
}

function isValidFixtureId(value: unknown): value is string {
  return typeof value === "string" && FIXTURE_ID_PATTERN.test(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPhaseReference(value: unknown): value is PhaseReference {
  return value === "right" || value === "down" || value === "left" || value === "up";
}

const GLOBAL_NUMBER_KEYS = ["bpm", "loopBeats", "playSpeed", "t", "trailBeats", "trailSampleHz"] as const;
const GLOBAL_BOOLEAN_KEYS = ["isPlaying", "showTrails", "showWaves"] as const;
const HAND_NUMBER_KEYS = ["armSpeed", "armPhase", "armRadius", "poiSpeed", "poiPhase", "poiRadius"] as const;
const HAND_IDS: HandId[] = ["L", "R"];

function readFiniteNumber(source: Record<string, unknown>, key: string, path: string): number {
  if (!hasOwn(source, key) || !isFiniteNumber(source[key])) {
    throw new Error(`Fixture case state ${path} must be a finite number.`);
  }
  return source[key] as number;
}

function readBoolean(source: Record<string, unknown>, key: string, path: string): boolean {
  if (!hasOwn(source, key) || typeof source[key] !== "boolean") {
    throw new Error(`Fixture case state ${path} must be a boolean.`);
  }
  return source[key] as boolean;
}

function readPhaseReference(source: Record<string, unknown>, key: string): PhaseReference {
  if (!hasOwn(source, key) || !isPhaseReference(source[key])) {
    throw new Error("Fixture case state global.phaseReference must be one of right/down/left/up.");
  }
  return source[key] as PhaseReference;
}

function parseHandState(candidate: unknown, handId: HandId): AppState["hands"][HandId] {
  if (!isRecord(candidate)) {
    throw new Error(`Fixture case state hands.${handId} must be an object.`);
  }

  for (const key of HAND_NUMBER_KEYS) {
    if (!hasOwn(candidate, key) || !isFiniteNumber(candidate[key])) {
      throw new Error(`Fixture case state hands.${handId}.${key} must be a finite number.`);
    }
  }

  return {
    armSpeed: readFiniteNumber(candidate, "armSpeed", `hands.${handId}.armSpeed`),
    armPhase: readFiniteNumber(candidate, "armPhase", `hands.${handId}.armPhase`),
    armRadius: readFiniteNumber(candidate, "armRadius", `hands.${handId}.armRadius`),
    poiSpeed: readFiniteNumber(candidate, "poiSpeed", `hands.${handId}.poiSpeed`),
    poiPhase: readFiniteNumber(candidate, "poiPhase", `hands.${handId}.poiPhase`),
    poiRadius: readFiniteNumber(candidate, "poiRadius", `hands.${handId}.poiRadius`)
  };
}

function parseStrictAppState(candidate: unknown): AppState {
  if (!isRecord(candidate)) {
    throw new Error("Fixture case state must be an object.");
  }

  const global = candidate.global;
  const hands = candidate.hands;
  if (!isRecord(global) || !isRecord(hands)) {
    throw new Error("Fixture case state must include full `global` and `hands` objects.");
  }

  for (const key of GLOBAL_NUMBER_KEYS) {
    if (!hasOwn(global, key) || !isFiniteNumber(global[key])) {
      throw new Error(`Fixture case state global.${key} must be a finite number.`);
    }
  }
  for (const key of GLOBAL_BOOLEAN_KEYS) {
    if (!hasOwn(global, key) || typeof global[key] !== "boolean") {
      throw new Error(`Fixture case state global.${key} must be a boolean.`);
    }
  }
  if (!hasOwn(global, "phaseReference") || !isPhaseReference(global.phaseReference)) {
    throw new Error("Fixture case state global.phaseReference must be one of right/down/left/up.");
  }

  const parsedState: AppState = {
    global: {
      bpm: readFiniteNumber(global, "bpm", "global.bpm"),
      loopBeats: readFiniteNumber(global, "loopBeats", "global.loopBeats"),
      playSpeed: readFiniteNumber(global, "playSpeed", "global.playSpeed"),
      isPlaying: readBoolean(global, "isPlaying", "global.isPlaying"),
      t: readFiniteNumber(global, "t", "global.t"),
      showTrails: readBoolean(global, "showTrails", "global.showTrails"),
      trailBeats: readFiniteNumber(global, "trailBeats", "global.trailBeats"),
      trailSampleHz: readFiniteNumber(global, "trailSampleHz", "global.trailSampleHz"),
      showWaves: readBoolean(global, "showWaves", "global.showWaves"),
      phaseReference: readPhaseReference(global, "phaseReference")
    },
    hands: {
      L: parseHandState(hands.L, "L"),
      R: parseHandState(hands.R, "R")
    }
  };

  return cloneState(parsedState);
}

function parseFixtureCase(candidate: unknown): FixtureCaseDefinition {
  if (!isRecord(candidate)) {
    throw new Error("Fixture case must be an object.");
  }

  const id = candidate.id;
  if (!isValidFixtureId(id)) {
    throw new Error("Fixture case id must be lowercase kebab-case.");
  }
  if (id === DEFAULT_FIXTURE_ID) {
    throw new Error(`Fixture case id "${DEFAULT_FIXTURE_ID}" is reserved.`);
  }

  return {
    id,
    state: parseStrictAppState(candidate.state)
  };
}

/**
 * Parses manually-authored fixture input cases from JSON text.
 *
 * @param serialized JSON payload from `fixtures/state-cases.json`.
 * @returns Validated fixture case list in file order.
 */
export function parseFixtureCasesFile(serialized: string): FixtureCaseDefinition[] {
  let payload: unknown;

  try {
    payload = JSON.parse(serialized);
  } catch {
    throw new Error("Fixture cases file is not valid JSON.");
  }

  if (!isRecord(payload)) {
    throw new Error("Fixture cases payload must be an object.");
  }
  if (payload.schemaVersion !== FIXTURE_CASES_SCHEMA_VERSION) {
    throw new Error(`Fixture cases schema mismatch. Expected ${FIXTURE_CASES_SCHEMA_VERSION}.`);
  }
  if (!Array.isArray(payload.cases)) {
    throw new Error("Fixture cases payload must include an array at `cases`.");
  }

  const parsed = payload.cases.map((entry) => parseFixtureCase(entry));
  const ids = new Set<string>();

  for (const fixtureCase of parsed) {
    if (ids.has(fixtureCase.id)) {
      throw new Error(`Duplicate fixture case id "${fixtureCase.id}".`);
    }
    ids.add(fixtureCase.id);
  }

  return parsed;
}

/**
 * Builds full fixture input set by prepending the canonical default-state fixture.
 *
 * @param defaultState Default app state fixture source.
 * @param manualCases Validated manual fixture cases from JSON.
 * @returns Combined fixture case list with default case first.
 */
export function buildFixtureCaseSet(defaultState: AppState, manualCases: FixtureCaseDefinition[]): FixtureCaseDefinition[] {
  return [
    {
      id: DEFAULT_FIXTURE_ID,
      state: cloneState(defaultState)
    },
    ...manualCases.map((fixtureCase) => ({
      id: fixtureCase.id,
      state: cloneState(fixtureCase.state)
    }))
  ];
}
