<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import FrameStableSelect from "@/components/FrameStableSelect.vue";
import MelTurningGraph from "@/lab/experiments/mel-turning/components/MelTurningGraph.vue";
import type { TurningDisplayFrame } from "@/lab/experiments/mel-turning/model/turningDisplayFrame";
import type {
  LowReelLocation,
  TurningHand,
  TurningPhase,
  TurningPlaneSide
} from "@/lab/experiments/mel-turning/model/turningTypes";
import {
  TURNING_REVIEW_CONTINUATION_KINDS,
  TURNING_REVIEW_LOCATIONS,
  TURNING_REVIEW_OUTCOMES,
  parseTurningReviewArtifact,
  serializeTurningReviewArtifact,
  type TurningPatternReview,
  type TurningReviewArtifact,
  type TurningReviewContinuationKind,
  type TurningReviewEditedNode,
  type TurningReviewEditedPattern,
  type TurningReviewOutcome
} from "@/lab/experiments/mel-turning/review/turningReviewArtifact";
import {
  buildTurningReviewTrace,
  createTurningReviewEditedPattern,
  getTurningReviewEffectiveSteps,
  insertTurningReviewStep,
  removeTurningReviewStep
} from "@/lab/experiments/mel-turning/review/turningReviewPattern";
import {
  getTurningReviewStorage,
  listTurningReviewWorkbenches,
  loadTurningReviewWorkbench,
  removeTurningReviewWorkbench,
  saveTurningReviewWorkbench,
  turningReviewStorageKey,
  type SavedTurningReviewWorkbench
} from "@/lab/experiments/mel-turning/review/turningReviewStorage";

const storage = getTurningReviewStorage();
const artifact = ref<TurningReviewArtifact | null>(null);
const activeCaseId = ref("");
const dataUpdatedAt = ref("");
const lastExportedAt = ref<string | undefined>();
const savedWorkbenches = ref<readonly SavedTurningReviewWorkbench[]>([]);
const pendingImport = ref<{
  readonly imported: TurningReviewArtifact;
  readonly saved: SavedTurningReviewWorkbench;
} | null>(null);
const errorMessage = ref("");
const statusMessage = ref("");
const graphFrame = ref<TurningDisplayFrame>("observer-relative");
const selectedStep = ref(0);
const showOriginal = ref(false);

const LOCATION_OPTIONS = TURNING_REVIEW_LOCATIONS.map((value) => ({ value, label: value }));
const PLANE_SIDE_OPTIONS = [
  { value: "a", label: "a" },
  { value: "b", label: "b" }
] as const;
const PHASE_OPTIONS = [
  { value: "up", label: "up" },
  { value: "down", label: "down" }
] as const;
const CONTINUATION_OPTIONS = TURNING_REVIEW_CONTINUATION_KINDS.map((value) => ({
  value,
  label: value.replaceAll("-", " ")
}));

const candidates = computed(() => artifact.value?.batch.candidates ?? []);
const candidateOptions = computed(() =>
  candidates.value.map((candidate) => ({
    value: candidate.caseId,
    label: `${candidate.caseId} · ${outcomeLabel(artifact.value?.reviews[candidate.caseId]?.outcome)}`
  }))
);
const activeCandidateIndex = computed(() =>
  candidates.value.findIndex((candidate) => candidate.caseId === activeCaseId.value)
);
const activeCandidate = computed(() => candidates.value[activeCandidateIndex.value] ?? null);
const activeReview = computed(() =>
  activeCandidate.value && artifact.value
    ? artifact.value.reviews[activeCandidate.value.caseId]
    : undefined
);
const editedPattern = computed(() => activeReview.value?.editedPattern ?? null);
const displayReview = computed<TurningPatternReview | undefined>(() => {
  const review = activeReview.value;
  if (!review || !showOriginal.value || !review.editedPattern) return review;
  const { editedPattern: _ignored, ...withoutEdit } = review;
  return withoutEdit;
});
const effectiveSteps = computed(() =>
  activeCandidate.value
    ? getTurningReviewEffectiveSteps(activeCandidate.value, displayReview.value)
    : []
);
const activeTrace = computed(() =>
  activeCandidate.value ? buildTurningReviewTrace(activeCandidate.value, displayReview.value) : null
);
const reviewedCount = computed(
  () =>
    candidates.value.filter((candidate) => artifact.value?.reviews[candidate.caseId]?.outcome)
      .length
);
const hasUnexportedChanges = computed(
  () => !lastExportedAt.value || dataUpdatedAt.value > lastExportedAt.value
);

function now(): string {
  return new Date().toISOString();
}

function refreshSavedWorkbenches(): void {
  if (!storage) {
    savedWorkbenches.value = [];
    return;
  }
  try {
    savedWorkbenches.value = listTurningReviewWorkbenches(storage);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error);
  }
}

function reviewedIn(candidateArtifact: TurningReviewArtifact): number {
  return candidateArtifact.batch.candidates.filter(
    (candidate) => candidateArtifact.reviews[candidate.caseId]?.outcome
  ).length;
}

function persist(): void {
  if (!storage || !artifact.value || !activeCaseId.value) return;
  saveTurningReviewWorkbench(storage, {
    artifact: artifact.value,
    activeCaseId: activeCaseId.value,
    updatedAt: dataUpdatedAt.value || now(),
    ...(lastExportedAt.value ? { lastExportedAt: lastExportedAt.value } : {})
  });
}

function activateSaved(workbench: SavedTurningReviewWorkbench): void {
  artifact.value = workbench.artifact;
  activeCaseId.value = workbench.activeCaseId;
  dataUpdatedAt.value = workbench.updatedAt;
  lastExportedAt.value = workbench.lastExportedAt;
  selectedStep.value = 0;
  showOriginal.value = false;
  pendingImport.value = null;
  errorMessage.value = "";
  statusMessage.value = `Resumed ${workbench.artifact.batch.id} from local storage.`;
}

function activateImported(imported: TurningReviewArtifact): void {
  const firstCase = imported.batch.candidates[0];
  if (!firstCase) throw new Error("Imported turning review batch has no candidates.");
  artifact.value = imported;
  activeCaseId.value = firstCase.caseId;
  dataUpdatedAt.value = now();
  lastExportedAt.value = undefined;
  selectedStep.value = 0;
  showOriginal.value = false;
  pendingImport.value = null;
  errorMessage.value = "";
  statusMessage.value = `Imported ${imported.batch.id}; progress will autosave locally.`;
  persist();
}

function closeActiveBatch(): void {
  persist();
  artifact.value = null;
  activeCaseId.value = "";
  selectedStep.value = 0;
  showOriginal.value = false;
  pendingImport.value = null;
  refreshSavedWorkbenches();
}

async function importFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;

  try {
    const imported = parseTurningReviewArtifact(JSON.parse(await file.text()));
    const saved = storage
      ? loadTurningReviewWorkbench(storage, turningReviewStorageKey(imported))
      : null;
    if (saved) {
      pendingImport.value = { imported, saved };
      statusMessage.value = "";
      return;
    }
    activateImported(imported);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error);
  }
}

function chooseImportedConflict(): void {
  const imported = pendingImport.value?.imported;
  if (!imported) return;
  activateImported(imported);
}

function chooseSavedConflict(): void {
  const saved = pendingImport.value?.saved;
  if (!saved) return;
  activateSaved(saved);
}

function selectCase(caseId: string): void {
  if (!candidates.value.some((candidate) => candidate.caseId === caseId)) return;
  activeCaseId.value = caseId;
  selectedStep.value = 0;
  showOriginal.value = false;
  persist();
}

function moveCase(offset: -1 | 1): void {
  const next = activeCandidateIndex.value + offset;
  const candidate = candidates.value[next];
  if (candidate) selectCase(candidate.caseId);
}

function baseReview(): TurningPatternReview {
  return (
    activeReview.value ?? {
      outcome: null,
      notes: "",
      updatedAt: now()
    }
  );
}

function commitReview(review: TurningPatternReview): void {
  const candidate = activeCandidate.value;
  const currentArtifact = artifact.value;
  if (!candidate || !currentArtifact) return;
  const updatedAt = now();
  artifact.value = {
    ...currentArtifact,
    reviews: {
      ...currentArtifact.reviews,
      [candidate.caseId]: {
        ...review,
        updatedAt
      }
    }
  };
  dataUpdatedAt.value = updatedAt;
  persist();
}

function setOutcome(outcome: TurningReviewOutcome): void {
  commitReview({ ...baseReview(), outcome });
}

function clearOutcome(): void {
  commitReview({ ...baseReview(), outcome: null });
}

function setNotes(event: Event): void {
  commitReview({
    ...baseReview(),
    notes: (event.target as HTMLTextAreaElement).value
  });
}

function beginEditing(): void {
  const candidate = activeCandidate.value;
  if (!candidate) return;
  commitReview({
    ...baseReview(),
    editedPattern: createTurningReviewEditedPattern(candidate)
  });
  showOriginal.value = false;
}

function commitEditedPattern(pattern: TurningReviewEditedPattern): void {
  commitReview({ ...baseReview(), editedPattern: pattern });
  showOriginal.value = false;
}

function setEditedNodeField(
  rowIndex: number,
  hand: TurningHand,
  field: keyof TurningReviewEditedNode,
  value: string
): void {
  const pattern = editedPattern.value;
  if (!pattern) return;
  const row = pattern.steps[rowIndex];
  if (!row) return;
  const node = row[hand];
  const parsedValue =
    field === "location"
      ? (value as LowReelLocation)
      : field === "planeSide"
        ? (value as TurningPlaneSide)
        : (value as TurningPhase);
  const steps = pattern.steps.map((step, index) =>
    index === rowIndex
      ? {
          ...step,
          [hand]: {
            ...node,
            [field]: parsedValue
          }
        }
      : step
  );
  commitEditedPattern({ ...pattern, steps });
}

function setContinuationKind(rowIndex: number, value: string): void {
  const pattern = editedPattern.value;
  if (!pattern) return;
  const steps = pattern.steps.map((step, index) =>
    index === rowIndex
      ? { ...step, continuationKind: value as TurningReviewContinuationKind }
      : step
  );
  commitEditedPattern({ ...pattern, steps });
}

function setTurnAfter(rowIndex: number): void {
  const pattern = editedPattern.value;
  if (!pattern || rowIndex >= pattern.steps.length - 1) return;
  commitEditedPattern({ ...pattern, turnAfterIndex: rowIndex });
}

function insertRowAfter(rowIndex: number): void {
  const pattern = editedPattern.value;
  if (!pattern) return;
  commitEditedPattern(insertTurningReviewStep(pattern, rowIndex));
}

function removeRow(rowIndex: number): void {
  const pattern = editedPattern.value;
  if (!pattern) return;
  try {
    commitEditedPattern(removeTurningReviewStep(pattern, rowIndex));
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error);
  }
}

function resetEdits(): void {
  const review = activeReview.value;
  if (!review?.editedPattern) return;
  if (!globalThis.confirm("Discard every notation edit for this candidate?")) return;
  const { editedPattern: _ignored, ...withoutEdit } = review;
  commitReview(withoutEdit);
  showOriginal.value = false;
}

function exportReview(): void {
  const currentArtifact = artifact.value;
  if (!currentArtifact) return;
  const blob = new Blob([serializeTurningReviewArtifact(currentArtifact)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${currentArtifact.batch.id}.reviewed.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  lastExportedAt.value = now();
  persist();
  statusMessage.value = `Exported ${anchor.download}.`;
}

function removeSaved(workbench: SavedTurningReviewWorkbench): void {
  if (!storage) return;
  if (
    !globalThis.confirm(
      `Remove the locally saved copy of ${workbench.artifact.batch.id}? Export it first if it contains work you need.`
    )
  ) {
    return;
  }
  removeTurningReviewWorkbench(storage, workbench.storageKey);
  refreshSavedWorkbenches();
}

function outcomeLabel(outcome: TurningReviewOutcome | null | undefined): string {
  if (outcome === "possible") return "Possible";
  if (outcome === "not-possible") return "Not possible";
  if (outcome === "inconclusive") return "Inconclusive";
  return "Pending";
}

function outcomeBadgeClass(outcome: TurningReviewOutcome | null | undefined): string {
  if (outcome === "possible") return "border-emerald-500/50 bg-emerald-950/35 text-emerald-200";
  if (outcome === "not-possible") return "border-rose-500/50 bg-rose-950/35 text-rose-200";
  if (outcome === "inconclusive") return "border-amber-500/50 bg-amber-950/35 text-amber-200";
  return "border-ui-border-strong bg-ui-input text-ui-text-muted";
}

function outcomeSegmentClass(outcome: TurningReviewOutcome): string {
  if (activeReview.value?.outcome !== outcome) {
    return "bg-ui-surface text-ui-text-secondary hover:bg-ui-input";
  }
  if (outcome === "possible") return "bg-emerald-950/55 text-emerald-200";
  if (outcome === "not-possible") return "bg-rose-950/55 text-rose-200";
  return "bg-amber-950/55 text-amber-200";
}

function directionLabel(
  config: TurningReviewArtifact["batch"]["candidates"][number]["source"]
): string {
  if (config.direction.mode === "same") {
    return config.direction.direction === "clockwise" ? "same CW" : "same CCW";
  }
  return config.direction.flow === "inwards" ? "opposite inwards" : "opposite outwards";
}

function nodeLabel(node: TurningReviewEditedNode): string {
  return `${node.location} ${node.planeSide} ${node.phase}`;
}

function edgeLabel(kind: string | null): string {
  if (!kind) return "—";
  return kind.replaceAll("-", " ");
}

onMounted(() => {
  refreshSavedWorkbenches();
  const latest = savedWorkbenches.value[0];
  if (latest) activateSaved(latest);
});
</script>

<template>
  <main class="min-h-screen bg-transparent px-5 py-5 text-ui-text md:px-8 lg:py-6">
    <div class="mx-auto grid max-w-[100rem] gap-5">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="grid max-w-4xl gap-2">
          <div class="flex flex-wrap items-center gap-3">
            <p class="text-xs uppercase tracking-[0.2em] text-ui-text-muted">Mel turning</p>
            <span
              class="rounded-full border border-violet-500/40 bg-violet-950/45 px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-violet-200"
            >
              Pattern verifier
            </span>
          </div>
          <h1 class="text-2xl font-semibold text-slate-50">Turning Pattern Verifier Workbench</h1>
          <p class="text-sm leading-6 text-ui-text-secondary">
            Import a generated JSON batch, inspect one exact pattern at a time, and record only
            whether it is possible, not possible, or inconclusive. Notes remain freeform for later
            interpretation.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <RouterLink
            :to="{ name: 'mel-turning-lab' }"
            class="rounded-md border border-ui-border-strong bg-ui-surface px-3 py-2 text-xs font-medium text-ui-text-secondary transition hover:border-ui-focus"
          >
            Model explorer
          </RouterLink>
          <label
            class="cursor-pointer rounded-md border border-sky-500/60 bg-sky-950/35 px-3 py-2 text-xs font-semibold text-sky-100 transition hover:border-sky-300"
          >
            Import JSON
            <input
              type="file"
              accept=".json,application/json"
              class="sr-only"
              @change="importFile"
            />
          </label>
          <button
            v-if="artifact"
            type="button"
            class="rounded-md border border-emerald-500/60 bg-emerald-950/35 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300"
            @click="exportReview"
          >
            Export reviewed JSON
          </button>
        </div>
      </header>

      <p
        v-if="errorMessage"
        class="rounded-md border border-rose-700/60 bg-rose-950/35 px-3 py-2 text-xs leading-5 text-rose-100"
      >
        {{ errorMessage }}
      </p>
      <p
        v-if="statusMessage"
        class="rounded-md border border-sky-700/50 bg-sky-950/25 px-3 py-2 text-xs leading-5 text-sky-100"
      >
        {{ statusMessage }}
      </p>

      <section
        v-if="pendingImport"
        class="rounded-lg border border-amber-600/60 bg-amber-950/25 p-4"
      >
        <h2 class="text-sm font-semibold text-amber-100">Local progress already exists</h2>
        <p class="mt-1 text-xs leading-5 text-ui-text-secondary">
          A locally saved copy of {{ pendingImport.imported.batch.id }} has
          {{ reviewedIn(pendingImport.saved.artifact) }} reviewed candidates. Choose explicitly; the
          workbench will not merge or replace it silently.
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-md border border-emerald-500/60 bg-emerald-950/35 px-3 py-2 text-xs font-semibold text-emerald-100"
            @click="chooseSavedConflict"
          >
            Resume local progress
          </button>
          <button
            type="button"
            class="rounded-md border border-amber-500/60 bg-amber-950/35 px-3 py-2 text-xs font-semibold text-amber-100"
            @click="chooseImportedConflict"
          >
            Replace with imported file
          </button>
          <button
            type="button"
            class="rounded-md border border-ui-border-strong px-3 py-2 text-xs text-ui-text-secondary"
            @click="pendingImport = null"
          >
            Cancel
          </button>
        </div>
      </section>

      <section
        v-if="!artifact"
        class="grid gap-4 rounded-lg border border-ui-border bg-ui-surface p-5"
      >
        <div>
          <h2 class="text-base font-semibold text-slate-100">Import or resume a batch</h2>
          <p class="mt-1 text-xs leading-5 text-ui-text-secondary">
            Imported batches and every subsequent edit are copied into this browser’s local storage.
            Export a reviewed JSON file before clearing browser data or moving machines.
          </p>
        </div>
        <div v-if="savedWorkbenches.length > 0" class="grid gap-2">
          <article
            v-for="workbench in savedWorkbenches"
            :key="workbench.storageKey"
            class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-ui-border-subtle bg-ui-surface-raised p-3"
          >
            <div>
              <h3 class="font-mono text-sm font-semibold text-slate-100">
                {{ workbench.artifact.batch.id }}
              </h3>
              <p class="mt-1 text-xs text-ui-text-muted">
                {{ reviewedIn(workbench.artifact) }} /
                {{ workbench.artifact.batch.candidates.length }} reviewed · saved
                {{ new Date(workbench.updatedAt).toLocaleString() }}
              </p>
            </div>
            <div class="flex gap-2">
              <button
                type="button"
                class="rounded-md border border-sky-500/60 bg-sky-950/35 px-3 py-2 text-xs font-semibold text-sky-100"
                @click="activateSaved(workbench)"
              >
                Resume
              </button>
              <button
                type="button"
                class="rounded-md border border-rose-800/60 px-3 py-2 text-xs text-rose-200"
                @click="removeSaved(workbench)"
              >
                Remove local copy
              </button>
            </div>
          </article>
        </div>
      </section>

      <template v-else-if="activeCandidate && activeTrace">
        <section class="overflow-hidden rounded-lg border border-ui-border bg-ui-surface">
          <header
            class="flex flex-wrap items-center justify-between gap-3 border-b border-ui-border-subtle px-4 py-3"
          >
            <div>
              <p class="font-mono text-[0.6875rem] text-ui-text-muted">
                {{ artifact.batch.id }} · candidate {{ activeCandidateIndex + 1 }} of
                {{ candidates.length }}
              </p>
              <h2 class="mt-1 text-base font-semibold text-slate-100">
                {{ activeCandidate.caseId }}
              </h2>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="rounded-full border px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.12em]"
                :class="outcomeBadgeClass(activeReview?.outcome)"
              >
                {{ outcomeLabel(activeReview?.outcome) }}
              </span>
              <span
                v-if="editedPattern"
                class="rounded-full border border-violet-500/50 bg-violet-950/35 px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-violet-200"
              >
                Edited
              </span>
            </div>
          </header>

          <div class="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div class="grid gap-1 text-xs leading-5 text-ui-text-secondary sm:grid-cols-2">
              <p>
                <span class="text-ui-text-muted">Source:</span>
                {{ activeCandidate.source.left }} / {{ activeCandidate.source.right }} ·
                {{ directionLabel(activeCandidate.source) }} · offset
                {{ activeCandidate.source.offset }}
              </p>
              <p>
                <span class="text-ui-text-muted">Target:</span>
                {{ activeCandidate.target.left }} / {{ activeCandidate.target.right }} ·
                {{ directionLabel(activeCandidate.target) }} · offset
                {{ activeCandidate.target.offset }}
              </p>
              <p>
                <span class="text-ui-text-muted">Route:</span>
                {{ activeCandidate.summary.timing }} · {{ activeCandidate.summary.sourceFamily }} →
                {{ activeCandidate.summary.targetFamily }} · turn
                {{ activeCandidate.turnDirection }}
              </p>
              <p>
                <span class="text-ui-text-muted">Bridge:</span>
                {{ activeCandidate.summary.preparationHalfbeats }} preparation + 1 turn +
                {{ activeCandidate.summary.recoveryHalfbeats }} recovery
              </p>
            </div>
            <p class="text-right text-xs text-ui-text-muted">
              {{ reviewedCount }} / {{ candidates.length }} reviewed<br />
              <span :class="hasUnexportedChanges ? 'text-amber-200' : 'text-emerald-200'">
                {{ hasUnexportedChanges ? "Saved locally · not exported" : "Saved and exported" }}
              </span>
            </p>
          </div>

          <footer
            class="flex flex-wrap items-center gap-2 border-t border-ui-border-subtle bg-ui-surface-raised px-3 py-2.5"
          >
            <div
              class="flex h-10 min-w-0 flex-[1_1_29rem] overflow-hidden rounded-md border border-ui-border-strong bg-ui-input sm:min-w-[26rem]"
            >
              <button
                type="button"
                class="shrink-0 border-r border-ui-border-strong px-3 text-xs text-ui-text-secondary transition hover:bg-ui-surface disabled:opacity-35"
                :disabled="activeCandidateIndex <= 0"
                @click="moveCase(-1)"
              >
                Previous
              </button>
              <FrameStableSelect
                :model-value="activeCaseId"
                :options="candidateOptions"
                class="h-full min-w-0 flex-1 border-0 bg-ui-input px-3 text-xs text-ui-text outline-none"
                aria-label="Active turning review candidate"
                @update:model-value="selectCase(String($event))"
              />
              <button
                type="button"
                class="shrink-0 border-l border-ui-border-strong px-3 text-xs text-ui-text-secondary transition hover:bg-ui-surface disabled:opacity-35"
                :disabled="activeCandidateIndex >= candidates.length - 1"
                @click="moveCase(1)"
              >
                Next
              </button>
            </div>

            <div
              class="flex h-10 min-w-60 flex-[1_1_22rem] overflow-hidden rounded-md border border-ui-border-strong bg-ui-input focus-within:border-ui-focus"
            >
              <label
                for="turning-review-notes"
                class="flex shrink-0 items-center border-r border-ui-border-strong px-2.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-ui-text-muted"
              >
                Notes
              </label>
              <textarea
                id="turning-review-notes"
                :value="activeReview?.notes ?? ''"
                rows="1"
                class="h-full min-w-0 flex-1 resize-none bg-transparent px-2.5 py-2 text-xs leading-5 text-ui-text outline-none"
                placeholder="Freeform observations about this pattern…"
                @input="setNotes"
              />
            </div>

            <div
              class="flex h-10 shrink-0 overflow-hidden rounded-md border border-ui-border-strong"
              aria-label="Review status"
            >
              <button
                v-for="outcome in TURNING_REVIEW_OUTCOMES"
                :key="outcome"
                type="button"
                class="border-l border-ui-border-strong px-3 text-xs font-semibold transition first:border-l-0"
                :class="outcomeSegmentClass(outcome)"
                :aria-pressed="activeReview?.outcome === outcome"
                @click="setOutcome(outcome)"
              >
                {{ outcomeLabel(outcome) }}
              </button>
              <button
                type="button"
                class="border-l border-ui-border-strong px-3 text-xs font-medium transition"
                :class="
                  activeReview?.outcome
                    ? 'bg-ui-surface text-ui-text-muted hover:bg-ui-input'
                    : 'bg-ui-input text-slate-100'
                "
                :aria-pressed="!activeReview?.outcome"
                @click="clearOutcome"
              >
                Pending
              </button>
            </div>

            <button
              type="button"
              class="h-10 shrink-0 rounded-md border border-ui-border-strong px-3 text-xs text-ui-text-muted transition hover:bg-ui-input"
              @click="closeActiveBatch"
            >
              Batch library
            </button>
          </footer>
        </section>

        <div class="grid items-start gap-4 xl:grid-cols-[minmax(24rem,0.8fr)_minmax(0,1.2fr)]">
          <section class="grid gap-3 xl:sticky xl:top-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex gap-2">
                <button
                  v-for="frame in ['observer-relative', 'body-relative'] as const"
                  :key="frame"
                  type="button"
                  class="rounded-md border px-3 py-2 text-xs font-semibold"
                  :class="
                    graphFrame === frame
                      ? 'border-sky-300 bg-sky-300 text-slate-950'
                      : 'border-ui-border-strong bg-ui-surface text-ui-text-secondary'
                  "
                  @click="graphFrame = frame"
                >
                  {{ frame === "observer-relative" ? "Observer graph" : "Body graph" }}
                </button>
              </div>
              <div v-if="editedPattern" class="flex gap-2">
                <button
                  type="button"
                  class="rounded-md border px-3 py-2 text-xs font-semibold"
                  :class="
                    !showOriginal
                      ? 'border-violet-300 bg-violet-300 text-slate-950'
                      : 'border-ui-border-strong bg-ui-surface text-ui-text-secondary'
                  "
                  @click="showOriginal = false"
                >
                  Edited pattern
                </button>
                <button
                  type="button"
                  class="rounded-md border px-3 py-2 text-xs font-semibold"
                  :class="
                    showOriginal
                      ? 'border-violet-300 bg-violet-300 text-slate-950'
                      : 'border-ui-border-strong bg-ui-surface text-ui-text-secondary'
                  "
                  @click="showOriginal = true"
                >
                  Generated original
                </button>
              </div>
            </div>
            <MelTurningGraph :trace="activeTrace" :frame="graphFrame" :active-step="selectedStep" />
          </section>

          <section class="min-w-0 overflow-hidden rounded-lg border border-ui-border bg-ui-surface">
            <header
              class="flex flex-wrap items-center justify-between gap-3 border-b border-ui-border-subtle px-4 py-3"
            >
              <div>
                <h2 class="text-sm font-semibold text-slate-100">Pattern steps</h2>
                <p class="mt-1 text-xs text-ui-text-muted">
                  Generated details remain immutable. Editing creates a separate notation-level
                  working version.
                </p>
              </div>
              <div class="flex gap-2">
                <button
                  v-if="!editedPattern"
                  type="button"
                  class="rounded-md border border-violet-500/60 bg-violet-950/35 px-3 py-2 text-xs font-semibold text-violet-100"
                  @click="beginEditing"
                >
                  Edit pattern
                </button>
                <button
                  v-else
                  type="button"
                  class="rounded-md border border-rose-800/60 px-3 py-2 text-xs text-rose-200"
                  @click="resetEdits"
                >
                  Reset edits
                </button>
              </div>
            </header>

            <div class="overflow-x-auto">
              <table
                class="w-full border-collapse text-left text-xs"
                :class="editedPattern && !showOriginal ? 'min-w-[64rem]' : 'min-w-[44rem]'"
              >
                <thead class="bg-ui-surface-raised text-ui-text-muted">
                  <tr>
                    <th class="border-b border-ui-border-subtle px-3 py-2 font-semibold">t</th>
                    <th class="border-b border-ui-border-subtle px-3 py-2 font-semibold">Facing</th>
                    <th class="border-b border-ui-border-subtle px-3 py-2 font-semibold">Region</th>
                    <th class="border-b border-ui-border-subtle px-3 py-2 font-semibold">
                      Cyan · left
                    </th>
                    <th class="border-b border-ui-border-subtle px-3 py-2 font-semibold">
                      Red · right
                    </th>
                    <th class="border-b border-ui-border-subtle px-3 py-2 font-semibold">
                      Outgoing interval
                    </th>
                    <th
                      v-if="editedPattern && !showOriginal"
                      class="border-b border-ui-border-subtle px-3 py-2 font-semibold"
                    >
                      Rows
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(step, rowIndex) in effectiveSteps"
                    :key="step.id"
                    class="cursor-pointer border-b border-ui-border-subtle align-top transition hover:bg-ui-surface-raised"
                    :class="selectedStep === step.step ? 'bg-sky-950/20' : ''"
                    @click="selectedStep = step.step"
                  >
                    <td class="px-3 py-2.5 font-mono text-ui-text-muted">{{ step.step }}</td>
                    <td class="px-3 py-2.5 font-mono">{{ step.facing }}°</td>
                    <td class="px-3 py-2.5 capitalize text-ui-text-muted">{{ step.region }}</td>
                    <td class="px-3 py-2.5">
                      <div v-if="editedPattern && !showOriginal" class="flex gap-1.5">
                        <FrameStableSelect
                          :model-value="step.left.location"
                          :options="LOCATION_OPTIONS"
                          class="rounded border border-cyan-700/60 bg-ui-input px-2 py-1.5 text-cyan-100"
                          :aria-label="`Left location at step ${step.step}`"
                          @update:model-value="
                            setEditedNodeField(rowIndex, 'left', 'location', String($event))
                          "
                        />
                        <FrameStableSelect
                          :model-value="step.left.planeSide"
                          :options="PLANE_SIDE_OPTIONS"
                          class="rounded border border-ui-border-strong bg-ui-input px-2 py-1.5"
                          :aria-label="`Left plane side at step ${step.step}`"
                          @update:model-value="
                            setEditedNodeField(rowIndex, 'left', 'planeSide', String($event))
                          "
                        />
                        <FrameStableSelect
                          :model-value="step.left.phase"
                          :options="PHASE_OPTIONS"
                          class="rounded border border-ui-border-strong bg-ui-input px-2 py-1.5"
                          :aria-label="`Left phase at step ${step.step}`"
                          @update:model-value="
                            setEditedNodeField(rowIndex, 'left', 'phase', String($event))
                          "
                        />
                      </div>
                      <span v-else class="font-mono text-cyan-200">{{ nodeLabel(step.left) }}</span>
                    </td>
                    <td class="px-3 py-2.5">
                      <div v-if="editedPattern && !showOriginal" class="flex gap-1.5">
                        <FrameStableSelect
                          :model-value="step.right.location"
                          :options="LOCATION_OPTIONS"
                          class="rounded border border-rose-700/60 bg-ui-input px-2 py-1.5 text-rose-100"
                          :aria-label="`Right location at step ${step.step}`"
                          @update:model-value="
                            setEditedNodeField(rowIndex, 'right', 'location', String($event))
                          "
                        />
                        <FrameStableSelect
                          :model-value="step.right.planeSide"
                          :options="PLANE_SIDE_OPTIONS"
                          class="rounded border border-ui-border-strong bg-ui-input px-2 py-1.5"
                          :aria-label="`Right plane side at step ${step.step}`"
                          @update:model-value="
                            setEditedNodeField(rowIndex, 'right', 'planeSide', String($event))
                          "
                        />
                        <FrameStableSelect
                          :model-value="step.right.phase"
                          :options="PHASE_OPTIONS"
                          class="rounded border border-ui-border-strong bg-ui-input px-2 py-1.5"
                          :aria-label="`Right phase at step ${step.step}`"
                          @update:model-value="
                            setEditedNodeField(rowIndex, 'right', 'phase', String($event))
                          "
                        />
                      </div>
                      <span v-else class="font-mono text-rose-200">{{
                        nodeLabel(step.right)
                      }}</span>
                    </td>
                    <td class="px-3 py-2.5">
                      <template
                        v-if="
                          editedPattern && !showOriginal && rowIndex < effectiveSteps.length - 1
                        "
                      >
                        <label class="flex items-center gap-2 text-amber-100">
                          <input
                            type="radio"
                            :name="`turn-${activeCandidate.caseId}`"
                            :checked="editedPattern.turnAfterIndex === rowIndex"
                            @change="setTurnAfter(rowIndex)"
                          />
                          Turn after this row
                        </label>
                        <FrameStableSelect
                          v-if="editedPattern.turnAfterIndex !== rowIndex"
                          :model-value="
                            editedPattern.steps[rowIndex]?.continuationKind ?? 'reel-continuation'
                          "
                          :options="CONTINUATION_OPTIONS"
                          class="mt-1.5 rounded border border-ui-border-strong bg-ui-input px-2 py-1.5"
                          :aria-label="`Continuation after step ${step.step}`"
                          @update:model-value="setContinuationKind(rowIndex, String($event))"
                        />
                        <p v-else class="mt-1 font-mono text-[0.625rem] text-amber-200">
                          body turn · {{ activeCandidate.turnDirection }}
                        </p>
                      </template>
                      <span v-else class="font-mono text-ui-text-secondary">
                        {{ edgeLabel(step.outgoingKind) }}
                      </span>
                    </td>
                    <td v-if="editedPattern && !showOriginal" class="px-3 py-2.5">
                      <div class="flex flex-wrap gap-1.5">
                        <button
                          v-if="rowIndex < effectiveSteps.length - 1"
                          type="button"
                          class="rounded border border-ui-border-strong px-2 py-1 text-ui-text-secondary"
                          @click.stop="insertRowAfter(rowIndex)"
                        >
                          Add after
                        </button>
                        <button
                          type="button"
                          class="rounded border border-rose-900/60 px-2 py-1 text-rose-200"
                          @click.stop="removeRow(rowIndex)"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <details class="border-t border-ui-border-subtle px-4 py-3">
              <summary class="cursor-pointer text-xs font-medium text-ui-text-muted">
                Technical provenance
              </summary>
              <div class="mt-3 grid gap-2 text-[0.6875rem] leading-5 text-ui-text-muted">
                <p>
                  Route {{ activeCandidate.routeId }} · model
                  {{ activeCandidate.summary.modelStatus }} · evidence
                  {{ activeCandidate.summary.evidenceStatus }}
                </p>
                <p v-for="step in activeCandidate.steps" :key="step.step" class="font-mono">
                  t{{ step.step }} · body L {{ step.left.handPointBody.x.toFixed(3) }},
                  {{ step.left.handPointBody.y.toFixed(3) }} · R
                  {{ step.right.handPointBody.x.toFixed(3) }},
                  {{ step.right.handPointBody.y.toFixed(3) }} ·
                  {{ step.outgoingEdge?.provenance.join("; ") || "end" }}
                </p>
              </div>
            </details>
          </section>
        </div>
      </template>
    </div>
  </main>
</template>
