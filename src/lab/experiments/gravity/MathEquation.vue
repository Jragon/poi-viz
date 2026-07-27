<script setup lang="ts">
import katex from "katex";
import { computed } from "vue";

import "katex/dist/katex.min.css";

const props = withDefaults(
  defineProps<{
    tex: string;
    display?: boolean;
    ariaLabel?: string;
  }>(),
  {
    display: true
  }
);

const markup = computed(() =>
  katex.renderToString(props.tex, {
    displayMode: props.display,
    throwOnError: false,
    output: "htmlAndMathml"
  })
);
</script>

<template>
  <div
    class="overflow-x-auto py-2 text-slate-100"
    :aria-label="props.ariaLabel"
    v-html="markup"
  ></div>
</template>
