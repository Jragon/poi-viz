<script setup lang="ts">
import { computed } from "vue";

import {
  deriveLoopIntervals,
  deriveRowStates
} from "@/lab/experiments/poi-beat-graph/graphHelpers";
import type {
  PoiBeatDerivedRowState,
  PoiBeatGraph,
  PoiBeatInterval,
  PoiBeatLane,
  PoiBeatLaneId,
  PoiBeatTrack
} from "@/lab/experiments/poi-beat-graph/types";

const props = defineProps<{
  graph: PoiBeatGraph;
  trackId?: string;
  halfBeatDuration: number;
}>();

const emit = defineEmits<{
  selectLane: [step: number, laneId: PoiBeatLaneId];
  appendRow: [];
  deleteRow: [];
}>();

const layout = {
  leftPad: 50,
  rightPad: 58,
  topPad: 34,
  bottomPad: 30,
  laneGap: 58,
  rowGap: 38,
  inactiveRadius: 3.5,
  activeRadius: 7
} as const;

interface DisplayRowState extends PoiBeatDerivedRowState {
  readonly key: string;
  readonly label: string;
  readonly isLoopClosure: boolean;
  readonly sourceStep: number;
}

interface ActivePointView {
  readonly row: DisplayRowState;
  readonly x: number;
  readonly y: number;
}

interface LaneNodeView {
  readonly key: string;
  readonly lane: PoiBeatLane;
  readonly row: DisplayRowState;
  readonly x: number;
  readonly y: number;
  readonly active: boolean;
}

interface ConnectorView {
  readonly key: string;
  readonly interval: PoiBeatInterval;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

const track = computed<PoiBeatTrack>(() => {
  const selectedTrack = props.trackId
    ? props.graph.tracks.find((candidate) => candidate.id === props.trackId)
    : props.graph.tracks[0];

  if (!selectedTrack) {
    throw new Error("PoiBeatGraph requires at least one matching track");
  }

  return selectedTrack;
});

const lanes = computed(() => props.graph.lanes);
const laneX = computed(
  () => new Map(lanes.value.map((lane, index) => [lane.id, xForLaneIndex(index)]))
);
const rowStates = computed(() => deriveRowStates(track.value));
const displayRows = computed<readonly DisplayRowState[]>(() => {
  const states = rowStates.value.map((state) => ({
    ...state,
    key: `step-${state.row.step}`,
    label: String(state.row.step),
    isLoopClosure: false,
    sourceStep: state.row.step
  }));
  const first = states[0];
  if (!first) return states;

  return [
    ...states,
    {
      ...first,
      key: "loop",
      label: "loop",
      isLoopClosure: true,
      sourceStep: first.row.step
    }
  ];
});
const intervals = computed(() => deriveLoopIntervals(track.value, props.halfBeatDuration));
const canDeleteRow = computed(() => track.value.rows.length > 2);
const svgWidth = computed(
  () => layout.leftPad + layout.rightPad + layout.laneGap * Math.max(lanes.value.length - 1, 0)
);
const svgHeight = computed(
  () => layout.topPad + layout.bottomPad + layout.rowGap * Math.max(displayRows.value.length - 1, 0)
);
const activePoints = computed<readonly ActivePointView[]>(() =>
  displayRows.value.map((row, index) => ({
    row,
    x: xForLane(row.row.laneId),
    y: yForRowIndex(index)
  }))
);
const laneNodes = computed<readonly LaneNodeView[]>(() =>
  displayRows.value.flatMap((row, rowIndex) =>
    lanes.value.map((lane, laneIndex) => ({
      key: `${row.key}-${lane.id}`,
      lane,
      row,
      x: xForLaneIndex(laneIndex),
      y: yForRowIndex(rowIndex),
      active: lane.id === row.row.laneId
    }))
  )
);
const connectors = computed<readonly ConnectorView[]>(() =>
  intervals.value.map((interval, index) => {
    const fromPoint = activePoints.value[index];
    const toPoint = activePoints.value[index + 1];
    if (!fromPoint || !toPoint) {
      throw new Error("PoiBeatGraph connector invariant failed");
    }

    return {
      key: `${interval.fromRow.step}-${interval.toRow.step}`,
      interval,
      x1: fromPoint.x,
      y1: fromPoint.y,
      x2: toPoint.x,
      y2: toPoint.y
    };
  })
);

function xForLaneIndex(index: number): number {
  return layout.leftPad + index * layout.laneGap;
}

function xForLane(laneId: PoiBeatLaneId): number {
  const x = laneX.value.get(laneId);
  if (x === undefined) {
    throw new Error(`Unknown rendered lane: ${laneId}`);
  }
  return x;
}

function yForRowIndex(index: number): number {
  return layout.topPad + index * layout.rowGap;
}

function nodeClass(node: LaneNodeView): string {
  if (node.active) return "fill-sky-300 stroke-sky-100";
  return "fill-slate-950 stroke-slate-600 hover:fill-slate-800 hover:stroke-slate-400";
}

function connectorClass(connector: ConnectorView): string {
  if (connector.interval.planeSide === "a") return "stroke-amber-300";
  return "stroke-sky-300";
}

function laneHeaderLabel(lane: PoiBeatLane): string {
  if (lane.vertical === "high") return `▲ ${lane.label}`;
  if (lane.vertical === "low") return `▼ ${lane.label}`;
  return lane.label;
}

function selectLane(row: DisplayRowState, laneId: PoiBeatLaneId): void {
  if (row.isLoopClosure) return;
  emit("selectLane", row.sourceStep, laneId);
}
</script>

<template>
  <section class="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60">
    <div class="border-b border-slate-800 px-4 py-2.5">
      <p class="text-xs uppercase tracking-[0.16em] text-slate-500">Graph</p>
      <h2 class="mt-1 text-sm font-semibold text-slate-200">{{ track.id }} beat graph</h2>
    </div>

    <div class="px-3 py-3">
      <svg
        role="img"
        aria-label="Poi beat graph with vertical time rows and symmetric lanes"
        :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
        class="block w-full text-slate-400"
      >
        <g aria-hidden="true">
          <line
            v-for="lane in lanes"
            :key="`axis-${lane.id}`"
            :x1="xForLane(lane.id)"
            :x2="xForLane(lane.id)"
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
            :y1="yForRowIndex(index)"
            :y2="yForRowIndex(index)"
            class="stroke-slate-800/70"
            stroke-width="1"
          />
        </g>

        <g>
          <text
            v-for="(lane, index) in lanes"
            :key="`label-${lane.id}`"
            :x="xForLaneIndex(index)"
            :y="20"
            text-anchor="middle"
            class="fill-slate-400 text-[9px] font-medium"
          >
            {{ laneHeaderLabel(lane) }}
          </text>
        </g>

        <g>
          <text
            v-for="(row, index) in displayRows"
            :key="`row-label-${row.key}`"
            :x="24"
            :y="yForRowIndex(index) + 4"
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
          <foreignObject
            v-for="node in laneNodes"
            :key="node.key"
            :x="node.x - 10"
            :y="node.y - 10"
            width="20"
            height="20"
          >
            <button
              type="button"
              class="grid h-5 w-5 place-items-center rounded-full bg-transparent"
              :aria-label="`${node.row.label} ${node.lane.label}`"
              :disabled="node.row.isLoopClosure"
              @click="selectLane(node.row, node.lane.id)"
            >
              <svg viewBox="0 0 20 20" class="h-5 w-5 overflow-visible">
                <circle
                  cx="10"
                  cy="10"
                  :r="node.active ? layout.activeRadius : layout.inactiveRadius"
                  :class="nodeClass(node)"
                  stroke-width="1.6"
                />
              </svg>
            </button>
          </foreignObject>
        </g>

        <g>
          <text
            v-for="point in activePoints"
            :key="`meta-${point.row.key}`"
            :x="svgWidth - layout.rightPad + 8"
            :y="point.y + 3"
            class="fill-slate-400 text-[9px] uppercase"
          >
            {{ point.row.phaseLabel }} {{ point.row.planeSide }}
          </text>
        </g>
      </svg>
    </div>

    <div class="flex justify-center gap-2 border-t border-slate-800 px-3 py-2">
      <button
        type="button"
        class="inline-grid h-7 w-7 place-items-center rounded-md border border-slate-700 text-base leading-none text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600 disabled:hover:bg-transparent"
        aria-label="Delete row"
        title="Delete row"
        :disabled="!canDeleteRow"
        @click="emit('deleteRow')"
      >
        -
      </button>
      <button
        type="button"
        class="inline-grid h-7 w-7 place-items-center rounded-md border border-slate-700 text-base leading-none text-slate-200 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white"
        aria-label="Append row"
        title="Append row"
        @click="emit('appendRow')"
      >
        +
      </button>
    </div>

    <div class="grid grid-cols-2 border-t border-slate-800 text-xs text-slate-400">
      <div class="border-r border-slate-800 px-3 py-2">
        <span class="font-mono text-sky-300">b</span> interval side
      </div>
      <div class="px-3 py-2"><span class="font-mono text-amber-300">a</span> interval side</div>
    </div>
  </section>
</template>
