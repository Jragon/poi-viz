<script setup lang="ts">
import { useSlots } from "vue";

import type { LabFigureLayout } from "@/lab/components/figures/figureTypes";

const props = defineProps<{
  layout: LabFigureLayout;
}>();

const slots = useSlots();
</script>

<template>
  <div class="lab-figure-grid" :class="`lab-figure-grid--${props.layout}`">
    <template v-if="props.layout === 'main-with-inset'">
      <div v-if="slots.main" class="lab-figure-grid__main">
        <slot name="main" />
      </div>
      <div v-if="slots.inset" class="lab-figure-grid__inset">
        <slot name="inset" />
      </div>
    </template>
    <slot v-else />
  </div>
</template>
