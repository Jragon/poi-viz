<script setup lang="ts">
import type {
  TurnLegalityHandEntry,
  TurnLegalityMatrixRow
} from "@/lab/experiments/mel-turning/model/turnLegalityMatrix";

defineProps<{
  rows: readonly TurnLegalityMatrixRow[];
}>();

const laneCode = {
  "left-high": "LH",
  "left-low": "L",
  center: "C",
  "right-low": "R",
  "right-high": "RH"
} as const;

function arrow(direction: TurnLegalityHandEntry["midpointPoiDirection"]): string {
  return direction === "left" ? "←" : "→";
}

function location(
  lane: TurnLegalityHandEntry["fromLane"],
  placement: TurnLegalityHandEntry["fromHandPlacement"],
  side: TurnLegalityHandEntry["fromPlaneSide"]
): string {
  return `${laneCode[lane]}${placement === "behind-body" ? "b" : ""} ${side.toUpperCase()}`;
}

function handSummary(hand: TurnLegalityHandEntry): string {
  const from = location(hand.fromLane, hand.fromHandPlacement, hand.fromPlaneSide);
  const to = location(hand.toLane, hand.toHandPlacement, hand.toPlaneSide);
  const mechanism =
    hand.mechanism === "hold"
      ? `hold ${hand.fromPlaneSide.toUpperCase()}`
      : `cross ${hand.fromPlaneSide.toUpperCase()}→${hand.toPlaneSide.toUpperCase()} ${hand.gate ?? ""} gate`;
  const preparation = hand.preparedBeforeTurn ? " · prep" : "";
  return `${from} → ${to} · ${mechanism} · ${arrow(hand.midpointPoiDirection)}${preparation}`;
}

function handEntry(row: TurnLegalityMatrixRow, hand: "left" | "right") {
  return row.hands.find((entry) => entry.hand === hand);
}
</script>

<template>
  <details
    class="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/75"
    data-turn-legality-matrix
  >
    <summary
      class="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-slate-200 marker:hidden"
    >
      Verified legality matrix · {{ rows.length }} turns
      <span class="ml-2 text-xs font-normal text-slate-500">
        Derived from normalized fixtures
      </span>
    </summary>

    <div class="overflow-x-auto border-t border-slate-800">
      <table class="min-w-[1180px] border-collapse text-left text-[11px] leading-5">
        <thead class="bg-slate-900/90 uppercase tracking-[0.12em] text-slate-500">
          <tr>
            <th class="px-3 py-2 font-semibold">Case</th>
            <th class="px-3 py-2 font-semibold">Form</th>
            <th class="px-3 py-2 font-semibold">Turn</th>
            <th class="px-3 py-2 font-semibold">Planes</th>
            <th class="px-3 py-2 font-semibold">Left hand</th>
            <th class="px-3 py-2 font-semibold">Right hand</th>
            <th class="px-3 py-2 font-semibold">Evidence</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/80 text-slate-400">
          <tr v-for="row in rows" :key="row.fixtureId" :data-legality-row="row.fixtureId">
            <td class="max-w-64 px-3 py-2 align-top">
              <span class="font-semibold text-slate-200">{{ row.label }}</span>
              <span class="mt-0.5 block font-mono text-[10px] text-slate-600">
                {{ row.fixtureId }}
              </span>
            </td>
            <td class="whitespace-nowrap px-3 py-2 align-top">
              {{ row.timing }} · {{ row.reelPosition }}<br />
              {{ row.patternBefore }} → {{ row.patternAfter }}
            </td>
            <td class="whitespace-nowrap px-3 py-2 align-top">
              {{ row.turnDirection }} · t{{ row.turnAfterStep }}→t{{
                row.turnAfterStep + 1
              }}
            </td>
            <td class="whitespace-nowrap px-3 py-2 align-top font-mono">
              {{ row.planeConfigurationBefore }}→{{ row.planeConfigurationAfter }}
              · {{ row.crossingCount }}x
            </td>
            <td class="px-3 py-2 align-top font-mono">
              <span v-if="handEntry(row, 'left')">
                {{ handSummary(handEntry(row, "left")!) }}
              </span>
              <span v-else class="text-slate-700">—</span>
            </td>
            <td class="px-3 py-2 align-top font-mono">
              <span v-if="handEntry(row, 'right')">
                {{ handSummary(handEntry(row, "right")!) }}
              </span>
              <span v-else class="text-slate-700">—</span>
            </td>
            <td class="whitespace-nowrap px-3 py-2 align-top text-emerald-300">
              {{ row.verificationStatus }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="border-t border-slate-800 px-5 py-3 text-xs leading-5 text-slate-500">
      “Prep” means the turn-source node differs from the same phase one four-half-beat reel cycle
      earlier. Cross gates are named by the shared body-turn direction. This matrix records positive
      verified evidence; absence from it does not prove a transition impossible.
    </p>
  </details>
</template>
