import { describe, expect, it } from "vitest";
import { nextTick, ref, type MaybeRefOrGetter } from "vue";

import { createTransport } from "@/composables/useTransport";
import type { MultiRigSequence, Segment } from "@/engine/types";
import {
  TRAIL_DECAY_DEFAULT,
  TRAIL_DECAY_MAX,
  TRAIL_DECAY_MIN,
  TRAIL_STEP_FIXED,
  useVisualizerSession,
  type VisualizerSessionOptions
} from "@/visualizer/useVisualizerSession";

function createScheduler() {
  let nextHandle = 1;
  const callbacks = new Map<number, (timestampMs: number) => void>();

  return {
    requestFrame(callback: (timestampMs: number) => void) {
      const handle = nextHandle;
      nextHandle += 1;
      callbacks.set(handle, callback);
      return handle;
    },
    cancelFrame(handle: number) {
      callbacks.delete(handle);
    }
  };
}

function makeSegment(handOmega: number, headOmega: number): Segment {
  return {
    hand: {
      startPose: { phaseAbs: 0, radius: 1 },
      driver: { kind: "circle", omega: handOmega }
    },
    head: {
      startPose: { phaseAbs: 0, radius: 1 },
      driver: { kind: "circle", omega: headOmega }
    }
  };
}

function makeSequence(durationUnits: number): MultiRigSequence {
  return {
    rigs: [
      {
        rigId: "left",
        sequence: {
          segments: [{ segment: makeSegment(1, 2), durationUnits }]
        }
      }
    ]
  };
}

function makeContinuousSequence(durationUnits: number): MultiRigSequence {
  return {
    rigs: [
      {
        rigId: "left",
        sequence: {
          segments: [
            {
              segment: makeSegment((Math.PI * 2) / durationUnits, (Math.PI * 2) / durationUnits),
              durationUnits
            }
          ]
        }
      }
    ]
  };
}

function createSession(
  sequence: MaybeRefOrGetter<MultiRigSequence>,
  options: VisualizerSessionOptions = {}
) {
  const scheduler = createScheduler();
  const transport = createTransport({
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame
  });

  return {
    transport,
    session: useVisualizerSession(sequence, transport, options)
  };
}

describe("useVisualizerSession", () => {
  it("resets transport to zero and pauses when the sequence reference changes", async () => {
    const sequence = ref<MultiRigSequence>(makeSequence(2));
    const { session, transport } = createSession(sequence);

    expect(transport.duration.value).toBe(2);

    transport.setCurrentTime(1.25);
    transport.play();
    expect(transport.isPlaying.value).toBe(true);

    sequence.value = makeSequence(5);
    await nextTick();

    expect(transport.isPlaying.value).toBe(false);
    expect(transport.currentTime.value).toBe(0);
    expect(transport.duration.value).toBe(5);
    expect(session.currentFrame.value).toBeTruthy();
  });

  it("resets transport even when a new sequence has the same max duration", async () => {
    const sequence = ref<MultiRigSequence>(makeSequence(2));
    const { session, transport } = createSession(sequence);

    transport.setCurrentTime(1.25);
    transport.play();

    sequence.value = {
      rigs: [
        {
          rigId: "left",
          sequence: {
            segments: [
              {
                segment: makeSegment(5, 6),
                durationUnits: 2
              }
            ]
          }
        }
      ]
    };
    await nextTick();

    expect(transport.isPlaying.value).toBe(false);
    expect(transport.currentTime.value).toBe(0);
    expect(transport.duration.value).toBe(2);
    expect(session.currentFrame.value).toBeTruthy();
  });

  it("autoplays on initial prepare when enabled", () => {
    const { transport } = createSession(makeSequence(2), {
      autoplay: true,
      resumeOnSequenceChange: true
    });
    expect(transport.isPlaying.value).toBe(true);
  });

  it("keeps playing across sequence changes when resumeOnSequenceChange is enabled", async () => {
    const sequence = ref<MultiRigSequence>(makeSequence(2));
    const { transport } = createSession(sequence, {
      autoplay: true,
      resumeOnSequenceChange: true
    });

    expect(transport.isPlaying.value).toBe(true);

    sequence.value = makeSequence(5);
    await nextTick();

    expect(transport.isPlaying.value).toBe(true);
    expect(transport.currentTime.value).toBe(0);
    expect(transport.duration.value).toBe(5);
  });

  it("clamps trailDecaySteps to [min, max] and rejects non-finite or non-positive input", () => {
    const { session } = createSession(makeSequence(2));

    expect(session.trailDecaySteps.value).toBe(TRAIL_DECAY_DEFAULT);

    session.setTrailDecaySteps(40);
    expect(session.trailDecaySteps.value).toBe(40);

    session.setTrailDecaySteps(1);
    expect(session.trailDecaySteps.value).toBe(TRAIL_DECAY_MIN);

    session.setTrailDecaySteps(1000);
    expect(session.trailDecaySteps.value).toBe(TRAIL_DECAY_MAX);

    session.setTrailDecaySteps(-1);
    expect(session.trailDecaySteps.value).toBe(TRAIL_DECAY_DEFAULT);

    session.setTrailDecaySteps(Number.NaN);
    expect(session.trailDecaySteps.value).toBe(TRAIL_DECAY_DEFAULT);
  });

  it("keeps the live trail tip aligned with the current frame between grid samples", async () => {
    const { session, transport } = createSession(makeSequence(2));
    expect(TRAIL_STEP_FIXED).toBe(0.01);

    transport.setCurrentTime(TRAIL_STEP_FIXED * 0.5);
    await nextTick();
    expect(session.currentTrails.value.left?.hand).toHaveLength(2);
    expect(session.currentTrails.value.left?.head).toHaveLength(2);

    const firstFrame = session.currentFrame.value;
    if (!firstFrame?.ok) throw new Error("expected evaluated frame");
    expect(session.currentTrails.value.left?.hand?.at(-1)).toEqual(
      firstFrame.cartesianPoses.left.handPosition
    );
    expect(session.currentTrails.value.left?.head?.at(-1)).toEqual(
      firstFrame.cartesianPoses.left.headPosition
    );

    transport.setCurrentTime(TRAIL_STEP_FIXED);
    await nextTick();
    const atFirstStep = session.currentTrails.value;
    expect(atFirstStep.left?.hand).toHaveLength(2);

    transport.setCurrentTime(TRAIL_STEP_FIXED * 1.5);
    await nextTick();
    const betweenSteps = session.currentTrails.value;
    expect(betweenSteps.left?.hand).toHaveLength(3);

    const secondFrame = session.currentFrame.value;
    if (!secondFrame?.ok) throw new Error("expected evaluated frame");
    expect(betweenSteps.left?.hand?.at(-1)).toEqual(secondFrame.cartesianPoses.left.handPosition);
    expect(betweenSteps.left?.head?.at(-1)).toEqual(secondFrame.cartesianPoses.left.headPosition);
    expect(betweenSteps.left?.hand?.[0]).toEqual(atFirstStep.left?.hand?.[0]);
  });

  it("collapses currentTrails back to empty after transport wraps to 0", async () => {
    const { session, transport } = createSession(makeSequence(2));
    transport.setCurrentTime(1.0);
    await nextTick();
    expect(Object.keys(session.currentTrails.value).length).toBeGreaterThan(0);

    transport.setCurrentTime(0);
    await nextTick();
    expect(session.currentTrails.value).toEqual({});
  });

  it("keeps continuous currentTrails populated at the transport boundary in auto mode", async () => {
    const { session, transport } = createSession(makeContinuousSequence(2));
    session.setTrailDecaySteps(3);

    expect(session.trailLoopMode.value).toBe("auto");
    transport.setCurrentTime(0);
    await nextTick();

    expect(session.currentTrails.value.left?.hand).toHaveLength(3);
    expect(session.currentTrails.value.left?.head).toHaveLength(3);
  });

  it("turns continuous boundary trails off when trailLoopMode is off", async () => {
    const { session, transport } = createSession(makeContinuousSequence(2));
    session.setTrailDecaySteps(3);

    session.setTrailLoopMode("off");
    transport.setCurrentTime(0);
    await nextTick();

    expect(session.trailLoopMode.value).toBe("off");
    expect(session.currentTrails.value).toEqual({});

    session.setTrailLoopMode("auto");
    await nextTick();

    expect(session.trailLoopMode.value).toBe("auto");
    expect(session.currentTrails.value.left?.hand).toHaveLength(3);
  });

  it("applies trail decay as a max hold window", async () => {
    const { session, transport } = createSession(makeSequence(2));
    session.setTrailDecaySteps(3);

    transport.setCurrentTime(TRAIL_STEP_FIXED * 8);
    await nextTick();

    expect(session.currentTrails.value.left?.hand).toHaveLength(3);
    expect(session.currentTrails.value.left?.head).toHaveLength(3);
  });
});
