import {
  setGlobalBoolean,
  setGlobalNumber,
  setGlobalPhaseReference,
  setHandNumber,
  type GlobalBooleanKey,
  type GlobalNumberKey,
  type GlobalPhaseReferenceKey,
  type HandNumberKey
} from "@/state/actions";
import type { AppState, HandId, PhaseReference } from "@/types/state";

export const STATE_QUERY_PARAM_KEY = "state";
export const LOCAL_STORAGE_STATE_KEY = "poi-phase-visualiser-state";
export const PERSISTED_STATE_SCHEMA_VERSION = 2;
export const PERSISTENCE_DEBOUNCE_MS = 250;

interface PersistedStatePayload {
  schemaVersion: number;
  state: unknown;
}

const HAND_IDS: HandId[] = ["L", "R"];
const GLOBAL_NUMBER_KEYS: GlobalNumberKey[] = ["bpm", "loopBeats", "playSpeed", "t", "trailBeats", "trailSampleHz"];
const GLOBAL_BOOLEAN_KEYS: GlobalBooleanKey[] = ["isPlaying", "showTrails", "showWaves"];
const GLOBAL_PHASE_REFERENCE_KEYS: GlobalPhaseReferenceKey[] = ["phaseReference"];
const HAND_NUMBER_KEYS: HandNumberKey[] = ["armSpeed", "armPhase", "armRadius", "poiSpeed", "poiPhase", "poiRadius"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPhaseReference(value: unknown): value is PhaseReference {
  return value === "right" || value === "down" || value === "left" || value === "up";
}

function toPayload(state: AppState): PersistedStatePayload {
  return {
    schemaVersion: PERSISTED_STATE_SCHEMA_VERSION,
    state
  };
}

function extractCandidateState(payload: unknown): unknown | null {
  if (!isRecord(payload)) {
    return null;
  }

  const schemaVersion = payload.schemaVersion;
  const nestedState = payload.state;

  if (schemaVersion === PERSISTED_STATE_SCHEMA_VERSION && nestedState !== undefined) {
    return nestedState;
  }
  return null;
}

function mergeStateCandidateWithDefaults(candidate: unknown, defaults: AppState): AppState | null {
  const stateRecord = isRecord(candidate) ? candidate : null;
  if (!stateRecord) {
    return null;
  }

  let merged = defaults;
  const globalRecord = isRecord(stateRecord.global) ? stateRecord.global : null;
  const handsRecord = isRecord(stateRecord.hands) ? stateRecord.hands : null;

  if (!globalRecord) {
    return null;
  }

  for (const key of GLOBAL_PHASE_REFERENCE_KEYS) {
    const maybeValue = globalRecord[key];
    if (!isPhaseReference(maybeValue)) {
      return null;
    }
    merged = setGlobalPhaseReference(merged, key, maybeValue);
  }

  for (const key of GLOBAL_NUMBER_KEYS) {
    const maybeValue = globalRecord[key];
    if (isFiniteNumber(maybeValue)) {
      merged = setGlobalNumber(merged, key, maybeValue);
    }
  }
  for (const key of GLOBAL_BOOLEAN_KEYS) {
    const maybeValue = globalRecord[key];
    if (typeof maybeValue === "boolean") {
      merged = setGlobalBoolean(merged, key, maybeValue);
    }
  }

  if (handsRecord) {
    for (const handId of HAND_IDS) {
      const handRecord = isRecord(handsRecord[handId]) ? handsRecord[handId] : null;
      if (!handRecord) {
        continue;
      }

      for (const key of HAND_NUMBER_KEYS) {
        const maybeValue = handRecord[key];
        if (isFiniteNumber(maybeValue)) {
          merged = setHandNumber(merged, handId, key, maybeValue);
        }
      }
    }
  }

  return merged;
}

function isPersistedStatePayload(payload: unknown): payload is PersistedStatePayload {
  return (
    isRecord(payload) &&
    payload.schemaVersion === PERSISTED_STATE_SCHEMA_VERSION &&
    Object.prototype.hasOwnProperty.call(payload, "state")
  );
}

/**
 * Returns whether raw serialized payload is compatible with the current persistence schema.
 *
 * @param serialized Serialized state payload from storage or URL.
 * @returns `true` when payload is parseable and matches current schema.
 */
export function isPersistedStatePayloadCompatible(serialized: string | null): boolean {
  if (!serialized) {
    return false;
  }

  try {
    const parsed = JSON.parse(serialized) as unknown;
    return isPersistedStatePayload(parsed);
  } catch {
    return false;
  }
}

/**
 * Serializes app state into versioned persistence payload JSON.
 *
 * @param state App state to persist.
 * @returns JSON payload string safe for URL/localStorage usage.
 */
export function serializeState(state: AppState): string {
  return JSON.stringify(toPayload(state));
}

/**
 * Parses serialized payload and merges valid fields with defaults.
 *
 * @param serialized JSON payload from URL/localStorage.
 * @param defaults Default state used for schema fallback and clamps.
 * @returns Hydrated state, or `null` when payload cannot be parsed.
 */
export function deserializeState(serialized: string, defaults: AppState): AppState | null {
  try {
    const payload = JSON.parse(serialized) as unknown;
    const candidate = extractCandidateState(payload);
    if (candidate === null) {
      return null;
    }
    return mergeStateCandidateWithDefaults(candidate, defaults);
  } catch {
    return null;
  }
}

/**
 * Builds a shareable URL containing encoded state in the `state` query param.
 *
 * @param state App state snapshot to encode.
 * @param currentHref Current page URL used as base.
 * @returns URL string with encoded `state` query payload.
 */
export function buildStateUrl(state: AppState, currentHref: string): string {
  const url = new URL(currentHref);
  url.searchParams.set(STATE_QUERY_PARAM_KEY, serializeState(state));
  return url.toString();
}

/**
 * Removes encoded state query parameter from a URL.
 *
 * @param urlString URL string to sanitize.
 * @returns URL string without persisted state query payload.
 */
export function stripStateQueryParam(urlString: string): string {
  const url = new URL(urlString);
  url.searchParams.delete(STATE_QUERY_PARAM_KEY);
  return url.toString();
}

/**
 * Reads and decodes state payload from a URL query param.
 *
 * @param urlString URL that may contain serialized state.
 * @param defaults Default state used for merge/clamp fallback.
 * @returns Decoded state, or `null` when absent/invalid.
 */
export function readStateFromUrl(urlString: string, defaults: AppState): AppState | null {
  try {
    const url = new URL(urlString);
    const encoded = url.searchParams.get(STATE_QUERY_PARAM_KEY);
    if (!encoded) {
      return null;
    }
    return deserializeState(encoded, defaults);
  } catch {
    return null;
  }
}

/**
 * Reads and decodes state payload from localStorage value.
 *
 * @param serialized Serialized state payload from storage.
 * @param defaults Default state used for merge/clamp fallback.
 * @returns Decoded state, or `null` when absent/invalid.
 */
export function readStateFromStorage(serialized: string | null, defaults: AppState): AppState | null {
  if (!serialized) {
    return null;
  }
  return deserializeState(serialized, defaults);
}

/**
 * Resolves initial state with URL priority, then storage, then defaults.
 *
 * @param defaults Baseline default state.
 * @param urlString Current page URL.
 * @param storageValue Raw serialized storage value.
 * @returns Initial app state chosen by hydration precedence.
 */
export function resolveInitialState(defaults: AppState, urlString: string, storageValue: string | null): AppState {
  const fromUrl = readStateFromUrl(urlString, defaults);
  if (fromUrl) {
    return fromUrl;
  }

  const fromStorage = readStateFromStorage(storageValue, defaults);
  if (fromStorage) {
    return fromStorage;
  }

  return defaults;
}
