import {
  computed,
  ref,
  toValue,
  watch,
  watchEffect,
  type ComputedRef,
  type MaybeRefOrGetter,
  type Ref
} from "vue";

import { createTransport, type TransportController } from "@/composables/useTransport";
import type { PreparedMultiRigSequence } from "@/engine/multirig";
import {
  DEFAULT_TILTED_PROJECTION_PITCH_DEG,
  DEFAULT_TILTED_PROJECTION_YAW_DEG,
  type PlaneProjectionSettings,
  type ProjectionMode,
  type ProjectionModePreference
} from "@/engine/planeProjection";
import type { MultiRigSequence, PlaneSide } from "@/engine/types";
import type { PlaneSideDisplaySettings } from "@/visualizer/planeSideDisplay";
import {
  useMultiRigPlayback,
  type MultiRigPlaybackController,
  type MultiRigTrailSamples,
  type PlaybackEvaluateResult,
  type TrailLoopMode
} from "@/visualizer/useMultiRigPlayback";

export const TRAIL_STEP_FIXED = 0.01;
export const TRAIL_DECAY_MIN = 2;
export const TRAIL_DECAY_MAX = 250;
export const TRAIL_DECAY_DEFAULT = 100;
export const PROJECTION_YAW_MIN = -60;
export const PROJECTION_YAW_MAX = 60;
export const PROJECTION_YAW_STEP = 1;
export const PROJECTION_PITCH_MIN = -45;
export const PROJECTION_PITCH_MAX = 45;
export const PROJECTION_PITCH_STEP = 1;
export const PLANE_SIDE_DEPTH_MIN = 0;
export const PLANE_SIDE_DEPTH_MAX = 1;
export const PLANE_SIDE_DEPTH_STEP = 0.01;
export const PLANE_SIDE_DEPTH_DEFAULT = 0.12;
export const PLANE_SIDE_DISPLAY_DEFAULT_SIDE: PlaneSide = "a";

export interface VisualizerSessionOptions {
  readonly autoplay?: boolean;
  readonly resumeOnSequenceChange?: boolean;
}

export interface VisualizerSession {
  readonly transport: TransportController;
  readonly playback: MultiRigPlaybackController;
  readonly currentFrame: Ref<PlaybackEvaluateResult | null>;
  readonly currentTrails: ComputedRef<MultiRigTrailSamples>;
  readonly trailDecaySteps: Ref<number>;
  readonly trailLoopMode: Ref<TrailLoopMode>;
  readonly projectionMode: Ref<ProjectionModePreference>;
  readonly projectionYawDeg: Ref<number>;
  readonly projectionPitchDeg: Ref<number>;
  readonly projectionSettings: ComputedRef<PlaneProjectionSettings>;
  readonly planeSideADepthWorld: Ref<number>;
  readonly planeSideBDepthWorld: Ref<number>;
  readonly planeSideDisplaySettings: ComputedRef<PlaneSideDisplaySettings>;
  readonly errorMessage: ComputedRef<string | null>;
  readonly isReady: ComputedRef<boolean>;
  setTrailDecaySteps: (value: number) => void;
  setTrailLoopMode: (value: TrailLoopMode) => void;
  setProjectionMode: (value: ProjectionModePreference) => void;
  setProjectionYawDeg: (value: number) => void;
  setProjectionPitchDeg: (value: number) => void;
  setPlaneSideDepthsWorld: (sideADepthWorld: number, sideBDepthWorld: number) => void;
  dispose: () => void;
}

function clampTrailDecaySteps(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return TRAIL_DECAY_DEFAULT;
  return Math.min(Math.max(Math.floor(value), TRAIL_DECAY_MIN), TRAIL_DECAY_MAX);
}

function clampProjectionDegrees(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

function clampPlaneSideDepthWorld(value: number): number {
  if (!Number.isFinite(value)) return PLANE_SIDE_DEPTH_DEFAULT;
  return Math.min(Math.max(value, PLANE_SIDE_DEPTH_MIN), PLANE_SIDE_DEPTH_MAX);
}

function preparedUsesNonWallPlane(prepared: PreparedMultiRigSequence | null): boolean {
  return (
    prepared?.rigs.some((rig) =>
      rig.prepared.segments.some((segment) => segment.planeId !== "wall")
    ) ?? false
  );
}

function resolveProjectionMode(
  preference: ProjectionModePreference,
  prepared: PreparedMultiRigSequence | null
): ProjectionMode {
  if (preference !== "auto") return preference;
  return preparedUsesNonWallPlane(prepared) ? "tilted" : "orthographic";
}

function formatPrepareErrors(codes: readonly { code: string }[]): string {
  return codes.map((error) => error.code).join(", ");
}

export function useVisualizerSession(
  sequence: MaybeRefOrGetter<MultiRigSequence>,
  transport: TransportController = createTransport(),
  options: VisualizerSessionOptions = {}
): VisualizerSession {
  const currentFrame = ref<PlaybackEvaluateResult | null>(null);
  const trailDecaySteps = ref<number>(TRAIL_DECAY_DEFAULT);
  const trailLoopMode = ref<TrailLoopMode>("auto");
  const projectionMode = ref<ProjectionModePreference>("auto");
  const projectionYawDeg = ref<number>(DEFAULT_TILTED_PROJECTION_YAW_DEG);
  const projectionPitchDeg = ref<number>(DEFAULT_TILTED_PROJECTION_PITCH_DEG);
  const planeSideADepthWorld = ref<number>(PLANE_SIDE_DEPTH_DEFAULT);
  const planeSideBDepthWorld = ref<number>(PLANE_SIDE_DEPTH_DEFAULT);
  const playbackRef: { current: MultiRigPlaybackController | null } = { current: null };
  const projectionSettings = computed<PlaneProjectionSettings>(() => ({
    mode: resolveProjectionMode(projectionMode.value, playbackRef.current?.prepared.value ?? null),
    yawDeg: projectionYawDeg.value,
    pitchDeg: projectionPitchDeg.value
  }));
  const planeSideDisplaySettings = computed<PlaneSideDisplaySettings>(() => ({
    sideADepthWorld: planeSideADepthWorld.value,
    sideBDepthWorld: planeSideBDepthWorld.value,
    defaultSide: PLANE_SIDE_DISPLAY_DEFAULT_SIDE
  }));
  const playback = useMultiRigPlayback(
    () => toValue(sequence),
    projectionSettings,
    planeSideDisplaySettings
  );
  playbackRef.current = playback;

  const stopPreparedWatch = watch(
    () => playback.prepared.value,
    (prepared) => {
      const wasPlaying = transport.isPlaying.value;
      const shouldAutoplay =
        options.autoplay === true &&
        currentFrame.value === null &&
        transport.currentTime.value === 0;
      const shouldResume =
        options.resumeOnSequenceChange === true && (wasPlaying || shouldAutoplay);

      transport.pause();
      transport.reset();
      transport.setDuration(prepared?.maxSequenceDuration ?? 0);
      currentFrame.value = null;

      if (prepared && shouldResume) {
        transport.play();
      }
    },
    { immediate: true }
  );

  const stopEvaluationWatch = watchEffect(() => {
    if (!playback.prepared.value) {
      currentFrame.value = null;
      return;
    }

    const result = playback.evaluate(transport.currentTime.value);
    currentFrame.value = result;

    if (!result.ok) {
      transport.pause();
    }
  });

  const currentTrails = computed<MultiRigTrailSamples>(() => {
    const prepared = playback.prepared.value;
    if (!prepared) return {};
    const t = transport.currentTime.value;
    if (t < 0 || (t === 0 && trailLoopMode.value === "off")) return {};
    return playback.sampleTrails(t, TRAIL_STEP_FIXED, trailDecaySteps.value, {
      loopMode: trailLoopMode.value,
      loopDuration: prepared.maxSequenceDuration
    });
  });

  const setTrailDecaySteps = (value: number) => {
    trailDecaySteps.value = clampTrailDecaySteps(value);
  };

  const setTrailLoopMode = (value: TrailLoopMode) => {
    trailLoopMode.value = value === "auto" ? "auto" : "off";
  };

  const setProjectionMode = (value: ProjectionModePreference) => {
    projectionMode.value = value === "tilted" || value === "orthographic" ? value : "auto";
  };

  const setProjectionYawDeg = (value: number) => {
    projectionYawDeg.value = clampProjectionDegrees(
      value,
      PROJECTION_YAW_MIN,
      PROJECTION_YAW_MAX,
      DEFAULT_TILTED_PROJECTION_YAW_DEG
    );
  };

  const setProjectionPitchDeg = (value: number) => {
    projectionPitchDeg.value = clampProjectionDegrees(
      value,
      PROJECTION_PITCH_MIN,
      PROJECTION_PITCH_MAX,
      DEFAULT_TILTED_PROJECTION_PITCH_DEG
    );
  };

  const setPlaneSideDepthsWorld = (sideADepth: number, sideBDepth: number) => {
    planeSideADepthWorld.value = clampPlaneSideDepthWorld(sideADepth);
    planeSideBDepthWorld.value = clampPlaneSideDepthWorld(sideBDepth);
  };

  const errorMessage = computed(() => {
    if (playback.prepareErrors.value.length > 0) {
      return `Sequence validation failed: ${formatPrepareErrors(playback.prepareErrors.value)}`;
    }

    if (currentFrame.value && !currentFrame.value.ok) {
      return `Playback evaluation failed: ${currentFrame.value.reason}`;
    }

    return null;
  });

  const isReady = computed(() => playback.prepared.value !== null && errorMessage.value === null);

  const dispose = () => {
    stopEvaluationWatch();
    stopPreparedWatch();
    playback.dispose();
  };

  return {
    transport,
    playback,
    currentFrame,
    currentTrails,
    trailDecaySteps,
    trailLoopMode,
    projectionMode,
    projectionYawDeg,
    projectionPitchDeg,
    projectionSettings,
    planeSideADepthWorld,
    planeSideBDepthWorld,
    planeSideDisplaySettings,
    errorMessage,
    isReady,
    setTrailDecaySteps,
    setTrailLoopMode,
    setProjectionMode,
    setProjectionYawDeg,
    setProjectionPitchDeg,
    setPlaneSideDepthsWorld,
    dispose
  };
}
