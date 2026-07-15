<script setup lang="ts">
import { computed } from "vue";

import { decodeStallPattern } from "@/lab/experiments/qt-stall-graph/stallPatternCodec";
import StallPatternGraph from "@/lab/experiments/qt-stall-graph/StallPatternGraph.vue";

const props = withDefaults(
  defineProps<{
    codec: string;
    selected?: boolean;
  }>(),
  { selected: false }
);

const emit = defineEmits<{ select: [codec: string] }>();
const decoded = computed(() => decodeStallPattern(props.codec));
</script>

<template>
  <article
    class="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border bg-slate-950/60 transition"
    :class="props.selected ? 'border-amber-400/70' : 'border-slate-800 hover:border-slate-600'"
  >
    <button
      type="button"
      class="block w-full shrink-0 p-3 text-left"
      :aria-pressed="props.selected"
      :disabled="!decoded.ok"
      @click="emit('select', props.codec)"
    >
      <span class="grid h-44 w-full place-items-center overflow-hidden">
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
    </button>

    <footer
      class="mt-auto flex h-11 min-w-0 shrink-0 items-center gap-2 border-t border-slate-800 px-3"
    >
      <code class="min-w-0 flex-1 truncate text-[10px] text-slate-500">{{ props.codec }}</code>
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
