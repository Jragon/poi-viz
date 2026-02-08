import { ref } from "vue";

export interface NumericDrafts {
  getDraftValue: (draftKey: string, fallbackValue: number) => string;
  updateDraft: (draftKey: string, event: Event) => void;
  commitDraft: (draftKey: string, fallbackValue: number, onCommit: (value: number) => void) => void;
  commitDraftOnEnter: (event: KeyboardEvent) => void;
  clearDrafts: () => void;
}

interface NumericDraftOptions {
  inputDecimals?: number;
}

function parseFiniteNumber(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Shared commit-on-blur numeric draft handling for controls input fields.
 */
export function useNumericDrafts(options: NumericDraftOptions = {}): NumericDrafts {
  const inputDecimals = options.inputDecimals ?? 4;
  const numericDrafts = ref<Record<string, string>>({});

  function roundForInput(value: number): number {
    return Number(value.toFixed(inputDecimals));
  }

  function clearDrafts(): void {
    numericDrafts.value = {};
  }

  function getDraftValue(draftKey: string, fallbackValue: number): string {
    const draftValue = numericDrafts.value[draftKey];
    if (draftValue !== undefined) {
      return draftValue;
    }

    return String(roundForInput(fallbackValue));
  }

  function updateDraft(draftKey: string, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    numericDrafts.value[draftKey] = target.value;
  }

  function commitDraft(draftKey: string, fallbackValue: number, onCommit: (value: number) => void): void {
    const draftValue = numericDrafts.value[draftKey];
    if (draftValue === undefined) {
      return;
    }

    const parsed = parseFiniteNumber(draftValue);
    if (parsed !== null) {
      onCommit(parsed);
    } else {
      numericDrafts.value[draftKey] = String(roundForInput(fallbackValue));
    }

    delete numericDrafts.value[draftKey];
  }

  function commitDraftOnEnter(event: KeyboardEvent): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      target.blur();
    }
  }

  return {
    getDraftValue,
    updateDraft,
    commitDraft,
    commitDraftOnEnter,
    clearDrafts
  };
}
