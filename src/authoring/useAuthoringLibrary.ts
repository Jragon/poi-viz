import { computed, ref, type ComputedRef, type Ref } from "vue";

import { validateAuthoredDocument } from "@/authoring/compile";
import { seedDocuments as defaultSeedDocuments } from "@/authoring/seedDocuments";
import type {
  AuthoredDocumentEntry,
  AuthoredDocumentLibrarySnapshot,
  AuthoredSequenceDocument
} from "@/authoring/types";

const DEFAULT_STORAGE_KEY = "poi-v2:authoring-library";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface UseAuthoringLibraryOptions {
  storage?: StorageLike | null;
  storageKey?: string;
  createId?: () => string;
  seedDocuments?: AuthoredDocumentEntry[];
}

export interface AuthoringLibraryController {
  readonly documents: Ref<AuthoredDocumentEntry[]>;
  readonly selectedDocumentId: Ref<string | null>;
  readonly selectedDocument: ComputedRef<AuthoredDocumentEntry | null>;
  createDocument: (document?: AuthoredSequenceDocument) => AuthoredDocumentEntry;
  updateDocument: (id: string, document: AuthoredSequenceDocument) => void;
  duplicateDocument: (id: string) => AuthoredDocumentEntry | null;
  deleteDocument: (id: string) => void;
  selectDocument: (id: string | null) => void;
}

function getDefaultStorage(): StorageLike | null {
  if (typeof globalThis.localStorage === "undefined") {
    return null;
  }

  return globalThis.localStorage;
}

function createDefaultDocument(): AuthoredSequenceDocument {
  return {
    name: "Untitled",
    description: null,
    tracks: {
      left: {
        segments: [
          {
            kind: "first",
            durationUnits: 1,
            planeId: "wall",
            planeSide: "a",
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

function createSnapshot(
  documents: AuthoredDocumentEntry[],
  selectedDocumentId: string | null
): AuthoredDocumentLibrarySnapshot {
  return {
    documents,
    selectedDocumentId
  };
}

function isValidStoredDocumentEntry(value: unknown): value is AuthoredDocumentEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AuthoredDocumentEntry>;
  if (typeof candidate.id !== "string" || !candidate.document) {
    return false;
  }

  return validateAuthoredDocument(candidate.document as AuthoredSequenceDocument).ok;
}

function parseSnapshot(raw: string | null): AuthoredDocumentLibrarySnapshot | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthoredDocumentLibrarySnapshot>;
    if (!Array.isArray(parsed.documents)) {
      return null;
    }

    const documents = parsed.documents.filter(isValidStoredDocumentEntry);
    const selectedDocumentId =
      typeof parsed.selectedDocumentId === "string" ? parsed.selectedDocumentId : null;

    if (documents.length === 0) {
      return null;
    }

    return {
      documents,
      selectedDocumentId:
        selectedDocumentId && documents.some((document) => document.id === selectedDocumentId)
          ? selectedDocumentId
          : documents[0].id
    };
  } catch {
    return null;
  }
}

function cloneDocument(document: AuthoredSequenceDocument): AuthoredSequenceDocument {
  return JSON.parse(JSON.stringify(document)) as AuthoredSequenceDocument;
}

function cloneEntry(entry: AuthoredDocumentEntry): AuthoredDocumentEntry {
  return {
    id: entry.id,
    document: cloneDocument(entry.document)
  };
}

function makeSeedEntries(
  seedDocuments: AuthoredDocumentEntry[] | undefined
): AuthoredDocumentEntry[] {
  if (seedDocuments && seedDocuments.length > 0) {
    return seedDocuments.map(cloneEntry);
  }

  return defaultSeedDocuments.map(cloneEntry);
}

export function useAuthoringLibrary(
  options: UseAuthoringLibraryOptions = {}
): AuthoringLibraryController {
  const documentsRef = ref<AuthoredDocumentEntry[]>([]);
  const selectedDocumentIdRef = ref<string | null>(null);
  const storage = options.storage ?? getDefaultStorage();
  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
  const createId = options.createId ?? (() => crypto.randomUUID());

  const persist = () => {
    if (!storage) {
      return;
    }

    storage.setItem(
      storageKey,
      JSON.stringify(createSnapshot(documentsRef.value, selectedDocumentIdRef.value))
    );
  };

  const seedEntries = makeSeedEntries(options.seedDocuments);
  const hydrated = parseSnapshot(storage?.getItem(storageKey) ?? null);

  documentsRef.value = hydrated?.documents ?? seedEntries;
  selectedDocumentIdRef.value = hydrated?.selectedDocumentId ?? documentsRef.value[0]?.id ?? null;

  if (!hydrated) {
    persist();
  }

  const selectedDocument = computed(() => {
    if (!selectedDocumentIdRef.value) {
      return null;
    }

    return (
      documentsRef.value.find((document) => document.id === selectedDocumentIdRef.value) ?? null
    );
  });

  const createDocument = (document: AuthoredSequenceDocument = createDefaultDocument()) => {
    const entry: AuthoredDocumentEntry = {
      id: createId(),
      document: cloneDocument(document)
    };
    documentsRef.value = [...documentsRef.value, entry];
    selectedDocumentIdRef.value = entry.id;
    persist();
    return entry;
  };

  const updateDocument = (id: string, document: AuthoredSequenceDocument) => {
    documentsRef.value = documentsRef.value.map((entry) =>
      entry.id === id ? { ...entry, document: cloneDocument(document) } : entry
    );
    persist();
  };

  const duplicateDocument = (id: string) => {
    const source = documentsRef.value.find((entry) => entry.id === id);
    if (!source) {
      return null;
    }

    const duplicate: AuthoredDocumentEntry = {
      id: createId(),
      document: {
        ...cloneDocument(source.document),
        name: `${source.document.name} Copy`
      }
    };

    documentsRef.value = [...documentsRef.value, duplicate];
    selectedDocumentIdRef.value = duplicate.id;
    persist();
    return duplicate;
  };

  const deleteDocument = (id: string) => {
    const nextDocuments = documentsRef.value.filter((entry) => entry.id !== id);
    documentsRef.value = nextDocuments;
    if (selectedDocumentIdRef.value === id) {
      selectedDocumentIdRef.value = nextDocuments[0]?.id ?? null;
    }
    persist();
  };

  const selectDocument = (id: string | null) => {
    selectedDocumentIdRef.value =
      id && documentsRef.value.some((document) => document.id === id)
        ? id
        : (documentsRef.value[0]?.id ?? null);
    persist();
  };

  return {
    documents: documentsRef,
    selectedDocumentId: selectedDocumentIdRef,
    selectedDocument,
    createDocument,
    updateDocument,
    duplicateDocument,
    deleteDocument,
    selectDocument
  };
}
