<script setup lang="ts">
import StallPatternCard from "@/lab/experiments/qt-stall-graph/StallPatternCard.vue";
import type { StallPatternOption } from "@/lab/experiments/qt-stall-graph/stallPatternOptions";

const props = withDefaults(
  defineProps<{
    patterns: readonly StallPatternOption[];
    ariaLabel: string;
    selectedCodec?: string | null;
    selectable?: boolean;
  }>(),
  { selectedCodec: null, selectable: false }
);

const emit = defineEmits<{ select: [codec: string] }>();
</script>

<template>
  <div
    class="grid min-w-0 grid-cols-2 items-stretch gap-2 lg:grid-cols-4"
    role="group"
    :aria-label="props.ariaLabel"
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
      compact
      :selectable="props.selectable"
      :selected="pattern.codec === props.selectedCodec"
      @select="emit('select', $event)"
    />
  </div>
</template>
