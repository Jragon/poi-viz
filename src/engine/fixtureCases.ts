import { deserializeState, PERSISTED_STATE_SCHEMA_VERSION } from "@/state/persistence";
import type { AppState } from "@/types/state";

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

function parseFixtureCase(candidate: unknown, defaults: AppState): FixtureCaseDefinition {
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

  const state = deserializeState(
    JSON.stringify({
      schemaVersion: PERSISTED_STATE_SCHEMA_VERSION,
      state: candidate.state
    }),
    defaults
  );
  if (!state) {
    throw new Error(`Fixture case "${id}" has an invalid state payload.`);
  }

  return {
    id,
    state: cloneState(state)
  };
}

/**
 * Parses manually-authored fixture input cases from JSON text.
 *
 * @param serialized JSON payload from `fixtures/state-cases.json`.
 * @param defaults Default state used as merge/clamp baseline.
 * @returns Validated fixture case list in file order.
 */
export function parseFixtureCasesFile(serialized: string, defaults: AppState): FixtureCaseDefinition[] {
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

  const parsed = payload.cases.map((entry) => parseFixtureCase(entry, defaults));
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
