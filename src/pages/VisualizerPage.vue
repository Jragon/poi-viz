<script setup lang="ts">
import PoiVisualizer from "@/visualizer/PoiVisualizer.vue";
</script>

<template>
  <main class="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-8">
    <header class="rounded-xl border border-slate-800 bg-slate-900/70 p-6">
      <h1 class="text-2xl font-semibold tracking-tight text-slate-100">Poi Visualizer</h1>
      <p class="mt-2 text-sm text-slate-400">
        First canvas visualizer for the deterministic multi-rig engine.
      </p>
    </header>

    <section class="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 md:p-6">
      <PoiVisualizer />
    </section>
  </main>
</template>
