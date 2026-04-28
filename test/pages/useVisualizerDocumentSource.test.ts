import type { AuthoredDocumentEntry, AuthoredSequenceDocument } from "@/authoring/types";
import { useAuthoringLibrary, type StorageLike } from "@/authoring/useAuthoringLibrary";
import { useVisualizerDocumentSource } from "@/pages/useVisualizerDocumentSource";
import { describe, expect, it } from "vitest";

class MemoryStorage implements StorageLike {
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

function createLibrary(seeds: AuthoredDocumentEntry[], selectedId?: string) {
  const storage = new MemoryStorage();

  if (selectedId !== undefined) {
    storage.setItem(
      "test-lib",
      JSON.stringify({ documents: seeds, selectedDocumentId: selectedId })
    );
  }

  let nextId = 100;
  return useAuthoringLibrary({
    storage,
    storageKey: "test-lib",
    seedDocuments: seeds,
    createId: () => `gen-${nextId++}`
  });
}

describe("useVisualizerDocumentSource", () => {
  it("seeds selectedId from the library's current selection", () => {
    const library = createLibrary([makeEntry("a", "Alpha"), makeEntry("b", "Beta")], "b");
    const source = useVisualizerDocumentSource(library);

    expect(source.selectedId.value).toBe("b");
  });

  it("does not write back to the library when the visualizer selection changes", () => {
    const library = createLibrary([makeEntry("a", "Alpha"), makeEntry("b", "Beta")], "a");
    const source = useVisualizerDocumentSource(library);

    source.select("b");

    expect(source.selectedId.value).toBe("b");
    expect(library.selectedDocumentId.value).toBe("a");
  });

  it("compiles the selected document into a MultiRigSequence", () => {
    const library = createLibrary([makeEntry("a", "Alpha")]);
    const source = useVisualizerDocumentSource(library);

    expect(source.sequence.value).not.toBeNull();
    expect(source.sequence.value!.rigs).toHaveLength(1);
    expect(source.sequence.value!.rigs[0].rigId).toBe("left");
  });

  it("switching selection yields a different compiled sequence", () => {
    const docA = makeDocument("Alpha");
    docA.tracks.left!.segments[0].durationUnits = 2;
    const docB = makeDocument("Beta");
    docB.tracks.left!.segments[0].durationUnits = 5;

    const library = createLibrary([
      { id: "a", document: docA },
      { id: "b", document: docB }
    ]);
    const source = useVisualizerDocumentSource(library);

    source.select("a");
    const seqA = source.sequence.value;
    expect(seqA!.rigs[0].sequence.segments[0].durationUnits).toBe(2);

    source.select("b");
    const seqB = source.sequence.value;
    expect(seqB!.rigs[0].sequence.segments[0].durationUnits).toBe(5);
  });

  it("falls back to the first document when the selected entry is deleted", () => {
    const library = createLibrary([makeEntry("a", "Alpha"), makeEntry("b", "Beta")], "b");
    const source = useVisualizerDocumentSource(library);

    expect(source.selectedId.value).toBe("b");

    library.deleteDocument("b");

    expect(source.selectedId.value).toBe("a");
    expect(source.sequence.value).not.toBeNull();
  });

  it("yields null sequence for an empty library", () => {
    const library = createLibrary([makeEntry("a", "Alpha"), makeEntry("b", "Beta")], "a");

    // Delete both documents to reach the empty state programmatically
    library.deleteDocument("b");
    library.deleteDocument("a");

    const source = useVisualizerDocumentSource(library);

    expect(source.selectedId.value).toBeNull();
    expect(source.sequence.value).toBeNull();
    expect(source.selectedDocument.value).toBeNull();
  });

  it("select with an invalid id falls back to the first document", () => {
    const library = createLibrary([makeEntry("a", "Alpha")]);
    const source = useVisualizerDocumentSource(library);

    source.select("nonexistent");

    expect(source.selectedId.value).toBe("a");
  });

  it("select with null falls back to the first document", () => {
    const library = createLibrary([makeEntry("a", "Alpha")]);
    const source = useVisualizerDocumentSource(library);

    source.select(null);

    expect(source.selectedId.value).toBe("a");
  });
});
