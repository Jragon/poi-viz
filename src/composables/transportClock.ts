export type TransportTick = (frameDeltaSeconds: number) => void;

export interface TransportClock {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
}

/**
 * Creates a single RAF-backed transport clock.
 * The callback runs every animation frame and receives frame delta seconds.
 */
export function createTransportClock(onTick: TransportTick): TransportClock {
  let animationFrameId: number | null = null;
  let lastFrameTimeMs = 0;
  let running = false;

  const onAnimationFrame: FrameRequestCallback = (frameTimeMs) => {
    if (!running) {
      return;
    }

    if (lastFrameTimeMs === 0) {
      lastFrameTimeMs = frameTimeMs;
    }

    const frameDeltaSeconds = (frameTimeMs - lastFrameTimeMs) / 1000;
    lastFrameTimeMs = frameTimeMs;
    onTick(frameDeltaSeconds);

    animationFrameId = requestAnimationFrame(onAnimationFrame);
  };

  return {
    start(): void {
      if (running) {
        return;
      }
      running = true;
      lastFrameTimeMs = 0;
      animationFrameId = requestAnimationFrame(onAnimationFrame);
    },
    stop(): void {
      if (!running) {
        return;
      }
      running = false;
      lastFrameTimeMs = 0;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      animationFrameId = null;
    },
    isRunning(): boolean {
      return running;
    }
  };
}
