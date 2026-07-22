import { computed, ref, type ComputedRef, type Ref } from "vue";

import { validateAuthoredDocument } from "@/authoring/compile";
import { seedDocuments } from "@/authoring/seedDocuments";
import type { AuthoredSequenceDocument } from "@/authoring/types";
import {
  clonePatternSource,
  isPatternSource,
  validatePatternSource
} from "@/patterns/patternAdapters";
import type {
  PatternEntry,
  PatternFolder,
  PatternRegistrySnapshot,
  PatternSource
} from "@/patterns/types";

export interface PatternStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface PatternRegistryOptions {
  readonly storage?: PatternStorageLike | null;
  readonly storageKey?: string;
  readonly createId?: () => string;
  readonly seedPatterns?: PatternEntry[];
}

export interface PatternRegistryController {
  readonly entries: Ref<PatternEntry[]>;
  readonly folders: Ref<PatternFolder[]>;
  readonly selectedPatternId: Ref<string | null>;
  readonly selectedPattern: ComputedRef<PatternEntry | null>;
  saveAs: (
    source: PatternSource,
    metadata: { name: string; description?: string | null; folderId?: string | null }
  ) => PatternEntry;
  save: (id: string, source: PatternSource) => boolean;
  updateMetadata: (
    id: string,
    metadata: Partial<Pick<PatternEntry, "name" | "description" | "folderId">>
  ) => boolean;
  delete: (id: string) => boolean;
  select: (id: string | null) => void;
  createFolder: (name: string, parentId?: string | null) => PatternFolder;
  updateFolder: (id: string, name: string) => boolean;
  move: (id: string, folderId: string | null) => boolean;
  deleteFolder: (id: string) => boolean;
  get: (id: string) => PatternEntry | null;
}

const DEFAULT_STORAGE_KEY = "poi-v2:pattern-registry";
const OLD_AUTHORING_STORAGE_KEY = "poi-v2:authoring-library";

function getDefaultStorage(): PatternStorageLike | null {
  return typeof globalThis.localStorage === "undefined" ? null : globalThis.localStorage;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function defaultSeedPatterns(): PatternEntry[] {
  return seedDocuments.map((entry) => ({
    id: entry.id,
    name: entry.document.name,
    description: entry.document.description,
    folderId: null,
    source: { kind: "authoring", document: clone(entry.document) }
  }));
}

function synchronizeAuthoringMetadata(
  source: PatternSource,
  name: string,
  description: string | null
): PatternSource {
  if (source.kind !== "authoring") return clonePatternSource(source);
  return {
    kind: "authoring",
    document: {
      ...clone(source.document),
      name,
      description
    }
  };
}

function normalizeEntry(value: unknown): PatternEntry | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PatternEntry>;
  if (
    typeof candidate.id !== "string" ||
    candidate.id.length === 0 ||
    typeof candidate.name !== "string" ||
    candidate.name.trim().length === 0 ||
    (candidate.description !== null && typeof candidate.description !== "string") ||
    (candidate.folderId !== null && typeof candidate.folderId !== "string") ||
    !isPatternSource(candidate.source)
  ) {
    return null;
  }
  const source = candidate.source as PatternSource;
  if (!validatePatternSource(source).ok) return null;
  return {
    id: candidate.id,
    name: candidate.name,
    description: candidate.description,
    folderId: candidate.folderId,
    source: synchronizeAuthoringMetadata(source, candidate.name, candidate.description)
  };
}

function normalizeFolder(value: unknown): PatternFolder | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PatternFolder>;
  if (
    typeof candidate.id !== "string" ||
    candidate.id.length === 0 ||
    typeof candidate.name !== "string" ||
    candidate.name.trim().length === 0 ||
    (candidate.parentId !== null && typeof candidate.parentId !== "string")
  ) {
    return null;
  }
  return { id: candidate.id, name: candidate.name, parentId: candidate.parentId };
}

function hasValidFolderHierarchy(folders: readonly PatternFolder[]): boolean {
  const folderIds = new Set(folders.map((folder) => folder.id));
  if (folderIds.size !== folders.length) return false;

  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  for (const folder of folders) {
    if (folder.parentId !== null && !folderIds.has(folder.parentId)) return false;
    const visited = new Set<string>();
    let current: PatternFolder | undefined = folder;
    while (current) {
      if (visited.has(current.id)) return false;
      visited.add(current.id);
      current = current.parentId === null ? undefined : byId.get(current.parentId);
    }
  }
  return true;
}

function parseSnapshot(raw: string | null): PatternRegistrySnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PatternRegistrySnapshot>;
    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.patterns) ||
      !Array.isArray(parsed.folders)
    ) {
      return null;
    }
    const patterns = parsed.patterns.map(normalizeEntry);
    const folders = parsed.folders.map(normalizeFolder);
    if (patterns.some((entry) => entry === null) || folders.some((folder) => folder === null)) {
      return null;
    }
    const normalizedPatterns = patterns as PatternEntry[];
    const normalizedFolders = folders as PatternFolder[];
    if (!hasValidFolderHierarchy(normalizedFolders)) return null;

    const patternIds = new Set(normalizedPatterns.map((pattern) => pattern.id));
    if (patternIds.size !== normalizedPatterns.length) return null;
    const folderIds = new Set(normalizedFolders.map((folder) => folder.id));
    if (
      normalizedPatterns.some(
        (pattern) => pattern.folderId !== null && !folderIds.has(pattern.folderId)
      )
    ) {
      return null;
    }
    if (
      parsed.selectedPatternId !== null &&
      (typeof parsed.selectedPatternId !== "string" || !patternIds.has(parsed.selectedPatternId))
    ) {
      return null;
    }
    return {
      version: 1,
      patterns: normalizedPatterns,
      folders: normalizedFolders,
      selectedPatternId: parsed.selectedPatternId
    };
  } catch {
    return null;
  }
}

function migrateOldAuthoringSnapshot(raw: string | null): PatternRegistrySnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      documents?: Array<{ id?: string; document?: AuthoredSequenceDocument }>;
      selectedDocumentId?: string | null;
    };
    if (!Array.isArray(parsed.documents)) return null;
    if (
      parsed.documents.some(
        (entry) => !entry.id || !entry.document || !validateAuthoredDocument(entry.document).ok
      )
    ) {
      return null;
    }
    const patterns: PatternEntry[] = parsed.documents.map((entry) => ({
      id: entry.id as string,
      name: (entry.document as AuthoredSequenceDocument).name,
      description: (entry.document as AuthoredSequenceDocument).description,
      folderId: null,
      source: { kind: "authoring", document: clone(entry.document as AuthoredSequenceDocument) }
    }));
    if (new Set(patterns.map((pattern) => pattern.id)).size !== patterns.length) return null;
    return {
      version: 1,
      folders: [],
      patterns,
      selectedPatternId: patterns.some((pattern) => pattern.id === parsed.selectedDocumentId)
        ? parsed.selectedDocumentId ?? null
        : patterns[0]?.id ?? null
    };
  } catch {
    return null;
  }
}

function persist(
  storage: PatternStorageLike | null,
  key: string,
  entries: PatternEntry[],
  folders: PatternFolder[],
  selectedPatternId: string | null
) {
  storage?.setItem(
    key,
    JSON.stringify({
      version: 1,
      patterns: entries,
      folders,
      selectedPatternId
    } satisfies PatternRegistrySnapshot)
  );
}

function assertFolderName(name: string): string {
  const normalized = name.trim();
  if (!normalized) throw new Error("Pattern folder name cannot be empty");
  return normalized;
}

export function createPatternRegistry(
  options: PatternRegistryOptions = {}
): PatternRegistryController {
  const storage = options.storage === undefined ? getDefaultStorage() : options.storage;
  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
  const createId = options.createId ?? (() => crypto.randomUUID());
  const seeds = clone(options.seedPatterns ?? defaultSeedPatterns());
  const storedSnapshot = parseSnapshot(storage?.getItem(storageKey) ?? null);
  const migratedSnapshot = storedSnapshot
    ? null
    : migrateOldAuthoringSnapshot(storage?.getItem(OLD_AUTHORING_STORAGE_KEY) ?? null);
  const hydrated = storedSnapshot ?? migratedSnapshot;
  const entries = ref<PatternEntry[]>(hydrated?.patterns.map(clone) ?? seeds);
  const folders = ref<PatternFolder[]>(hydrated?.folders.map(clone) ?? []);
  const selectedPatternId = ref<string | null>(
    hydrated?.selectedPatternId ?? entries.value[0]?.id ?? null
  );

  const write = () =>
    persist(storage, storageKey, entries.value, folders.value, selectedPatternId.value);
  if (!storedSnapshot) write();

  const selectedPattern = computed(
    () => entries.value.find((entry) => entry.id === selectedPatternId.value) ?? null
  );
  const get = (id: string) => entries.value.find((entry) => entry.id === id) ?? null;

  const saveAs = (
    source: PatternSource,
    metadata: { name: string; description?: string | null; folderId?: string | null }
  ) => {
    const validation = validatePatternSource(source);
    if (!validation.ok) throw new Error(validation.message);
    if (
      metadata.folderId !== undefined &&
      metadata.folderId !== null &&
      !folders.value.some((folder) => folder.id === metadata.folderId)
    ) {
      throw new Error("Pattern folder does not exist");
    }
    const name = metadata.name.trim() || "Untitled Pattern";
    const description = metadata.description ?? null;
    const entry: PatternEntry = {
      id: createId(),
      name,
      description,
      folderId: metadata.folderId ?? null,
      source: synchronizeAuthoringMetadata(source, name, description)
    };
    entries.value = [...entries.value, entry];
    selectedPatternId.value = entry.id;
    write();
    return clone(entry);
  };

  const save = (id: string, source: PatternSource) => {
    const validation = validatePatternSource(source);
    const existing = get(id);
    if (!validation.ok || !existing || existing.source.kind !== source.kind) return false;
    entries.value = entries.value.map((entry) =>
      entry.id === id
        ? {
            ...entry,
            source: synchronizeAuthoringMetadata(source, entry.name, entry.description)
          }
        : entry
    );
    write();
    return true;
  };

  const updateMetadata = (
    id: string,
    metadata: Partial<Pick<PatternEntry, "name" | "description" | "folderId">>
  ) => {
    if (!get(id)) return false;
    if (metadata.name !== undefined && metadata.name.trim().length === 0) return false;
    if (
      metadata.folderId !== undefined &&
      metadata.folderId !== null &&
      !folders.value.some((folder) => folder.id === metadata.folderId)
    ) {
      return false;
    }
    entries.value = entries.value.map((entry) =>
      entry.id === id
        ? (() => {
            const name = metadata.name === undefined ? entry.name : metadata.name.trim();
            const description =
              metadata.description === undefined ? entry.description : metadata.description;
            return {
              ...entry,
              name,
              description,
              folderId:
                metadata.folderId === undefined ? entry.folderId : metadata.folderId,
              source: synchronizeAuthoringMetadata(entry.source, name, description)
            };
          })()
        : entry
    );
    write();
    return true;
  };

  const remove = (id: string) => {
    if (!get(id)) return false;
    entries.value = entries.value.filter((entry) => entry.id !== id);
    if (selectedPatternId.value === id) selectedPatternId.value = entries.value[0]?.id ?? null;
    write();
    return true;
  };

  const select = (id: string | null) => {
    selectedPatternId.value = id && get(id) ? id : entries.value[0]?.id ?? null;
    write();
  };

  const createFolder = (name: string, parentId: string | null = null) => {
    if (parentId && !folders.value.some((folder) => folder.id === parentId)) {
      throw new Error("Parent folder does not exist");
    }
    const folder = { id: createId(), name: assertFolderName(name), parentId };
    folders.value = [...folders.value, folder];
    write();
    return clone(folder);
  };

  const updateFolder = (id: string, name: string) => {
    const folder = folders.value.find((candidate) => candidate.id === id);
    if (!folder) return false;
    let normalizedName: string;
    try {
      normalizedName = assertFolderName(name);
    } catch {
      return false;
    }
    folders.value = folders.value.map((candidate) =>
      candidate.id === id ? { ...candidate, name: normalizedName } : candidate
    );
    write();
    return true;
  };

  const move = (id: string, folderId: string | null) => {
    if (
      !get(id) ||
      (folderId !== null && !folders.value.some((folder) => folder.id === folderId))
    ) {
      return false;
    }
    return updateMetadata(id, { folderId });
  };

  const deleteFolder = (id: string) => {
    if (!folders.value.some((folder) => folder.id === id)) return false;
    if (
      folders.value.some((folder) => folder.parentId === id) ||
      entries.value.some((entry) => entry.folderId === id)
    ) {
      return false;
    }
    folders.value = folders.value.filter((folder) => folder.id !== id);
    write();
    return true;
  };

  return {
    entries,
    folders,
    selectedPatternId,
    selectedPattern,
    saveAs,
    save,
    updateMetadata,
    delete: remove,
    select,
    createFolder,
    updateFolder,
    move,
    deleteFolder,
    get
  };
}

const singleton = createPatternRegistry();

export function usePatternRegistry(): PatternRegistryController {
  return singleton;
}
