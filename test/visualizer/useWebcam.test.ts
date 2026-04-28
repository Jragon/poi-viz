import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";

import { useWebcam } from "@/visualizer/useWebcam";

function installMediaDevices(
  implementation: () => Promise<MediaStream>
): typeof navigator.mediaDevices {
  const mediaDevices = {
    getUserMedia: vi.fn().mockImplementation(implementation)
  } as unknown as MediaDevices;

  Object.defineProperty(globalThis, "navigator", {
    value: { mediaDevices },
    configurable: true,
    writable: true
  });

  return mediaDevices;
}

describe("useWebcam", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("activates on successful stream acquisition and cleans up tracks on stop", async () => {
    const trackOne = { stop: vi.fn() };
    const trackTwo = { stop: vi.fn() };
    const stream = {
      getTracks: () => [trackOne, trackTwo]
    } as unknown as MediaStream;

    installMediaDevices(async () => stream);

    const scope = effectScope();
    const webcam = scope.run(() => useWebcam());
    if (!webcam) {
      throw new Error("expected webcam composable");
    }

    await webcam.start();
    expect(webcam.stream.value?.getTracks()).toEqual([trackOne, trackTwo]);
    expect(webcam.isActive.value).toBe(true);

    webcam.stop();
    expect(trackOne.stop).toHaveBeenCalledTimes(1);
    expect(trackTwo.stop).toHaveBeenCalledTimes(1);
    expect(webcam.stream.value).toBeNull();
    expect(webcam.isActive.value).toBe(false);

    scope.stop();
  });

  it("normalizes representative browser camera errors", async () => {
    installMediaDevices(async () => {
      const error = new Error("denied");
      error.name = "NotAllowedError";
      throw error;
    });

    const scope = effectScope();
    const webcam = scope.run(() => useWebcam());
    if (!webcam) {
      throw new Error("expected webcam composable");
    }

    await webcam.start();
    expect(webcam.stream.value).toBeNull();
    expect(webcam.errorMessage.value).toBe("Camera permission denied");

    scope.stop();
  });
});
