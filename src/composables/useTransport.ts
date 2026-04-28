import { computed, inject, provide, ref, type InjectionKey, type Ref } from "vue";

type FrameRequestCallback = (timestampMs: number) => void;

export interface TransportOptions {
  initialDuration?: number;
  initialSpeed?: number;
  unitsPerSecond?: number;
  maxFrameDeltaMs?: number;
  requestFrame?: (callback: FrameRequestCallback) => number;
  cancelFrame?: (handle: number) => void;
}

export interface TransportController {
  readonly currentTime: Ref<number>;
  readonly duration: Ref<number>;
  readonly speed: Ref<number>;
  readonly isPlaying: Ref<boolean>;
  readonly progress: Ref<number>;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  setCurrentTime: (nextTime: number) => void;
  setDuration: (nextDuration: number) => void;
  setSpeed: (nextSpeed: number) => void;
  dispose: () => void;
}

export const transportKey: InjectionKey<TransportController> = Symbol("transport");

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
  const isPlaying = ref(false);
  const progress = computed(() => {
    if (duration.value <= 0) return 0;
    return currentTime.value / duration.value;
  });

  const unitsPerSecond =
    Number.isFinite(options.unitsPerSecond) && (options.unitsPerSecond ?? 0) > 0
      ? (options.unitsPerSecond as number)
      : 1;
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
      const deltaUnits = (deltaMs / 1000) * unitsPerSecond * speed.value;
      const nextTime = currentTime.value + deltaUnits;
      currentTime.value = nextTime >= duration.value ? 0 : nextTime;
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

  const dispose = () => {
    pause();
  };

  return {
    currentTime,
    duration,
    speed,
    isPlaying,
    progress,
    play,
    pause,
    toggle,
    reset,
    setCurrentTime,
    setDuration,
    setSpeed,
    dispose
  };
}

export function provideTransport(
  transport: TransportController = createTransport()
): TransportController {
  provide(transportKey, transport);
  return transport;
}

export function useTransport(): TransportController {
  const transport = inject(transportKey);
  if (!transport) {
    throw new Error("No transport provided in the current component tree");
  }

  return transport;
}
