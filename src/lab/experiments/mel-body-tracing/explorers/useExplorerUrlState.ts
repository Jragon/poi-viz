import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import type { CosmoConfig } from "@/lab/experiments/mel-body-tracing/explorers/cosmoTypes";
import {
  parseExplorerState,
  serializeExplorerState,
  type BodyTracingExplorerTab
} from "@/lab/experiments/mel-body-tracing/explorers/explorerUrlCodec";
import type { ReelConfig } from "@/lab/experiments/mel-body-tracing/explorers/reelTypes";
import type { WrapConfig } from "@/lab/experiments/mel-body-tracing/explorers/wrapTypes";

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
  const leftEntries = Object.entries(left).sort(([a], [b]) => a.localeCompare(b));
  const rightEntries = Object.entries(right).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(leftEntries) === JSON.stringify(rightEntries);
}

export function useExplorerUrlState() {
  const route = useRoute();
  const router = useRouter();

  const initialState = parseExplorerState(route.query);
  const activeTab = ref<BodyTracingExplorerTab>(initialState.tab);
  const reelConfig = ref<ReelConfig>(initialState.reel);
  const wrapConfig = ref<WrapConfig>(initialState.wrap);
  const cosmoConfig = ref<CosmoConfig>(initialState.cosmo);

  function currentState() {
    return {
      tab: activeTab.value,
      reel: reelConfig.value,
      wrap: wrapConfig.value,
      cosmo: cosmoConfig.value
    };
  }

  function replaceQueryIfNeeded(): void {
    const nextQuery = serializeExplorerState(currentState());
    const currentQuery = normalizeQuery(route.query);
    if (queriesEqual(nextQuery, currentQuery)) return;

    void router.replace({ query: nextQuery });
  }

  watch(
    () => route.query,
    (query) => {
      const nextState = parseExplorerState(query);
      activeTab.value = nextState.tab;
      reelConfig.value = nextState.reel;
      wrapConfig.value = nextState.wrap;
      cosmoConfig.value = nextState.cosmo;
      replaceQueryIfNeeded();
    },
    { immediate: true }
  );

  watch([activeTab, reelConfig, wrapConfig, cosmoConfig], replaceQueryIfNeeded, { deep: true });

  return {
    activeTab,
    reelConfig,
    wrapConfig,
    cosmoConfig
  };
}
