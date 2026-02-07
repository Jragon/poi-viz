<script setup lang="ts">
import { createDefaultState } from "@/state/defaults";
import { PRESET_CATALOG } from "@/state/presets";

const state = createDefaultState();
</script>

<template>
  <main class="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 p-6 text-zinc-100">
    <header class="space-y-2">
      <h1 class="text-3xl font-semibold tracking-tight">Poi Phase Visualiser</h1>
      <p class="text-sm text-zinc-400">Phase 1/2 scaffold: toolchain, typed state model, defaults, and presets.</p>
    </header>

    <section class="rounded border border-zinc-800 bg-zinc-950/70 p-4">
      <h2 class="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-400">State Snapshot</h2>
      <pre class="overflow-auto text-xs leading-5 text-zinc-300">{{ JSON.stringify(state, null, 2) }}</pre>
    </section>

    <section class="rounded border border-zinc-800 bg-zinc-950/70 p-4">
      <h2 class="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-400">Presets</h2>
      <ul class="grid gap-2 text-sm text-zinc-300 md:grid-cols-2">
        <li v-for="preset in PRESET_CATALOG" :key="preset.id">{{ preset.label }} ({{ preset.id }})</li>
      </ul>
    </section>
  </main>
</template>

