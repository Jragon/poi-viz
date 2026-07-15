import type { AuthoredDocumentEntry, AuthoredSequenceDocument } from "@/authoring/types";
import { useAuthoringLibrary } from "@/authoring/useAuthoringLibrary";
import { describe, expect, it } from "vitest";

class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

function makeDocument(name: string): AuthoredSequenceDocument {
  return {
    name,
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

function makeEntry(id: string, name: string): AuthoredDocumentEntry {
  return {
    id,
    document: makeDocument(name)
  };
}

describe("useAuthoringLibrary", () => {
  it("seeds storage when no persisted library exists", () => {
    const storage = new MemoryStorage();
    const library = useAuthoringLibrary({
      storage,
      storageKey: "authoring",
      seedDocuments: [makeEntry("seed-1", "Seed")],
      createId: () => "generated"
    });

    expect(library.documents.value).toHaveLength(1);
    expect(library.selectedDocumentId.value).toBe("seed-1");

    const persisted = JSON.parse(storage.getItem("authoring") ?? "null");
    expect(persisted.selectedDocumentId).toBe("seed-1");
    expect(persisted.documents[0].document.name).toBe("Seed");
  });

  it("hydrates a previously saved library snapshot", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "authoring",
      JSON.stringify({
        documents: [makeEntry("doc-1", "Stored"), makeEntry("doc-2", "Other")],
        selectedDocumentId: "doc-2"
      })
    );

    const library = useAuthoringLibrary({
      storage,
      storageKey: "authoring",
      seedDocuments: [makeEntry("seed-1", "Seed")],
      createId: () => "generated"
    });

    expect(library.documents.value.map((entry) => entry.id)).toEqual(["doc-1", "doc-2"]);
    expect(library.selectedDocumentId.value).toBe("doc-2");
    expect(library.selectedDocument.value?.document.name).toBe("Other");
  });

  it("replaces an invalid stored snapshot with current seed documents", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "authoring",
      JSON.stringify({
        documents: [
          {
            id: "invalid",
            document: { name: "Invalid", description: null, tracks: {} }
          }
        ],
        selectedDocumentId: "invalid"
      })
    );

    const library = useAuthoringLibrary({
      storage,
      storageKey: "authoring",
      seedDocuments: [makeEntry("seed-1", "Seed")],
      createId: () => "generated"
    });

    expect(library.documents.value.map((entry) => entry.id)).toEqual(["seed-1"]);
    expect(library.selectedDocumentId.value).toBe("seed-1");

    const persisted = JSON.parse(storage.getItem("authoring") ?? "null");
    expect(persisted.documents.map((entry: { id: string }) => entry.id)).toEqual(["seed-1"]);
    expect(persisted.selectedDocumentId).toBe("seed-1");
  });

  it("creates, updates, duplicates, and deletes documents while persisting selection", () => {
    const storage = new MemoryStorage();
    let nextId = 1;
    const library = useAuthoringLibrary({
      storage,
      storageKey: "authoring",
      seedDocuments: [makeEntry("seed-1", "Seed")],
      createId: () => `doc-${nextId++}`
    });

    const created = library.createDocument(makeDocument("Created"));
    expect(created.id).toBe("doc-1");
    expect(library.selectedDocumentId.value).toBe("doc-1");

    library.updateDocument(created.id, makeDocument("Updated"));
    expect(library.selectedDocument.value?.document.name).toBe("Updated");

    const duplicate = library.duplicateDocument(created.id);
    expect(duplicate?.id).toBe("doc-2");
    expect(duplicate?.document.name).toBe("Updated Copy");
    expect(library.selectedDocumentId.value).toBe("doc-2");

    library.deleteDocument(duplicate!.id);
    expect(library.documents.value.map((entry) => entry.id)).toEqual(["seed-1", "doc-1"]);
    expect(library.selectedDocumentId.value).toBe("seed-1");

    const persisted = JSON.parse(storage.getItem("authoring") ?? "null");
    expect(persisted.documents.map((entry: { id: string }) => entry.id)).toEqual([
      "seed-1",
      "doc-1"
    ]);
    expect(persisted.selectedDocumentId).toBe("seed-1");
  });
});
