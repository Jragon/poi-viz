import { describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";

import { toCartesianMultiRigPose } from "@/engine/cartesian";
import { evalPreparedMultiRigSequenceAt, prepareMultiRigSequence } from "@/engine/multirig";
import { toWorldMultiRigPose } from "@/engine/planeProjection";
import type { MultiRigSequence, Segment, TimeUnit } from "@/engine/types";
import type { PlaybackEvalSuccess, PlaybackEvaluateResult } from "@/visualizer/useMultiRigPlayback";
import {
  createDefaultMetronomeRule,
  usePhaseMetronome,
  type MetronomeRuleDraft
} from "@/visualizer/usePhaseMetronome";

function makeSegment(
  handOmega: number,
  headOmega: number,
  startHandPhase = 0,
  startHeadPhase = 0
): Segment {
  return {
    durationUnits: 1,
    hand: {
      startPose: { phaseAbs: startHandPhase, radius: 1 },
      driver: { kind: "circle", omega: handOmega }
    },
    head: {
      startPose: { phaseAbs: startHeadPhase, radius: 1 },
      driver: { kind: "circle", omega: headOmega }
    }
  };
}

function makeSequence(segments: Segment[]): MultiRigSequence {
  return {
    rigs: [
      {
        rigId: "left",
        sequence: { segments }
      }
    ]
  };
}

function prepare(sequence: MultiRigSequence) {
  const result = prepareMultiRigSequence(sequence);
  if (!result.ok) {
    throw new Error(`failed to prepare sequence: ${JSON.stringify(result.errors)}`);
  }

  return result.prepared;
}

function createFrame(prepared: ReturnType<typeof prepare>, t: TimeUnit): PlaybackEvalSuccess {
  const result = evalPreparedMultiRigSequenceAt(prepared, t);
  if (!result.ok) {
    throw new Error(`failed to evaluate sequence at ${t}`);
  }

  const relativePoses = Object.fromEntries(
    Object.entries(result.poses).map(([rigId, value]) => [rigId, value.pose])
  );

  return {
    ok: true,
    evaluatedPoses: result.poses,
    relativePoses,
    worldPoses: toWorldMultiRigPose(result.poses),
    cartesianPoses: toCartesianMultiRigPose(relativePoses)
  };
}

function createHarness(sequence: MultiRigSequence) {
  const prepared = prepare(sequence);
  const preparedRef = ref(prepared);
  const currentFrame = ref<PlaybackEvaluateResult | null>(createFrame(prepared, 0));
  const currentTime = ref(0);
  const duration = ref(prepared.maxSequenceDuration);
  const isPlaying = ref(false);
  const speed = ref(1);
  const unitsPerSecond = ref(1);
  const rewind = vi.fn(() => {
    currentTime.value = 0;
    currentFrame.value = createFrame(preparedRef.value, 0);
  });

  const controller = usePhaseMetronome({
    currentFrame,
    prepared: preparedRef,
    currentTime,
    duration,
    isPlaying,
    speed,
    unitsPerSecond,
    onRuleAdded: rewind
  });

  const setSnapshot = async (t: TimeUnit, playing = isPlaying.value) => {
    isPlaying.value = playing;
    currentTime.value = t;
    currentFrame.value = createFrame(preparedRef.value, t);
    await nextTick();
  };

  const replacePrepared = async (nextSequence: MultiRigSequence) => {
    const nextPrepared = prepare(nextSequence);
    preparedRef.value = nextPrepared;
    duration.value = nextPrepared.maxSequenceDuration;
    currentTime.value = 0;
    currentFrame.value = createFrame(nextPrepared, 0);
    await nextTick();
  };

  return {
    controller,
    preparedRef,
    currentTime,
    rewind,
    setSnapshot,
    replacePrepared
  };
}

describe("usePhaseMetronome", () => {
  it("adds a default rule and rewinds transport via the add callback", async () => {
    const harness = createHarness(makeSequence([{ ...makeSegment(0, Math.PI), durationUnits: 1 }]));

    await harness.setSnapshot(0.4, false);
    harness.controller.addRule();
    await nextTick();

    expect(harness.rewind).toHaveBeenCalledTimes(1);
    expect(harness.currentTime.value).toBe(0);
    expect(harness.controller.rules.value).toHaveLength(1);
    expect(harness.controller.rules.value[0]).toMatchObject(createDefaultMetronomeRule("left"));

    harness.controller.dispose();
  });

  it("emits an absolute crossing event during forward motion", async () => {
    const harness = createHarness(
      makeSequence([{ ...makeSegment(0, Math.PI * 2), durationUnits: 1 }])
    );
    const rule: MetronomeRuleDraft = {
      enabled: true,
      source: { kind: "absolute", rigId: "left", node: "head" },
      targetRad: Math.PI / 2,
      tone: "low"
    };

    harness.controller.addRule(rule);
    await harness.setSnapshot(0.2, false);
    await harness.setSnapshot(0.3, true);

    expect(harness.controller.lastEvents.value).toHaveLength(1);
    expect(harness.controller.lastEvents.value[0].tone).toBe("low");
    expect(harness.controller.lastEvents.value[0].crossingTimeUnits).toBeCloseTo(0.25);

    harness.controller.dispose();
  });

  it("emits an absolute crossing event during reverse phase motion", async () => {
    const harness = createHarness(
      makeSequence([{ ...makeSegment(0, -Math.PI * 2), durationUnits: 1 }])
    );
    const rule: MetronomeRuleDraft = {
      enabled: true,
      source: { kind: "absolute", rigId: "left", node: "head" },
      targetRad: -Math.PI / 2,
      tone: "accent"
    };

    harness.controller.addRule(rule);
    await harness.setSnapshot(0.2, false);
    await harness.setSnapshot(0.3, true);

    expect(harness.controller.lastEvents.value).toHaveLength(1);
    expect(harness.controller.lastEvents.value[0].crossingTimeUnits).toBeCloseTo(0.25);

    harness.controller.dispose();
  });

  it("preserves ordering for multiple crossings in one frame", async () => {
    const harness = createHarness(
      makeSequence([{ ...makeSegment(0, Math.PI * 40), durationUnits: 1 }])
    );
    const rule: MetronomeRuleDraft = {
      enabled: true,
      source: { kind: "absolute", rigId: "left", node: "head" },
      targetRad: 0,
      tone: "accent"
    };

    harness.controller.addRule(rule);
    await harness.setSnapshot(0.05, false);
    await harness.setSnapshot(0.2, true);

    expect(harness.controller.lastEvents.value).toHaveLength(3);
    expect(harness.controller.lastEvents.value[0].scheduledOffsetSec).toBeLessThan(
      harness.controller.lastEvents.value[1].scheduledOffsetSec
    );
    expect(harness.controller.lastEvents.value[1].scheduledOffsetSec).toBeLessThan(
      harness.controller.lastEvents.value[2].scheduledOffsetSec
    );

    harness.controller.dispose();
  });

  it("emits distinct events for multiple enabled rules in the same frame", async () => {
    const harness = createHarness(
      makeSequence([{ ...makeSegment(0, Math.PI * 2), durationUnits: 1 }])
    );

    harness.controller.addRule({
      enabled: true,
      source: { kind: "absolute", rigId: "left", node: "head" },
      targetRad: Math.PI / 2,
      tone: "low"
    });
    harness.controller.addRule({
      enabled: true,
      source: { kind: "absolute", rigId: "left", node: "head" },
      targetRad: Math.PI,
      tone: "high"
    });

    await harness.setSnapshot(0.2, false);
    await harness.setSnapshot(0.55, true);

    expect(harness.controller.lastEvents.value).toHaveLength(2);
    expect(harness.controller.lastEvents.value.map((event) => event.tone)).toEqual(["low", "high"]);
    expect(harness.controller.lastEvents.value[0].crossingTimeUnits).toBeCloseTo(0.25);
    expect(harness.controller.lastEvents.value[1].crossingTimeUnits).toBeCloseTo(0.5);

    harness.controller.dispose();
  });

  it("does not emit while paused during scrubbing", async () => {
    const harness = createHarness(
      makeSequence([{ ...makeSegment(0, Math.PI * 2), durationUnits: 1 }])
    );
    const rule: MetronomeRuleDraft = {
      enabled: true,
      source: { kind: "absolute", rigId: "left", node: "head" },
      targetRad: Math.PI / 2,
      tone: "accent"
    };

    harness.controller.addRule(rule);
    await harness.setSnapshot(0.2, false);
    await harness.setSnapshot(0.9, false);

    expect(harness.controller.lastEvents.value).toEqual([]);

    harness.controller.dispose();
  });

  it("suppresses crossings across a segment boundary jump", async () => {
    const harness = createHarness(
      makeSequence([
        { ...makeSegment(0, Math.PI * 2), durationUnits: 0.5 },
        { ...makeSegment(0, 0, 0, Math.PI * 10), durationUnits: 0.5 }
      ])
    );
    const rule: MetronomeRuleDraft = {
      enabled: true,
      source: { kind: "absolute", rigId: "left", node: "head" },
      targetRad: Math.PI / 2,
      tone: "accent"
    };

    harness.controller.addRule(rule);
    await harness.setSnapshot(0.49, false);
    await harness.setSnapshot(0.51, true);

    expect(harness.controller.lastEvents.value).toEqual([]);

    harness.controller.dispose();
  });

  it("emits tail crossings when outer transport wraps to zero", async () => {
    const harness = createHarness(
      makeSequence([{ ...makeSegment(0, Math.PI * 2), durationUnits: 1 }])
    );
    const rule: MetronomeRuleDraft = {
      enabled: true,
      source: { kind: "absolute", rigId: "left", node: "head" },
      targetRad: 0,
      tone: "accent"
    };

    harness.controller.addRule(rule);
    await harness.setSnapshot(0.98, false);
    await harness.setSnapshot(0, true);

    expect(harness.controller.lastEvents.value).toHaveLength(1);
    expect(harness.controller.lastEvents.value[0].crossingTimeUnits).toBeCloseTo(1);

    harness.controller.dispose();
  });

  it("clears rules and samples when the prepared sequence changes", async () => {
    const harness = createHarness(
      makeSequence([{ ...makeSegment(0, Math.PI * 2), durationUnits: 1 }])
    );
    const rule: MetronomeRuleDraft = {
      enabled: true,
      source: { kind: "absolute", rigId: "left", node: "head" },
      targetRad: Math.PI / 2,
      tone: "accent"
    };

    harness.controller.addRule(rule);
    await harness.setSnapshot(0.2, false);

    await harness.replacePrepared(makeSequence([{ ...makeSegment(0, Math.PI), durationUnits: 2 }]));

    expect(harness.controller.rules.value).toEqual([]);
    expect(harness.controller.lastEvents.value).toEqual([]);

    harness.controller.dispose();
  });

  it("emits relative head-minus-hand events for flower timing targets", async () => {
    const harness = createHarness(
      makeSequence([{ ...makeSegment(Math.PI * 2, Math.PI * 4), durationUnits: 1 }])
    );
    const rule: MetronomeRuleDraft = {
      enabled: true,
      source: { kind: "relative-head-minus-hand", rigId: "left" },
      targetRad: Math.PI,
      tone: "accent"
    };

    harness.controller.addRule(rule);
    await harness.setSnapshot(0.45, false);
    await harness.setSnapshot(0.55, true);

    expect(harness.controller.lastEvents.value).toHaveLength(1);
    expect(harness.controller.lastEvents.value[0].crossingTimeUnits).toBeCloseTo(0.5);

    harness.controller.dispose();
  });
});
