import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTransportClock } from "@/composables/transportClock";

let queuedRafCallbacks = new Map<number, FrameRequestCallback>();
let nextRafId = 1;

function installMockRaf(): void {
  queuedRafCallbacks = new Map<number, FrameRequestCallback>();
  nextRafId = 1;

  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback): number => {
      const rafId = nextRafId;
      nextRafId += 1;
      queuedRafCallbacks.set(rafId, callback);
      return rafId;
    })
  );

  vi.stubGlobal(
    "cancelAnimationFrame",
    vi.fn((rafId: number): void => {
      queuedRafCallbacks.delete(rafId);
    })
  );
}

function runAnimationFrame(frameTimeMs: number): void {
  const callbacks = Array.from(queuedRafCallbacks.values());
  queuedRafCallbacks.clear();

  for (const callback of callbacks) {
    callback(frameTimeMs);
  }
}

describe("createTransportClock", () => {
  beforeEach(() => {
    installMockRaf();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts once, emits frame delta seconds, and stops cleanly", () => {
    const onTick = vi.fn();
    const clock = createTransportClock(onTick);

    clock.start();
    clock.start();

    expect(clock.isRunning()).toBe(true);
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);

    runAnimationFrame(1000);
    runAnimationFrame(1125);

    expect(onTick).toHaveBeenCalledTimes(2);
    expect(onTick).toHaveBeenNthCalledWith(1, 0);
    expect(onTick).toHaveBeenNthCalledWith(2, 0.125);

    clock.stop();
    expect(clock.isRunning()).toBe(false);
    expect(cancelAnimationFrame).toHaveBeenCalledTimes(1);

    const callsAfterStop = onTick.mock.calls.length;
    runAnimationFrame(1250);
    expect(onTick.mock.calls.length).toBe(callsAfterStop);
  });

  it("allows restart after stop with a reset frame baseline", () => {
    const onTick = vi.fn();
    const clock = createTransportClock(onTick);

    clock.start();
    runAnimationFrame(500);
    runAnimationFrame(600);
    clock.stop();

    clock.start();
    runAnimationFrame(900);
    runAnimationFrame(1000);

    expect(onTick).toHaveBeenNthCalledWith(1, 0);
    expect(onTick).toHaveBeenNthCalledWith(2, 0.1);
    expect(onTick).toHaveBeenNthCalledWith(3, 0);
    expect(onTick).toHaveBeenNthCalledWith(4, 0.1);
  });
});
