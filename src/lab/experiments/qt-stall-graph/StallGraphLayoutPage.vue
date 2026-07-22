<script setup lang="ts">
import { computed, ref } from "vue";

import { decodeStallPattern } from "@/lab/experiments/qt-stall-graph/stallPatternCodec";
import StallPatternGraph from "@/lab/experiments/qt-stall-graph/StallPatternGraph.vue";
import StallPatternGraphScroller from "@/lab/experiments/qt-stall-graph/StallPatternGraphScroller.vue";

const SHORT_CODEC = "q1.4.URDL.RDLU";
const LONG_CODEC = `q1.24.${"URDL".repeat(6)}.${"RDLU".repeat(6)}`;
const DRAFT_CODEC = "q1.12.U_R_D_L_F_B_.R_D_L_U_B_F_";

const codec = ref(LONG_CODEC);
const decoded = computed(() => decodeStallPattern(codec.value));
const shortDecoded = decodeStallPattern(SHORT_CODEC);
if (!shortDecoded.ok) throw new Error(shortDecoded.error.message);
const shortDraft = shortDecoded.draft;

const presets = [
  { label: "4 beats", codec: SHORT_CODEC },
  { label: "24 beats", codec: LONG_CODEC },
  { label: "Draft gaps", codec: DRAFT_CODEC }
] as const;
</script>

<template>
  <main class="min-h-screen bg-transparent px-5 py-8 text-ui-text md:px-8 md:py-10">
    <section class="mx-auto grid min-w-0 max-w-7xl gap-6">
      <header class="min-w-0 max-w-3xl">
        <p class="text-xs uppercase tracking-[0.2em] text-cyan-400">Quarter-time stall graph</p>
        <h1 class="mt-2 text-3xl font-semibold text-slate-50">Layout Playground</h1>
        <p class="mt-3 text-sm leading-6 text-slate-400">
          Compare continuous, fitted, horizontal and vertical renderings. Every panel below uses the
          canonical codec model.
        </p>
      </header>

      <section class="min-w-0 rounded-lg border border-ui-border-subtle bg-slate-900/60 p-4">
        <label
          for="stall-layout-codec"
          class="text-xs uppercase tracking-[0.14em] text-ui-text-muted"
        >
          Pattern codec
        </label>
        <input
          id="stall-layout-codec"
          v-model="codec"
          type="text"
          spellcheck="false"
          class="mt-2 w-full rounded-md border border-ui-border-strong bg-ui-input px-3 py-2 font-mono text-sm text-ui-text-secondary transition focus:border-cyan-400"
        />
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="preset in presets"
            :key="preset.label"
            type="button"
            class="rounded-md border border-ui-border-strong bg-ui-surface px-3 py-1.5 text-xs text-ui-text-secondary transition hover:border-cyan-400 hover:bg-ui-surface-raised hover:text-cyan-100"
            @click="codec = preset.codec"
          >
            {{ preset.label }}
          </button>
        </div>
        <p v-if="!decoded.ok" class="mt-3 font-mono text-xs text-red-300">
          {{ decoded.error.code }} — {{ decoded.error.message }}
        </p>
      </section>

      <section class="grid min-w-0 gap-4 lg:grid-cols-2">
        <article class="min-w-0 rounded-lg border border-ui-border-subtle bg-slate-900/50 p-4">
          <p class="text-xs uppercase tracking-[0.14em] text-ui-text-muted">Fixed reference</p>
          <h2 class="mt-1 text-sm font-semibold text-slate-200">Four beats · 260px card</h2>
          <div
            class="mt-4 w-[260px] max-w-full rounded-md border border-ui-border-subtle bg-slate-950 p-3"
          >
            <StallPatternGraph :draft="shortDraft" orientation="horizontal" density="compact" />
          </div>
        </article>

        <article class="min-w-0 rounded-lg border border-ui-border-subtle bg-slate-900/50 p-4">
          <p class="text-xs uppercase tracking-[0.14em] text-ui-text-muted">Overview</p>
          <h2 class="mt-1 text-sm font-semibold text-slate-200">Fit the entire pattern · 260px</h2>
          <div
            v-if="decoded.ok"
            class="mt-4 w-[260px] max-w-full rounded-md border border-ui-border-subtle bg-slate-950 p-3"
          >
            <StallPatternGraph
              :draft="decoded.draft"
              orientation="horizontal"
              density="thumbnail"
            />
          </div>
        </article>
      </section>

      <article class="min-w-0 rounded-lg border border-ui-border-subtle bg-slate-900/50 p-4">
        <p class="text-xs uppercase tracking-[0.14em] text-ui-text-muted">Editor candidate</p>
        <h2 class="mt-1 text-sm font-semibold text-slate-200">
          Continuous horizontal timeline · scrollable
        </h2>
        <p class="mt-2 text-xs text-ui-text-muted">
          Cardinal labels remain fixed while the beat timeline scrolls.
        </p>
        <StallPatternGraphScroller
          v-if="decoded.ok"
          class="mt-4"
          :draft="decoded.draft"
          density="editor"
          :active-beat="Math.min(6, decoded.draft.beatCount - 1)"
        />
      </article>

      <section class="grid min-w-0 items-start gap-4">
        <article class="min-w-0 rounded-lg border border-ui-border-subtle bg-slate-900/50 p-4">
          <p class="text-xs uppercase tracking-[0.14em] text-ui-text-muted">Optional orientation</p>
          <h2 class="mt-1 text-sm font-semibold text-slate-200">Vertical · intrinsic thumbnail</h2>
          <div
            v-if="decoded.ok"
            class="mt-4 max-h-[34rem] overflow-y-auto rounded-md border border-ui-border-subtle bg-slate-950 p-3"
          >
            <StallPatternGraph
              :draft="decoded.draft"
              orientation="vertical"
              density="thumbnail"
              :fit-to-container="false"
            />
          </div>
        </article>
      </section>
    </section>
  </main>
</template>
