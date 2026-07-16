<script setup lang="ts">
import EmbeddedVisualizer from "@/lab/components/EmbeddedVisualizer.vue";
import StallPatternCard from "@/lab/experiments/qt-stall-graph/StallPatternCard.vue";
import type { StallPatternOption } from "@/lab/experiments/qt-stall-graph/stallPatternOptions";
import { useStallPatternSelection } from "@/lab/experiments/qt-stall-graph/useStallPatternSelection";

const props = withDefaults(
  defineProps<{
    patterns: readonly StallPatternOption[];
    compact?: boolean;
  }>(),
  { compact: false }
);
const { selectedCodec, selection, select } = useStallPatternSelection(() => props.patterns);
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
        v-bind="{
          ...(pattern.eyebrow ? { eyebrow: pattern.eyebrow } : {}),
          ...(pattern.ariaLabel ? { ariaLabel: pattern.ariaLabel } : {})
        }"
        :compact="props.compact"
        :selected="pattern.codec === selectedCodec"
        @select="select"
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
