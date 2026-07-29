<script setup lang="ts">
defineOptions({ inheritAttrs: false });

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

const props = defineProps<{
  modelValue: string | number;
  options: readonly SelectOption[];
}>();

const emit = defineEmits<{
  (event: "update:modelValue", value: string | number): void;
}>();

function onChange(event: Event) {
  const selectedIndex = (event.target as HTMLSelectElement).selectedIndex;
  const option = props.options[selectedIndex];
  if (option) {
    emit("update:modelValue", option.value);
  }
}
</script>

<template>
  <select v-bind="$attrs" :value="modelValue" @change="onChange">
    <option
      v-for="option in options"
      :key="`${typeof option.value}:${option.value}`"
      :value="option.value"
      :disabled="option.disabled"
    >
      {{ option.label }}
    </option>
  </select>
</template>
