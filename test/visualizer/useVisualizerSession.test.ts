import { describe, expect, it } from "vitest";
import { nextTick, ref } from "vue";

import { createTransport } from "@/composables/useTransport";
import type { MultiRigSequence, Segment } from "@/engine/types";
import { useVisualizerSession } from "@/visualizer/useVisualizerSession";

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

describe("useVisualizerSession", () => {
  it("resets transport to zero and pauses when the sequence reference changes", async () => {
    const scheduler = createScheduler();
    const transport = createTransport({
      requestFrame: scheduler.requestFrame,
      cancelFrame: scheduler.cancelFrame
    });
    const sequence = ref<MultiRigSequence>(makeSequence(2));
    const session = useVisualizerSession(sequence, transport);

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
});
