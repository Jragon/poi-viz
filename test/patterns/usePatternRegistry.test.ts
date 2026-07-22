import { describe, expect, it } from "vitest";

import type { AuthoredSequenceDocument } from "@/authoring/types";
import { createEmptyStallPatternDraft } from "@/lab/experiments/qt-stall-graph/stallPattern";
import {
  createPatternRegistry,
  type PatternStorageLike
} from "@/patterns/usePatternRegistry";
import type { PatternSource } from "@/patterns/types";

class MemoryStorage implements PatternStorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function document(): AuthoredSequenceDocument {
  return {
    name: "Working",
    description: null,
    tracks: {
      left: {
        segments: [
          {
            kind: "first",
            durationUnits: 1,
            hand: {
              startPose: { phaseDeg: 0, radius: 1 },
              driver: { kind: "circle", omega: 0, omegaUnit: "radians-per-unit" }
            },
            head: {
              startPose: { phaseDeg: 0, radius: 1 },
              driver: { kind: "circle", omega: 0, omegaUnit: "radians-per-unit" }
            }
          }
        ]
      }
    }
  };
}

function source(): PatternSource {
  return { kind: "authoring", document: document() };
}

describe("createPatternRegistry", () => {
  it("saves sources explicitly and clones them at both boundaries", () => {
    const storage = new MemoryStorage();
    const registry = createPatternRegistry({
      storage,
      storageKey: "patterns",
      seedPatterns: [],
      createId: () => "pattern-1"
    });

    const working = source();
    const entry = registry.saveAs(working, { name: "Saved" });
    if (working.kind !== "authoring") throw new Error("Fixture kind changed");
    working.document.tracks.left!.segments[0].durationUnits = 9;

    const savedSource = registry.get(entry.id)?.source;
    expect(savedSource?.kind).toBe("authoring");
    if (savedSource?.kind !== "authoring") throw new Error("Expected authored source");
    expect(savedSource.document.name).toBe("Saved");
    expect(savedSource.document.tracks.left?.segments[0].durationUnits).toBe(1);
    expect(JSON.parse(storage.getItem("patterns") ?? "{}").patterns[0].name).toBe("Saved");
  });

  it("keeps authoring metadata canonical and refuses cross-editor overwrites", () => {
    const registry = createPatternRegistry({
      storage: new MemoryStorage(),
      storageKey: "patterns",
      seedPatterns: [],
      createId: () => "pattern-1"
    });
    const entry = registry.saveAs(source(), { name: "Saved", description: "First" });

    expect(registry.updateMetadata(entry.id, { name: "Renamed", description: "Second" })).toBe(
      true
    );
    const renamed = registry.get(entry.id);
    expect(renamed?.name).toBe("Renamed");
    expect(renamed?.source.kind === "authoring" && renamed.source.document.name).toBe("Renamed");
    expect(
      renamed?.source.kind === "authoring" && renamed.source.document.description
    ).toBe("Second");

    expect(
      registry.save(entry.id, {
        kind: "stall-graph",
        draft: createEmptyStallPatternDraft()
      })
    ).toBe(false);
    expect(registry.get(entry.id)?.source.kind).toBe("authoring");
  });

  it("supports folders and refuses to delete non-empty folders", () => {
    const registry = createPatternRegistry({
      storage: new MemoryStorage(),
      storageKey: "patterns",
      seedPatterns: [],
      createId: (() => {
        let index = 0;
        return () => "id-" + index++;
      })()
    });

    const folder = registry.createFolder("Exploration");
    const entry = registry.saveAs(source(), { name: "Saved", folderId: folder.id });

    expect(registry.deleteFolder(folder.id)).toBe(false);
    expect(registry.move(entry.id, null)).toBe(true);
    expect(registry.deleteFolder(folder.id)).toBe(true);
  });

  it("renames folders without allowing empty names", () => {
    const registry = createPatternRegistry({
      storage: new MemoryStorage(),
      storageKey: "patterns",
      seedPatterns: [],
      createId: (() => {
        let index = 0;
        return () => "folder-id-" + index++;
      })()
    });
    const folder = registry.createFolder("Ideas");

    expect(registry.updateFolder(folder.id, "More ideas")).toBe(true);
    expect(registry.folders.value[0]?.name).toBe("More ideas");
    expect(registry.updateFolder(folder.id, "   ")).toBe(false);
    expect(registry.folders.value[0]?.name).toBe("More ideas");
  });

  it("migrates the previous authoring library once", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "poi-v2:authoring-library",
      JSON.stringify({
        documents: [{ id: "old", document: document() }],
        selectedDocumentId: "old"
      })
    );

    const registry = createPatternRegistry({
      storage,
      storageKey: "patterns",
      seedPatterns: []
    });

    expect(registry.selectedPatternId.value).toBe("old");
    expect(registry.selectedPattern.value?.source.kind).toBe("authoring");
    expect(storage.getItem("patterns")).not.toBeNull();
    expect(storage.getItem("poi-v2:authoring-library")).not.toBeNull();
  });

  it("adds newly bundled saved patterns once when migrating a version-one registry", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "patterns",
      JSON.stringify({
        version: 1,
        folders: [],
        patterns: [
          {
            id: "stored",
            name: "Stored",
            description: null,
            folderId: null,
            source: source()
          }
        ],
        selectedPatternId: "stored"
      })
    );
    const seed = {
      id: "new-bundled-pattern",
      name: "New bundled pattern",
      description: null,
      folderId: null,
      source: source()
    };

    const registry = createPatternRegistry({
      storage,
      storageKey: "patterns",
      seedPatterns: [seed]
    });

    expect(registry.entries.value.map((entry) => entry.id)).toEqual([
      "stored",
      "new-bundled-pattern"
    ]);
    expect(registry.selectedPatternId.value).toBe("stored");
    expect(JSON.parse(storage.getItem("patterns") ?? "{}").version).toBe(2);

    registry.delete("new-bundled-pattern");
    const reloaded = createPatternRegistry({
      storage,
      storageKey: "patterns",
      seedPatterns: [seed]
    });
    expect(reloaded.entries.value.map((entry) => entry.id)).toEqual(["stored"]);
  });

  it("rejects malformed snapshots as a whole instead of silently repairing them", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "patterns",
      JSON.stringify({
        version: 1,
        folders: [{ id: "folder", name: "Folder", parentId: "missing" }],
        patterns: [
          {
            id: "stored",
            name: "Stored",
            description: null,
            folderId: "folder",
            source: source()
          }
        ],
        selectedPatternId: "stored"
      })
    );
    const seed = {
      id: "seed",
      name: "Seed",
      description: null,
      folderId: null,
      source: source()
    };

    const registry = createPatternRegistry({
      storage,
      storageKey: "patterns",
      seedPatterns: [seed]
    });

    expect(registry.entries.value.map((entry) => entry.id)).toEqual(["seed"]);
    expect(registry.folders.value).toEqual([]);
    expect(registry.selectedPatternId.value).toBe("seed");
  });
});
