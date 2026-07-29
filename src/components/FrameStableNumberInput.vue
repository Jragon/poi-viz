<script setup lang="ts">
import { ref, watch } from "vue";

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  modelValue: number;
}>();

const emit = defineEmits<{
  (event: "update:modelValue", value: number): void;
}>();

const draft = ref(String(props.modelValue));
const isEditing = ref(false);
const lastEmittedValue = ref<number | null>(null);

watch(
  () => props.modelValue,
  (next) => {
    if (isEditing.value && lastEmittedValue.value !== null && next === lastEmittedValue.value) {
      lastEmittedValue.value = null;
      return;
    }

    draft.value = String(next);
    lastEmittedValue.value = null;
  }
);

function onFocus() {
  isEditing.value = true;
}

function onInput(event: Event) {
  const input = event.target as HTMLInputElement;
  draft.value = input.value;
  if (Number.isFinite(input.valueAsNumber)) {
    lastEmittedValue.value = input.valueAsNumber;
    emit("update:modelValue", input.valueAsNumber);
  }
}

function onBlur() {
  isEditing.value = false;
  lastEmittedValue.value = null;
  if (draft.value.trim() === "" || !Number.isFinite(Number(draft.value))) {
    draft.value = String(props.modelValue);
  }
}
</script>

<template>
  <input
    v-bind="$attrs"
    :value="draft"
    type="number"
    @focus="onFocus"
    @input="onInput"
    @blur="onBlur"
  />
</template>
