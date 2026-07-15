import { computed, ref, watch } from "vue";
import { useRoute, useRouter, type LocationQueryRaw } from "vue-router";

import {
  createEmptyStallPatternDraft,
  type StallPatternDraft
} from "@/lab/experiments/qt-stall-graph/stallPattern";
import {
  decodeStallPattern,
  encodeStallPattern,
  type StallPatternCodecError
} from "@/lab/experiments/qt-stall-graph/stallPatternCodec";
import type { StallGraphOrientation } from "@/lab/experiments/qt-stall-graph/stallGraphGeometry";

function firstQueryValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return firstQueryValue(value[0]);
  return undefined;
}

export function useStallPatternUrlState() {
  const route = useRoute();
  const router = useRouter();
  const draft = ref<StallPatternDraft | null>(null);
  const codecError = ref<StallPatternCodecError | null>(null);
  const orientation = ref<StallGraphOrientation>("horizontal");
  let syncingFromRoute = false;

  watch(
    () => route.query,
    (query) => {
      syncingFromRoute = true;
      orientation.value = firstQueryValue(query.view) === "v" ? "vertical" : "horizontal";

      const payload = firstQueryValue(query.p);
      if (payload === undefined) {
        draft.value = createEmptyStallPatternDraft();
        codecError.value = null;
      } else {
        const decoded = decodeStallPattern(payload);
        if (decoded.ok) {
          draft.value = decoded.draft;
          codecError.value = null;
        } else {
          draft.value = null;
          codecError.value = decoded.error;
        }
      }
      syncingFromRoute = false;
    },
    { immediate: true }
  );

  watch(
    [draft, orientation],
    ([nextDraft, nextOrientation]) => {
      if (syncingFromRoute || nextDraft === null) return;
      const encoded = encodeStallPattern(nextDraft);
      if (!encoded.ok) {
        codecError.value = encoded.error;
        return;
      }

      codecError.value = null;
      const nextQuery: LocationQueryRaw = { ...route.query, p: encoded.codec };
      if (nextOrientation === "vertical") nextQuery.view = "v";
      else delete nextQuery.view;

      const currentCodec = firstQueryValue(route.query.p);
      const currentView = firstQueryValue(route.query.view);
      if (
        currentCodec === encoded.codec &&
        currentView === (nextOrientation === "vertical" ? "v" : undefined)
      ) {
        return;
      }

      void router.replace({ query: nextQuery });
    },
    { deep: true }
  );

  const codec = computed(() => {
    if (draft.value === null) return null;
    const encoded = encodeStallPattern(draft.value);
    return encoded.ok ? encoded.codec : null;
  });

  function reset(): void {
    draft.value = createEmptyStallPatternDraft();
    codecError.value = null;
  }

  return { draft, orientation, codec, codecError, reset };
}
