import { describe, expect, it } from "vitest";

import { createTransport } from "@/composables/useTransport";
import type { MultiRigSequence } from "@/engine/types";
import { DISPLAY_SETTINGS_STORAGE_KEY, type StorageLike } from "@/visualizer/useDisplaySettings";
import { useVisualizerCore } from "@/visualizer/useVisualizerCore";
import { useVisualizerDisplay } from "@/visualizer/useVisualizerDisplay";

class MemoryStorage implements StorageLike {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

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

function makeSequence(): MultiRigSequence {
  return {
    rigs: [
      {
        rigId: "left",
        sequence: {
          segments: [
            {
              hand: {
                startPose: { phaseAbs: 0, radius: 1 },
                driver: { kind: "circle", omega: 1 }
              },
              head: {
                startPose: { phaseAbs: 0, radius: 1 },
                driver: { kind: "circle", omega: 2 }
              },
              durationUnits: 2
            }
          ]
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

describe("useVisualizerDisplay", () => {
  it("wires session and transport externals into the display controller", () => {
    const core = useVisualizerCore(makeSequence(), { transport: createScheduledTransport() });
    const display = useVisualizerDisplay(core, { storage: null });

    display.external.trailDecaySteps?.set(42);
    display.external.trailLoopMode?.set("off");
    display.external.transportSecondsPerUnit?.set(2);

    expect(core.session.trailDecaySteps.value).toBe(42);
    expect(core.session.trailLoopMode.value).toBe("off");
    expect(core.transport.speed.value).toBe(0.5);

    core.dispose();
  });

  it("keeps external settings out of persisted display snapshots", () => {
    const storage = new MemoryStorage();
    const core = useVisualizerCore(makeSequence(), { transport: createScheduledTransport() });
    const display = useVisualizerDisplay(core, { storage });

    display.external.trailDecaySteps?.set(50);
    display.external.transportSecondsPerUnit?.set(3);
    display.setDisplayScale(1.5);

    const snapshot = storage.getItem(DISPLAY_SETTINGS_STORAGE_KEY) ?? "";
    expect(snapshot).toContain("displayScale");
    expect(snapshot).not.toContain("trailDecaySteps");
    expect(snapshot).not.toContain("transportSecondsPerUnit");

    core.dispose();
  });
});
