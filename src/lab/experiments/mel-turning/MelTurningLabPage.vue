<script setup lang="ts">
import { computed, ref } from "vue";

import MelTurningGraph from "@/lab/experiments/mel-turning/components/MelTurningGraph.vue";
import TurnLegalityMatrix from "@/lab/experiments/mel-turning/components/TurnLegalityMatrix.vue";
import AdversarialTurningProbePanel from "@/lab/experiments/mel-turning/components/AdversarialTurningProbePanel.vue";
import { evaluateAdversarialTurningProbes } from "@/lab/experiments/mel-turning/fixtures/adversarialTurningProbes";
import { VERIFIED_ONE_HAND_TURNS } from "@/lab/experiments/mel-turning/fixtures/verifiedOneHandTurns";
import { VERIFIED_TWO_HAND_TURNS } from "@/lab/experiments/mel-turning/fixtures/verifiedTwoHandTurns";
import {
  VERIFIED_TURNING_TRACES,
  getVerifiedTurningTrace
} from "@/lab/experiments/mel-turning/fixtures/verifiedTurningTraces";
import {
  TURNING_DISPLAY_FRAME_LABELS,
  type TurningDisplayFrame
} from "@/lab/experiments/mel-turning/model/turningDisplayFrame";
import {
  analyzeTurningTraceTurn,
  type TurningHandTurnEdge
} from "@/lab/experiments/mel-turning/model/turnEdgeAnalysis";
import { buildTurnLegalityMatrix } from "@/lab/experiments/mel-turning/model/turnLegalityMatrix";
import type { TurningLaneId, TurningNode } from "@/lab/experiments/mel-turning/model/turningTypes";

const selectedTraceId = ref(VERIFIED_TURNING_TRACES[0]?.id ?? "");
const selectedTrace = computed(() => getVerifiedTurningTrace(selectedTraceId.value));
const selectedTurnAnalysis = computed(() => analyzeTurningTraceTurn(selectedTrace.value));
const legalityMatrix = buildTurnLegalityMatrix([
  ...VERIFIED_ONE_HAND_TURNS,
  ...VERIFIED_TWO_HAND_TURNS
]);
const adversarialProbeResults = evaluateAdversarialTurningProbes();
const selectedMobileFrame = ref<TurningDisplayFrame>("body-relative");
const displayFrames: readonly TurningDisplayFrame[] = [
  "body-relative",
  "observer-relative"
] as const;

const laneCode: Readonly<Record<TurningLaneId, string>> = {
  "left-high": "LH",
  "left-low": "L",
  center: "C",
  "right-low": "R",
  "right-high": "RH"
};

function nodeLabel(node: TurningNode): string {
  return `${laneCode[node.laneId]} ${node.planeSide.toUpperCase()} ${node.phase}`;
}

function sideMotionLabel(handEdge: TurningHandTurnEdge): string {
  const motion = handEdge.sideMotion;
  if (motion.kind === "hold") return `hold ${motion.side.toUpperCase()}`;
  return `cross ${motion.fromSide.toUpperCase()}→${motion.toSide.toUpperCase()}`;
}

function midpointArrow(handEdge: TurningHandTurnEdge): string {
  return handEdge.midpointPoiDirection === "left" ? "←" : "→";
}
</script>

<template>
  <main class="mx-auto grid min-h-screen w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 md:py-12">
    <header class="grid gap-3">
      <div class="flex flex-wrap items-center gap-3">
        <p class="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
          Mel Turning Lab
        </p>
        <span
          class="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300"
        >
          Verified fixtures
        </span>
      </div>
      <h1 class="text-3xl font-semibold text-slate-100">Shared body turns over beat graphs</h1>
      <p class="max-w-4xl text-sm leading-6 text-slate-400">
        This experiment keeps Mel’s five body-relative lane columns and uninterrupted poi timing,
        then projects the same trace into body-relative and observer-relative frames. Phase chevrons
        are derived through Mel’s existing beat-graph rules; the turning model and renderer remain
        isolated from the original body-tracing experiment.
      </p>
    </header>

    <section class="grid gap-3">
      <h2 class="text-sm font-semibold text-slate-200">Choose a physically verified bridge</h2>
      <div class="grid gap-2 lg:grid-cols-3">
        <button
          v-for="trace in VERIFIED_TURNING_TRACES"
          :key="trace.id"
          type="button"
          class="rounded-xl border px-4 py-3 text-left transition"
          :class="
            selectedTraceId === trace.id
              ? 'border-amber-300/70 bg-amber-300/10 text-slate-100'
              : 'border-slate-700 bg-slate-900/70 text-slate-400 hover:border-slate-500 hover:text-slate-200'
          "
          @click="selectedTraceId = trace.id"
        >
          <span class="block text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
            {{ trace.timing }}
          </span>
          <span class="mt-1 block text-sm font-semibold">{{ trace.label }}</span>
        </button>
      </div>
    </section>

    <section class="grid gap-4 xl:hidden">
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="frame in displayFrames"
          :key="frame"
          type="button"
          class="rounded-lg border px-3 py-2 text-xs font-semibold transition"
          :class="
            selectedMobileFrame === frame
              ? 'border-amber-300/70 bg-amber-300/10 text-amber-200'
              : 'border-slate-700 bg-slate-900/70 text-slate-400'
          "
          @click="selectedMobileFrame = frame"
        >
          {{ TURNING_DISPLAY_FRAME_LABELS[frame] }}
        </button>
      </div>
      <MelTurningGraph :trace="selectedTrace" :frame="selectedMobileFrame" />
    </section>

    <section class="hidden items-start gap-5 xl:grid xl:grid-cols-2">
      <MelTurningGraph :trace="selectedTrace" frame="body-relative" />
      <MelTurningGraph :trace="selectedTrace" frame="observer-relative" />
    </section>

    <section
      class="grid gap-4 rounded-2xl border border-slate-700/80 bg-slate-950/75 p-5"
      data-turn-edge-analysis
    >
      <header class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Shared transition
          </p>
          <h2 class="mt-1 text-base font-semibold text-slate-100">Turn-edge contract</h2>
        </div>
        <div class="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.14em]">
          <span
            class="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-emerald-300"
          >
            Contract {{ selectedTurnAnalysis.contractStatus }}
          </span>
          <span
            class="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-cyan-300"
          >
            Physical {{ selectedTurnAnalysis.physicalStatus }}
          </span>
        </div>
      </header>

      <template v-if="selectedTurnAnalysis.edge">
        <p class="text-xs text-slate-400">
          Shared t{{ selectedTurnAnalysis.edge.sourceStep }} → t{{
            selectedTurnAnalysis.edge.targetStep
          }}
          · turn {{ selectedTurnAnalysis.edge.event.direction }} ·
          {{ selectedTurnAnalysis.edge.crossingCount }}
          {{ selectedTurnAnalysis.edge.crossingCount === 1 ? "crossing" : "crossings" }}
        </p>

        <div class="grid gap-3 md:grid-cols-2">
          <article
            v-for="handEdge in selectedTurnAnalysis.edge.hands"
            :key="handEdge.hand"
            class="rounded-xl border border-slate-800 bg-slate-900/70 p-4"
          >
            <div class="flex items-center justify-between gap-3">
              <h3
                class="text-xs font-semibold uppercase tracking-[0.16em]"
                :class="handEdge.hand === 'left' ? 'text-cyan-300' : 'text-pink-300'"
              >
                {{ handEdge.hand }} hand
              </h3>
              <span class="text-xs font-medium text-slate-300">
                {{ sideMotionLabel(handEdge) }}
              </span>
            </div>
            <p class="mt-3 font-mono text-xs text-slate-400">
              {{ nodeLabel(handEdge.from) }} → {{ nodeLabel(handEdge.to) }}
            </p>
            <p class="mt-2 text-xs text-slate-500">
              Midpoint poi {{ midpointArrow(handEdge) }} · {{ handEdge.poiDirection }}
            </p>
          </article>
        </div>
      </template>

      <ul v-else class="grid gap-2 text-xs text-rose-300">
        <li v-for="diagnostic in selectedTurnAnalysis.diagnostics" :key="diagnostic.code">
          {{ diagnostic.message }}
        </li>
      </ul>

      <p class="border-t border-slate-800 pt-3 text-xs leading-5 text-slate-500">
        This proves the shared timing and classifies each hand’s hold/cross mechanism. Physical
        status currently comes from the verified fixture; gate and anatomical rules are not yet
        applied to unverified candidates.
      </p>
    </section>

    <TurnLegalityMatrix :rows="legalityMatrix" />

    <AdversarialTurningProbePanel :results="adversarialProbeResults" />

    <aside
      class="grid gap-4 rounded-2xl border border-slate-700/80 bg-slate-900/70 p-5 lg:grid-cols-3"
    >
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Current bridge
        </p>
        <h2 class="mt-2 text-base font-semibold text-slate-100">{{ selectedTrace.label }}</h2>
        <p class="mt-2 text-sm leading-6 text-slate-400">{{ selectedTrace.summary }}</p>
      </div>

      <div
        class="grid gap-2 border-t border-slate-800 pt-4 text-xs leading-5 text-slate-400 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"
      >
        <p>
          <span class="font-semibold text-slate-200">Chevron:</span>
          poi points up or down; it sits between the node and the A/B letter.
        </p>
        <p>
          <span class="font-semibold text-slate-200">a / b:</span>
          observer-fixed plane side; it does not swap when the performer turns.
        </p>
        <p>
          <span class="font-semibold text-slate-200">0° / 180°:</span>
          body facing before and after the shared half-beat turn.
        </p>
      </div>

      <div class="border-t border-slate-800 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
        <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Source</p>
        <code class="mt-2 block break-words text-[11px] leading-5 text-slate-400">
          {{ selectedTrace.source }}
        </code>
      </div>
    </aside>
  </main>
</template>
