import {
  buildStateUrl,
  isPersistedStatePayloadCompatible,
  LOCAL_STORAGE_STATE_KEY,
  PERSISTENCE_DEBOUNCE_MS,
  resolveInitialState,
  serializeState,
  stripStateQueryParam
} from "@/state/persistence";
import {
  deserializeUserPresetLibrary,
  isPresetLibraryPayloadCompatible,
  PRESET_LIBRARY_STORAGE_KEY,
  serializeUserPresetLibrary,
  type UserPresetRecord
} from "@/state/presetLibrary";
import type { AppState } from "@/types/state";

type TimeoutHandle = ReturnType<typeof setTimeout>;

/**
 * Minimal storage contract used by persistence coordination.
 */
export interface PersistenceStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

interface PersistenceCoordinatorOptions {
  storage?: PersistenceStorage | null;
  debounceMs?: number;
}

/**
 * Hydration result from URL/storage/defaults resolution.
 */
export interface PersistenceHydrationResult {
  initialState: AppState;
  userPresetRecords: UserPresetRecord[];
  cleanHref: string;
}

/**
 * Runtime persistence policy owner for app-state and preset-library data.
 */
export interface PersistenceCoordinator {
  resolveHydration: (defaults: AppState, currentHref: string) => PersistenceHydrationResult;
  buildShareUrl: (state: AppState, currentHref: string) => string;
  persistSessionStateNow: (state: AppState) => void;
  scheduleSessionStateSync: (state: AppState) => void;
  enableSessionSync: () => void;
  disableSessionSync: () => void;
  persistPresetLibraryNow: (records: UserPresetRecord[]) => void;
  cancelScheduledSync: () => void;
}

function resolveDefaultStorage(): PersistenceStorage | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
}

function readStorageValue(storage: PersistenceStorage | null, key: string): string | null {
  if (!storage) {
    return null;
  }
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageValue(storage: PersistenceStorage | null, key: string, value: string): void {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(key, value);
  } catch {
    // Ignore write failures (private mode, quota, disabled storage).
  }
}

function removeStorageValue(storage: PersistenceStorage | null, key: string): void {
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(key);
  } catch {
    // Ignore delete failures (private mode, disabled storage).
  }
}

function getCompatibleStateStorageValue(storage: PersistenceStorage | null): string | null {
  const raw = readStorageValue(storage, LOCAL_STORAGE_STATE_KEY);
  if (!raw) {
    return null;
  }
  if (!isPersistedStatePayloadCompatible(raw)) {
    removeStorageValue(storage, LOCAL_STORAGE_STATE_KEY);
    return null;
  }
  return raw;
}

function getCompatiblePresetLibraryStorageValue(storage: PersistenceStorage | null): string | null {
  const raw = readStorageValue(storage, PRESET_LIBRARY_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  if (!isPresetLibraryPayloadCompatible(raw)) {
    removeStorageValue(storage, PRESET_LIBRARY_STORAGE_KEY);
    return null;
  }
  return raw;
}

/**
 * Creates a coordinator that centralizes persistence policy and runtime syncing.
 *
 * @param options Coordinator options.
 * @returns Coordinator API for hydration, storage sync, and share-url generation.
 */
export function createPersistenceCoordinator(options: PersistenceCoordinatorOptions = {}): PersistenceCoordinator {
  const storage = options.storage ?? resolveDefaultStorage();
  const debounceMs = options.debounceMs ?? PERSISTENCE_DEBOUNCE_MS;

  let syncEnabled = false;
  let syncTimerHandle: TimeoutHandle | null = null;

  function cancelScheduledSync(): void {
    if (syncTimerHandle !== null) {
      clearTimeout(syncTimerHandle);
      syncTimerHandle = null;
    }
  }

  function persistSessionStateNow(state: AppState): void {
    writeStorageValue(storage, LOCAL_STORAGE_STATE_KEY, serializeState(state));
  }

  return {
    resolveHydration(defaults: AppState, currentHref: string): PersistenceHydrationResult {
      const compatibleStateStorageValue = getCompatibleStateStorageValue(storage);
      const compatiblePresetLibraryStorageValue = getCompatiblePresetLibraryStorageValue(storage);

      return {
        initialState: resolveInitialState(defaults, currentHref, compatibleStateStorageValue),
        userPresetRecords: deserializeUserPresetLibrary(compatiblePresetLibraryStorageValue, defaults),
        cleanHref: stripStateQueryParam(currentHref)
      };
    },
    buildShareUrl(state: AppState, currentHref: string): string {
      const cleanHref = stripStateQueryParam(currentHref);
      return buildStateUrl(state, cleanHref);
    },
    persistSessionStateNow,
    scheduleSessionStateSync(state: AppState): void {
      if (!syncEnabled) {
        return;
      }

      cancelScheduledSync();
      syncTimerHandle = setTimeout(() => {
        persistSessionStateNow(state);
        syncTimerHandle = null;
      }, debounceMs);
    },
    enableSessionSync(): void {
      syncEnabled = true;
    },
    disableSessionSync(): void {
      syncEnabled = false;
      cancelScheduledSync();
    },
    persistPresetLibraryNow(records: UserPresetRecord[]): void {
      writeStorageValue(storage, PRESET_LIBRARY_STORAGE_KEY, serializeUserPresetLibrary(records));
    },
    cancelScheduledSync
  };
}
