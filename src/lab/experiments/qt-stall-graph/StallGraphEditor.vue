<script setup lang="ts">
import { computed, ref } from "vue";

import EmbeddedVisualizer from "@/lab/components/EmbeddedVisualizer.vue";
import {
  CARDINAL_LABELS,
  CARDINAL_ORDER,
  type Cardinal
} from "@/lab/experiments/qt-stall-graph/cardinals";
import {
  compileStallGraphState,
  type StallGraphDiagnostic
} from "@/lab/experiments/qt-stall-graph/compileStallGraph";
import {
  clearNode,
  getBeatCount,
  STALL_GRAPH_LAYOUT as layout,
  setNode,
  svgDimensions,
  xForLaneIndex,
  yForBeatIndex,
  type StallGraphEditState,
  type StallGraphHand,
  type StallGraphNodeMap
} from "@/lab/experiments/qt-stall-graph/stateModel";

interface DisplayRow {
  readonly key: string;
  readonly label: string;
  readonly beatIndex: number;
  readonly isLoopClosure: boolean;
}

interface TrackPoint {
  readonly key: string;
  readonly hand: StallGraphHand;
  readonly beatIndex: number;
  readonly cardinal: Cardinal;
  readonly x: number;
  readonly y: number;
  readonly isLoopClosure: boolean;
}

interface ConnectorView {
  readonly key: string;
  readonly hand: StallGraphHand;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

interface ClickTargetView {
  readonly key: string;
  readonly row: DisplayRow;
  readonly cardinal: Cardinal;
  readonly x: number;
  readonly y: number;
}

const rowCount = ref(4);
const editState = ref<StallGraphEditState>({
  left: new Map(),
  right: new Map(),
  editMode: "left",
  selectedNodeKey: null,
  showLeft: true,
  showRight: true,
  playLeft: true,
  playRight: true
});

const effectiveRowCount = computed(() =>
  Math.max(rowCount.value, getBeatCount(editState.value), 2)
);
const displayRows = computed<readonly DisplayRow[]>(() => {
  const rows: DisplayRow[] = [];
  for (let beatIndex = 0; beatIndex < effectiveRowCount.value; beatIndex++) {
    rows.push({
      key: `beat-${beatIndex}`,
      label: String(beatIndex + 1),
      beatIndex,
      isLoopClosure: false
    });
  }

  rows.push({
    key: "loop",
    label: "loop",
    beatIndex: effectiveRowCount.value,
    isLoopClosure: true
  });

  return rows;
});

const svgSize = computed(() => svgDimensions(displayRows.value.length - 1));
const svgWidth = computed(() => svgSize.value.width);
const svgHeight = computed(() => svgSize.value.height);
const canDeleteRow = computed(() => effectiveRowCount.value > 2);
const hasAnyNode = computed(() => editState.value.left.size > 0 || editState.value.right.size > 0);

const visibleHands = computed<readonly StallGraphHand[]>(() => {
  const hands: StallGraphHand[] = [];
  if (editState.value.showLeft) hands.push("left");
  if (editState.value.showRight) hands.push("right");
  return hands;
});

const trackPoints = computed(() => visibleHands.value.flatMap((hand) => makeTrackPoints(hand)));
const connectors = computed(() => visibleHands.value.flatMap((hand) => makeConnectors(hand)));
const clickTargets = computed<readonly ClickTargetView[]>(() =>
  displayRows.value.flatMap((row) => {
    if (row.isLoopClosure) return [];

    return CARDINAL_ORDER.map((cardinal, laneIndex) => ({
      key: `${row.key}-${cardinal}`,
      row,
      cardinal,
      x: xForLaneIndex(laneIndex),
      y: yForBeatIndex(row.beatIndex)
    }));
  })
);

const compiled = computed(() =>
  compileStallGraphState(editState.value, { beatCount: effectiveRowCount.value })
);
const sequence = computed(() => compiled.value.sequence ?? null);
const diagnostics = computed(() => (hasAnyNode.value ? compiled.value.diagnostics : []));

function nodesForHand(hand: StallGraphHand): StallGraphNodeMap {
  return hand === "left" ? editState.value.left : editState.value.right;
}

function makeTrackPoints(hand: StallGraphHand): readonly TrackPoint[] {
  const points = Array.from(nodesForHand(hand).entries())
    .sort((a, b) => a[0] - b[0])
    .map(([beatIndex, node]) => pointForNode(hand, beatIndex, node.cardinal, false));

  const first = points[0];
  if (!first || points.length < 2) return points;

  return [
    ...points,
    {
      ...first,
      key: `${hand}-loop`,
      beatIndex: effectiveRowCount.value,
      y: yForBeatIndex(effectiveRowCount.value),
      isLoopClosure: true
    }
  ];
}

function makeConnectors(hand: StallGraphHand): readonly ConnectorView[] {
  const points = makeTrackPoints(hand);
  const result: ConnectorView[] = [];

  for (let index = 0; index < points.length - 1; index++) {
    const from = points[index];
    const to = points[index + 1];
    result.push({
      key: `${hand}-${from.beatIndex}-${to.beatIndex}-${index}`,
      hand,
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y
    });
  }

  return result;
}

function pointForNode(
  hand: StallGraphHand,
  beatIndex: number,
  cardinal: Cardinal,
  isLoopClosure: boolean
): TrackPoint {
  return {
    key: `${hand}-${beatIndex}`,
    hand,
    beatIndex,
    cardinal,
    x: xForLaneIndex(CARDINAL_ORDER.indexOf(cardinal)),
    y: yForBeatIndex(beatIndex),
    isLoopClosure
  };
}

function placeNode(cardinal: Cardinal, beatIndex: number): void {
  const hand = editState.value.editMode;
  const nodes = nodesForHand(hand);
  const existing = nodes.get(beatIndex);
  const nextNodes =
    existing?.cardinal === cardinal
      ? clearNode(nodes, beatIndex)
      : setNode(nodes, beatIndex, cardinal);

  editState.value = {
    ...editState.value,
    [hand]: nextNodes,
    selectedNodeKey: existing?.cardinal === cardinal ? null : `${hand}-${beatIndex}`
  };
}

function appendRow(): void {
  rowCount.value += 1;
}

function deleteRow(): void {
  if (!canDeleteRow.value) return;

  const nextRowCount = effectiveRowCount.value - 1;
  rowCount.value = nextRowCount;
  editState.value = {
    ...editState.value,
    left: trimNodes(editState.value.left, nextRowCount),
    right: trimNodes(editState.value.right, nextRowCount),
    selectedNodeKey: null
  };
}

function trimNodes(nodes: StallGraphNodeMap, nextRowCount: number): StallGraphNodeMap {
  return new Map(Array.from(nodes.entries()).filter(([beatIndex]) => beatIndex < nextRowCount));
}

function setEditMode(hand: StallGraphHand): void {
  editState.value = { ...editState.value, editMode: hand, selectedNodeKey: null };
}

function toggleFlag(flag: "showLeft" | "showRight" | "playLeft" | "playRight"): void {
  editState.value = { ...editState.value, [flag]: !editState.value[flag] };
}

function connectorClass(connector: ConnectorView): string {
  return connector.hand === "left" ? "stroke-cyan-300" : "stroke-pink-300";
}

function pointClass(point: TrackPoint): string {
  return point.hand === "left"
    ? "fill-slate-950 stroke-cyan-300"
    : "fill-slate-950 stroke-pink-300";
}

function pointRadius(point: TrackPoint): number {
  return isSelectedPoint(point) ? layout.nodeRadiusActive : layout.nodeRadius;
}

function pointStrokeWidth(point: TrackPoint): number {
  return isSelectedPoint(point) ? 3 : 2;
}

function pointStrokeDasharray(point: TrackPoint): string | undefined {
  return point.isLoopClosure ? "2 2" : undefined;
}

function isSelectedPoint(point: TrackPoint): boolean {
  return (
    !point.isLoopClosure && editState.value.selectedNodeKey === `${point.hand}-${point.beatIndex}`
  );
}

function diagnosticText(diagnostic: StallGraphDiagnostic): string {
  const hand = diagnostic.hand ? ` ${diagnostic.hand}` : "";
  const beat = diagnostic.beatIndex !== undefined ? ` beat ${diagnostic.beatIndex + 1}` : "";
  const edge = diagnostic.from && diagnostic.to ? ` ${diagnostic.from}->${diagnostic.to}` : "";
  return `${diagnostic.code}${hand}${beat}${edge}`;
}
</script>

<template>
  <div class="grid gap-4">
    <section class="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60">
      <div
        class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-2.5"
      >
        <div>
          <p class="text-xs uppercase tracking-[0.16em] text-slate-500">Graph</p>
          <h2 class="mt-1 text-sm font-semibold text-slate-200">
            {{ editState.editMode === "left" ? "Left edit graph" : "Right edit graph" }}
          </h2>
        </div>

        <div class="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            class="rounded-md border px-2 py-1 font-semibold transition hover:border-cyan-300"
            :class="
              editState.editMode === 'left'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-slate-700 text-slate-400'
            "
            @click="setEditMode('left')"
          >
            Edit L
          </button>
          <button
            type="button"
            class="rounded-md border px-2 py-1 font-semibold transition hover:border-pink-300"
            :class="
              editState.editMode === 'right'
                ? 'border-pink-400 text-pink-300'
                : 'border-slate-700 text-slate-400'
            "
            @click="setEditMode('right')"
          >
            Edit R
          </button>
        </div>
      </div>

      <div class="px-3 py-3">
        <svg
          role="img"
          aria-label="Quarter-time stall graph with cardinal lanes and beat rows"
          :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
          class="block w-full text-slate-400"
        >
          <g aria-hidden="true">
            <line
              v-for="(cardinal, index) in CARDINAL_ORDER"
              :key="`axis-${cardinal}`"
              :x1="xForLaneIndex(index)"
              :x2="xForLaneIndex(index)"
              :y1="layout.topPad - 16"
              :y2="svgHeight - layout.bottomPad + 10"
              class="stroke-slate-800"
              stroke-width="1"
            />
            <line
              v-for="(row, index) in displayRows"
              :key="`row-axis-${row.key}`"
              :x1="layout.leftPad - 28"
              :x2="svgWidth - layout.rightPad + 16"
              :y1="yForBeatIndex(index)"
              :y2="yForBeatIndex(index)"
              class="stroke-slate-800/70"
              stroke-width="1"
            />
          </g>

          <g>
            <text
              v-for="(cardinal, index) in CARDINAL_ORDER"
              :key="`label-${cardinal}`"
              :x="xForLaneIndex(index)"
              y="20"
              text-anchor="middle"
              class="fill-slate-400 text-[9px] font-medium"
            >
              {{ cardinal }}
            </text>
          </g>

          <g>
            <text
              v-for="(row, index) in displayRows"
              :key="`row-label-${row.key}`"
              x="24"
              :y="yForBeatIndex(index) + 4"
              class="fill-slate-500 font-mono text-[10px]"
            >
              {{ row.label }}
            </text>
          </g>

          <g>
            <line
              v-for="connector in connectors"
              :key="connector.key"
              :x1="connector.x1"
              :y1="connector.y1"
              :x2="connector.x2"
              :y2="connector.y2"
              :class="connectorClass(connector)"
              stroke-width="2.5"
              stroke-linecap="round"
            />
          </g>

          <g>
            <circle
              v-for="point in trackPoints"
              :key="point.key"
              :cx="point.x"
              :cy="point.y"
              :r="pointRadius(point)"
              :class="pointClass(point)"
              :stroke-width="pointStrokeWidth(point)"
              :stroke-dasharray="pointStrokeDasharray(point)"
              :data-active-node="isSelectedPoint(point) ? 'true' : undefined"
            />
          </g>

          <g>
            <foreignObject
              v-for="target in clickTargets"
              :key="target.key"
              :x="target.x - 11"
              :y="target.y - 11"
              width="22"
              height="22"
            >
              <button
                type="button"
                class="grid h-5.5 w-5.5 place-items-center rounded-full bg-transparent"
                :aria-label="`${editState.editMode} hand beat ${target.row.label} ${CARDINAL_LABELS[target.cardinal]}`"
                @click="placeNode(target.cardinal, target.row.beatIndex)"
              >
                <span class="sr-only">{{ target.cardinal }}</span>
              </button>
            </foreignObject>
          </g>
        </svg>
      </div>

      <div
        class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-3 py-2"
      >
        <div class="flex gap-2">
          <button
            type="button"
            class="inline-grid h-7 w-7 place-items-center rounded-md border border-slate-700 text-base leading-none text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600 disabled:hover:bg-transparent"
            aria-label="Delete row"
            title="Delete row"
            :disabled="!canDeleteRow"
            @click="deleteRow"
          >
            -
          </button>
          <button
            type="button"
            class="inline-grid h-7 w-7 place-items-center rounded-md border border-slate-700 text-base leading-none text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white"
            aria-label="Append row"
            title="Append row"
            @click="appendRow"
          >
            +
          </button>
        </div>

        <div class="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            class="rounded-md border px-2 py-1 transition hover:border-cyan-300"
            :class="
              editState.showLeft
                ? 'border-cyan-400 text-cyan-300'
                : 'border-slate-700 text-slate-500'
            "
            @click="toggleFlag('showLeft')"
          >
            Show L
          </button>
          <button
            type="button"
            class="rounded-md border px-2 py-1 transition hover:border-pink-300"
            :class="
              editState.showRight
                ? 'border-pink-400 text-pink-300'
                : 'border-slate-700 text-slate-500'
            "
            @click="toggleFlag('showRight')"
          >
            Show R
          </button>
          <button
            type="button"
            class="rounded-md border px-2 py-1 transition hover:border-cyan-300"
            :class="
              editState.playLeft
                ? 'border-cyan-400 text-cyan-300'
                : 'border-slate-700 text-slate-500'
            "
            @click="toggleFlag('playLeft')"
          >
            Play L
          </button>
          <button
            type="button"
            class="rounded-md border px-2 py-1 transition hover:border-pink-300"
            :class="
              editState.playRight
                ? 'border-pink-400 text-pink-300'
                : 'border-slate-700 text-slate-500'
            "
            @click="toggleFlag('playRight')"
          >
            Play R
          </button>
        </div>
      </div>
    </section>

    <ul
      v-if="diagnostics.length > 0"
      class="rounded border border-red-900/40 bg-red-950/20 px-3 py-2 text-xs text-red-300"
    >
      <li v-for="(diagnostic, index) in diagnostics" :key="index" class="font-mono">
        {{ diagnosticText(diagnostic) }}
      </li>
    </ul>

    <EmbeddedVisualizer
      v-if="sequence !== null"
      :sequence="sequence"
      title="Stall graph preview"
      size="compact"
      :show-body-rig="true"
      projection-mode="auto"
    />
    <div
      v-else
      class="rounded border border-slate-800 bg-slate-950/30 px-4 py-8 text-center text-xs text-slate-600"
    >
      Add at least two compatible nodes on a played hand to preview.
    </div>
  </div>
</template>
