<script setup lang="ts">
import type { AuthoredDocumentEntry } from "@/authoring/types";

const props = defineProps<{
  documents: AuthoredDocumentEntry[];
  selectedId: string | null;
}>();

const emit = defineEmits<{
  select: [id: string];
}>();
</script>

<template>
  <div
    class="grid gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300"
  >
    <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Document</p>
    <select
      class="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
      :value="props.selectedId ?? ''"
      @change="emit('select', ($event.target as HTMLSelectElement).value)"
    >
      <option v-for="entry in props.documents" :key="entry.id" :value="entry.id">
        {{ entry.document.name }}
      </option>
    </select>
    <p
      v-if="props.documents.find((e) => e.id === props.selectedId)?.document.description"
      class="text-xs text-slate-500"
    >
      {{ props.documents.find((e) => e.id === props.selectedId)?.document.description }}
    </p>
  </div>
</template>
