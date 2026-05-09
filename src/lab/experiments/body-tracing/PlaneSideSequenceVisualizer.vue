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
import { createDefaultOverlaySettings } from "@/visualizer/overlaySettings";
import PoiCanvasViewport from "@/visualizer/PoiCanvasViewport.vue";
import { useVisualizerCore } from "@/visualizer/useVisualizerCore";

type PatternDefinition = {
  id: string;
  name: string;
  description: string;
  segments: Segment[];
};

type PhaseSegmentInput = {
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
  readonly durationShare: number;
  readonly headStartLabel: string;
  readonly handKind: string;
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
const RIGHT = 0;
const LEFT = Math.PI;
const UP = Math.PI / 2;
const DOWN = (3 / 2) * Math.PI;
const HEAD_RADIUS = 0.6;
const LANDMARK_HAND_OFFSET = 0.78;
const DIAGNOSTIC_SAMPLE_COUNT = 180;
const DIAGNOSTIC_RIG_ID = "right";

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

function makePhaseSegment(input: PhaseSegmentInput): Segment {
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
              label: "smooth transfer",
              evalPose: (startPose, context) =>
                evalSmoothTransferHand(startPose, input.handStart, input.handEnd, context)
            }
          },
    head: {
      startPose: { phaseAbs: input.phaseStart, radius: HEAD_RADIUS },
      driver: {
        kind: "circle",
        omega: (input.phaseEnd - input.phaseStart) / input.durationUnits
      }
    }
  };
}

function makeLandmarkPhaseScheduleWrap(): Segment[] {
  const rightHand = { x: LANDMARK_HAND_OFFSET, y: 0 };
  const leftHand = { x: -LANDMARK_HAND_OFFSET, y: 0 };

  return [
    makePhaseSegment({
      durationUnits: 1,
      handStart: rightHand,
      handEnd: rightHand,
      phaseStart: 0,
      phaseEnd: TAU,
      planeSide: "b"
    }),
    makePhaseSegment({
      durationUnits: 0.5,
      handStart: rightHand,
      handEnd: leftHand,
      phaseStart: TAU,
      phaseEnd: TAU + LEFT,
      planeSide: "a"
    }),
    makePhaseSegment({
      durationUnits: 1,
      handStart: leftHand,
      handEnd: leftHand,
      phaseStart: TAU + LEFT,
      phaseEnd: 2 * TAU + LEFT,
      planeSide: "b"
    }),
    makePhaseSegment({
      durationUnits: 0.5,
      handStart: leftHand,
      handEnd: rightHand,
      phaseStart: 2 * TAU + LEFT,
      phaseEnd: 3 * TAU,
      planeSide: "a"
    })
  ];
}

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
    { phase: RIGHT, label: "0" },
    { phase: UP, label: "90" },
    { phase: LEFT, label: "180" },
    { phase: DOWN, label: "270" }
  ];
  const match = cardinals.find((cardinal) => Math.abs(phase - cardinal.phase) <= 1e-9);
  if (match) return match.label;

  return ((phase * 180) / Math.PI).toFixed(0);
}

const selectedPattern: PatternDefinition = {
  id: "landmark-phase-schedule",
  name: "Landmark phase schedule",
  description:
    "Four-segment schedule: circles on back side b, runtime-eased transfer arcs on front side a.",
  segments: makeLandmarkPhaseScheduleWrap()
};

const sideSequence = computed<MultiRigSequence>(() => ({
  rigs: [
    {
      rigId: "right",
      sequence: {
        segments: selectedPattern.segments
      }
    }
  ]
}));

const core = useVisualizerCore(sideSequence, {
  autoplay: true,
  resumeOnSequenceChange: true,
  transportOptions: {
    initialSpeed: 0.45
  }
});
core.session.setProjectionMode("orthographic");
core.session.setTrailDecaySteps(180);

const overlaySettings = computed(() => {
  const settings = createDefaultOverlaySettings(core.rigOrder.value);
  settings.visibility.showHandTrails = true;
  settings.visibility.showHeadTrails = true;
  return settings;
});

const activeSegmentIndex = computed(() => {
  const frame = core.session.currentFrame.value;
  if (!frame?.ok) return null;

  return frame.evaluatedPoses[DIAGNOSTIC_RIG_ID]?.segmentIndex ?? null;
});

const currentTimeLabel = computed(() => core.transport.currentTime.value.toFixed(2));
const durationLabel = computed(() => core.transport.duration.value.toFixed(2));
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
  selectedPattern.segments.map((segment, index) => ({
    label: describeSegment(segment, index),
    durationUnits: segment.durationUnits,
    handKind: getSegmentHandKind(segment)
  }))
);

const speedDiagnostics = computed<SpeedDiagnostics | null>(() => {
  const prepared = core.session.playback.prepared.value;
  if (!prepared || prepared.maxSequenceDuration <= 0) return null;

  const rig = prepared.rigs.find((entry) => entry.rigId === DIAGNOSTIC_RIG_ID) ?? prepared.rigs[0];
  if (!rig) return null;

  const duration = prepared.maxSequenceDuration;
  const velocityDt = Math.max(duration / 1200, 1e-4);
  const rows: SpeedAggregate[] = rig.prepared.segments.map((segment, index) => ({
    segmentIndex: index,
    label: describeSegment(segment, index),
    durationUnits: segment.durationUnits,
    durationShare: segment.durationUnits / duration,
    headStartLabel: formatPhaseCardinal(segment.head.startPose.phaseAbs),
    handKind: getSegmentHandKind(segment),
    handSpeedSum: 0,
    handSpeedMax: 0,
    headSpeedSum: 0,
    headSpeedMax: 0,
    sampleCount: 0
  }));
  const speedSeries: { headSpeed: number; segmentIndex: number }[] = [];

  for (let index = 0; index < DIAGNOSTIC_SAMPLE_COUNT; index += 1) {
    const t = (duration * (index + 0.5)) / DIAGNOSTIC_SAMPLE_COUNT;
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
  const safeMaxHeadSpeed = Math.max(maxHeadSpeed, 1e-6);

  return {
    rows: rows.map((row) => ({
      ...row,
      handSpeedAverage: row.sampleCount > 0 ? row.handSpeedSum / row.sampleCount : 0,
      headSpeedAverage: row.sampleCount > 0 ? row.headSpeedSum / row.sampleCount : 0
    })),
    speedBars: speedSeries.map((sample) => ({
      heightPercent: Math.max(4, (sample.headSpeed / safeMaxHeadSpeed) * 100),
      segmentIndex: sample.segmentIndex
    })),
    maxHandSpeed,
    maxHeadSpeed
  };
});

function togglePlayback() {
  core.transport.toggle();
}

function onScrub(event: Event) {
  core.transport.setCurrentTime(Number((event.target as HTMLInputElement).value));
}
</script>

<template>
  <section class="lab-live-cell overflow-hidden rounded-lg border border-slate-800 bg-slate-950/80">
    <header class="grid gap-3 border-b border-slate-800 px-4 py-3 md:items-start">
      <div class="min-w-0">
        <p class="text-xs uppercase tracking-[0.2em] text-slate-500">Engine Playback</p>
        <h2 class="mt-1 text-lg font-semibold text-slate-100">{{ selectedPattern.name }}</h2>
        <p class="mt-1 text-sm leading-6 text-slate-400">
          {{ selectedPattern.description }}
        </p>
      </div>

      <dl class="grid grid-cols-2 gap-x-5 gap-y-1 text-xs text-slate-400 md:text-right">
        <div>
          <dt class="uppercase tracking-[0.18em] text-slate-600">Time</dt>
          <dd class="font-mono text-slate-300">{{ currentTimeLabel }} / {{ durationLabel }}</dd>
        </div>
        <div>
          <dt class="uppercase tracking-[0.18em] text-slate-600">Active</dt>
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
      :display-scale="1"
      :is-fullscreen="false"
      :overlay-settings="overlaySettings"
      :poses="core.cartesianPoses.value"
      :projection-drag="null"
      :rig-order="core.rigOrder.value"
      :scene-world-radius="core.sceneWorldRadius.value"
      :trails="core.trails.value"
      :webcam-active="false"
      :webcam-stream="null"
    />

    <div
      class="grid gap-4 border-t border-slate-800 px-4 py-3 text-sm text-slate-300 md:grid-cols-[auto_minmax(10rem,1fr)] md:items-center"
    >
      <button
        type="button"
        class="rounded-md border border-slate-700 px-3 py-2 font-medium text-slate-100 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:text-slate-500"
        :disabled="core.transport.duration.value <= 0"
        @click="togglePlayback"
      >
        {{ core.transport.isPlaying.value ? "Pause" : "Play" }}
      </button>

      <label class="grid gap-1 text-xs uppercase tracking-[0.18em] text-slate-500">
        Timeline
        <input
          type="range"
          min="0"
          :max="core.transport.duration.value"
          step="any"
          :value="core.transport.currentTime.value"
          class="w-full accent-sky-400"
          :disabled="core.transport.duration.value <= 0"
          @input="onScrub"
        />
      </label>
    </div>

    <div class="grid gap-4 border-t border-slate-800 px-4 py-4 text-sm text-slate-300">
      <div class="grid gap-2">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Segment Timing
          </h3>
          <p class="font-mono text-xs text-slate-500">
            {{ selectedPattern.segments.length }} segments
          </p>
        </div>

        <div class="flex h-8 overflow-hidden rounded-md border border-slate-800 bg-slate-950">
          <div
            v-for="(summary, index) in segmentSummaries"
            :key="`${selectedPattern.id}-segment-${index}`"
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
            <h3 class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Head Speed
            </h3>
            <p class="font-mono text-xs text-slate-500">
              max {{ formatNumber(speedDiagnostics.maxHeadSpeed) }} / hand
              {{ formatNumber(speedDiagnostics.maxHandSpeed) }}
            </p>
          </div>

          <div
            class="flex h-20 items-end gap-px rounded-md border border-slate-800 bg-slate-950 p-2"
          >
            <div
              v-for="(bar, index) in speedDiagnostics.speedBars"
              :key="`${selectedPattern.id}-speed-${index}`"
              class="min-w-px flex-1 rounded-t-sm transition-colors"
              :class="bar.segmentIndex === activeSegmentIndex ? 'bg-sky-300' : 'bg-pink-400/65'"
              :style="{ height: `${bar.heightPercent}%` }"
            ></div>
          </div>
        </div>

        <div class="overflow-x-auto rounded-md border border-slate-800">
          <table class="min-w-full divide-y divide-slate-800 text-left text-xs">
            <thead class="bg-slate-900/70 text-slate-500">
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
                :key="`${selectedPattern.id}-speed-row-${row.segmentIndex}`"
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
