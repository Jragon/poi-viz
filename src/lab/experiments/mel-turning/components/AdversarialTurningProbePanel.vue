<script setup lang="ts">
import type { AdversarialTurningProbeResult } from "@/lab/experiments/mel-turning/fixtures/adversarialTurningProbes";

defineProps<{
  results: readonly AdversarialTurningProbeResult[];
}>();

function outcome(result: AdversarialTurningProbeResult): string {
  if (result.analysis.contractStatus === "invalid") return "Rejected structurally";
  return "Survives · unresolved";
}
</script>

<template>
  <section
    class="grid gap-4 rounded-2xl border border-slate-700/80 bg-slate-950/75 p-5"
    data-adversarial-turning-probes
  >
    <header>
      <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-300">
        Adversarial probes
      </p>
      <h2 class="mt-1 text-base font-semibold text-slate-100">Try to break the turn contract</h2>
      <p class="mt-2 max-w-4xl text-xs leading-5 text-slate-500">
        These are deterministic mutations of verified traces. Every mutation is stripped of
        verified status before analysis.
      </p>
    </header>

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="result in results"
        :key="result.probe.id"
        class="rounded-xl border border-slate-800 bg-slate-900/70 p-4"
        :data-adversarial-probe="result.probe.id"
      >
        <div class="flex items-start justify-between gap-3">
          <h3 class="text-xs font-semibold text-slate-200">{{ result.probe.label }}</h3>
          <span
            class="whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em]"
            :class="
              result.analysis.contractStatus === 'invalid'
                ? 'border-rose-400/25 bg-rose-400/10 text-rose-300'
                : 'border-amber-400/25 bg-amber-400/10 text-amber-300'
            "
          >
            {{ outcome(result) }}
          </span>
        </div>
        <p class="mt-2 text-xs leading-5 text-slate-400">{{ result.probe.mutation }}</p>
        <p class="mt-2 border-t border-slate-800 pt-2 text-[11px] leading-5 text-slate-500">
          {{ result.probe.lesson }}
        </p>
        <code
          v-if="result.analysis.diagnostics.length > 0"
          class="mt-2 block text-[10px] text-rose-300"
        >
          {{ result.analysis.diagnostics.map((diagnostic) => diagnostic.code).join(", ") }}
        </code>
      </article>
    </div>
  </section>
</template>
