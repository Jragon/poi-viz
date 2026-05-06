import { describe, expect, it } from "vitest";
import { nextTick, ref } from "vue";

import { createTransport } from "@/composables/useTransport";
import type { MultiRigSequence, Segment } from "@/engine/types";
import { useVisualizerCore } from "@/visualizer/useVisualizerCore";

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

function makeSegment(handRadius: number, headRadius: number): Segment {
  return {
    durationUnits: 1,
    hand: {
      startPose: { phaseAbs: 0, radius: handRadius },
      driver: { kind: "circle", omega: 1 }
    },
    head: {
      startPose: { phaseAbs: 0, radius: headRadius },
      driver: { kind: "circle", omega: 2 }
    }
  };
}

function makeSequence(durationUnits: number, handRadius = 1, headRadius = 1): MultiRigSequence {
  return {
    rigs: [
      {
        rigId: "left",
        sequence: {
          segments: [{ ...makeSegment(handRadius, headRadius), durationUnits }]
        }
      }
    ]
  };
}

function createScheduledTransport() {
  const scheduler = createScheduler();
  return createTransport({
    requestFrame: scheduler.requestFrame,
    cancelFrame: scheduler.cancelFrame
  });
}

describe("useVisualizerCore", () => {
  it("uses an existing transport when one is provided", () => {
    const transport = createScheduledTransport();
    const core = useVisualizerCore(makeSequence(3), { transport });

    expect(core.transport).toBe(transport);
    expect(core.ownsTransport).toBe(false);
    expect(core.transport.duration.value).toBe(3);
    expect(core.rigOrder.value).toEqual(["left"]);

    core.dispose();
  });

  it("keeps separate mounted core controllers independent", () => {
    const firstTransport = createScheduledTransport();
    const secondTransport = createScheduledTransport();
    const first = useVisualizerCore(makeSequence(2), { transport: firstTransport });
    const second = useVisualizerCore(makeSequence(5), { transport: secondTransport });

    first.transport.setCurrentTime(1);
    second.transport.setCurrentTime(4);

    expect(first.transport.duration.value).toBe(2);
    expect(second.transport.duration.value).toBe(5);
    expect(first.transport.currentTime.value).toBe(1);
    expect(second.transport.currentTime.value).toBe(4);

    first.dispose();
    second.dispose();
  });

  it("updates derived canvas state when the sequence changes", async () => {
    const sequence = ref(makeSequence(2, 1, 1));
    const core = useVisualizerCore(sequence, { transport: createScheduledTransport() });

    expect(core.sceneWorldRadius.value).toBe(2);
    expect(core.sequenceSummary.value).toBe("left:1");

    sequence.value = makeSequence(4, 3, 2);
    await nextTick();

    expect(core.transport.duration.value).toBe(4);
    expect(core.sceneWorldRadius.value).toBe(5);
    expect(core.cartesianPoses.value.left).toBeTruthy();

    core.dispose();
  });

  it("disposes an internally created transport", () => {
    const scheduler = createScheduler();
    const core = useVisualizerCore(makeSequence(2), {
      transportOptions: {
        requestFrame: scheduler.requestFrame,
        cancelFrame: scheduler.cancelFrame
      },
      autoplay: true,
      resumeOnSequenceChange: true
    });

    expect(core.ownsTransport).toBe(true);
    expect(core.transport.isPlaying.value).toBe(true);

    core.dispose();

    expect(core.transport.isPlaying.value).toBe(false);
  });
});
