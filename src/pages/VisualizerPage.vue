<script setup lang="ts">
import { useAuthoringLibrary } from "@/authoring/useAuthoringLibrary";
import DocumentSelector from "@/pages/components/DocumentSelector.vue";
import { useVisualizerDocumentSource } from "@/pages/useVisualizerDocumentSource";
import PoiVisualizer from "@/visualizer/PoiVisualizer.vue";

const library = useAuthoringLibrary();
const source = useVisualizerDocumentSource(library);
</script>

<template>
  <main class="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-8">
    <template v-if="source.sequence.value">
      <DocumentSelector
        :documents="source.documents.value"
        :selected-id="source.selectedId.value"
        @select="source.select($event)"
      />

      <section class="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 md:p-6">
        <PoiVisualizer :sequence="source.sequence.value" />
      </section>
    </template>

    <section
      v-else
      class="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-sm text-slate-400"
    >
      <p>No saved documents.</p>
      <router-link
        to="/authoring"
        class="mt-3 inline-block rounded-xl bg-emerald-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-300"
      >
        Create one in the editor
      </router-link>
    </section>
  </main>
</template>
