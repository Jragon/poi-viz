import { describe, expect, it } from "vitest";

import type { AuthoredSequenceDocument } from "@/authoring/types";
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

    expect(registry.get(entry.id)?.source).toEqual(source());
    expect(JSON.parse(storage.getItem("patterns") ?? "{}").patterns[0].name).toBe("Saved");
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
});
