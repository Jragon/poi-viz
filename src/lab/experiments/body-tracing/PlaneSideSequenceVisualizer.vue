<script setup lang="ts">
import { computed } from "vue";

import { evalPreparedMultiRigSequenceAt } from "@/engine/multirig";
import { toWorldMultiRigPose } from "@/engine/planeProjection";
import type {
  DriverEvalContext,
  MultiRigSequence,
  RelativeNodePose,
  Segment,
  Vec2,
  Vec3
} from "@/engine/types";
import PoiCanvasViewport from "@/visualizer/PoiCanvasViewport.vue";
import {
  createVisualizerWorkspace,
  provideVisualizerWorkspace
} from "@/visualizer/visualizerWorkspace";

type PatternDefinition = {
  id: string;
  name: string;
  description: string;
  segments: Segment[];
};

type WrapSegmentInput = {
  readonly durationUnits: number;
  readonly handStart: Vec2;
  readonly handEnd: Vec2;
  readonly phaseStart: number;
  readonly phaseEnd: number;
  readonly planeSide?: "a" | "b";
};

type SpeedAggregate = {
  readonly segmentIndex: number;
  readonly label: string;
  readonly durationUnits: number;
  readonly headStartLabel: string;
  handSpeedSum: number;
  handSpeedMax: number;
  headSpeedSum: number;
  headSpeedMax: number;
  sampleCount: number;
};

type SpeedDiagnostics = {
  readonly rows: readonly (SpeedAggregate & {
    readonly handSpeedAverage: number;
    readonly headSpeedAverage: number;
  })[];
  readonly speedBars: readonly {
    readonly heightPercent: number;
    readonly segmentIndex: number;
  }[];
  readonly maxHandSpeed: number;
  readonly maxHeadSpeed: number;
};

const TAU = Math.PI * 2;

const PHASE = {
  right: 0,
  up: Math.PI / 2,
  left: Math.PI,
  down: (3 / 2) * Math.PI
} as const;

const WRAP_PARAMS = {
  handHorizontalOffset: 0.5,
  headRadius: 0.6,
  circleDuration: 0.75,
  transferDuration: 0.75,
  circleSide: "b" as const,
  transferSide: "a" as const,
  transferLabel: "smooth transfer",
  diagnosticSampleCount: 180,
  diagnosticRigId: "right",
  playbackSpeed: 1,
  playbackUnitsPerSecond: 1
} as const;

// === Geometry and Easing Helpers ===

function cartesianToPolar(point: Vec2, fallbackPhaseAbs: number): RelativeNodePose {
  const radius = Math.hypot(point.x, point.y);
  if (radius <= 1e-12) {
    return { phaseAbs: fallbackPhaseAbs, radius: 0 };
  }

  return {
    phaseAbs: Math.atan2(point.y, point.x),
    radius
  };
}

function distance2(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function lerp2(a: Vec2, b: Vec2, progress: number): Vec2 {
  return {
    x: a.x + (b.x - a.x) * progress,
    y: a.y + (b.y - a.y) * progress
  };
}

function worldPointToPose(point: Vec2): RelativeNodePose {
  return cartesianToPolar(point, 0);
}

function evalSmoothTransferHand(
  startPose: RelativeNodePose,
  start: Vec2,
  end: Vec2,
  context: DriverEvalContext
) {
  const progress = smoothstep(context.tLocal / context.durationUnits);
  if (progress <= 0) return worldPointToPose(start);
  if (progress >= 1) return worldPointToPose(end);

  return cartesianToPolar(lerp2(start, end, progress), startPose.phaseAbs);
}

// === Wrap Segment Builders ===

function makeWrapSegment(input: WrapSegmentInput): Segment {
  return {
    durationUnits: input.durationUnits,
    planeId: "wall",
    ...(input.planeSide ? { planeSide: input.planeSide } : {}),
    hand:
      distance2(input.handStart, input.handEnd) <= 1e-9
        ? {
            startPose: worldPointToPose(input.handStart),
            driver: { kind: "circle", omega: 0 }
          }
        : {
            startPose: worldPointToPose(input.handStart),
            driver: {
              kind: "runtime",
              label: WRAP_PARAMS.transferLabel,
              evalPose: (startPose, context) =>
                evalSmoothTransferHand(startPose, input.handStart, input.handEnd, context)
            }
          },
    head: {
      startPose: { phaseAbs: input.phaseStart, radius: WRAP_PARAMS.headRadius },
      driver: {
        kind: "circle",
        omega: (input.phaseEnd - input.phaseStart) / input.durationUnits
      }
    }
  };
}

function makeBasicWrapSegments(): Segment[] {
  const rightHand = { x: WRAP_PARAMS.handHorizontalOffset, y: 0 };
  const leftHand = { x: -WRAP_PARAMS.handHorizontalOffset, y: 0 };

  return [
    makeWrapSegment({
      durationUnits: WRAP_PARAMS.circleDuration,
      handStart: rightHand,
      handEnd: rightHand,
      phaseStart: PHASE.right,
      phaseEnd: TAU,
      planeSide: WRAP_PARAMS.circleSide
    }),
    makeWrapSegment({
      durationUnits: WRAP_PARAMS.transferDuration,
      handStart: rightHand,
      handEnd: leftHand,
      phaseStart: TAU,
      phaseEnd: TAU + PHASE.left,
      planeSide: WRAP_PARAMS.transferSide
    }),
    makeWrapSegment({
      durationUnits: WRAP_PARAMS.circleDuration,
      handStart: leftHand,
      handEnd: leftHand,
      phaseStart: TAU + PHASE.left,
      phaseEnd: 2 * TAU + PHASE.left,
      planeSide: WRAP_PARAMS.circleSide
    }),
    makeWrapSegment({
      durationUnits: WRAP_PARAMS.transferDuration,
      handStart: leftHand,
      handEnd: rightHand,
      phaseStart: 2 * TAU + PHASE.left,
      phaseEnd: 3 * TAU,
      planeSide: WRAP_PARAMS.transferSide
    })
  ];
}

// === Segment Labels and Formatting ===

function getSegmentHandKind(segment: Segment): string {
  if (segment.hand.driver.kind === "runtime") {
    return segment.hand.driver.label;
  }

  if (segment.hand.driver.kind === "point-to-point") {
    return "transfer";
  }

  if (segment.hand.driver.omega === 0) {
    return "circle";
  }

  return "circle";
}

function describeSegment(segment: Segment, index: number): string {
  const side = segment.planeSide ? ` ${segment.planeSide}` : "";
  return `${index + 1}. ${getSegmentHandKind(segment)}${side}`;
}

function distance3(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function normalizeTime(t: number, duration: number): number {
  return ((t % duration) + duration) % duration;
}

function formatNumber(value: number): string {
  return value.toFixed(2);
}

function formatPhaseCardinal(phaseAbs: number): string {
  const phase = normalizeTime(phaseAbs, TAU);
  const cardinals: readonly { phase: number; label: string }[] = [
    { phase: PHASE.right, label: "0" },
    { phase: PHASE.up, label: "90" },
    { phase: PHASE.left, label: "180" },
    { phase: PHASE.down, label: "270" }
  ];
  const match = cardinals.find((cardinal) => Math.abs(phase - cardinal.phase) <= 1e-9);
  if (match) return match.label;

  return ((phase * 180) / Math.PI).toFixed(0);
}

function makeSpeedRows(segments: readonly Segment[]): SpeedAggregate[] {
  return segments.map((segment, index) => ({
    segmentIndex: index,
    label: describeSegment(segment, index),
    durationUnits: segment.durationUnits,
    headStartLabel: formatPhaseCardinal(segment.head.startPose.phaseAbs),
    handSpeedSum: 0,
    handSpeedMax: 0,
    headSpeedSum: 0,
    headSpeedMax: 0,
    sampleCount: 0
  }));
}

function toAverageSpeedRows(rows: readonly SpeedAggregate[]): SpeedDiagnostics["rows"] {
  return rows.map((row) => ({
    ...row,
    handSpeedAverage: row.sampleCount > 0 ? row.handSpeedSum / row.sampleCount : 0,
    headSpeedAverage: row.sampleCount > 0 ? row.headSpeedSum / row.sampleCount : 0
  }));
}

function toSpeedBars(
  samples: readonly { headSpeed: number; segmentIndex: number }[],
  maxHeadSpeed: number
): SpeedDiagnostics["speedBars"] {
  const safeMaxHeadSpeed = Math.max(maxHeadSpeed, 1e-6);

  return samples.map((sample) => ({
    heightPercent: Math.max(4, (sample.headSpeed / safeMaxHeadSpeed) * 100),
    segmentIndex: sample.segmentIndex
  }));
}

const wrapFixture: PatternDefinition = {
  id: "landmark-phase-schedule",
  name: "Landmark phase schedule",
  description:
    "Four-segment schedule: circles on back side b, runtime-eased transfer arcs on front side a.",
  segments: makeBasicWrapSegments()
};

const wrapSequence = computed<MultiRigSequence>(() => ({
  rigs: [
    {
      rigId: "right",
      sequence: {
        segments: wrapFixture.segments
      }
    }
  ]
}));

const workspace = provideVisualizerWorkspace(
  createVisualizerWorkspace(wrapSequence, {
    autoplay: true,
    resumeOnSequenceChange: true,
    transportOptions: {
      initialSpeed: WRAP_PARAMS.playbackSpeed,
      unitsPerSecond: WRAP_PARAMS.playbackUnitsPerSecond
    }
  })
);
const { core, transport, display } = workspace;
core.session.setProjectionMode("tilted");
core.session.setPlaneSideSeparationWorld(0.2);
core.session.setTrailDecaySteps(180);
display.setOverlayVisibility("showHandTrails", true);
display.setOverlayVisibility("showHeadTrails", true);

const activeSegmentIndex = computed(() => {
  const frame = core.session.currentFrame.value;
  if (!frame?.ok) return null;

  return frame.evaluatedPoses[WRAP_PARAMS.diagnosticRigId]?.segmentIndex ?? null;
});

const currentTimeLabel = computed(() => transport.currentTime.value.toFixed(2));
const durationLabel = computed(() => transport.duration.value.toFixed(2));
const activeMetadata = computed(() => {
  const frame = core.session.currentFrame.value;
  if (!frame?.ok) return "unprepared";

  return Object.entries(frame.evaluatedPoses)
    .map(
      ([rigId, value]) =>
        `${rigId}: segment ${value.segmentIndex + 1}, ${value.planeId} ${value.planeSide ?? "unspecified"}`
    )
    .join(" / ");
});

const segmentSummaries = computed(() =>
  wrapFixture.segments.map((segment, index) => ({
    label: describeSegment(segment, index),
    durationUnits: segment.durationUnits
  }))
);

// === Speed Diagnostics ===

const speedDiagnostics = computed<SpeedDiagnostics | null>(() => {
  const prepared = core.session.playback.prepared.value;
  if (!prepared || prepared.maxSequenceDuration <= 0) return null;

  const rig =
    prepared.rigs.find((entry) => entry.rigId === WRAP_PARAMS.diagnosticRigId) ?? prepared.rigs[0];
  if (!rig) return null;

  const duration = prepared.maxSequenceDuration;
  const velocityDt = Math.max(duration / 1200, 1e-4);
  const rows = makeSpeedRows(rig.prepared.segments);
  const speedSeries: { headSpeed: number; segmentIndex: number }[] = [];

  for (let index = 0; index < WRAP_PARAMS.diagnosticSampleCount; index += 1) {
    const t = (duration * (index + 0.5)) / WRAP_PARAMS.diagnosticSampleCount;
    const previous = evalPreparedMultiRigSequenceAt(
      prepared,
      normalizeTime(t - velocityDt, duration)
    );
    const current = evalPreparedMultiRigSequenceAt(prepared, normalizeTime(t, duration));
    const next = evalPreparedMultiRigSequenceAt(prepared, normalizeTime(t + velocityDt, duration));

    if (!previous.ok || !current.ok || !next.ok) continue;

    const previousWorld = toWorldMultiRigPose(previous.poses)[rig.rigId];
    const currentPose = current.poses[rig.rigId];
    const nextWorld = toWorldMultiRigPose(next.poses)[rig.rigId];
    if (!previousWorld || !currentPose || !nextWorld) continue;

    const handSpeed =
      distance3(previousWorld.handPosition, nextWorld.handPosition) / (2 * velocityDt);
    const headSpeed =
      distance3(previousWorld.headPosition, nextWorld.headPosition) / (2 * velocityDt);
    const row = rows[currentPose.segmentIndex];
    if (!row) continue;

    row.handSpeedSum += handSpeed;
    row.handSpeedMax = Math.max(row.handSpeedMax, handSpeed);
    row.headSpeedSum += headSpeed;
    row.headSpeedMax = Math.max(row.headSpeedMax, headSpeed);
    row.sampleCount += 1;
    speedSeries.push({ headSpeed, segmentIndex: currentPose.segmentIndex });
  }

  const maxHeadSpeed = rows.reduce((maxSpeed, row) => Math.max(maxSpeed, row.headSpeedMax), 0);
  const maxHandSpeed = rows.reduce((maxSpeed, row) => Math.max(maxSpeed, row.handSpeedMax), 0);

  return {
    rows: toAverageSpeedRows(rows),
    speedBars: toSpeedBars(speedSeries, maxHeadSpeed),
    maxHandSpeed,
    maxHeadSpeed
  };
});

// === Transport Handlers ===

function togglePlayback() {
  transport.toggle();
}

function onScrub(event: Event) {
  transport.setCurrentTime(Number((event.target as HTMLInputElement).value));
}
</script>

<template>
  <section
    class="lab-live-cell overflow-hidden rounded-lg border border-ui-border-subtle bg-slate-950/80"
  >
    <header class="grid gap-3 border-b border-ui-border-subtle px-4 py-3 md:items-start">
      <div class="min-w-0">
        <p class="text-xs uppercase tracking-[0.2em] text-ui-text-muted">Engine Playback</p>
        <h2 class="mt-1 text-lg font-semibold text-slate-100">{{ wrapFixture.name }}</h2>
        <p class="mt-1 text-sm leading-6 text-slate-400">
          {{ wrapFixture.description }}
        </p>
      </div>

      <dl class="grid grid-cols-2 gap-x-5 gap-y-1 text-xs text-slate-400 md:text-right">
        <div>
          <dt class="uppercase tracking-[0.18em] text-ui-text-muted">Time</dt>
          <dd class="font-mono text-slate-300">{{ currentTimeLabel }} / {{ durationLabel }}</dd>
        </div>
        <div>
          <dt class="uppercase tracking-[0.18em] text-ui-text-muted">Active</dt>
          <dd class="font-mono text-slate-300">{{ activeMetadata }}</dd>
        </div>
      </dl>
    </header>

    <div
      v-if="core.errorMessage.value"
      class="border-b border-rose-900/70 bg-rose-950/45 px-4 py-3 text-sm text-rose-100"
    >
      {{ core.errorMessage.value }}
    </div>

    <PoiCanvasViewport
      v-else
      class="min-h-80! rounded-none border-0 md:min-h-112!"
      :projection-drag-enabled="false"
    />

    <div
      class="grid gap-4 border-t border-ui-border-subtle px-4 py-3 text-sm text-slate-300 md:grid-cols-[auto_minmax(10rem,1fr)] md:items-center"
    >
      <button
        type="button"
        class="rounded-md border border-ui-border-strong bg-ui-surface px-3 py-2 font-medium text-ui-text transition hover:border-ui-focus hover:bg-ui-surface-raised disabled:cursor-not-allowed disabled:border-ui-border disabled:bg-ui-surface-raised disabled:text-ui-text-muted"
        :disabled="transport.duration.value <= 0"
        @click="togglePlayback"
      >
        {{ transport.isPlaying.value ? "Pause" : "Play" }}
      </button>

      <label class="grid gap-1 text-xs uppercase tracking-[0.18em] text-ui-text-muted">
        Timeline
        <input
          type="range"
          min="0"
          :max="transport.duration.value"
          step="any"
          :value="transport.currentTime.value"
          class="w-full accent-sky-400"
          :disabled="transport.duration.value <= 0"
          @input="onScrub"
        />
      </label>
    </div>

    <div class="grid gap-4 border-t border-ui-border-subtle px-4 py-4 text-sm text-slate-300">
      <div class="grid gap-2">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-xs font-semibold uppercase tracking-[0.18em] text-ui-text-muted">
            Segment Timing
          </h3>
          <p class="font-mono text-xs text-ui-text-muted">
            {{ wrapFixture.segments.length }} segments
          </p>
        </div>

        <div
          class="flex h-8 overflow-hidden rounded-md border border-ui-border-subtle bg-slate-950"
        >
          <div
            v-for="(summary, index) in segmentSummaries"
            :key="`${wrapFixture.id}-segment-${index}`"
            class="grid min-w-8 place-items-center border-r border-slate-900 px-1 text-[0.65rem] font-semibold text-slate-100 last:border-r-0"
            :class="index === activeSegmentIndex ? 'bg-sky-500/70' : 'bg-slate-800/70'"
            :style="{ flex: `${summary.durationUnits} 1 0` }"
            :title="`${summary.label}: ${formatNumber(summary.durationUnits)} beats`"
          >
            {{ index + 1 }}
          </div>
        </div>
      </div>

      <div
        v-if="speedDiagnostics"
        class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,1.25fr)]"
      >
        <div class="grid gap-2">
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-xs font-semibold uppercase tracking-[0.18em] text-ui-text-muted">
              Head Speed
            </h3>
            <p class="font-mono text-xs text-ui-text-muted">
              max {{ formatNumber(speedDiagnostics.maxHeadSpeed) }} / hand
              {{ formatNumber(speedDiagnostics.maxHandSpeed) }}
            </p>
          </div>

          <div
            class="flex h-20 items-end gap-px rounded-md border border-ui-border-subtle bg-slate-950 p-2"
          >
            <div
              v-for="(bar, index) in speedDiagnostics.speedBars"
              :key="`${wrapFixture.id}-speed-${index}`"
              class="min-w-px flex-1 rounded-t-sm transition-colors"
              :class="bar.segmentIndex === activeSegmentIndex ? 'bg-sky-300' : 'bg-pink-400/65'"
              :style="{ height: `${bar.heightPercent}%` }"
            ></div>
          </div>
        </div>

        <div class="overflow-x-auto rounded-md border border-ui-border-subtle">
          <table class="min-w-full divide-y divide-slate-800 text-left text-xs">
            <thead class="bg-slate-900/70 text-ui-text-muted">
              <tr>
                <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Segment</th>
                <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Head</th>
                <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Beats</th>
                <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Hand Avg/Max</th>
                <th class="px-3 py-2 font-semibold uppercase tracking-[0.14em]">Head Avg/Max</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-900 bg-slate-950/60 font-mono text-slate-300">
              <tr
                v-for="row in speedDiagnostics.rows"
                :key="`${wrapFixture.id}-speed-row-${row.segmentIndex}`"
                :class="row.segmentIndex === activeSegmentIndex ? 'bg-sky-500/10 text-sky-100' : ''"
              >
                <td class="whitespace-nowrap px-3 py-2 font-sans text-slate-200">
                  {{ row.label }}
                </td>
                <td class="px-3 py-2">{{ row.headStartLabel }}</td>
                <td class="px-3 py-2">{{ formatNumber(row.durationUnits) }}</td>
                <td class="whitespace-nowrap px-3 py-2">
                  {{ formatNumber(row.handSpeedAverage) }} / {{ formatNumber(row.handSpeedMax) }}
                </td>
                <td class="whitespace-nowrap px-3 py-2">
                  {{ formatNumber(row.headSpeedAverage) }} / {{ formatNumber(row.headSpeedMax) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>
