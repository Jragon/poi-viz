<script setup lang="ts">
import { computed, ref, watch } from "vue";

import EmbeddedVisualizer from "@/lab/components/EmbeddedVisualizer.vue";
import { compileStallPattern } from "@/lab/experiments/qt-stall-graph/compileStallGraph";
import { decodeStallPattern } from "@/lab/experiments/qt-stall-graph/stallPatternCodec";
import StallPatternCard from "@/lab/experiments/qt-stall-graph/StallPatternCard.vue";

const props = defineProps<{ codecs: readonly string[] }>();
const selectedCodec = ref<string | null>(null);

const validCodecs = computed(() => props.codecs.filter((codec) => decodeStallPattern(codec).ok));

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
  <section class="not-prose my-6 grid min-w-0 gap-4">
    <div class="grid min-w-0 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <StallPatternCard
        v-for="codec in props.codecs"
        :key="codec"
        :codec="codec"
        :selected="codec === selectedCodec"
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
      class="rounded-md border border-slate-800 bg-slate-950/50 px-4 py-5 text-sm text-slate-500"
    >
      Select a complete, compilable codec to preview it.
    </p>
  </section>
</template>
