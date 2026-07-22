<script setup lang="ts">
import { computed, ref, watch } from "vue";

import EmbeddedVisualizer from "@/lab/components/EmbeddedVisualizer.vue";
import { compileStallPattern } from "@/lab/experiments/qt-stall-graph/compileStallGraph";
import StallPatternCard from "@/lab/experiments/qt-stall-graph/StallPatternCard.vue";
import { decodeStallPattern } from "@/lab/experiments/qt-stall-graph/stallPatternCodec";

export interface StallPatternOption {
  readonly codec: string;
  readonly label: string;
  readonly ariaLabel?: string;
}

const props = withDefaults(
  defineProps<{
    patterns: readonly StallPatternOption[];
    compact?: boolean;
  }>(),
  { compact: false }
);
const selectedCodec = ref<string | null>(null);

const validCodecs = computed(() =>
  props.patterns.map((pattern) => pattern.codec).filter((codec) => decodeStallPattern(codec).ok)
);

watch(
  validCodecs,
  (codecs) => {
    if (selectedCodec.value && codecs.includes(selectedCodec.value)) return;
    selectedCodec.value = codecs[0] ?? null;
  },
  { immediate: true }
);

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
</script>

<template>
  <section
    class="not-prose my-6 grid min-w-0 gap-4"
    :class="props.compact ? 'max-w-4xl!' : 'max-w-6xl!'"
  >
    <div
      class="grid min-w-0 items-stretch gap-3"
      :class="props.compact ? 'grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-4'"
    >
      <StallPatternCard
        v-for="pattern in props.patterns"
        :key="pattern.codec"
        :codec="pattern.codec"
        :label="pattern.label"
        :aria-label="pattern.ariaLabel"
        :compact="props.compact"
        selectable
        :selected="pattern.codec === selectedCodec"
        @select="selectedCodec = $event"
      />
    </div>

    <EmbeddedVisualizer
      v-if="selection"
      :sequence="selection.sequence"
      title="Selected article pattern"
      :summary="selection.codec"
      size="compact"
      :show-body-rig="true"
      projection-mode="auto"
    />
    <p
      v-else
      class="rounded-md border border-ui-border-subtle bg-slate-950/50 px-4 py-5 text-sm text-ui-text-muted"
    >
      Select a complete, compilable codec to preview it.
    </p>
  </section>
</template>
