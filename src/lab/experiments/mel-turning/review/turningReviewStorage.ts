import {
  parseTurningReviewArtifact,
  type TurningReviewArtifact
} from "@/lab/experiments/mel-turning/review/turningReviewArtifact";

export const TURNING_REVIEW_STORAGE_PREFIX = "poi-viz:mel-turning-review:";

export interface TurningReviewStorageLike {
  readonly length: number;
  getItem(key: string): string | null;
  key(index: number): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

export interface SavedTurningReviewWorkbench {
  readonly storageKey: string;
  readonly artifact: TurningReviewArtifact;
  readonly activeCaseId: string;
  readonly updatedAt: string;
  readonly lastExportedAt?: string;
}

interface StoredTurningReviewWorkbench {
  readonly storageVersion: 1;
  readonly artifact: unknown;
  readonly activeCaseId: unknown;
  readonly updatedAt: unknown;
  readonly lastExportedAt?: unknown;
}

export function getTurningReviewStorage(): TurningReviewStorageLike | null {
  return typeof globalThis.localStorage === "undefined" ? null : globalThis.localStorage;
}

export function turningReviewStorageKey(artifact: TurningReviewArtifact): string {
  return `${TURNING_REVIEW_STORAGE_PREFIX}${encodeURIComponent(artifact.batch.id)}:${artifact.batch.contentHash}`;
}

function parseStoredWorkbench(storageKey: string, serialized: string): SavedTurningReviewWorkbench {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error(`Saved turning review ${storageKey} is not valid JSON.`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Saved turning review ${storageKey} is not an object.`);
  }
  const stored = parsed as StoredTurningReviewWorkbench;
  if (stored.storageVersion !== 1) {
    throw new Error(`Saved turning review ${storageKey} has an unsupported storage version.`);
  }
  const artifact = parseTurningReviewArtifact(stored.artifact);
  if (typeof stored.activeCaseId !== "string") {
    throw new Error(`Saved turning review ${storageKey} has no active case ID.`);
  }
  if (!artifact.batch.candidates.some((candidate) => candidate.caseId === stored.activeCaseId)) {
    throw new Error(`Saved turning review ${storageKey} refers to an absent active case.`);
  }
  if (typeof stored.updatedAt !== "string" || stored.updatedAt.length === 0) {
    throw new Error(`Saved turning review ${storageKey} has no update timestamp.`);
  }
  if (
    stored.lastExportedAt !== undefined &&
    (typeof stored.lastExportedAt !== "string" || stored.lastExportedAt.length === 0)
  ) {
    throw new Error(`Saved turning review ${storageKey} has an invalid export timestamp.`);
  }

  return {
    storageKey,
    artifact,
    activeCaseId: stored.activeCaseId,
    updatedAt: stored.updatedAt,
    ...(typeof stored.lastExportedAt === "string" ? { lastExportedAt: stored.lastExportedAt } : {})
  };
}

export function loadTurningReviewWorkbench(
  storage: TurningReviewStorageLike,
  storageKey: string
): SavedTurningReviewWorkbench | null {
  const serialized = storage.getItem(storageKey);
  return serialized === null ? null : parseStoredWorkbench(storageKey, serialized);
}

export function listTurningReviewWorkbenches(
  storage: TurningReviewStorageLike
): readonly SavedTurningReviewWorkbench[] {
  const result: SavedTurningReviewWorkbench[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key?.startsWith(TURNING_REVIEW_STORAGE_PREFIX)) continue;
    const workbench = loadTurningReviewWorkbench(storage, key);
    if (workbench) result.push(workbench);
  }
  return result.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export function saveTurningReviewWorkbench(
  storage: TurningReviewStorageLike,
  input: {
    readonly artifact: TurningReviewArtifact;
    readonly activeCaseId: string;
    readonly updatedAt: string;
    readonly lastExportedAt?: string;
  }
): SavedTurningReviewWorkbench {
  if (!input.artifact.batch.candidates.some(({ caseId }) => caseId === input.activeCaseId)) {
    throw new Error(`Cannot save absent turning review case ${input.activeCaseId}.`);
  }
  const storageKey = turningReviewStorageKey(input.artifact);
  const stored: StoredTurningReviewWorkbench = {
    storageVersion: 1,
    artifact: input.artifact,
    activeCaseId: input.activeCaseId,
    updatedAt: input.updatedAt,
    ...(input.lastExportedAt ? { lastExportedAt: input.lastExportedAt } : {})
  };
  storage.setItem(storageKey, JSON.stringify(stored));
  return {
    storageKey,
    artifact: input.artifact,
    activeCaseId: input.activeCaseId,
    updatedAt: input.updatedAt,
    ...(input.lastExportedAt ? { lastExportedAt: input.lastExportedAt } : {})
  };
}

export function removeTurningReviewWorkbench(
  storage: TurningReviewStorageLike,
  storageKey: string
): void {
  storage.removeItem(storageKey);
}
