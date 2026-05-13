import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  decodeBeatGraphFromUrlParams,
  encodeBeatGraphToUrlParams
} from "@/lab/experiments/mel-body-tracing/beat-graph/beatGraphUrlCodec";
import type { PoiBeatGraph } from "@/lab/experiments/mel-body-tracing/beat-graph/types";

function firstQueryValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return firstQueryValue(value[0]);
  return undefined;
}

function graphEquals(left: PoiBeatGraph, right: PoiBeatGraph): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function queryForGraph(graph: PoiBeatGraph, defaultGraph: PoiBeatGraph): Record<string, string> {
  if (graphEquals(graph, defaultGraph)) return {};

  const params = encodeBeatGraphToUrlParams(graph);
  if (!params) {
    console.warn("Beat graph URL codec only supports one left-hand and one right-hand track");
    return {};
  }

  return { ...params };
}

function normalizeBeatGraphQuery(query: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of ["s", "lt", "rt"] as const) {
    const value = firstQueryValue(query[key]);
    if (value !== undefined) result[key] = value;
  }
  return result;
}

function queriesEqual(left: Record<string, string>, right: Record<string, string>): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function useBeatGraphUrlState(createDefaultGraph: () => PoiBeatGraph) {
  const route = useRoute();
  const router = useRouter();
  const defaultGraph = createDefaultGraph();
  const graph = ref<PoiBeatGraph>(defaultGraph);
  let syncingFromRoute = false;

  watch(
    () => route.query,
    (query) => {
      const hasGraphParams =
        query.s !== undefined || query.lt !== undefined || query.rt !== undefined;
      if (!hasGraphParams) {
        syncingFromRoute = true;
        graph.value = defaultGraph;
        syncingFromRoute = false;
        return;
      }

      const decoded = decodeBeatGraphFromUrlParams({
        s: firstQueryValue(query.s) ?? null,
        lt: firstQueryValue(query.lt) ?? null,
        rt: firstQueryValue(query.rt) ?? null
      });

      if (!decoded.ok) {
        console.warn(decoded.reason);
        syncingFromRoute = true;
        graph.value = defaultGraph;
        syncingFromRoute = false;
        return;
      }

      syncingFromRoute = true;
      graph.value = decoded.graph;
      syncingFromRoute = false;
    },
    { immediate: true }
  );

  watch(
    graph,
    (nextGraph) => {
      if (syncingFromRoute) return;

      const nextQuery = queryForGraph(nextGraph, defaultGraph);
      const currentQuery = normalizeBeatGraphQuery(route.query);
      if (queriesEqual(nextQuery, currentQuery)) return;

      void router.replace({ query: nextQuery });
    },
    { deep: true }
  );

  return { graph };
}
