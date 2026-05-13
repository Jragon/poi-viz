import { computed, ref } from "vue";

import {
  compilePoiBeatGraph,
  DEFAULT_POI_BEAT_COMPILER_OPTIONS
} from "@/lab/experiments/mel-body-tracing/beat-graph/compileBeatGraph";
import { filterPoiBeatGraphTracks } from "@/lab/experiments/mel-body-tracing/beat-graph/graphHelpers";
import type { PoiBeatGraph } from "@/lab/experiments/mel-body-tracing/beat-graph/types";
import {
  buildCosmoBeatGraph,
  DEFAULT_COSMO_CONFIG
} from "@/lab/experiments/mel-body-tracing/explorers/cosmoRules";
import type {
  CosmoConfig,
  CosmoPositionPair
} from "@/lab/experiments/mel-body-tracing/explorers/cosmoTypes";
import type { BodyTracingExplorerTab } from "@/lab/experiments/mel-body-tracing/explorers/explorerUrlCodec";
import {
  buildReelBeatGraph,
  DEFAULT_REEL_CONFIG,
  deriveReelState,
  REEL_OFFSET_LABELS,
  REEL_POSITION_LABELS,
  resolveDirections
} from "@/lab/experiments/mel-body-tracing/explorers/reelRules";
import type { ReelConfig } from "@/lab/experiments/mel-body-tracing/explorers/reelTypes";
import {
  buildWrapBeatGraph,
  DEFAULT_WRAP_CONFIG
} from "@/lab/experiments/mel-body-tracing/explorers/wrapRules";
import type {
  WrapConfig,
  WrapPositionPair
} from "@/lab/experiments/mel-body-tracing/explorers/wrapTypes";
import type { Ref } from "vue";

interface UseExplorerBeatGraphOptions {
  readonly activeTab: Ref<BodyTracingExplorerTab>;
  readonly reelConfig: Ref<ReelConfig>;
  readonly wrapConfig: Ref<WrapConfig>;
  readonly cosmoConfig: Ref<CosmoConfig>;
}

function capitalizeLabel(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function formatPair(pair: WrapPositionPair | CosmoPositionPair): string {
  return `${REEL_POSITION_LABELS[pair.a]} -> ${REEL_POSITION_LABELS[pair.b]}`;
}

function graphForTab(
  tab: BodyTracingExplorerTab,
  reelConfig: ReelConfig,
  wrapConfig: WrapConfig,
  cosmoConfig: CosmoConfig
): PoiBeatGraph {
  if (tab === "wrap") return buildWrapBeatGraph(wrapConfig);
  if (tab === "cosmo") return buildCosmoBeatGraph(cosmoConfig);
  return buildReelBeatGraph(reelConfig);
}

export function useExplorerBeatGraph(options: UseExplorerBeatGraphOptions) {
  const visibleTrackIds = ref<string[]>(["left", "right"]);
  const compilerOptions = DEFAULT_POI_BEAT_COMPILER_OPTIONS;

  const graph = computed(() =>
    graphForTab(
      options.activeTab.value,
      options.reelConfig.value,
      options.wrapConfig.value,
      options.cosmoConfig.value
    )
  );
  const visibleGraph = computed(() => filterPoiBeatGraphTracks(graph.value, visibleTrackIds.value));
  const compiled = computed(() => compilePoiBeatGraph(visibleGraph.value, compilerOptions));

  const visualizerTitle = computed(() => `Compiled ${options.activeTab.value}`);
  const summaryLabel = computed(() => {
    if (options.activeTab.value === "wrap") {
      return `L ${formatPair(options.wrapConfig.value.left)} / R ${formatPair(options.wrapConfig.value.right)} / Offset ${options.wrapConfig.value.offset}`;
    }

    if (options.activeTab.value === "cosmo") {
      return `L ${formatPair(options.cosmoConfig.value.left)} / R ${formatPair(options.cosmoConfig.value.right)} / Offset ${options.cosmoConfig.value.offset}`;
    }

    const state = deriveReelState(options.reelConfig.value);
    const offsetName = REEL_OFFSET_LABELS[options.reelConfig.value.offset];
    return `${state.timing} ${offsetName} ${capitalizeLabel(state.patternType)}`;
  });
  const resolvedDirectionsLabel = computed(() => {
    const direction =
      options.activeTab.value === "wrap"
        ? options.wrapConfig.value.direction
        : options.activeTab.value === "cosmo"
          ? options.cosmoConfig.value.direction
          : options.reelConfig.value.direction;
    const directions = resolveDirections(direction);
    return `Left ${directions.left === "clockwise" ? "CW" : "CCW"} / Right ${directions.right === "clockwise" ? "CW" : "CCW"}`;
  });

  function toggleTrackVisibility(trackId: string): void {
    const visibleIds = new Set(visibleTrackIds.value);
    if (visibleIds.has(trackId)) {
      if (visibleIds.size <= 1) return;
      visibleIds.delete(trackId);
    } else {
      visibleIds.add(trackId);
    }

    visibleTrackIds.value = graph.value.tracks
      .map((track) => track.id)
      .filter((candidateId) => visibleIds.has(candidateId));
  }

  function resetVisibleTracks(): void {
    visibleTrackIds.value = graph.value.tracks.map((track) => track.id);
  }

  return {
    compilerOptions,
    compiled,
    graph,
    resolvedDirectionsLabel,
    summaryLabel,
    visibleGraph,
    visibleTrackIds,
    visualizerTitle,
    toggleTrackVisibility,
    resetVisibleTracks,
    defaults: {
      reel: DEFAULT_REEL_CONFIG,
      wrap: DEFAULT_WRAP_CONFIG,
      cosmo: DEFAULT_COSMO_CONFIG
    }
  };
}
