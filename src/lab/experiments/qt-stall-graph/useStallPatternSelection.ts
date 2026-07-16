import { computed, ref, toValue, watch, type MaybeRefOrGetter } from "vue";

import { compileStallPattern } from "@/lab/experiments/qt-stall-graph/compileStallGraph";
import { decodeStallPattern } from "@/lab/experiments/qt-stall-graph/stallPatternCodec";
import type { StallPatternOption } from "@/lab/experiments/qt-stall-graph/stallPatternOptions";

export function useStallPatternSelection(
  patterns: MaybeRefOrGetter<readonly StallPatternOption[]>
) {
  const selectedCodec = ref<string | null>(null);
  const validCodecs = computed(() =>
    toValue(patterns)
      .map((pattern) => pattern.codec)
      .filter((codec) => decodeStallPattern(codec).ok)
  );

  watch(
    validCodecs,
    (codecs) => {
      if (selectedCodec.value && codecs.includes(selectedCodec.value)) return;
      selectedCodec.value = codecs[0] ?? null;
    },
    { immediate: true }
  );

  function select(codec: string): void {
    if (validCodecs.value.includes(codec)) selectedCodec.value = codec;
  }

  const selection = computed(() => {
    if (!selectedCodec.value) return null;
    const decoded = decodeStallPattern(selectedCodec.value);
    if (!decoded.ok) return null;
    const compiled = compileStallPattern(decoded.draft);
    if (!compiled.sequence) return null;
    return {
      codec: selectedCodec.value,
      sequence: compiled.sequence
    };
  });

  return { selectedCodec, selection, select };
}
