import { interpolateSample } from "./idealTether";
import type { IdealTetherSample, IdealTetherTrace } from "./types";

const TAU = Math.PI * 2;
const CARDINALS = [
  { offset: 0, label: "bottom" },
  { offset: Math.PI / 2, label: "side" },
  { offset: Math.PI, label: "top" },
  { offset: Math.PI * 1.5, label: "side" },
  { offset: TAU, label: "bottom" }
] as const;

export interface LoopMarker {
  readonly time: number;
  readonly label: string;
  readonly kind: "cardinal" | "event";
}

export interface LoopDiagnostics {
  readonly complete: boolean;
  readonly direction: 1 | -1;
  readonly duration: number;
  readonly speedMin: number;
  readonly speedMax: number;
  readonly speedMean: number;
  readonly speedRipple: number;
  readonly minimumTension: number;
  readonly positiveHandWork: number;
  readonly negativeHandWork: number;
  readonly absoluteHandWork: number;
  readonly energyBalanceResidual: number;
  readonly markers: readonly LoopMarker[];
}

interface UnwrappedSample {
  readonly sample: IdealTetherSample;
  readonly angle: number;
}

function wrappedDelta(delta: number): number {
  let result = delta;
  while (result > Math.PI) result -= TAU;
  while (result < -Math.PI) result += TAU;
  return result;
}

function unwrap(samples: readonly IdealTetherSample[]): UnwrappedSample[] {
  if (samples.length === 0) return [];
  const result: UnwrappedSample[] = [{ sample: samples[0]!, angle: samples[0]!.theta }];
  for (let index = 1; index < samples.length; index += 1) {
    const previous = result[index - 1]!;
    const sample = samples[index]!;
    result.push({
      sample,
      angle: previous.angle + wrappedDelta(sample.theta - previous.sample.theta)
    });
  }
  return result;
}

function firstDirection(samples: readonly UnwrappedSample[]): 1 | -1 {
  for (let index = 1; index < samples.length; index += 1) {
    const delta = samples[index]!.angle - samples[index - 1]!.angle;
    if (Math.abs(delta) > 1e-8) return delta > 0 ? 1 : -1;
  }
  return 1;
}

function crossingTime(
  samples: readonly UnwrappedSample[],
  target: number,
  direction: 1 | -1
): number | null {
  const progress = (angle: number) => direction * (angle - samples[0]!.angle);
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1]!;
    const current = samples[index]!;
    const previousProgress = progress(previous.angle);
    const currentProgress = progress(current.angle);
    if (previousProgress > target + 1e-9 || currentProgress < target - 1e-9) continue;
    const span = currentProgress - previousProgress;
    const amount = span > 1e-9 ? (target - previousProgress) / span : 0;
    return previous.sample.time + (current.sample.time - previous.sample.time) * amount;
  }
  return null;
}

function samplesThrough(
  samples: readonly IdealTetherSample[],
  endTime: number
): IdealTetherSample[] {
  const result = samples.filter((sample) => sample.time < endTime - 1e-10);
  const endpoint = interpolateSample(samples, endTime);
  if (result.length === 0 || Math.abs(result.at(-1)!.time - endTime) > 1e-10) result.push(endpoint);
  return result;
}

function integrate(
  samples: readonly IdealTetherSample[],
  value: (sample: IdealTetherSample) => number
): number {
  let total = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1]!;
    const current = samples[index]!;
    total += (value(previous) + value(current)) * 0.5 * (current.time - previous.time);
  }
  return total;
}

function workDelta(
  samples: readonly IdealTetherSample[],
  positive: (sample: IdealTetherSample) => number,
  negative: (sample: IdealTetherSample) => number
): { readonly positive: number; readonly negative: number } {
  const endpoint = samples.at(-1)!;
  const start = samples[0]!;
  return {
    positive: positive(endpoint) - positive(start),
    negative: negative(endpoint) - negative(start)
  };
}

export function analyzeFirstLoop(trace: IdealTetherTrace): LoopDiagnostics {
  const unwrapped = unwrap(trace.samples);
  if (unwrapped.length < 2) {
    return {
      complete: false,
      direction: 1,
      duration: 0,
      speedMin: 0,
      speedMax: 0,
      speedMean: 0,
      speedRipple: 0,
      minimumTension: 0,
      positiveHandWork: 0,
      negativeHandWork: 0,
      absoluteHandWork: 0,
      energyBalanceResidual: 0,
      markers: []
    };
  }

  const direction = firstDirection(unwrapped);
  const cardinalMarkers: LoopMarker[] = [];
  let endTime: number | null = null;
  for (const cardinal of CARDINALS) {
    const time = crossingTime(unwrapped, cardinal.offset, direction);
    if (time === null) break;
    cardinalMarkers.push({ time, label: cardinal.label, kind: "cardinal" });
    if (cardinal.offset === TAU) {
      endTime = time;
      break;
    }
  }

  const finalTime = endTime ?? trace.samples.at(-1)!.time;
  const window = samplesThrough(trace.samples, finalTime);
  const speedMin = Math.min(...window.map((sample) => sample.normalizedWorldSpeed));
  const speedMax = Math.max(...window.map((sample) => sample.normalizedWorldSpeed));
  const duration = Math.max(finalTime - trace.samples[0]!.time, 0);
  const speedMean = duration > 0
    ? integrate(window, (sample) => sample.normalizedWorldSpeed) / duration
    : 0;
  const handWork = workDelta(
    window,
    (sample) => sample.cumulativeHandPositiveWork,
    (sample) => sample.cumulativeHandNegativeWork
  );
  const driveWork = workDelta(
    window,
    (sample) => sample.cumulativeDrivePositiveWork,
    (sample) => sample.cumulativeDriveNegativeWork
  );
  const events = trace.events.filter((event) => event.time <= finalTime + 1e-9);
  const boundaryWork = events.reduce((total, event) => total + event.boundaryWork, 0);
  const dissipatedEnergy = events.reduce((total, event) => total + event.dissipatedEnergy, 0);
  const start = window[0]!;
  const end = window.at(-1)!;
  const energyBalanceResidual = end.mechanicalEnergy - start.mechanicalEnergy -
    (handWork.positive + handWork.negative) -
    (driveWork.positive + driveWork.negative) -
    boundaryWork + dissipatedEnergy;
  const eventMarkers: LoopMarker[] = events.map((event) => ({
    time: event.time,
    label: event.kind,
    kind: "event"
  }));

  return {
    complete: endTime !== null,
    direction,
    duration,
    speedMin,
    speedMax,
    speedMean,
    speedRipple: speedMean > 1e-9 ? (speedMax - speedMin) / speedMean : 0,
    minimumTension: Math.min(...window.map((sample) => sample.normalizedTension)),
    positiveHandWork: handWork.positive,
    negativeHandWork: handWork.negative,
    absoluteHandWork: handWork.positive - handWork.negative,
    energyBalanceResidual,
    markers: [...cardinalMarkers, ...eventMarkers].sort((a, b) => a.time - b.time)
  };
}
