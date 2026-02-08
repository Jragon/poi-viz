import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePersistenceCoordinator, type PersistenceStorage } from "@/composables/usePersistenceCoordinator";
import { createDefaultState } from "@/state/defaults";
import { LOCAL_STORAGE_STATE_KEY, serializeState } from "@/state/persistence";
import {
  createUserPresetRecord,
  PRESET_LIBRARY_SCHEMA_VERSION,
  PRESET_LIBRARY_STORAGE_KEY,
  serializeUserPresetLibrary
} from "@/state/presetLibrary";

interface MemoryStorage extends PersistenceStorage {
  readRaw: (key: string) => string | null;
}

function createMemoryStorage(initial: Record<string, string> = {}): MemoryStorage {
  const values = new Map<string, string>(Object.entries(initial));

  return {
    getItem(key: string): string | null {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      values.set(key, value);
    },
    removeItem(key: string): void {
      values.delete(key);
    },
    readRaw(key: string): string | null {
      return values.get(key) ?? null;
    }
  };
}

describe("persistence coordinator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("hydrates with URL precedence and strips the state query param", () => {
    const defaults = createDefaultState();
    const storageState = createDefaultState();
    storageState.global.bpm = 60;

    const urlState = createDefaultState();
    urlState.global.bpm = 30;

    const storage = createMemoryStorage({
      [LOCAL_STORAGE_STATE_KEY]: serializeState(storageState)
    });
    const coordinator = usePersistenceCoordinator({ storage });

    const hydration = coordinator.resolveHydration(
      defaults,
      `https://jragon.github.io/poi-viz/?state=${encodeURIComponent(serializeState(urlState))}&foo=bar`
    );

    expect(hydration.initialState.global.bpm).toBe(30);
    expect(new URL(hydration.cleanHref).searchParams.get("state")).toBeNull();
    expect(new URL(hydration.cleanHref).searchParams.get("foo")).toBe("bar");
  });

  it("purges incompatible storage payloads during hydration", () => {
    const defaults = createDefaultState();
    const storage = createMemoryStorage({
      [LOCAL_STORAGE_STATE_KEY]: JSON.stringify({ schemaVersion: 1, state: {} }),
      [PRESET_LIBRARY_STORAGE_KEY]: JSON.stringify({ schemaVersion: PRESET_LIBRARY_SCHEMA_VERSION - 1, presets: [] })
    });
    const coordinator = usePersistenceCoordinator({ storage });

    const hydration = coordinator.resolveHydration(defaults, "https://jragon.github.io/poi-viz/");

    expect(hydration.initialState).toEqual(defaults);
    expect(hydration.userPresetRecords).toEqual([]);
    expect(storage.readRaw(LOCAL_STORAGE_STATE_KEY)).toBeNull();
    expect(storage.readRaw(PRESET_LIBRARY_STORAGE_KEY)).toBeNull();
  });

  it("keeps hydration idempotent across serialize and rehydrate", () => {
    const defaults = createDefaultState();
    const initialState = createDefaultState();
    initialState.global.bpm = 37;
    initialState.global.loopBeats = 9;
    initialState.hands.R.poiRadius = 111;

    const now = new Date("2026-02-08T08:00:00.000Z");
    const preset = createUserPresetRecord("Baseline", initialState, now);

    const storage = createMemoryStorage();
    const coordinator = usePersistenceCoordinator({ storage });

    coordinator.persistSessionStateNow(initialState);
    coordinator.persistPresetLibraryNow([preset]);

    const firstHydration = coordinator.resolveHydration(defaults, "https://jragon.github.io/poi-viz/");
    coordinator.persistSessionStateNow(firstHydration.initialState);
    coordinator.persistPresetLibraryNow(firstHydration.userPresetRecords);
    const secondHydration = coordinator.resolveHydration(defaults, "https://jragon.github.io/poi-viz/");

    expect(serializeState(secondHydration.initialState)).toBe(serializeState(firstHydration.initialState));
    expect(serializeUserPresetLibrary(secondHydration.userPresetRecords)).toBe(
      serializeUserPresetLibrary(firstHydration.userPresetRecords)
    );
  });

  it("debounces session-state sync and persists only the latest state", () => {
    const storage = createMemoryStorage();
    const coordinator = usePersistenceCoordinator({ storage, debounceMs: 250 });

    const first = createDefaultState();
    first.global.bpm = 20;

    const second = createDefaultState();
    second.global.bpm = 44;

    coordinator.enableSessionSync();
    coordinator.scheduleSessionStateSync(first);
    coordinator.scheduleSessionStateSync(second);

    expect(storage.readRaw(LOCAL_STORAGE_STATE_KEY)).toBeNull();

    vi.advanceTimersByTime(249);
    expect(storage.readRaw(LOCAL_STORAGE_STATE_KEY)).toBeNull();

    vi.advanceTimersByTime(1);

    const persisted = storage.readRaw(LOCAL_STORAGE_STATE_KEY);
    expect(persisted).not.toBeNull();
    if (!persisted) {
      return;
    }

    const hydrated = usePersistenceCoordinator({ storage }).resolveHydration(createDefaultState(), "https://jragon.github.io/poi-viz/");
    expect(hydrated.initialState.global.bpm).toBe(44);
  });

  it("builds share URLs without mutating the current editing URL", () => {
    const state = createDefaultState();
    state.global.bpm = 52;

    const coordinator = usePersistenceCoordinator({ storage: createMemoryStorage() });
    const currentHref = "https://jragon.github.io/poi-viz/?foo=bar";
    const shareUrl = coordinator.buildShareUrl(state, currentHref);

    expect(currentHref).toBe("https://jragon.github.io/poi-viz/?foo=bar");
    expect(new URL(shareUrl).searchParams.get("state")).not.toBeNull();
    expect(new URL(shareUrl).searchParams.get("foo")).toBe("bar");
  });
});
