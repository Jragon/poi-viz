export type TimingOffset = 0 | 0.25 | 0.5 | 0.75;
export type OrbitDirection = "positive" | "negative";
export type TimingClassification = "same" | "quarter-right" | "split" | "quarter-left";
export type WallCardinal = "R" | "U" | "L" | "D";

export interface TimingModel {
  readonly downbeatOffset: TimingOffset;
  readonly leftDirection: OrbitDirection;
  readonly rightDirection: OrbitDirection;
}

export interface DiagramPoint {
  readonly x: number;
  readonly y: number;
}

export const TIMING_OFFSETS: readonly TimingOffset[] = [0, 0.25, 0.5, 0.75];
export const QUARTER_TIMES = [0, 0.25, 0.5, 0.75] as const;
export const BOTTOM_PHASE = 0.75;

const CARDINAL_PHASES: Readonly<Record<WallCardinal, number>> = {
  R: 0,
  U: 0.25,
  L: 0.5,
  D: 0.75
};

export function normalizePhase(value: number): number {
  return ((value % 1) + 1) % 1;
}

export function directionSign(direction: OrbitDirection): 1 | -1 {
  return direction === "positive" ? 1 : -1;
}

export function phaseAtTime(time: number, downbeatTime: number, direction: OrbitDirection): number {
  return normalizePhase(BOTTOM_PHASE + directionSign(direction) * (time - downbeatTime));
}

export function wallHeightAtTime(time: number, downbeatTime: number): number {
  return -Math.cos(2 * Math.PI * (time - downbeatTime));
}

export function cardinalForPhase(phase: number): WallCardinal {
  const quarterIndex = Math.round(normalizePhase(phase) * 4) % 4;
  return (["R", "U", "L", "D"] as const)[quarterIndex];
}

export function cardinalPhase(cardinal: WallCardinal): number {
  return CARDINAL_PHASES[cardinal];
}

export function downbeatTimes(offset: TimingOffset): {
  readonly left: 0;
  readonly right: TimingOffset;
} {
  return { left: 0, right: offset };
}

export function swapOffset(offset: TimingOffset): TimingOffset {
  return normalizePhase(1 - offset) as TimingOffset;
}

export function swapTiming(model: TimingModel): TimingModel {
  return {
    downbeatOffset: swapOffset(model.downbeatOffset),
    leftDirection: model.rightDirection,
    rightDirection: model.leftDirection
  };
}

export function classifyOffset(offset: TimingOffset): TimingClassification {
  switch (offset) {
    case 0:
      return "same";
    case 0.25:
      return "quarter-left";
    case 0.5:
      return "split";
    case 0.75:
      return "quarter-right";
  }
}

export function describeTimingOffset(offset: TimingOffset): string {
  switch (classifyOffset(offset)) {
    case "same":
      return "Left and right downbeats occur together.";
    case "quarter-right":
      return "The right downbeat leads the left by one quarter cycle.";
    case "split":
      return "The downbeats are separated by half a cycle.";
    case "quarter-left":
      return "The left downbeat leads the right by one quarter cycle.";
  }
}

export function formatOffset(offset: TimingOffset): string {
  switch (offset) {
    case 0:
      return "0/4";
    case 0.25:
      return "1/4";
    case 0.5:
      return "2/4";
    case 0.75:
      return "3/4";
  }
}

export function formatDirection(direction: OrbitDirection): string {
  return direction === "positive" ? "counter-clockwise" : "clockwise";
}

export function formatCycleTime(time: number): string {
  const normalized = normalizePhase(time);
  const quarter = TIMING_OFFSETS.find((offset) => Math.abs(normalized - offset) < 1e-9);

  return quarter === undefined ? normalized.toFixed(2) : formatOffset(quarter);
}

export function phaseToPoint(
  phase: number,
  centerX: number,
  centerY: number,
  radius: number
): DiagramPoint {
  const angle = normalizePhase(phase) * Math.PI * 2;
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY - radius * Math.sin(angle)
  };
}

export function formatPoint(point: DiagramPoint): string {
  return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
}

export function buildHeightWavePath(
  downbeatTime: number,
  width: number,
  top: number,
  amplitude: number,
  sampleCount = 48
): string {
  const centerY = top + amplitude;
  const coordinates: string[] = [];

  for (let index = 0; index <= sampleCount; index += 1) {
    const time = index / sampleCount;
    const x = time * width;
    const y = centerY - wallHeightAtTime(time, downbeatTime) * amplitude;
    coordinates.push(`${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }

  return coordinates.join(" ");
}
