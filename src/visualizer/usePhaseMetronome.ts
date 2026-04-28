import { computed, ref, watch, type ComputedRef, type Ref } from "vue";

import type { PreparedMultiRigSequence, PreparedRigSequenceEntry } from "@/engine/multirig";
import type { RigId, TimeUnit } from "@/engine/types";
import type { PlaybackEvalSuccess, PlaybackEvaluateResult } from "@/visualizer/useMultiRigPlayback";

const TAU = Math.PI * 2;
const DEFAULT_TARGET_RAD = 0;
const MAX_SCHEDULING_WINDOW_SEC = 0.02;
const MIN_SCHEDULING_OFFSET_SEC = 0.005;
const CLICK_DURATION_SEC = 0.06;
const CLICK_PEAK_GAIN = 0.12;
const ZERO_EPSILON = 1e-9;

export type MetronomeToneId = "low" | "mid" | "high" | "accent";

const METRONOME_TONE_FREQUENCIES: Record<MetronomeToneId, number> = {
  low: 440,
  mid: 660,
  high: 880,
  accent: 1320
};

export type MetronomeAbsoluteSource = {
  kind: "absolute";
  rigId: RigId;
  node: "hand" | "head";
};

export type MetronomeRelativeHeadMinusHandSource = {
  kind: "relative-head-minus-hand";
  rigId: RigId;
};

export type MetronomeSource = MetronomeAbsoluteSource | MetronomeRelativeHeadMinusHandSource;

export interface MetronomeRule {
  readonly id: string;
  readonly enabled: boolean;
  readonly source: MetronomeSource;
  readonly targetRad: number;
  readonly tone: MetronomeToneId;
}

export type MetronomeRuleDraft = Omit<MetronomeRule, "id">;

export interface MetronomeEvent {
  readonly ruleId: string;
  readonly sourceKind: MetronomeSource["kind"];
  readonly tone: MetronomeToneId;
  readonly frameTimeUnits: TimeUnit;
  readonly crossingTimeUnits: TimeUnit;
  readonly scheduledOffsetSec: number;
}

export interface PhaseMetronomeOptions {
  readonly currentFrame: Ref<PlaybackEvaluateResult | null>;
  readonly prepared: Ref<PreparedMultiRigSequence | null>;
  readonly currentTime: Ref<TimeUnit>;
  readonly duration: Ref<TimeUnit>;
  readonly isPlaying: Ref<boolean>;
  readonly speed: Ref<number>;
  readonly unitsPerSecond: Ref<number>;
  readonly onRuleAdded?: () => void;
}

export interface PhaseMetronomeController {
  readonly rules: Ref<MetronomeRule[]>;
  readonly rigIds: ComputedRef<RigId[]>;
  readonly lastEvents: Ref<MetronomeEvent[]>;
  readonly isAudioEnabled: Ref<boolean>;
  readonly isMuted: Ref<boolean>;
  readonly audioErrorMessage: Ref<string | null>;
  addRule: (rule?: MetronomeRuleDraft) => void;
  updateRule: (ruleId: string, nextRule: MetronomeRuleDraft) => void;
  removeRule: (ruleId: string) => void;
  clearRules: () => void;
  resetSamples: () => void;
  setAudioEnabled: (enabled: boolean) => Promise<void>;
  setMuted: (muted: boolean) => void;
  dispose: () => void;
}

type WebkitAudioGlobal = typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

type Crossing = {
  readonly crossingPhase: number;
  readonly fraction: number;
};

export function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

export function createDefaultMetronomeRule(rigId: RigId): MetronomeRuleDraft {
  return {
    enabled: true,
    source: { kind: "absolute", rigId, node: "head" },
    targetRad: DEFAULT_TARGET_RAD,
    tone: "accent"
  };
}

function cloneRule(rule: MetronomeRuleDraft, id: string): MetronomeRule {
  return {
    id,
    enabled: rule.enabled,
    source: { ...rule.source },
    targetRad: rule.targetRad,
    tone: rule.tone
  };
}

function getRuleRigId(source: MetronomeSource): RigId {
  return source.rigId;
}

function getAudioContextConstructor(): typeof AudioContext | undefined {
  return globalThis.AudioContext ?? (globalThis as WebkitAudioGlobal).webkitAudioContext;
}

function scheduleClick(context: AudioContext, offsetSec: number, frequencyHz: number) {
  const when = context.currentTime + Math.max(offsetSec, MIN_SCHEDULING_OFFSET_SEC);
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequencyHz, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.linearRampToValueAtTime(CLICK_PEAK_GAIN, when + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + CLICK_DURATION_SEC);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(when);
  oscillator.stop(when + CLICK_DURATION_SEC);
}

function getPreparedRigById(
  prepared: PreparedMultiRigSequence | null,
  rigId: RigId
): PreparedRigSequenceEntry | null {
  if (!prepared) return null;
  return prepared.rigs.find((rig) => rig.rigId === rigId) ?? null;
}

function getWrappedRigTime(
  prepared: PreparedRigSequenceEntry | null,
  segmentIndex: number,
  tLocal: TimeUnit
): TimeUnit | null {
  if (!prepared) return null;
  const placement = prepared.prepared.placements[segmentIndex];
  if (!placement) return null;
  return placement.startUnit + tLocal;
}

function getLastSegmentIndex(prepared: PreparedRigSequenceEntry | null): number | null {
  if (!prepared || prepared.prepared.placements.length === 0) return null;
  return prepared.prepared.placements.length - 1;
}

function resolveSourcePhase(source: MetronomeSource, frame: PlaybackEvalSuccess): number | null {
  const rig = frame.evaluatedPoses[source.rigId];
  if (!rig) return null;

  switch (source.kind) {
    case "absolute":
      return source.node === "hand" ? rig.pose.handPose.phaseAbs : rig.pose.headPose.phaseAbs;
    case "relative-head-minus-hand":
      return rig.pose.headPose.phaseAbs - rig.pose.handPose.phaseAbs;
  }
}

function resolveSourceOmega(
  source: MetronomeSource,
  preparedRig: PreparedRigSequenceEntry | null,
  segmentIndex: number
): number | null {
  if (!preparedRig) return null;

  const placement = preparedRig.prepared.placements[segmentIndex];
  if (!placement) return null;

  switch (source.kind) {
    case "absolute":
      return source.node === "hand"
        ? placement.segment.hand.driver.omega
        : placement.segment.head.driver.omega;
    case "relative-head-minus-hand":
      return placement.segment.head.driver.omega - placement.segment.hand.driver.omega;
  }
}

function findCrossings(prevPhase: number, nextPhase: number, target: number): Crossing[] {
  const delta = nextPhase - prevPhase;
  if (Math.abs(delta) <= ZERO_EPSILON) {
    return [];
  }

  const crossings: Crossing[] = [];

  if (delta > 0) {
    const firstTurn = Math.floor((prevPhase - target) / TAU) + 1;
    const lastTurn = Math.floor((nextPhase - target) / TAU);

    for (let turn = firstTurn; turn <= lastTurn; turn += 1) {
      const crossingPhase = target + turn * TAU;
      const fraction = (crossingPhase - prevPhase) / delta;
      crossings.push({ crossingPhase, fraction });
    }

    return crossings;
  }

  const firstTurn = Math.ceil((prevPhase - target) / TAU) - 1;
  const lastTurn = Math.ceil((nextPhase - target) / TAU);

  for (let turn = firstTurn; turn >= lastTurn; turn -= 1) {
    const crossingPhase = target + turn * TAU;
    const fraction = (crossingPhase - prevPhase) / delta;
    crossings.push({ crossingPhase, fraction });
  }

  return crossings;
}

function unitsToSeconds(units: TimeUnit, speed: number, unitsPerSecond: number): number {
  const scale = speed * unitsPerSecond;
  if (!Number.isFinite(scale) || scale <= 0) {
    return 0;
  }

  return units / scale;
}

function toMetronomeEvents(
  rule: MetronomeRule,
  crossings: readonly Crossing[],
  frameStartUnits: TimeUnit,
  frameEndUnits: TimeUnit,
  speed: number,
  unitsPerSecond: number
): MetronomeEvent[] {
  const frameDeltaUnits = Math.abs(frameEndUnits - frameStartUnits);
  const schedulingWindowSec = Math.min(
    unitsToSeconds(frameDeltaUnits, speed, unitsPerSecond),
    MAX_SCHEDULING_WINDOW_SEC
  );

  return crossings.map((crossing) => ({
    ruleId: rule.id,
    sourceKind: rule.source.kind,
    tone: rule.tone,
    frameTimeUnits: frameEndUnits,
    crossingTimeUnits: frameStartUnits + (frameEndUnits - frameStartUnits) * crossing.fraction,
    scheduledOffsetSec: MIN_SCHEDULING_OFFSET_SEC + crossing.fraction * schedulingWindowSec
  }));
}

export function usePhaseMetronome(options: PhaseMetronomeOptions): PhaseMetronomeController {
  const rules = ref<MetronomeRule[]>([]);
  const lastEvents = ref<MetronomeEvent[]>([]);
  const isAudioEnabled = ref(false);
  const isMuted = ref(false);
  const audioErrorMessage = ref<string | null>(null);
  const rigIds = computed(() => options.prepared.value?.rigs.map((rig) => rig.rigId) ?? []);

  const previousRulePhases = new Map<string, number>();
  const previousRigSegmentIndex = new Map<RigId, number>();
  const previousRigWrappedTime = new Map<RigId, TimeUnit>();
  let previousTime: TimeUnit | null = null;
  let nextRuleId = 1;
  let audioContext: AudioContext | null = null;

  const resetSamples = () => {
    previousRulePhases.clear();
    previousRigSegmentIndex.clear();
    previousRigWrappedTime.clear();
    previousTime = null;
    lastEvents.value = [];
  };

  const clearRules = () => {
    rules.value = [];
    resetSamples();
  };

  const setAudioEnabled = async (enabled: boolean) => {
    isAudioEnabled.value = enabled;
    audioErrorMessage.value = null;

    if (!enabled) {
      if (audioContext && audioContext.state !== "closed") {
        await audioContext.suspend();
      }
      return;
    }

    const AudioContextCtor = getAudioContextConstructor();
    if (!AudioContextCtor) {
      isAudioEnabled.value = false;
      audioErrorMessage.value = "Web Audio is not available in this browser.";
      return;
    }

    if (!audioContext || audioContext.state === "closed") {
      audioContext = new AudioContextCtor();
    }

    await audioContext.resume();
  };

  const setMuted = (muted: boolean) => {
    isMuted.value = muted;
  };

  const addRule = (rule?: MetronomeRuleDraft) => {
    const defaultRigId = rigIds.value[0];
    if (!rule && !defaultRigId) {
      return;
    }

    const nextRule = rule ?? createDefaultMetronomeRule(defaultRigId);
    rules.value = [...rules.value, cloneRule(nextRule, `metronome-rule-${nextRuleId++}`)];
    options.onRuleAdded?.();
  };

  const updateRule = (ruleId: string, nextRule: MetronomeRuleDraft) => {
    rules.value = rules.value.map((rule) =>
      rule.id === ruleId ? cloneRule(nextRule, rule.id) : rule
    );
    previousRulePhases.delete(ruleId);
  };

  const removeRule = (ruleId: string) => {
    rules.value = rules.value.filter((rule) => rule.id !== ruleId);
    previousRulePhases.delete(ruleId);
  };

  const syncSamplesFromFrame = (frame: PlaybackEvalSuccess, frameTime: TimeUnit) => {
    previousTime = frameTime;

    for (const rule of rules.value) {
      const phase = resolveSourcePhase(rule.source, frame);
      if (phase === null) {
        previousRulePhases.delete(rule.id);
        continue;
      }

      previousRulePhases.set(rule.id, phase);
    }

    for (const [rigId, rigPose] of Object.entries(frame.evaluatedPoses)) {
      const preparedRig = getPreparedRigById(options.prepared.value, rigId);
      previousRigSegmentIndex.set(rigId, rigPose.segmentIndex);
      const wrappedTime = getWrappedRigTime(preparedRig, rigPose.segmentIndex, rigPose.tLocal);
      if (wrappedTime === null) {
        previousRigWrappedTime.delete(rigId);
        continue;
      }

      previousRigWrappedTime.set(rigId, wrappedTime);
    }
  };

  const emitAudio = (events: readonly MetronomeEvent[]) => {
    if (!isAudioEnabled.value || isMuted.value || !audioContext) {
      return;
    }

    for (const event of events) {
      scheduleClick(audioContext, event.scheduledOffsetSec, METRONOME_TONE_FREQUENCIES[event.tone]);
    }
  };

  const stopPreparedWatch = watch(
    () => options.prepared.value,
    () => {
      clearRules();
    }
  );

  const stopPlaybackWatch = watch(
    () => options.currentFrame.value,
    (frameResult) => {
      lastEvents.value = [];

      const currentTime = options.currentTime.value;
      const duration = options.duration.value;
      const isPlaying = options.isPlaying.value;
      const speed = options.speed.value;
      const unitsPerSecond = options.unitsPerSecond.value;

      if (!frameResult?.ok || !options.prepared.value) {
        resetSamples();
        return;
      }

      if (!isPlaying) {
        syncSamplesFromFrame(frameResult, currentTime);
        return;
      }

      if (previousTime === null || currentTime === previousTime) {
        syncSamplesFromFrame(frameResult, currentTime);
        return;
      }

      const nextEvents: MetronomeEvent[] = [];
      const wrappedTransport = currentTime < previousTime;

      for (const rule of rules.value) {
        if (!rule.enabled) {
          continue;
        }

        const rigId = getRuleRigId(rule.source);
        const prevPhase = previousRulePhases.get(rule.id);
        if (prevPhase === undefined) {
          continue;
        }

        const currentPhase = resolveSourcePhase(rule.source, frameResult);
        if (currentPhase === null) {
          continue;
        }

        const rigPose = frameResult.evaluatedPoses[rigId];
        if (!rigPose) {
          continue;
        }

        const prevSegmentIndex = previousRigSegmentIndex.get(rigId);
        const preparedRig = getPreparedRigById(options.prepared.value, rigId);
        const prevWrappedTime = previousRigWrappedTime.get(rigId);
        const currentWrappedTime = getWrappedRigTime(
          preparedRig,
          rigPose.segmentIndex,
          rigPose.tLocal
        );

        if (
          prevSegmentIndex === undefined ||
          prevWrappedTime === undefined ||
          currentWrappedTime === null
        ) {
          continue;
        }

        const wrappedRig = currentWrappedTime < prevWrappedTime;

        if (wrappedTransport) {
          if (currentTime !== 0) {
            resetSamples();
            syncSamplesFromFrame(frameResult, currentTime);
            return;
          }

          const lastSegmentIndex = getLastSegmentIndex(preparedRig);
          if (lastSegmentIndex === null || prevSegmentIndex !== lastSegmentIndex) {
            continue;
          }

          const omega = resolveSourceOmega(rule.source, preparedRig, prevSegmentIndex);
          if (omega === null) {
            continue;
          }

          const tailUnits = duration - previousTime;
          if (tailUnits <= ZERO_EPSILON) {
            continue;
          }

          const tailPhase = prevPhase + omega * tailUnits;
          const crossings = findCrossings(prevPhase, tailPhase, rule.targetRad);
          nextEvents.push(
            ...toMetronomeEvents(rule, crossings, previousTime, duration, speed, unitsPerSecond)
          );
          continue;
        }

        if (wrappedRig || rigPose.segmentIndex !== prevSegmentIndex) {
          continue;
        }

        const crossings = findCrossings(prevPhase, currentPhase, rule.targetRad);
        nextEvents.push(
          ...toMetronomeEvents(rule, crossings, previousTime, currentTime, speed, unitsPerSecond)
        );
      }

      lastEvents.value = nextEvents;
      emitAudio(nextEvents);
      syncSamplesFromFrame(frameResult, currentTime);
    },
    { flush: "sync" }
  );

  const dispose = () => {
    stopPreparedWatch();
    stopPlaybackWatch();
    resetSamples();
    if (audioContext && audioContext.state !== "closed") {
      void audioContext.close();
    }
    audioContext = null;
  };

  return {
    rules,
    rigIds,
    lastEvents,
    isAudioEnabled,
    isMuted,
    audioErrorMessage,
    addRule,
    updateRule,
    removeRule,
    clearRules,
    resetSamples,
    setAudioEnabled,
    setMuted,
    dispose
  };
}
