<script setup lang="ts">
import { computed, useSlots } from "vue";

import { assertValidLabFigureId, type LabFigureWidth } from "@/lab/components/figures/figureTypes";

const props = withDefaults(
  defineProps<{
    id: string;
    width?: LabFigureWidth;
  }>(),
  { width: "prose" }
);

const slots = useSlots();
const figureId = computed(() => assertValidLabFigureId(props.id));
const titleId = computed(() => `${figureId.value}-title`);
const captionId = computed(() => `${figureId.value}-caption`);
const hasTitle = computed(() => Boolean(slots.title));
const hasCaption = computed(() => Boolean(slots.caption));
</script>

<template>
  <figure
    :id="figureId"
    class="lab-figure"
    :class="`lab-figure--${props.width}`"
    tabindex="-1"
    :aria-labelledby="hasTitle ? titleId : undefined"
    :aria-describedby="hasCaption ? captionId : undefined"
  >
    <header v-if="hasTitle" class="lab-figure__header">
      <h3 :id="titleId" class="lab-figure__title">
        <slot name="title" />
      </h3>
    </header>

    <div class="lab-figure__content">
      <slot />
    </div>

    <figcaption v-if="hasCaption" :id="captionId" class="lab-figure__caption">
      <slot name="caption" />
    </figcaption>
  </figure>
</template>
