import { computed, ref, watch, type ComputedRef, type Ref } from "vue";

import { compileAuthoredDocument } from "@/authoring/compile";
import type { AuthoredDocumentEntry } from "@/authoring/types";
import type { AuthoringLibraryController } from "@/authoring/useAuthoringLibrary";
import type { MultiRigSequence } from "@/engine/types";

export interface VisualizerDocumentSource {
  readonly documents: Ref<AuthoredDocumentEntry[]>;
  readonly selectedId: Ref<string | null>;
  readonly selectedDocument: ComputedRef<AuthoredDocumentEntry | null>;
  readonly sequence: ComputedRef<MultiRigSequence | null>;
  select: (id: string | null) => void;
}

export function useVisualizerDocumentSource(
  library: AuthoringLibraryController
): VisualizerDocumentSource {
  const selectedId = ref<string | null>(library.selectedDocumentId.value);

  // When the library's document list changes, verify the current selection
  // still exists. If not, fall back to the first available document.
  watch(
    () => library.documents.value,
    (documents) => {
      if (selectedId.value && documents.some((entry) => entry.id === selectedId.value)) {
        return;
      }
      selectedId.value = documents[0]?.id ?? null;
    },
    { flush: "sync" }
  );

  const selectedDocument = computed(() => {
    if (!selectedId.value) {
      return null;
    }
    return library.documents.value.find((entry) => entry.id === selectedId.value) ?? null;
  });

  const sequence = computed<MultiRigSequence | null>(() => {
    const entry = selectedDocument.value;
    if (!entry) {
      return null;
    }

    const result = compileAuthoredDocument(entry.document);
    if (!result.ok) {
      throw new Error(
        `Invariant: persisted document "${entry.document.name}" failed to compile: ${result.errors[0]?.code ?? "UNKNOWN"}`
      );
    }

    return result.sequence;
  });

  const select = (id: string | null) => {
    if (id && library.documents.value.some((entry) => entry.id === id)) {
      selectedId.value = id;
    } else {
      selectedId.value = library.documents.value[0]?.id ?? null;
    }
  };

  return {
    documents: library.documents,
    selectedId,
    selectedDocument,
    sequence,
    select
  };
}
