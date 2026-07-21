import { computed, type ComputedRef } from "vue";

import type { MultiRigSequence } from "@/engine/types";
import { compilePatternSource } from "@/patterns/patternAdapters";
import { usePatternRegistry } from "@/patterns/usePatternRegistry";
import type { PatternEntry } from "@/patterns/types";

export interface SelectedPatternSequence {
  readonly selectedEntry: ComputedRef<PatternEntry | null>;
  readonly sequence: ComputedRef<MultiRigSequence | null>;
  readonly errorMessage: ComputedRef<string | null>;
}

export function useSelectedPatternSequence(
  fallback: MultiRigSequence
): SelectedPatternSequence {
  const registry = usePatternRegistry();
  const selectedEntry = computed(() => registry.selectedPattern.value);
  const compiled = computed(() => {
    const entry = selectedEntry.value;
    if (!entry) return { sequence: fallback, errorMessage: null };
    const result = compilePatternSource(entry.source);
    return result.ok
      ? { sequence: result.sequence, errorMessage: null }
      : { sequence: null, errorMessage: entry.name + ": " + result.message };
  });

  return {
    selectedEntry,
    sequence: computed(() => compiled.value.sequence),
    errorMessage: computed(() => compiled.value.errorMessage)
  };
}
