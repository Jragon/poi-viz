import {
  setGlobalBoolean,
  setGlobalNumber,
  setHandNumber,
  type GlobalBooleanKey,
  type GlobalNumberKey,
  type HandNumberKey
} from "@/state/actions";
import type { AppState, HandId } from "@/types/state";

export const STATE_QUERY_PARAM_KEY = "state";
export const LOCAL_STORAGE_STATE_KEY = "poi-phase-visualiser-state";
export const PERSISTED_STATE_SCHEMA_VERSION = 1;
export const PERSISTENCE_DEBOUNCE_MS = 250;

interface PersistedStatePayload {
  schemaVersion: number;
  state: unknown;
}

const HAND_IDS: HandId[] = ["L", "R"];
const GLOBAL_NUMBER_KEYS: GlobalNumberKey[] = ["bpm", "loopBeats", "playSpeed", "t", "trailBeats", "trailSampleHz"];
const GLOBAL_BOOLEAN_KEYS: GlobalBooleanKey[] = ["isPlaying", "showTrails", "showWaves"];
const HAND_NUMBER_KEYS: HandNumberKey[] = ["armSpeed", "armPhase", "armRadius", "poiSpeed", "poiPhase", "poiRadius"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
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

  // Backward-compatible fallback for payloads that were raw state objects.
  return payload;
}

function mergeStateCandidateWithDefaults(candidate: unknown, defaults: AppState): AppState {
  const stateRecord = isRecord(candidate) ? candidate : null;
  if (!stateRecord) {
    return defaults;
  }

  let merged = defaults;
  const globalRecord = isRecord(stateRecord.global) ? stateRecord.global : null;
  const handsRecord = isRecord(stateRecord.hands) ? stateRecord.hands : null;

  if (globalRecord) {
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

export function serializeState(state: AppState): string {
  return JSON.stringify(toPayload(state));
}

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

export function buildStateUrl(state: AppState, currentHref: string): string {
  const url = new URL(currentHref);
  url.searchParams.set(STATE_QUERY_PARAM_KEY, serializeState(state));
  return url.toString();
}

export function stripStateQueryParam(urlString: string): string {
  const url = new URL(urlString);
  url.searchParams.delete(STATE_QUERY_PARAM_KEY);
  return url.toString();
}

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

export function readStateFromStorage(serialized: string | null, defaults: AppState): AppState | null {
  if (!serialized) {
    return null;
  }
  return deserializeState(serialized, defaults);
}

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
