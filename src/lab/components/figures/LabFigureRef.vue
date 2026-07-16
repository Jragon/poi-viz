<script setup lang="ts">
import { computed } from "vue";

import { assertValidLabFigureId } from "@/lab/components/figures/figureTypes";

const props = defineProps<{
  figureId: string;
}>();

const href = computed(() => `#${assertValidLabFigureId(props.figureId)}`);
</script>

<template>
  <a class="lab-figure-ref" :href="href">
    <slot />
  </a>
</template>
