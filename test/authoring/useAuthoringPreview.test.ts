import { describe, expect, it } from "vitest";
import { nextTick, ref } from "vue";

import { useAuthoringPreview } from "@/authoring/useAuthoringPreview";
import { createTransport } from "@/composables/useTransport";
import type { MultiRigSequence, Segment } from "@/engine/types";

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

function makeSequence(durations: number[]): MultiRigSequence {
  return {
    rigs: [
      {
        rigId: "left",
        sequence: {
          segments: durations.map((durationUnits, index) => ({
            segment: makeSegment(index + 1, index + 2),
            durationUnits
          }))
        }
      }
    ]
  };
}

describe("useAuthoringPreview", () => {
  it("restarts at the consumed segment boundary when the sequence changes", async () => {
    const scheduler = createScheduler();
    const transport = createTransport({
      requestFrame: scheduler.requestFrame,
      cancelFrame: scheduler.cancelFrame
    });
    const sequence = ref<MultiRigSequence>(makeSequence([2, 3]));
    const restartTime = ref<number | null>(null);
    const preview = useAuthoringPreview(
      sequence,
      () => {
        const next = restartTime.value;
        restartTime.value = null;
        return next;
      },
      transport
    );

    expect(transport.duration.value).toBe(5);

    transport.setCurrentTime(1.5);
    transport.play();
    restartTime.value = 2;
    sequence.value = makeSequence([2, 4]);
    await nextTick();

    expect(transport.currentTime.value).toBe(2);
    expect(transport.duration.value).toBe(6);
    expect(transport.isPlaying.value).toBe(true);
    preview.dispose();
  });

  it("preserves current time when no restart boundary is provided", async () => {
    const scheduler = createScheduler();
    const transport = createTransport({
      requestFrame: scheduler.requestFrame,
      cancelFrame: scheduler.cancelFrame
    });
    const sequence = ref<MultiRigSequence>(makeSequence([2, 3]));
    const preview = useAuthoringPreview(sequence, () => null, transport);

    transport.setCurrentTime(1.25);
    sequence.value = makeSequence([2, 4]);
    await nextTick();

    expect(transport.currentTime.value).toBe(1.25);
    expect(transport.duration.value).toBe(6);
    preview.dispose();
  });
});
