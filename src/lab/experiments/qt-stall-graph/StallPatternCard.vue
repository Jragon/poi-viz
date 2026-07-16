<script setup lang="ts">
import { computed } from "vue";

import { decodeStallPattern } from "@/lab/experiments/qt-stall-graph/stallPatternCodec";
import StallPatternGraph from "@/lab/experiments/qt-stall-graph/StallPatternGraph.vue";

const props = withDefaults(
  defineProps<{
    codec: string;
    label: string;
    eyebrow?: string;
    ariaLabel?: string;
    compact?: boolean;
    selected?: boolean;
    selectable?: boolean;
  }>(),
  { compact: false, selected: false, selectable: true }
);

const emit = defineEmits<{ select: [codec: string] }>();
const decoded = computed(() => decodeStallPattern(props.codec));
</script>

<template>
  <article
    class="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border bg-slate-950/60 transition"
    :class="props.selected ? 'border-amber-400/70' : 'border-slate-800 hover:border-slate-600'"
  >
    <component
      :is="props.selectable ? 'button' : 'div'"
      type="button"
      class="flex w-full shrink-0 flex-col text-left"
      :class="props.compact ? 'p-1' : 'p-2'"
      :aria-label="
        props.selectable ? `Select pattern: ${props.ariaLabel ?? props.label}` : undefined
      "
      :title="`${props.label} — ${props.codec}`"
      :aria-pressed="props.selectable ? props.selected : undefined"
      :disabled="props.selectable ? !decoded.ok : undefined"
      @click="props.selectable && emit('select', props.codec)"
    >
      <span
        class="grid w-full place-items-center overflow-hidden"
        :class="props.compact ? 'aspect-square' : 'h-32'"
      >
        <StallPatternGraph
          v-if="decoded.ok"
          :draft="decoded.draft"
          orientation="horizontal"
          density="thumbnail"
          :fill-container="true"
          :aria-label="`Pattern thumbnail for ${props.codec}`"
        />
        <span v-else class="text-xs text-red-300">
          {{ decoded.error.message }}
        </span>
      </span>
      <span
        v-if="props.compact"
        class="grid min-h-10 place-items-center px-1 pb-1 pt-1 text-center leading-4"
      >
        <span>
          <span v-if="props.eyebrow" class="block font-mono text-[9px] text-slate-500">
            {{ props.eyebrow }}
          </span>
          <span class="line-clamp-2 text-xs text-slate-300 sm:text-sm">{{ props.label }}</span>
        </span>
      </span>
    </component>

    <footer
      v-if="!props.compact"
      class="mt-auto flex min-h-12 min-w-0 shrink-0 items-center gap-2 border-t border-slate-800 px-2"
    >
      <span class="grid min-w-0 flex-1 gap-0.5">
        <span class="truncate text-[10px] text-slate-300" :title="props.label">
          {{ props.label }}
        </span>
        <code class="truncate text-[9px] text-slate-500">{{ props.codec }}</code>
      </span>
      <RouterLink
        v-if="decoded.ok"
        :to="{ name: 'qt-stall-graph', query: { p: props.codec } }"
        class="shrink-0 text-[11px] text-cyan-300 transition hover:text-cyan-100"
      >
        Edit →
      </RouterLink>
    </footer>
  </article>
</template>
