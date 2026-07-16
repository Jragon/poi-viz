<script setup lang="ts">
const props = defineProps<{
  label: string;
  title?: string;
}>();
</script>

<template>
  <div
    class="lab-figure-panel"
    role="group"
    :aria-label="props.title ? `${props.label}: ${props.title}` : props.label"
  >
    <header class="lab-figure-panel__header">
      <span class="lab-figure-panel__label">{{ props.label }}</span>
      <h4 v-if="props.title" class="lab-figure-panel__title">{{ props.title }}</h4>
    </header>
    <div class="lab-figure-panel__content">
      <slot />
    </div>
  </div>
</template>
