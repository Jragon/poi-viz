<script setup lang="ts">
import { computed, ref, watch } from "vue";

import {
  compileTurningTracePlayback,
  DEFAULT_TURNING_TRACE_PLAYBACK_OPTIONS,
  getTurningRootFacingDeg
} from "@/lab/experiments/mel-turning/adapter/turningTracePlayback";
import LowReelEndpointCard from "@/lab/experiments/mel-turning/components/LowReelEndpointCard.vue";
import LowReelRouteStepsTable from "@/lab/experiments/mel-turning/components/LowReelRouteStepsTable.vue";
import MelTurningGraph from "@/lab/experiments/mel-turning/components/MelTurningGraph.vue";
import TurningResearchArticle from "@/lab/experiments/mel-turning/components/TurningResearchArticle.vue";
import { buildLowReelEndpointPreviewTrace } from "@/lab/experiments/mel-turning/model/buildLowReelTurningTrace";
import {
  buildLowReelRouteProjection,
  lowReelRouteStateLocation
} from "@/lab/experiments/mel-turning/model/lowReelRouteProjection";
import {
  solveLowReelTurningRoutes,
  type LowReelRouteCycleEntry,
  type LowReelRouteSolverResult,
  type LowReelTurningRoute
} from "@/lab/experiments/mel-turning/model/lowReelRouteSolver";
import {
  constrainTurningTarget,
  type ConstrainedTurningTarget
} from "@/lab/experiments/mel-turning/model/turningEndpointCompatibility";
import { DEFAULT_TURNING_EXPLORER_STATE } from "@/lab/experiments/mel-turning/model/turningExplorerState";
import type { TurningDisplayFrame } from "@/lab/experiments/mel-turning/model/turningDisplayFrame";
import { useTurningExplorerUrlState } from "@/lab/experiments/mel-turning/model/useTurningExplorerUrlState";
import type { TurnTopologyStatus } from "@/lab/experiments/mel-turning/model/turningTypes";
import PoiCanvasViewport from "@/visualizer/PoiCanvasViewport.vue";
import type { PlaneSideDisplayBoundary } from "@/visualizer/planeSideDisplay";
import { getBodyFacingCueLabel } from "@/visualizer/renderFrame";
import {
  createVisualizerWorkspace,
  provideVisualizerWorkspace
} from "@/visualizer/visualizerWorkspace";

const { source, target, turnDirection } = useTurningExplorerUrlState();
type ExplorerView = "body-graph" | "observer-graph" | "steps-table";

const explorerView = ref<ExplorerView>("observer-graph");
const selectedRouteId = ref("");
const targetAdjustmentMessage = ref("");

const sourceModel = computed({
  get: () => source.value,
  set: (nextSource) => {
    source.value = nextSource;
    applyTargetConstraint(nextSource, target.value);
  }
});
const targetModel = computed({
  get: () => target.value,
  set: (requestedTarget) => {
    applyTargetConstraint(source.value, requestedTarget);
  }
});
const targetConstraint = computed(() => constrainTurningTarget(source.value, target.value));
const targetConstraintMessage = computed(
  () =>
    `${formatDirectionMode(target.value.direction)} is fixed by the source. Offsets ${targetConstraint.value.compatibleOffsets.join(
      " and "
    )} preserve ${targetConstraint.value.sourceTiming} timing for this ${targetConstraint.value.sourcePatternType} → ${targetConstraint.value.targetPatternType} pairing.`
);

const searchResult = computed(() =>
  solveLowReelTurningRoutes({
    source: source.value,
    target: target.value,
    turnDirection: turnDirection.value,
    options: {
      maxRoutes: 40,
      maxExtraHalfbeats: 0,
      includeUnresolved: true
    }
  })
);
const shortestRoutes = computed(() =>
  searchResult.value.routes
    .filter((route) => route.isShortest)
    .sort((left, right) => statusRank(left.modelStatus) - statusRank(right.modelStatus))
);
const selectedRoute = computed(
  () =>
    shortestRoutes.value.find((route) => route.id === selectedRouteId.value) ??
    shortestRoutes.value[0] ??
    null
);
const activeProjection = computed(() =>
  selectedRoute.value ? buildLowReelRouteProjection(searchResult.value, selectedRoute.value) : null
);
const sourcePreviewTrace = computed(() =>
  buildLowReelEndpointPreviewTrace(source.value, "Source reel preview")
);
const activeTrace = computed(() => activeProjection.value?.trace ?? sourcePreviewTrace.value);
const graphFrame = computed<TurningDisplayFrame>(() =>
  explorerView.value === "body-graph" ? "body-relative" : "observer-relative"
);
const playbackSequence = computed(() => compileTurningTracePlayback(activeTrace.value));
const planeSideDisplayBoundary = computed<PlaneSideDisplayBoundary>(() => ({
  mode: "finite",
  initialSideByRig: Object.fromEntries(
    activeTrace.value.tracks.flatMap((track) => {
      const firstNode = track.nodes[0];
      return firstNode ? [[track.id, firstNode.planeSide] as const] : [];
    })
  )
}));

watch(
  shortestRoutes,
  (routes) => {
    if (routes.some((route) => route.id === selectedRouteId.value)) return;
    selectedRouteId.value = routes[0]?.id ?? "";
  },
  { immediate: true }
);

const workspace = provideVisualizerWorkspace(
  createVisualizerWorkspace(() => playbackSequence.value, {
    autoplay: true,
    resumeOnSequenceChange: true,
    planeSideDisplayBoundary,
    transportOptions: { initialEndBehavior: "reset" },
    display: { storage: null }
  })
);
const { core, transport, display } = workspace;
const halfBeatDuration = DEFAULT_TURNING_TRACE_PLAYBACK_OPTIONS.halfBeatDuration;
const rootFacingDeg = computed(() =>
  getTurningRootFacingDeg(activeTrace.value, transport.currentTime.value, halfBeatDuration)
);
const rootFacingLabel = computed(
  () => `${Math.round(rootFacingDeg.value)}° · ${getBodyFacingCueLabel(rootFacingDeg.value)}`
);
const activeStep = computed(() => {
  const lastStep = activeTrace.value.tracks[0]?.nodes.at(-1)?.step ?? 0;
  return Math.min(Math.floor(transport.currentTime.value / halfBeatDuration), lastStep);
});
const scrubMaximum = computed(() => Math.max(transport.duration.value - 0.0001, 0));
const candidateSummary = computed(() => {
  const validCount = shortestRoutes.value.filter((route) => route.modelStatus === "valid").length;
  const unresolvedCount = shortestRoutes.value.length - validCount;
  const total = searchResult.value.shortestRouteCount;
  const materialized =
    total > shortestRoutes.value.length
      ? `${shortestRoutes.value.length} of ${total} shown`
      : `${total}`;
  return `${materialized} shortest · ${validCount} model-valid · ${unresolvedCount} unresolved`;
});
const searchStatus = computed<TurnTopologyStatus>(() => {
  if (shortestRoutes.value.length === 0) return "invalid";
  return shortestRoutes.value.some((route) => route.modelStatus === "valid")
    ? "valid"
    : "unresolved";
});

const anatomicalStyles = {
  left: { lineColor: "#22d3ee", handColor: "#67e8f9" },
  right: { lineColor: "#fb7185", handColor: "#fda4af" }
} as const;

core.session.setProjectionMode("tilted");
core.session.setProjectionYawDeg(-14);
core.session.setProjectionPitchDeg(10);
core.session.setPlaneSideDepthsWorld(0.14, 0.14);
core.session.setTrailLoopMode("off");
transport.setSpeed(1);
display.setOverlayVisibility("showBodyRig", true);
display.setOverlayVisibility("showHandTrails", false);
display.setOverlayVisibility("showHeadTrails", true);
display.setRigOverlayStyle("left", "lineColor", "#22d3ee");
display.setRigOverlayStyle("left", "handColor", "#67e8f9");
display.setRigOverlayStyle("left", "headColor", "#22d3ee");
display.setRigOverlayStyle("right", "lineColor", "#fb7185");
display.setRigOverlayStyle("right", "handColor", "#fda4af");
display.setRigOverlayStyle("right", "headColor", "#fb7185");

function statusRank(status: TurnTopologyStatus): number {
  if (status === "valid") return 0;
  if (status === "unresolved") return 1;
  return 2;
}

function statusLabel(status: TurnTopologyStatus): string {
  if (status === "valid") return "Shortest route found";
  if (status === "unresolved") return "Shortest route unresolved";
  return "No model route";
}

function statusBadgeClass(status: TurnTopologyStatus): string {
  if (status === "valid") {
    return "border-emerald-500/50 bg-emerald-950/35 text-emerald-200";
  }
  if (status === "unresolved") {
    return "border-amber-500/50 bg-amber-950/35 text-amber-200";
  }
  return "border-rose-500/50 bg-rose-950/35 text-rose-200";
}

function routeButtonClass(route: LowReelTurningRoute): string {
  if (selectedRoute.value?.id === route.id) {
    return "border-sky-300 bg-sky-950/55 text-slate-100";
  }
  return "border-ui-border-strong bg-ui-surface text-ui-text-secondary hover:border-ui-focus hover:bg-ui-surface-raised";
}

function routeStatusLabel(route: LowReelTurningRoute): string {
  if (route.evidenceStatus === "exact-route-verified") return "verified";
  return route.modelStatus === "valid" ? "model-valid" : "unresolved";
}

function cycleStepForRouteState(cycle: readonly LowReelRouteCycleEntry[], stateId: string): number {
  return cycle.find((entry) => entry.state.id === stateId)?.cycleStep ?? 0;
}

function routeRows(result: LowReelRouteSolverResult, route: LowReelTurningRoute): string {
  const sourceState = route.states[0];
  const targetState = route.states.at(-1);
  if (!sourceState || !targetState) return "Missing route boundary";
  return `Row ${cycleStepForRouteState(result.sourceCycle, sourceState.id) + 1} → row ${
    cycleStepForRouteState(result.targetCycle, targetState.id) + 1
  }`;
}

function routeShape(route: LowReelTurningRoute): string {
  return `${route.bridgeHalfbeats} halfbeat${
    route.bridgeHalfbeats === 1 ? "" : "s"
  } · ${route.preparationHalfbeats} prep + 1 turn + ${route.recoveryHalfbeats} recovery`;
}

function routeTurnMechanisms(route: LowReelTurningRoute): string {
  const turn = route.edges[route.turnEdgeIndex];
  return turn?.kind === "body-turn"
    ? `Left ${turn.leftAction} · Right ${turn.rightAction}`
    : "Missing turn edge";
}

function routeBoundaryNodes(route: LowReelTurningRoute): string {
  const sourceState = route.states[0];
  const targetState = route.states.at(-1);
  if (!sourceState || !targetState) return "Missing route boundary";
  const node = (state: typeof sourceState, hand: "left" | "right") => {
    const handState = state[hand];
    return `${lowReelRouteStateLocation(state, hand)} ${handState.planeSide} ${handState.phase}`;
  };
  return `L ${node(sourceState, "left")} → ${node(targetState, "left")} · R ${node(
    sourceState,
    "right"
  )} → ${node(targetState, "right")}`;
}

function formatDirectionMode(direction: ConstrainedTurningTarget["target"]["direction"]): string {
  if (direction.mode === "same") {
    return direction.direction === "clockwise" ? "Same · CW" : "Same · CCW";
  }
  return direction.flow === "inwards" ? "Opposite · Inwards" : "Opposite · Outwards";
}

function applyTargetConstraint(
  nextSource: ConstrainedTurningTarget["target"],
  requestedTarget: ConstrainedTurningTarget["target"]
): void {
  const constrained = constrainTurningTarget(nextSource, requestedTarget);
  const adjustments: string[] = [];

  if (constrained.directionAdjusted) {
    adjustments.push(
      `Target direction changed to ${formatDirectionMode(constrained.target.direction)}.`
    );
  }
  if (constrained.offsetAdjusted) {
    adjustments.push(
      `Offset ${requestedTarget.offset} changed to ${constrained.target.offset} to preserve ${constrained.sourceTiming} timing.`
    );
  }

  targetAdjustmentMessage.value = adjustments.join(" ");
  target.value = constrained.target;
}

function swapEndpoints(): void {
  const previousSource = source.value;
  const nextSource = target.value;
  source.value = nextSource;
  applyTargetConstraint(nextSource, previousSource);
}

function resetEndpoints(): void {
  source.value = {
    ...DEFAULT_TURNING_EXPLORER_STATE.source,
    direction: { ...DEFAULT_TURNING_EXPLORER_STATE.source.direction }
  };
  target.value = {
    ...DEFAULT_TURNING_EXPLORER_STATE.target,
    direction: { ...DEFAULT_TURNING_EXPLORER_STATE.target.direction }
  };
  targetAdjustmentMessage.value = "";
  turnDirection.value = DEFAULT_TURNING_EXPLORER_STATE.turnDirection;
}

function togglePlayback(): void {
  transport.toggle();
}

function onScrub(event: Event): void {
  transport.setCurrentTime(Number((event.target as HTMLInputElement).value));
}

function selectTableStep(step: number): void {
  transport.setCurrentTime(Math.min(step * halfBeatDuration, scrubMaximum.value));
}

function toggleRepeat(): void {
  transport.setEndBehavior(transport.endBehavior.value === "repeat" ? "reset" : "repeat");
}
</script>

<template>
  <main class="min-h-screen bg-transparent px-5 py-5 text-ui-text md:px-8 lg:py-6">
    <div class="mx-auto grid max-w-[100rem] gap-5">
      <header class="grid max-w-4xl gap-2">
        <div class="flex flex-wrap items-center gap-3">
          <p class="text-xs uppercase tracking-[0.2em] text-ui-text-muted">Mel turning</p>
          <span
            class="rounded-full border border-sky-500/40 bg-sky-950/45 px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-sky-200"
          >
            Model explorer
          </span>
        </div>
        <h1 class="text-2xl font-semibold text-slate-50">Low-Reel Turning Explorer</h1>
        <p class="text-sm leading-6 text-ui-text-secondary">
          Choose an exact source reel, then explore target hand positions using Mel’s Body Tracing
          model. Target direction is derived and only offsets that preserve the source timing stay
          available. The solver finds every materialized shortest preparation → turn → recovery
          route, then plays the selected finite trace in the existing poi visualizer.
        </p>
        <div class="flex flex-wrap gap-x-4 gap-y-2">
          <RouterLink
            :to="{ name: 'body-tracing-explorer' }"
            class="w-fit text-xs font-medium text-sky-300 underline decoration-sky-500/50 underline-offset-4 transition hover:text-sky-200"
          >
            Open the original Body Tracing Explorer
          </RouterLink>
          <RouterLink
            :to="{ name: 'mel-turning-review' }"
            class="w-fit text-xs font-medium text-violet-300 underline decoration-violet-500/50 underline-offset-4 transition hover:text-violet-200"
          >
            Open the Pattern Verifier Workbench
          </RouterLink>
        </div>
      </header>

      <section class="grid items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(30rem,1fr)]">
        <div class="grid min-w-0 gap-4">
          <div class="grid gap-4 md:grid-cols-2">
            <LowReelEndpointCard v-model="sourceModel" title="Source graph" />
            <LowReelEndpointCard
              v-model="targetModel"
              title="Target graph"
              direction-locked
              :allowed-offsets="targetConstraint.compatibleOffsets"
              :constraint-message="targetConstraintMessage"
              :adjustment-message="targetAdjustmentMessage"
            />
          </div>

          <section class="overflow-hidden rounded-lg border border-ui-border bg-ui-surface">
            <header
              class="flex flex-wrap items-center justify-between gap-3 border-b border-ui-border-subtle px-3 py-2.5"
            >
              <div>
                <p
                  class="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-ui-text-muted"
                >
                  Shared event
                </p>
                <h2 class="mt-1 text-sm font-semibold text-slate-100">Body-turn direction</h2>
              </div>
              <div class="flex gap-2">
                <button
                  type="button"
                  class="h-8 rounded-md border border-ui-border-strong bg-ui-surface px-2.5 text-xs font-medium text-ui-text-secondary transition hover:border-ui-focus hover:bg-ui-surface-raised"
                  @click="swapEndpoints"
                >
                  Swap endpoints
                </button>
                <button
                  type="button"
                  class="h-8 rounded-md border border-ui-border-strong bg-ui-surface px-2.5 text-xs font-medium text-ui-text-secondary transition hover:border-ui-focus hover:bg-ui-surface-raised"
                  @click="resetEndpoints"
                >
                  Reset
                </button>
              </div>
            </header>
            <div class="grid grid-cols-2 gap-2 p-3">
              <button
                v-for="direction in ['left', 'right'] as const"
                :key="direction"
                type="button"
                class="h-10 rounded-md border text-xs font-semibold capitalize transition"
                :class="
                  turnDirection === direction
                    ? 'border-amber-300 bg-amber-300 text-slate-950'
                    : 'border-ui-border-strong bg-ui-input text-ui-text-secondary hover:border-ui-focus hover:bg-ui-surface-raised'
                "
                :aria-pressed="turnDirection === direction"
                @click="turnDirection = direction"
              >
                Turn {{ direction }}
              </button>
            </div>
          </section>

          <section class="overflow-hidden rounded-lg border border-ui-border bg-ui-surface">
            <header
              class="flex flex-wrap items-start justify-between gap-3 border-b border-ui-border-subtle px-3 py-2.5"
            >
              <div>
                <p
                  class="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-ui-text-muted"
                >
                  Shortest route search
                </p>
                <h2 class="mt-1 text-sm font-semibold text-slate-100">Solver routes</h2>
              </div>
              <div class="text-right">
                <span
                  class="inline-flex rounded-full border px-2.5 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.12em]"
                  :class="statusBadgeClass(searchStatus)"
                >
                  {{ statusLabel(searchStatus) }}
                </span>
                <p class="mt-1 font-mono text-[0.625rem] text-ui-text-muted">
                  {{ candidateSummary }}
                </p>
              </div>
            </header>

            <div
              v-if="searchResult.diagnostics.length > 0"
              class="grid gap-2 border-b border-ui-border-subtle bg-amber-950/20 p-3"
            >
              <p
                v-for="(diagnostic, diagnosticIndex) in searchResult.diagnostics"
                :key="`${diagnostic.code}-${diagnosticIndex}`"
                class="text-xs leading-5 text-amber-100"
              >
                {{ diagnostic.message }}
              </p>
            </div>

            <div v-if="shortestRoutes.length > 0" class="grid gap-2 p-3 sm:grid-cols-2">
              <button
                v-for="(route, routeIndex) in shortestRoutes"
                :key="route.id"
                type="button"
                class="rounded-md border p-3 text-left transition"
                :class="routeButtonClass(route)"
                :aria-pressed="selectedRoute?.id === route.id"
                @click="selectedRouteId = route.id"
              >
                <span class="flex items-center justify-between gap-2">
                  <span class="font-mono text-xs font-semibold">
                    Route {{ routeIndex + 1 }} · {{ routeRows(searchResult, route) }}
                  </span>
                  <span
                    class="rounded-full border px-2 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-[0.1em]"
                    :class="statusBadgeClass(route.modelStatus)"
                  >
                    {{ routeStatusLabel(route) }}
                  </span>
                </span>
                <span class="mt-2 block text-xs font-medium">
                  {{ routeShape(route) }}
                </span>
                <span class="mt-1 block text-xs">
                  {{ routeTurnMechanisms(route) }}
                </span>
                <span class="mt-1 block font-mono text-[0.625rem] leading-4 opacity-70">
                  {{ routeBoundaryNodes(route) }}
                </span>
              </button>
            </div>
            <p
              v-if="shortestRoutes.length > 0"
              class="border-t border-ui-border-subtle px-3 py-2 text-[0.625rem] leading-4 text-ui-text-muted"
            >
              Only shortest routes are shown. Unresolved routes remain playable research hypotheses;
              their badges do not claim physical verification.
            </p>
            <p v-else class="p-4 text-xs leading-5 text-ui-text-secondary">
              No preparation/turn/recovery route is known for these exact endpoints in the current
              solver grammar. The source reel remains available while you adjust the target.
            </p>
          </section>

          <section class="grid gap-2">
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="view in [
                  { id: 'body-graph', label: 'Body-relative graph' },
                  { id: 'observer-graph', label: 'Observer-relative graph' },
                  { id: 'steps-table', label: 'Steps table' }
                ] as const"
                :key="view.id"
                type="button"
                class="h-9 rounded-md border px-3 text-xs font-semibold transition"
                :class="
                  explorerView === view.id
                    ? 'border-sky-300 bg-sky-300 text-slate-950'
                    : 'border-ui-border-strong bg-ui-surface text-ui-text-secondary hover:border-ui-focus hover:bg-ui-surface-raised'
                "
                @click="explorerView = view.id"
              >
                {{ view.label }}
              </button>
            </div>
            <LowReelRouteStepsTable
              v-if="explorerView === 'steps-table' && activeProjection"
              :steps="activeProjection.steps"
              :active-step="activeStep"
              @select-step="selectTableStep"
            />
            <p
              v-else-if="explorerView === 'steps-table'"
              class="rounded-2xl border border-slate-700/80 bg-slate-950/75 p-5 text-xs leading-5 text-slate-400"
            >
              Select endpoints with a solver route to inspect its complete step table.
            </p>
            <MelTurningGraph
              v-else
              :trace="activeTrace"
              :frame="graphFrame"
              :active-step="activeStep"
            />
          </section>
        </div>

        <aside class="grid min-w-0 gap-3 xl:sticky xl:top-4">
          <section class="overflow-hidden rounded-lg border border-ui-border bg-ui-surface-raised">
            <header
              class="flex flex-wrap items-start justify-between gap-3 border-b border-ui-border-subtle px-3 py-2.5"
            >
              <div>
                <p
                  class="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-ui-text-muted"
                >
                  Existing visualizer · explicit body root
                </p>
                <h2 class="mt-1 text-sm font-semibold text-slate-100">
                  {{ selectedRoute ? "Selected solver route" : "Source preview" }}
                </h2>
              </div>
              <div class="text-right">
                <p class="font-mono text-sm font-semibold text-amber-200">
                  {{ rootFacingLabel }}
                </p>
                <p class="mt-0.5 text-[0.625rem] text-ui-text-muted">
                  Cyan anatomical left · red anatomical right
                </p>
              </div>
            </header>

            <div
              v-if="core.errorMessage.value"
              class="border-b border-rose-900/70 bg-rose-950/45 px-4 py-3 text-sm text-rose-100"
            >
              {{ core.errorMessage.value }}
            </div>

            <PoiCanvasViewport
              v-else
              class="min-h-[clamp(24rem,58vh,42rem)]! rounded-none border-0"
              :projection-drag-enabled="true"
              :root-facing-deg="rootFacingDeg"
              :body-anatomical-styles="anatomicalStyles"
              show-body-facing-cue
            />

            <div class="grid gap-3 border-t border-ui-border-subtle px-3 py-3">
              <div class="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                <button
                  type="button"
                  class="h-8 rounded-md border border-ui-border-strong bg-ui-surface px-3 text-xs font-medium text-ui-text transition hover:border-ui-focus hover:bg-ui-surface-raised"
                  @click="togglePlayback"
                >
                  {{ transport.isPlaying.value ? "Pause" : "Play" }}
                </button>
                <input
                  type="range"
                  min="0"
                  :max="scrubMaximum"
                  step="any"
                  :value="transport.currentTime.value"
                  class="w-full accent-sky-400"
                  aria-label="Turning sequence timeline"
                  @input="onScrub"
                />
                <p class="font-mono text-[0.625rem] text-ui-text-muted">
                  {{ transport.currentTime.value.toFixed(2) }} /
                  {{ transport.duration.value.toFixed(2) }}
                </p>
              </div>

              <div class="flex flex-wrap items-center justify-between gap-2">
                <div
                  class="grid grid-cols-3 overflow-hidden rounded-md border border-ui-border-strong"
                >
                  <button
                    v-for="speed in [0.25, 0.5, 1]"
                    :key="speed"
                    type="button"
                    class="h-8 px-2.5 text-xs transition"
                    :class="
                      transport.speed.value === speed
                        ? 'bg-sky-400 text-slate-950'
                        : 'bg-ui-input text-ui-text-secondary hover:bg-ui-surface-raised'
                    "
                    @click="transport.setSpeed(speed)"
                  >
                    {{ speed }}x
                  </button>
                </div>
                <button
                  type="button"
                  class="h-8 rounded-md border px-3 text-xs font-medium transition"
                  :class="
                    transport.endBehavior.value === 'repeat'
                      ? 'border-emerald-400/70 bg-emerald-950/40 text-emerald-200'
                      : 'border-ui-border-strong bg-ui-surface text-ui-text-secondary hover:border-ui-focus'
                  "
                  :aria-pressed="transport.endBehavior.value === 'repeat'"
                  @click="toggleRepeat"
                >
                  Repeat {{ transport.endBehavior.value === "repeat" ? "on" : "off" }}
                </button>
              </div>
              <p class="text-[0.6875rem] leading-5 text-ui-text-muted">
                Repeat replays from the reset boundary. It does not assert that this one-turn path
                closes as a movement cycle.
              </p>
            </div>
          </section>

          <aside
            class="rounded-lg border border-cyan-800/60 bg-cyan-950/20 px-3 py-2.5 text-xs leading-5 text-cyan-100"
          >
            At 180°, the cyan anatomical-left shoulder must appear on the observer’s right and the
            red anatomical-right shoulder on the observer’s left. The hand and poi targets stay in
            observer space while the full support pose turns underneath them.
          </aside>
        </aside>
      </section>

      <TurningResearchArticle />
    </div>
  </main>
</template>
