import { computed, ref, type Ref } from "vue";

type FrameRequestCallback = (timestampMs: number) => void;

export type TransportEndBehavior = "repeat" | "reset";

export interface TransportOptions {
  initialDuration?: number;
  initialSpeed?: number;
  initialEndBehavior?: TransportEndBehavior;
  unitsPerSecond?: number;
  maxFrameDeltaMs?: number;
  requestFrame?: (callback: FrameRequestCallback) => number;
  cancelFrame?: (handle: number) => void;
}

export interface TransportController {
  readonly currentTime: Ref<number>;
  readonly duration: Ref<number>;
  readonly speed: Ref<number>;
  readonly unitsPerSecond: Ref<number>;
  readonly isPlaying: Ref<boolean>;
  readonly progress: Ref<number>;
  readonly endBehavior: Ref<TransportEndBehavior>;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  setCurrentTime: (nextTime: number) => void;
  setDuration: (nextDuration: number) => void;
  setSpeed: (nextSpeed: number) => void;
  setEndBehavior: (nextBehavior: TransportEndBehavior) => void;
  dispose: () => void;
}

function getDefaultRequestFrame(): (callback: FrameRequestCallback) => number {
  if (typeof globalThis.requestAnimationFrame !== "function") {
    throw new Error("requestAnimationFrame is not available; provide a scheduler explicitly");
  }

  return globalThis.requestAnimationFrame.bind(globalThis);
}

function getDefaultCancelFrame(): (handle: number) => void {
  if (typeof globalThis.cancelAnimationFrame !== "function") {
    throw new Error("cancelAnimationFrame is not available; provide a scheduler explicitly");
  }

  return globalThis.cancelAnimationFrame.bind(globalThis);
}

function clampTime(nextTime: number, duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) {
    return 0;
  }

  if (!Number.isFinite(nextTime)) {
    return 0;
  }

  return Math.min(Math.max(nextTime, 0), duration);
}

export function createTransport(options: TransportOptions = {}): TransportController {
  const currentTime = ref(0);
  const duration = ref(
    Number.isFinite(options.initialDuration) && (options.initialDuration ?? 0) > 0
      ? (options.initialDuration as number)
      : 0
  );
  const speed = ref(
    Number.isFinite(options.initialSpeed) && (options.initialSpeed ?? 0) > 0
      ? (options.initialSpeed as number)
      : 0.25
  );
  const unitsPerSecond = ref(
    Number.isFinite(options.unitsPerSecond) && (options.unitsPerSecond ?? 0) > 0
      ? (options.unitsPerSecond as number)
      : 1
  );
  const isPlaying = ref(false);
  const endBehavior = ref<TransportEndBehavior>(
    options.initialEndBehavior === "reset" ? "reset" : "repeat"
  );
  const progress = computed(() => {
    if (duration.value <= 0) return 0;
    return currentTime.value / duration.value;
  });
  const maxFrameDeltaMs =
    Number.isFinite(options.maxFrameDeltaMs) && (options.maxFrameDeltaMs ?? 0) > 0
      ? (options.maxFrameDeltaMs as number)
      : 100;
  const requestFrame = options.requestFrame ?? getDefaultRequestFrame();
  const cancelFrame = options.cancelFrame ?? getDefaultCancelFrame();

  let frameHandle: number | null = null;
  let lastFrameTimeMs: number | null = null;

  const stopFrameLoop = () => {
    if (frameHandle !== null) {
      cancelFrame(frameHandle);
      frameHandle = null;
    }

    lastFrameTimeMs = null;
  };

  const stepFrame = (timestampMs: number) => {
    if (!isPlaying.value) {
      stopFrameLoop();
      return;
    }

    if (lastFrameTimeMs !== null && duration.value > 0) {
      const deltaMs = Math.min(Math.max(timestampMs - lastFrameTimeMs, 0), maxFrameDeltaMs);
      const deltaUnits = (deltaMs / 1000) * unitsPerSecond.value * speed.value;
      const nextTime = currentTime.value + deltaUnits;
      if (nextTime >= duration.value) {
        currentTime.value = 0;
        if (endBehavior.value === "reset") {
          isPlaying.value = false;
          stopFrameLoop();
          return;
        }
      } else {
        currentTime.value = nextTime;
      }
    }

    lastFrameTimeMs = timestampMs;
    frameHandle = requestFrame(stepFrame);
  };

  const play = () => {
    if (isPlaying.value || duration.value <= 0) {
      return;
    }

    isPlaying.value = true;
    lastFrameTimeMs = null;
    frameHandle = requestFrame(stepFrame);
  };

  const pause = () => {
    isPlaying.value = false;
    stopFrameLoop();
  };

  const toggle = () => {
    if (isPlaying.value) {
      pause();
      return;
    }

    play();
  };

  const reset = () => {
    currentTime.value = 0;
  };

  const setCurrentTime = (nextTime: number) => {
    currentTime.value = clampTime(nextTime, duration.value);
  };

  const setDuration = (nextDuration: number) => {
    if (!Number.isFinite(nextDuration) || nextDuration <= 0) {
      pause();
      duration.value = 0;
      currentTime.value = 0;
      return;
    }

    duration.value = nextDuration;
    currentTime.value = clampTime(currentTime.value, duration.value);
  };

  const setSpeed = (nextSpeed: number) => {
    if (!Number.isFinite(nextSpeed) || nextSpeed <= 0) {
      return;
    }

    speed.value = nextSpeed;
  };

  const setEndBehavior = (nextBehavior: TransportEndBehavior) => {
    endBehavior.value = nextBehavior === "reset" ? "reset" : "repeat";
  };

  const dispose = () => {
    pause();
  };

  return {
    currentTime,
    duration,
    speed,
    unitsPerSecond,
    isPlaying,
    progress,
    endBehavior,
    play,
    pause,
    toggle,
    reset,
    setCurrentTime,
    setDuration,
    setSpeed,
    setEndBehavior,
    dispose
  };
}
