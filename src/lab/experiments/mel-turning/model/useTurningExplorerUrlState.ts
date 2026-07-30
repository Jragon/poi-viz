import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import type { TurningReelConfig } from "@/lab/experiments/mel-turning/adapter/melBeatGraphAdapter";
import {
  parseTurningExplorerState,
  serializeTurningExplorerState
} from "@/lab/experiments/mel-turning/model/turningExplorerState";
import type { BodyTurnDirection } from "@/lab/experiments/mel-turning/model/turningTypes";

function normalizeQuery(query: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(query).flatMap(([key, value]) => {
      if (typeof value === "string") return [[key, value]];
      if (Array.isArray(value) && typeof value[0] === "string") return [[key, value[0]]];
      return [];
    })
  );
}

function queriesEqual(left: Record<string, string>, right: Record<string, string>): boolean {
  return (
    JSON.stringify(Object.entries(left).sort()) === JSON.stringify(Object.entries(right).sort())
  );
}

export function useTurningExplorerUrlState() {
  const route = useRoute();
  const router = useRouter();
  const initial = parseTurningExplorerState(route.query);
  const source = ref<TurningReelConfig>(initial.source);
  const target = ref<TurningReelConfig>(initial.target);
  const turnDirection = ref<BodyTurnDirection>(initial.turnDirection);

  function replaceQueryIfNeeded(): void {
    const next = serializeTurningExplorerState({
      source: source.value,
      target: target.value,
      turnDirection: turnDirection.value
    });
    if (queriesEqual(next, normalizeQuery(route.query))) return;
    void router.replace({ query: next });
  }

  watch(
    () => route.query,
    (query) => {
      const next = parseTurningExplorerState(query);
      source.value = next.source;
      target.value = next.target;
      turnDirection.value = next.turnDirection;
      replaceQueryIfNeeded();
    },
    { immediate: true }
  );
  watch([source, target, turnDirection], replaceQueryIfNeeded, { deep: true });

  return { source, target, turnDirection };
}
