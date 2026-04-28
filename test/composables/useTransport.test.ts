import { describe, expect, it } from "vitest";

import { createTransport } from "@/composables/useTransport";

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
    },
    runNext(timestampMs: number) {
      const [handle, callback] = callbacks.entries().next().value ?? [];
      if (handle === undefined || !callback) {
        throw new Error("No scheduled frame to run");
      }

      callbacks.delete(handle);
      callback(timestampMs);
    },
    pendingCount() {
      return callbacks.size;
    }
  };
}

describe("createTransport", () => {
  it("advances over animation frames and pauses cleanly", () => {
    const scheduler = createScheduler();
    const transport = createTransport({
      initialDuration: 10,
      initialSpeed: 1,
      requestFrame: scheduler.requestFrame,
      cancelFrame: scheduler.cancelFrame
    });

    transport.play();
    expect(transport.isPlaying.value).toBe(true);
    expect(scheduler.pendingCount()).toBe(1);

    scheduler.runNext(1000);
    expect(transport.currentTime.value).toBe(0);

    scheduler.runNext(1050);
    expect(transport.currentTime.value).toBeCloseTo(0.05);

    transport.pause();
    expect(transport.isPlaying.value).toBe(false);
    expect(scheduler.pendingCount()).toBe(0);
  });

  it("restarts from zero at the transport boundary instead of preserving remainder", () => {
    const scheduler = createScheduler();
    const transport = createTransport({
      initialDuration: 1,
      requestFrame: scheduler.requestFrame,
      cancelFrame: scheduler.cancelFrame
    });

    transport.setCurrentTime(0.98);
    transport.play();

    scheduler.runNext(1000);
    scheduler.runNext(1100);

    expect(transport.currentTime.value).toBe(0);
  });

  it("scales playback by speed", () => {
    const scheduler = createScheduler();
    const transport = createTransport({
      initialDuration: 10,
      requestFrame: scheduler.requestFrame,
      cancelFrame: scheduler.cancelFrame
    });

    transport.setSpeed(2);
    transport.play();

    scheduler.runNext(2000);
    scheduler.runNext(2050);

    expect(transport.currentTime.value).toBeCloseTo(0.1);
  });

  it("clamps large frame gaps to keep background-tab resumes bounded", () => {
    const scheduler = createScheduler();
    const transport = createTransport({
      initialDuration: 10,
      initialSpeed: 1,
      requestFrame: scheduler.requestFrame,
      cancelFrame: scheduler.cancelFrame,
      maxFrameDeltaMs: 100
    });

    transport.play();

    scheduler.runNext(1000);
    scheduler.runNext(1500);

    expect(transport.currentTime.value).toBeCloseTo(0.1);
  });

  it("resets to zero and pauses when duration becomes invalid", () => {
    const scheduler = createScheduler();
    const transport = createTransport({
      initialDuration: 10,
      requestFrame: scheduler.requestFrame,
      cancelFrame: scheduler.cancelFrame
    });

    transport.setCurrentTime(4);
    transport.play();
    transport.setDuration(0);

    expect(transport.isPlaying.value).toBe(false);
    expect(transport.duration.value).toBe(0);
    expect(transport.currentTime.value).toBe(0);
  });

  it("ignores invalid speed updates", () => {
    const scheduler = createScheduler();
    const transport = createTransport({
      initialDuration: 10,
      requestFrame: scheduler.requestFrame,
      cancelFrame: scheduler.cancelFrame
    });

    transport.setSpeed(1.5);
    transport.setSpeed(0);
    transport.setSpeed(Number.NaN);

    expect(transport.speed.value).toBe(1.5);
  });

  it("disposes by cancelling the active frame loop", () => {
    const scheduler = createScheduler();
    const transport = createTransport({
      initialDuration: 10,
      requestFrame: scheduler.requestFrame,
      cancelFrame: scheduler.cancelFrame
    });

    transport.play();
    expect(scheduler.pendingCount()).toBe(1);

    transport.dispose();

    expect(transport.isPlaying.value).toBe(false);
    expect(scheduler.pendingCount()).toBe(0);
  });
});
