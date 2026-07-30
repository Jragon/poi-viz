<script setup lang="ts">
import { computed } from "vue";

import {
  TURNING_DISPLAY_FRAME_LABELS,
  getTurningFacingAtStep,
  projectTurningHandSide,
  projectTurningLaneId,
  type TurningDisplayFrame
} from "@/lab/experiments/mel-turning/model/turningDisplayFrame";
import type {
  BodyFacing,
  BodyTurnEvent,
  TurningLaneId,
  TurningNode,
  TurningTrace,
  TurningTrack
} from "@/lab/experiments/mel-turning/model/turningTypes";

const props = defineProps<{
  trace: TurningTrace;
  frame: TurningDisplayFrame;
  activeStep?: number | null;
}>();

const layout = {
  width: 620,
  leftPad: 92,
  rightPad: 92,
  topPad: 58,
  bottomPad: 34,
  laneGap: 92,
  rowGap: 44,
  nodeRadius: 10,
  annotationChevronOffset: 14,
  planeSideOffset: 24
} as const;

interface GraphPoint {
  readonly key: string;
  readonly track: TurningTrack;
  readonly node: TurningNode;
  readonly facing: BodyFacing;
  readonly displayLaneId: TurningLaneId;
  readonly x: number;
  readonly y: number;
}

interface GraphConnector {
  readonly key: string;
  readonly track: TurningTrack;
  readonly from: GraphPoint;
  readonly to: GraphPoint;
}

const steps = computed(() => {
  const allSteps = props.trace.tracks.flatMap((track) => track.nodes.map((node) => node.step));
  return [...new Set(allSteps)].sort((a, b) => a - b);
});

const stepIndex = computed(() => new Map(steps.value.map((step, index) => [step, index] as const)));

const laneIndex = computed(
  () => new Map(props.trace.lanes.map((lane, index) => [lane.id, index] as const))
);

const svgHeight = computed(
  () => layout.topPad + layout.bottomPad + layout.rowGap * Math.max(steps.value.length - 1, 0)
);

const trackPoints = computed(() =>
  props.trace.tracks.map((track) => ({
    track,
    points: track.nodes.map((node) => makePoint(track, node))
  }))
);

const connectors = computed<readonly GraphConnector[]>(() =>
  trackPoints.value.flatMap(({ track, points }) =>
    points.slice(0, -1).map((point, index) => {
      const to = points[index + 1];
      if (!to) {
        throw new Error("MelTurningGraph connector invariant failed");
      }

      return {
        key: `${track.id}-${point.node.step}-${to.node.step}`,
        track,
        from: point,
        to
      };
    })
  )
);

function xForLane(laneId: TurningLaneId): number {
  const index = laneIndex.value.get(laneId);
  if (index === undefined) {
    throw new Error(`Unknown turning lane: ${laneId}`);
  }
  return layout.leftPad + index * layout.laneGap;
}

function yForStep(step: number): number {
  const index = stepIndex.value.get(step);
  if (index === undefined) {
    throw new Error(`Unknown turning step: ${step}`);
  }
  return layout.topPad + index * layout.rowGap;
}

function makePoint(track: TurningTrack, node: TurningNode): GraphPoint {
  const facing = getTurningFacingAtStep(props.trace, node.step);
  const displayLaneId = projectTurningLaneId(node.laneId, facing, props.frame);

  return {
    key: `${track.id}-${node.step}`,
    track,
    node,
    facing,
    displayLaneId,
    x: xForLane(displayLaneId),
    y: yForStep(node.step)
  };
}

function trackStroke(track: TurningTrack): string {
  return track.hand === "left" ? "#67e8f9" : "#fb7185";
}

function turnY(event: BodyTurnEvent): number {
  const nextStep = steps.value.find((step) => step > event.afterStep);
  if (nextStep === undefined) return yForStep(event.afterStep) + layout.rowGap / 2;
  return (yForStep(event.afterStep) + yForStep(nextStep)) / 2;
}

function facingAtStep(step: number): 0 | 180 {
  return getTurningFacingAtStep(props.trace, step);
}

function annotationSide(point: GraphPoint): "left" | "right" {
  return projectTurningHandSide(point.track.hand, point.facing, props.frame);
}

function chevronPoints(point: GraphPoint): string {
  const chevronX =
    point.x +
    (annotationSide(point) === "left"
      ? -layout.annotationChevronOffset
      : layout.annotationChevronOffset);
  const centreY = point.y + (point.node.phase === "up" ? 1 : -1);
  if (point.node.phase === "up") {
    return `${chevronX - 3},${centreY + 2.5} ${chevronX},${centreY - 2.5} ${chevronX + 3},${centreY + 2.5}`;
  }
  return `${chevronX - 3},${centreY - 2.5} ${chevronX},${centreY + 2.5} ${chevronX + 3},${centreY - 2.5}`;
}

function isActivePoint(point: GraphPoint): boolean {
  return props.activeStep === point.node.step;
}
</script>

<template>
  <section class="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/75">
    <div
      class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-3"
    >
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {{ TURNING_DISPLAY_FRAME_LABELS[frame] }}
        </p>
        <p class="mt-1 text-sm text-slate-300">
          {{
            frame === "body-relative"
              ? "Body L/R stays fixed · observer-fixed A/B"
              : "Screen L/R stays fixed · body lanes mirror after the turn"
          }}
        </p>
      </div>
      <div class="flex items-center gap-4 text-xs text-slate-400">
        <span class="inline-flex items-center gap-2">
          <span class="h-2.5 w-2.5 rounded-full bg-cyan-300"></span>
          Left
        </span>
        <span class="inline-flex items-center gap-2">
          <span class="h-2.5 w-2.5 rounded-full bg-rose-400"></span>
          Right
        </span>
        <span class="inline-flex items-center gap-2 text-slate-500">
          <span class="h-2.5 w-2.5 rounded-full border border-dashed border-slate-400"></span>
          Behind
        </span>
      </div>
    </div>

    <div class="overflow-x-auto p-3 sm:p-5">
      <svg
        :viewBox="`0 0 ${layout.width} ${svgHeight}`"
        class="mx-auto block min-w-[580px]"
        :data-display-frame="frame"
        role="img"
        :aria-label="`${trace.label}. ${TURNING_DISPLAY_FRAME_LABELS[frame]}. Vertical five-column beat graph with a shared 180 degree body-turn edge.`"
      >
        <g aria-hidden="true">
          <line
            v-for="(lane, index) in trace.lanes"
            :key="`lane-guide-${lane.id}`"
            :x1="layout.leftPad + index * layout.laneGap"
            :x2="layout.leftPad + index * layout.laneGap"
            :y1="layout.topPad - 16"
            :y2="svgHeight - layout.bottomPad + 8"
            stroke="#334155"
            stroke-dasharray="2 7"
          />

          <text
            v-for="(lane, index) in trace.lanes"
            :key="`lane-label-${lane.id}`"
            :x="layout.leftPad + index * layout.laneGap"
            y="20"
            fill="#94a3b8"
            font-size="11"
            font-weight="600"
            text-anchor="middle"
          >
            {{ lane.label }}
          </text>

          <g v-for="step in steps" :key="`row-${step}`">
            <line
              :x1="layout.leftPad - 20"
              :x2="layout.leftPad + layout.laneGap * 4 + 20"
              :y1="yForStep(step)"
              :y2="yForStep(step)"
              stroke="#1e293b"
            />
            <text
              :x="layout.leftPad - 40"
              :y="yForStep(step) + 4"
              fill="#64748b"
              font-size="11"
              font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
              text-anchor="end"
            >
              t{{ step }}
            </text>
            <text
              :x="layout.width - 26"
              :y="yForStep(step) + 4"
              fill="#64748b"
              font-size="10"
              font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
              text-anchor="end"
            >
              {{ facingAtStep(step) }}°
            </text>
          </g>
        </g>

        <g aria-hidden="true">
          <line
            v-for="connector in connectors"
            :key="connector.key"
            :x1="connector.from.x"
            :y1="connector.from.y"
            :x2="connector.to.x"
            :y2="connector.to.y"
            :stroke="trackStroke(connector.track)"
            stroke-opacity="0.62"
            stroke-width="2.25"
            stroke-linecap="round"
          />
        </g>

        <g
          v-for="event in trace.events"
          :key="`turn-${event.afterStep}`"
          data-turn-band
          aria-hidden="true"
        >
          <line
            :x1="layout.leftPad - 22"
            :x2="layout.leftPad + layout.laneGap * 4 + 22"
            :y1="turnY(event)"
            :y2="turnY(event)"
            stroke="#fbbf24"
            stroke-dasharray="5 4"
            stroke-width="2"
          />
          <text
            :x="layout.leftPad + layout.laneGap * 4 + 30"
            :y="turnY(event) + 3.5"
            fill="#fde68a"
            font-size="9.5"
            font-weight="700"
            letter-spacing="0.8"
            text-anchor="start"
          >
            TURN {{ event.direction.toUpperCase() }}
          </text>
        </g>

        <g v-for="{ track, points } in trackPoints" :key="track.id">
          <g
            v-for="point in points"
            :key="point.key"
            :data-turning-node="`${track.hand}-${point.node.step}`"
            :data-source-lane="point.node.laneId"
            :data-display-lane="point.displayLaneId"
            :data-hand-placement="point.node.handPlacement ?? 'wall'"
          >
            <title>
              {{ track.hand }} hand · t{{ point.node.step }} · {{ point.node.laneId }} · side
              {{ point.node.planeSide.toUpperCase() }} · {{ point.node.phase }}
            </title>
            <circle
              :cx="point.x"
              :cy="point.y"
              :r="layout.nodeRadius"
              :fill="isActivePoint(point) ? '#422006' : '#020617'"
              :stroke="trackStroke(track)"
              :stroke-width="isActivePoint(point) ? 4 : 2.5"
              :stroke-dasharray="point.node.handPlacement === 'behind-body' ? '3 3' : undefined"
            />
            <polyline
              :points="chevronPoints(point)"
              data-phase-chevron
              fill="none"
              :stroke="trackStroke(track)"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <text
              :x="
                point.x +
                (annotationSide(point) === 'left'
                  ? -layout.planeSideOffset
                  : layout.planeSideOffset)
              "
              :y="point.y + 3"
              data-plane-side
              :fill="trackStroke(track)"
              font-size="9"
              font-weight="700"
              text-anchor="middle"
            >
              {{ point.node.planeSide }}
            </text>
          </g>
        </g>
      </svg>
    </div>
  </section>
</template>
